// api/generate-outreach.js — Vercel Serverless Function
// POST { lead, language, tone, offer } → { message, subject, cta }
// Multi-AI fallback chain: Gemini → Groq → OpenRouter → static template.
// Keys: GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY (all server-side, never exposed).

const ALLOWED_ORIGINS = [
  'https://adfusionbot.cloud',
  'https://leadgen-hub.vercel.app',
  'https://leadgenhubai.vercel.app',
  'http://localhost:3000',
  'http://localhost:3002',
];

const VERTICAL_LABELS = {
  dental:       { label: 'Dental clinic',               audience: 'patients' },
  beauty:       { label: 'Beauty salon',                audience: 'patients' },
  eye:          { label: 'Eye clinic',                  audience: 'patients' },
  derma:        { label: 'Dermatology clinic',          audience: 'patients' },
  physio:       { label: 'Physiotherapy center',        audience: 'patients' },
  pharmacy:     { label: 'Pharmacy',                    audience: 'patients' },
  veterinary:   { label: 'Veterinary clinic',           audience: 'patients' },
  restaurant:   { label: 'Restaurant',                  audience: 'customers' },
  legal:        { label: 'Law office',                  audience: 'customers' },
  plastic:      { label: 'Plastic & cosmetic surgery',  audience: 'patients' },
  realty:       { label: 'Real estate agency',          audience: 'clients' },
  carrental:    { label: 'Car rental agency',           audience: 'customers' },
  travel:       { label: 'Travel & tourism agency',     audience: 'travelers' },
  medical:      { label: 'Medical clinic',              audience: 'patients' },
};

const OFFER_MAP = {
  free_audit:        { en: 'a free audit of your Google visibility & online presence', fr: 'un audit gratuit de votre visibilité Google', ar: 'تدقيق مجاني لحضوركم على Google' },
  landing_redesign:  { en: 'a complete landing page redesign optimized for conversions', fr: 'une refonte complète de votre landing page optimisée pour la conversion', ar: 'إعادة تصميم كاملة لصفحتكم المقصودة' },
  consultation:      { en: 'a 15-minute consultation to discuss growth opportunities', fr: 'une consultation de 15 minutes pour discuter de vos opportunités de croissance', ar: 'استشارة لمدة 15 دقيقة لمناقشة فرص النمو' },
  followup_gentle:   { en: 'a new way to boost your visibility and reach more local customers', fr: 'une nouvelle facon de booster votre visibilite et atteindre plus de clients locaux', ar: 'طريقة جديدة لتحسين ظهوركم والوصول إلى عملاء محليين أكثر' },
  followup_final:    { en: 'this opportunity', fr: 'cette opportunite', ar: 'هذه الفرصة' },
};

const TONE_MAP = {
  friendly:     { en: 'warm, friendly and conversational', fr: 'chaleureux, amical et conversationnel', ar: 'ودود ومحادث' },
  professional: { en: 'formal, expert and trustworthy',    fr: 'formel, expert et rassurant',            ar: 'رسمي وخبير وموثوق' },
  direct:       { en: 'punchy, direct and results-focused', fr: 'direct, percutant et axé résultats',    ar: 'مباشر ومركّز على النتائج' },
};

const LANG_INSTRUCTION = {
  ar: 'Write the message in Arabic. Use natural, professional Arabic (Moroccan business context).',
  fr: 'Write the message in French. Use natural, professional French (Moroccan business context).',
  en: 'Write the message in English.',
};

function cors(res, origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function json(res, status, obj) {
  res.status(status).json(obj);
}

// BUG B: localized audience words so 'customers' never leaks into FR/AR templates
const AUDIENCE_L10N = {
  fr: { patients: 'patients', customers: 'clients', clients: 'clients', travelers: 'voyageurs' },
  ar: { patients: '\u0645\u0631\u0636\u0649', customers: '\u0627\u0644\u0639\u0645\u0644\u0627\u0621', clients: '\u0627\u0644\u0639\u0645\u0644\u0627\u0621', travelers: '\u0627\u0644\u0645\u0633\u0627\u0641\u0631\u064a\u0646' },
  en: { patients: 'patients', customers: 'customers', clients: 'clients', travelers: 'travelers' },
};

// BUG C: collapse any literal backslash-n (double-escaped JSON) into real newlines
function normalizeNewlines(t) {
  return String(t == null ? '' : t).replace(/\\n/g, '\n');
}

// BUG B: FR template quality lint — flag English words leaking into French text
const FR_EN_LEAK = ['customers', 'users', 'people', 'feedback'];
function frEnglishLint(text) {
  const low = String(text || '').toLowerCase();
  return FR_EN_LEAK.some(function (w) { return new RegExp('\\b' + w + '\\b').test(low); });
}

// BUG D: if a truncated message ends mid-sentence, cut to last complete sentence + proper ' ...'
function truncateToSentence(text) {
  const t = String(text || '').trim();
  if (/[.!?\u2026]["')]?\s*$/.test(t)) return t; // already ends on a sentence terminator
  let cut = -1;
  const re = /[.!?\u2026]["')]?\s+/g;
  let m;
  while ((m = re.exec(t))) cut = m.index;
  if (cut >= 0) {
    const s = t.slice(0, cut + 1).trim();
    if (s.length >= 20) return s + ' ...';
  }
  return t.replace(/[.\u2026]+$/, '').trim() + ' ...';
}

// v2.17.1: enforce opening name-greeting + trailing signature placeholder on every provider success
function signatureGuard(message) {
  let m = normalizeNewlines(String(message || '').trim());
  const leadName = ((__ctx && __ctx.lead && __ctx.lead.name) || '').trim();
  const firstLine = (m.split('\n')[0] || '');
  if (leadName && /^Bonjour\s*[!!,]/i.test(firstLine)) {
    m = m.replace(firstLine, 'Bonjour ' + leadName + ' !');
  }
  const hadSig = /\{\{YOUR_NAME\}\}\s*$/.test(m);
  const body = hadSig ? m.replace(/\{\{YOUR_NAME\}\}\s*$/, '').trim() : m;
  m = truncateToSentence(body);
  if (hadSig || !m.includes('{{YOUR_NAME}}')) m += '\n\n{{YOUR_NAME}}';
  return m;
}

// ---- Multi-AI fallback chain config ----
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash'];

const FALLBACK_CHAIN = [
  { provider: 'gemini', model: 'gemini-3.6-flash', retries: 2 },
  { provider: 'gemini', model: 'gemini-2.5-flash', retries: 1 },
  { provider: 'groq', model: 'qwen/qwen3.8-27b', retries: 2 },
  { provider: 'openrouter', model: 'meta-llama/llama-3.1-8b-instruct', retries: 2 },
  { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', retries: 1 },
];

const RETRY_DELAYS = [2000, 5000, 10000]; // per-entry retry backoff
const PROVIDER_KEY = { gemini: 'GEMINI_API_KEY', groq: 'GROQ_API_KEY', openrouter: 'OPENROUTER_API_KEY' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Per-request context so getSystemPrompt(language) can build the full spec prompt.
let __ctx = null;

function getSystemPrompt(language) {
  const c = __ctx || {};
  const lead = c.lead || {};
  const vertLabel = c.vertLabel || 'local business';
  const audience = c.audience || 'customers';
  const ratingStr = c.ratingStr || '';
  const usp = c.usp || '';
  const services = c.services || [];
  const offerText = c.offerText || '';
  const toneText = c.toneText || '';
  const isFollowup = c.isFollowup;
  const isFinal = c.isFinal;

  return `You are an expert WhatsApp direct-response copywriter for local businesses in Morocco.

BUSINESS CONTEXT:
- Name: ${lead.name}
- Vertical: ${vertLabel} (audience: ${audience})
- Profession: ${lead.profession || vertLabel}
- City: ${lead.city || ''}${lead.country ? `, ${lead.country}` : ''}
- Rating: ${ratingStr || 'not specified'}
- USP: ${usp || 'not specified'}
- Services: ${services.length ? services.join(', ') : 'not specified'}
- Website: ${lead.website || 'none'}

OFFER: ${offerText}
TONE: ${toneText}
LANGUAGE: ${LANG_INSTRUCTION[language]}
FORMAT GUARANTEE (non-negotiable): ALWAYS start the message with 'Bonjour ${lead.name} !' and ALWAYS end with '{{YOUR_NAME}}' on its own final line.

${isFollowup ? `FOLLOW-UP CONTEXT: This is a ${isFinal ? 'FINAL (72h)' : 'GENTLE (48h)'} follow-up to a first message sent ${isFinal ? '~3 days' : '~2 days'} ago that got no reply yet. The recipient already saw the first message.
CRITICAL MESSAGE RULES (must follow exactly):
1. Length: ${isFinal ? '40-60 words total — short, light, respectful of their time.' : '60-90 words total — concise, scannable WhatsApp message.'}
2. Opener: reference the previous message naturally ("just following up on my message from ${isFinal ? 'the other day' : '2 days ago'}"), do NOT repeat the full first pitch.
3. Add ONE NEW value angle (different from the first message): a concrete benefit or proof point${usp ? ` (e.g. "${usp}")` : ''}${ratingStr ? `, or your ${ratingStr}` : ''}.
4. ${isFinal
    ? `Polite close-the-loop tone: it is clearly the last message for now, no pressure, leaves the door open ("should I close your file for now?" style).`
    : `Gentle reminder tone: helpful, not pushy, no guilt-trip. Present ${offerText}.`}
5. End with exactly ONE light question CTA${isFinal ? ' (e.g. "Should I close your file for now?" / "Je clôture votre dossier pour l\'instant ?")' : ' (e.g. "Still interested?" / "Toujours intéressé ?")'}.
6. Max 1 emoji total (keep it subdued).
7. No hashtags.
8. End with signature placeholder on its own line: {{YOUR_NAME}}
9. Do not add subject line inside the message body.` : `CRITICAL MESSAGE RULES (must follow exactly):
1. 60-90 words total — concise, scannable WhatsApp message.
2. Opener MUST cite ONE specific fact about the business: either its rating/reviews count (${ratingStr || 'or USP'}) or its top USP ("${usp || 'top service'}"). Do not be generic.
3. Include ONE pain hint relevant to the ${vertLabel} vertical and its ${audience} (e.g. losing ${audience} to more visible competitors).
4. Present ONE clear offer: ${offerText}.
5. End with exactly ONE question CTA (e.g. "Shall we schedule it this week?" / "On cale un créneau cette semaine ?" / "هل نحدد موعداً هذا الأسبوع؟").
6. Max 2 emojis total.
7. No hashtags.
8. End with signature placeholder on its own line: {{YOUR_NAME}}
9. Do not add subject line inside the message body.`}

OUTPUT: Return ONLY valid JSON (no markdown, no code fence) with exactly 3 keys:
{
  "message": "the WhatsApp message text (with line breaks as \\n)",
  "subject": "short subject line for CRM (5-8 words, same language as message)",
  "cta": "the question CTA alone (e.g. Shall we schedule a call?)"
}
Make sure the JSON is valid and all strings are properly escaped.`;
}

const USER_PROMPT = 'Generate the WhatsApp outreach message for the business described above, following every rule exactly. Return ONLY valid JSON with exactly the 3 keys: message, subject, cta.';

async function generateWithGroq(prompt, language) {
  const ac = new AbortController();
  const tmr = setTimeout(() => ac.abort(), 8000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          {role: 'system', content: getSystemPrompt(language)},
          {role: 'user', content: prompt}
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });
    if (!response.ok) throw new Error(`Groq ${response.status}`);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Groq empty response');
    return { content, model: 'qwen/qwen3.8-27b' };
  } finally { clearTimeout(tmr); }
}

async function generateWithOpenRouter(prompt, language) {
  const models = ['meta-llama/llama-3.1-8b-instruct', 'meta-llama/llama-3.3-70b-instruct'];
  const ac = new AbortController();
  const tmr = setTimeout(() => ac.abort(), 8000);
  try {
    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              {role: 'system', content: getSystemPrompt(language)},
              {role: 'user', content: prompt}
            ],
            temperature: 0.7
          })
        });
        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) return { content, model: data?.model || model };
        }
      } catch (e) { continue; }
    }
    throw new Error('OpenRouter all models failed');
  } finally { clearTimeout(tmr); }
}

async function callGemini(model) {
  const key = process.env.GEMINI_API_KEY;
  const lang = (__ctx && __ctx.language) || 'fr';
  const ac = new AbortController();
  const tmr = setTimeout(() => ac.abort(), 8000);
  let r;
  try {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: getSystemPrompt(lang) }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
      }),
      signal: ac.signal,
    });
  } finally { clearTimeout(tmr); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const t = typeof data === 'string' ? data : JSON.stringify(data || {});
    const err = new Error(`${model} HTTP ${r.status} — ${t.slice(0, 400)}`);
    err.status = r.status;
    err.notAvailable = r.status === 404 || /not found|not available|unsupported|deprecated/i.test(JSON.stringify(data) || '');
    err.retryable = r.status === 429 || r.status === 503 || r.status === 502 || r.status === 500;
    throw err;
  }
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  if (!text) {
    const err = new Error(`${model}: empty response`);
    err.retryable = true;
    throw err;
  }
  return text;
}

// Parse a provider's output into {message, subject, cta} — lenient: strips fences,
// tries strict JSON, then regex extraction, then truncated-message, then plain text.
function parseAI(text) {
  let cleaned = String(text || '').trim();
  if (!cleaned) return null;
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try { parsed = JSON.parse(m[0]); } catch {}
    }
  }
  let fw = '';
  if (!parsed || !parsed.message) {
    try {
      if (cleaned.startsWith('{') && cleaned.includes('"message"') && !cleaned.includes('"subject"')) {
        const m2 = cleaned.match(/"message"\s*:\s*"([\s\S]*)/);
        if (m2) {
          let partial = m2[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\//g, '/');
          partial = partial.replace(/\\$/, "").replace(/"\s*[,}]?\s*$/, "");
          if (partial.length > 20) { parsed = { message: truncateToSentence(partial.slice(0, 2000)), subject: 'Outreach', cta: '' }; fw = 'truncated'; }
        }
      }
      const msgM = cleaned.match(/"message"\s*:\s*"([\s\S]*?)"\s*,\s*"subject"/);
      const subjM = cleaned.match(/"subject"\s*:\s*"([^"]*)"/);
      const ctaM = cleaned.match(/"cta"\s*:\s*"([^"]*)"/);
      if (msgM && msgM[1]) {
        const rawMsg = msgM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\//g, '/');
        parsed = { message: rawMsg, subject: subjM ? subjM[1] : '', cta: ctaM ? ctaM[1] : '' };
      }
    } catch {}
  }
  if (!parsed || !parsed.message) {
    if (cleaned.length > 20 && !cleaned.includes('"message"')) {
      const lines = cleaned.split('\n').map(v => v.trim()).filter(Boolean);
      const msg = cleaned.replace(/^```[\s\S]*?```/g, '').trim() || String(text).trim();
      if (msg.length > 20) parsed = { message: msg.slice(0, 2000), subject: lines[0]?.slice(0, 80) || 'Outreach', cta: msg.split('?')[0].split('.').pop()?.trim().slice(0, 120) || '' };
    }
  }
  if (!parsed || !parsed.message) return null;
  return { parsed, fw };
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  cors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed, use POST' });
  }

  const t0 = Date.now();
  console.log('[outreach] handler version v2.17-multiai-chain');

  const hasAnyKey = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY'].some(k => process.env[k]);
  if (!hasAnyKey) {
    return json(res, 503, { error: 'No AI provider key configured (GEMINI_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY)', code: 'NO_KEY' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON body' }); }
  }
  if (!body || typeof body !== 'object') return json(res, 400, { error: 'Missing JSON body' });

  const lead = body.lead;
  const language = body.language;
  const tone = body.tone;
  const offer = body.offer;

  if (!lead || typeof lead !== 'object') return json(res, 400, { error: 'Missing lead object' });
  if (!lead.name) return json(res, 400, { error: 'lead.name is required' });
  if (!['ar','fr','en'].includes(language)) return json(res, 400, { error: 'language must be ar|fr|en' });
  if (!['friendly','professional','direct'].includes(tone)) return json(res, 400, { error: 'tone must be friendly|professional|direct' });
  if (!['free_audit','landing_redesign','consultation','followup_gentle','followup_final'].includes(offer)) return json(res, 400, { error: 'offer must be free_audit|landing_redesign|consultation|followup_gentle|followup_final' });

  const vertInfo = (lead.vertical && VERTICAL_LABELS[lead.vertical]) || null;
  const audience = vertInfo ? vertInfo.audience : 'customers';
  const vertLabel = vertInfo ? vertInfo.label : (lead.profession || 'local business');
  const ratingStr = lead.rating ? `${lead.rating}★${lead.reviews ? ` (${lead.reviews} reviews)` : ''}` : '';
  const usp = (lead.analysis && (lead.analysis.selectedUSP || (lead.analysis.usps && lead.analysis.usps[0]))) || '';
  const services = (lead.analysis && lead.analysis.services) || [];

  const offerText = (OFFER_MAP[offer] && OFFER_MAP[offer][language]) || OFFER_MAP[offer].en;
  const toneText = (TONE_MAP[tone] && TONE_MAP[tone][language]) || TONE_MAP[tone].en;
  const isFollowup = offer === 'followup_gentle' || offer === 'followup_final';
  const isFinal = offer === 'followup_final';

  __ctx = { lead, language, tone, offer, vertInfo, audience, vertLabel, ratingStr, usp, services, offerText, toneText, isFollowup, isFinal };

  function staticFallback() {
    const cityPart = lead.city ? (language==='fr' ? ` à ${lead.city}` : language==='ar' ? ` في ${lead.city}` : ` in ${lead.city}`) : '';
    const audL10n = (AUDIENCE_L10N[language] && AUDIENCE_L10N[language][audience]) || audience;
    const ratingPart = lead.rating ? `${lead.rating}★` : '';
    const reviewsPart = lead.reviews ? ` (${lead.reviews} ${language==='fr' ? 'avis' : language==='ar' ? 'تقييم' : 'reviews'})` : '';
    const ratingPhrase = ratingPart ? `${ratingPart}${reviewsPart}${cityPart}` : (usp ? `"${usp}"` : cityPart || vertLabel);
    let msg, subj, cta;
    if (isFinal) {
      if (language === 'fr') {
        msg = `Bonjour ${lead.name}, juste un dernier petit message pour clôturer la boucle 🙏 Si ce n'est pas le bon moment, je ferme votre dossier pour maintenant — pas de pression. Si jamais vous changez d'avis sur ${offerText}, ma porte reste ouverte. Je clôture votre dossier pour l'instant ?\n{{YOUR_NAME}}`;
        subj = `Dernier message pour ${lead.name}`;
        cta = `Je clôture votre dossier pour l'instant ?`;
      } else if (language === 'ar') {
        msg = `مرحبا ${lead.name}، رسالة أخيرة فقط لإغلاق الملف 🙏 إذا لم يكن الوقت مناسباً سأغلق ملفكم الآن — دون أي ضغط. وإذا تغير رأيكم حول ${offerText}، الباب يبقى مفتوحاً. هل أغلق ملفكم في الوقت الحالي؟\n{{YOUR_NAME}}`;
        subj = `رسالة أخيرة لـ ${lead.name}`;
        cta = `هل أغلق ملفكم في الوقت الحالي؟`;
      } else {
        msg = `Hi ${lead.name}, just one last message to close the loop 🙏 If the timing isn't right I'll close your file for now — no pressure at all. If you ever change your mind about ${offerText}, the door stays open. Should I close your file for now?\n{{YOUR_NAME}}`;
        subj = `Last message for ${lead.name}`;
        cta = `Should I close your file for now?`;
      }
    } else if (isFollowup) {
      if (language === 'fr') {
        msg = `Bonjour ${lead.name} ! 👋 Juste un petit suivi de mon message d'il y a 2 jours. Un nouvel angle qui pourrait vous intéresser : ${ratingPart ? `avec votre ${ratingPhrase}` : usp ? `"${usp}"` : 'valeur clé'}, ${offerText} pourrait faire une vraie différence pour vos ${audL10n}. Toujours intéressé ?\n{{YOUR_NAME}}`;
        subj = `Suivi pour ${lead.name}`;
        cta = `Toujours intéressé ?`;
      } else if (language === 'ar') {
        msg = `مرحبا ${lead.name} ! 👋 متابعة بسيطة لرسالتي من قبل يومين. زاوية جديدة قد تهمكم: ${ratingPart ? `بتقييمكم ${ratingPhrase}` : usp ? `"${usp}"` : 'قيمتكم الأساسية'}، ${offerText} يمكن أن يصنع فرقاً حقيقياً لـ ${audL10n} لديكم. هل ما زلتم مهتمين؟\n{{YOUR_NAME}}`;
        subj = `متابعة لـ ${lead.name}`;
        cta = `هل ما زلتم مهتمين؟`;
      } else {
        msg = `Hi ${lead.name} ! 👋 Just following up on my message from 2 days ago. One new angle that might interest you: ${ratingPart ? `with your ${ratingPhrase}` : usp ? `"${usp}"` : 'your core value'}, ${offerText} could make a real difference for your ${audL10n}. Still interested ?\n{{YOUR_NAME}}`;
        subj = `Follow-up for ${lead.name}`;
        cta = `Still interested ?`;
      }
    } else if (language === 'fr') {
      msg = `Bonjour ${lead.name} ! 👋 Félicitations pour votre note de ${ratingPhrase} ! Beaucoup de ${audL10n} vous cherchent sans vous trouver face à des concurrents plus visibles. Nous proposons ${offerText}. Intéressé par un créneau cette semaine ?\n{{YOUR_NAME}}`;
      subj = `Audit gratuit pour ${lead.name}`;
      cta = `Intéressé par un créneau cette semaine ?`;
    } else if (language === 'ar') {
      msg = `مرحبا ${lead.name} ! 👋 مبروك على تقييم ${ratingPhrase} ! الكثير من ${audL10n} يبحثون عنكم دون أن يجدوكم بسبب المنافسة. نقترح ${offerText}. هل نحدد موعداً هذا الأسبوع؟\n{{YOUR_NAME}}`;
      subj = `عرض مجاني لـ ${lead.name}`;
      cta = `هل نحدد موعداً هذا الأسبوع؟`;
    } else {
      msg = `Hi ${lead.name} ! 👋 Congrats on your ${ratingPhrase} ! Many potential ${audL10n} can't find you while more visible competitors win them over. We offer ${offerText}. Shall we schedule a call this week?\n{{YOUR_NAME}}`;
      subj = `Quick win for ${lead.name}`;
      cta = `Shall we schedule a call this week?`;
    }
    const fin = { message: normalizeNewlines(msg), subject: subj, cta };
    if (language === 'fr' && frEnglishLint(fin.message)) fin.fallbackWarning = 'template quality issue';
    return fin;
  }

  // simple in-memory circuit breaker: if >3 failures in 60s, skip AI entirely
  global.__outreachCB = global.__outreachCB || { fails: [], openUntil: 0 };
  if (Date.now() < global.__outreachCB.openUntil) {
    console.log('[outreach] circuit open — fallback now');
    const fb = staticFallback(); return json(res, 200, { ...fb, provider: 'template', model: 'template', fallback: true, attempts: 0, note: 'All AI providers unavailable — using template (circuit open)' });
  }
  let lastErr = '';

  const GLOBAL_BUDGET = 30000;
  let attempts = 0;

  for (const entry of FALLBACK_CHAIN) {
    if (!process.env[PROVIDER_KEY[entry.provider]]) {
      console.log(`[outreach] skip ${entry.provider}/${entry.model} (no ${PROVIDER_KEY[entry.provider]})`);
      continue;
    }
    for (let a = 0; a < entry.retries; a++) {
      attempts++;
      if (Date.now() - t0 > GLOBAL_BUDGET) {
        console.log('[outreach] global time budget exceeded — using template now');
        const fb = staticFallback();
        return json(res, 200, { ...fb, provider: 'template', model: 'template', fallback: true, attempts, note: 'time budget exceeded — using template' });
      }
      try {
        let content, model;
        if (entry.provider === 'gemini') {
          content = await callGemini(entry.model);
          model = entry.model;
        } else if (entry.provider === 'groq') {
          const r = await generateWithGroq(USER_PROMPT, language);
          content = r.content;
          model = r.model;
        } else {
          const r = await generateWithOpenRouter(USER_PROMPT, language);
          content = r.content;
          model = r.model;
        }
        const out = parseAI(content);
        if (!out || !out.parsed) {
          lastErr = `${entry.provider}/${model} attempt ${a+1}: unparseable output`;
          console.log(`[outreach] ${lastErr}: ${String(content).slice(0, 300)}`);
          if (a < entry.retries - 1) { await sleep(RETRY_DELAYS[Math.min(a, 2)]); continue; }
          break;
        }
        console.log(`[outreach] SUCCESS provider=${entry.provider} model=${model} attempts=${attempts} lead=${lead.name}`);
        return json(res, 200, {
          message: signatureGuard(out.parsed.message),
          subject: String(out.parsed.subject || '').trim(),
          cta: String(out.parsed.cta || '').trim(),
          provider: entry.provider,
          model,
          fallback: false,
          ...(out.fw ? { fallbackWarning: out.fw } : {}),
          attempts,
        });
      } catch (e) {
        lastErr = `${entry.provider}/${entry.model} attempt ${a+1}: ${e.message}`;
        console.log(`[outreach] ${lastErr}`);
        if (e && e.notAvailable) {
          console.log(`[outreach] model ${entry.model} not available, switching provider`);
          break;
        }
        if (e && e.retryable) {
          global.__outreachCB.fails.push(Date.now());
          global.__outreachCB.fails = global.__outreachCB.fails.filter(ts => Date.now() - ts < 60000);
          if (global.__outreachCB.fails.length >= 5) { global.__outreachCB.openUntil = Date.now() + 30000; console.log('[outreach] circuit tripped 5 fails/60s — open 30s'); }
        }
        if (a < entry.retries - 1) { await sleep(RETRY_DELAYS[Math.min(a, 2)]); continue; }
        break;
      }
    }
  }

  // All AI providers failed — static template fallback (never a raw 503)
  const fb = staticFallback();
  console.log(`[outreach] all providers failed (${lastErr}), attempts=${attempts} — static fallback lang=${language} vertical=${lead.vertical || vertLabel}`);
  return json(res, 200, { ...fb, provider: 'template', model: 'template', fallback: true, attempts, note: 'All AI providers unavailable — using template' });
};
