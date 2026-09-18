// api/generate-outreach.js — Vercel Serverless Function
// POST { lead, language, tone, offer } → { message, subject, cta }
// Uses GEMINI_API_KEY (same key as /api/gemini proxy). No new env vars.

const ALLOWED_ORIGINS = [
  'https://leadgenhubai.vercel.app',
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

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  cors(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed, use POST' });
  }

  console.log('[outreach] handler version 3df478a-fallback-v2');
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return json(res, 503, { error: 'GEMINI_API_KEY not configured', code: 'NO_KEY' });
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
  if (!['free_audit','landing_redesign','consultation'].includes(offer)) return json(res, 400, { error: 'offer must be free_audit|landing_redesign|consultation' });

  const vertInfo = (lead.vertical && VERTICAL_LABELS[lead.vertical]) || null;
  const audience = vertInfo ? vertInfo.audience : 'customers';
  const vertLabel = vertInfo ? vertInfo.label : (lead.profession || 'local business');
  const ratingStr = lead.rating ? `${lead.rating}★${lead.reviews ? ` (${lead.reviews} reviews)` : ''}` : '';
  const usp = (lead.analysis && (lead.analysis.selectedUSP || (lead.analysis.usps && lead.analysis.usps[0]))) || '';
  const services = (lead.analysis && lead.analysis.services) || [];

  const offerText = (OFFER_MAP[offer] && OFFER_MAP[offer][language]) || OFFER_MAP[offer].en;
  const toneText = (TONE_MAP[tone] && TONE_MAP[tone][language]) || TONE_MAP[tone].en;

  // Build system prompt per spec
  const systemPrompt = `You are an expert WhatsApp direct-response copywriter for local businesses in Morocco.

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

CRITICAL MESSAGE RULES (must follow exactly):
1. 60-90 words total — concise, scannable WhatsApp message.
2. Opener MUST cite ONE specific fact about the business: either its rating/reviews count (${ratingStr || 'or USP'}) or its top USP ("${usp || 'top service'}"). Do not be generic.
3. Include ONE pain hint relevant to the ${vertLabel} vertical and its ${audience} (e.g. losing ${audience} to more visible competitors).
4. Present ONE clear offer: ${offerText}.
5. End with exactly ONE question CTA (e.g. "Shall we schedule it this week?" / "On cale un créneau cette semaine ?" / "هل نحدد موعداً هذا الأسبوع؟").
6. Max 2 emojis total.
7. No hashtags.
8. End with signature placeholder on its own line: {{YOUR_NAME}}
9. Do not add subject line inside the message body.

OUTPUT: Return ONLY valid JSON (no markdown, no code fence) with exactly 3 keys:
{
  "message": "the WhatsApp message text (with line breaks as \\n)",
  "subject": "short subject line for CRM (5-8 words, same language as message)",
  "cta": "the question CTA alone (e.g. Shall we schedule a call?)"
}
Make sure the JSON is valid and all strings are properly escaped.`;

  const GEMINI_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest'];
  const RETRY_DELAYS = [2000, 5000, 10000]; // per-model exponential backoff
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  let lastErr = '';
  let lastStatus = 502;

  function staticFallback() {
    const cityPart = lead.city ? (language==='fr' ? ` à ${lead.city}` : language==='ar' ? ` في ${lead.city}` : ` in ${lead.city}`) : '';
    const ratingPart = lead.rating ? `${lead.rating}★` : '';
    const reviewsPart = lead.reviews ? ` (${lead.reviews} ${language==='fr' ? 'avis' : language==='ar' ? 'تقييم' : 'reviews'})` : '';
    const ratingPhrase = ratingPart ? `${ratingPart}${reviewsPart}${cityPart}` : (usp ? `"${usp}"` : cityPart || vertLabel);
    // offerText already localized
    let msg, subj, cta;
    if (language === 'fr') {
      msg = `Bonjour ${lead.name} ! 👋 Félicitations pour votre note de ${ratingPhrase} ! Beaucoup de ${audience} vous cherchent sans vous trouver face à des concurrents plus visibles. Nous proposons ${offerText}. Intéressé par un créneau cette semaine ?\n{{YOUR_NAME}}`;
      subj = `Audit gratuit pour ${lead.name}`;
      cta = `Intéressé par un créneau cette semaine ?`;
    } else if (language === 'ar') {
      msg = `مرحبا ${lead.name} ! 👋 مبروك على تقييم ${ratingPhrase} ! الكثير من ${audience} يبحثون عنكم دون أن يجدوكم بسبب المنافسة. نقترح ${offerText}. هل نحدد موعداً هذا الأسبوع؟\n{{YOUR_NAME}}`;
      subj = `عرض مجاني لـ ${lead.name}`;
      cta = `هل نحدد موعداً هذا الأسبوع؟`;
    } else {
      msg = `Hi ${lead.name} ! 👋 Congrats on your ${ratingPhrase} ! Many potential ${audience} can't find you while more visible competitors win them over. We offer ${offerText}. Shall we schedule a call this week?\n{{YOUR_NAME}}`;
      subj = `Quick win for ${lead.name}`;
      cta = `Shall we schedule a call this week?`;
    }
    return { message: msg, subject: subj, cta };
  }

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
    try {
      console.log(`[outreach] attempt model=${model} try=${attempt+1}/3 lead=${lead.name} lang=${language}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        const t = typeof data === 'string' ? data : JSON.stringify(data || {});
        lastErr = `${model} attempt ${attempt+1}: HTTP ${r.status} — ${t.slice(0, 400)}`;
        lastStatus = r.status;
        console.log(`[outreach] ${lastErr}`);
        if (r.status === 503 && data && data.code === 'NO_KEY') {
          return json(res, 503, { error: 'GEMINI_API_KEY missing', code: 'NO_KEY' });
        }
        const isRetryable = r.status === 429 || r.status === 503 || r.status === 502 || r.status === 500;
        const isFallbackable = r.status === 404 || /not found|not available|unsupported|deprecated/i.test(t);
        if (isFallbackable) {
          console.log(`[outreach] model ${model} not available, switching model`);
          break;
        }
        if (isRetryable && attempt < 2) {
          const d = RETRY_DELAYS[attempt] || 5000;
          console.log(`[outreach] retryable ${r.status}, waiting ${d}ms before retry`);
          await sleep(d);
          continue;
        }
        if (isRetryable) {
          // exhausted retries for this model, try next model
          console.log(`[outreach] retries exhausted for ${model}, trying next model`);
          break;
        }
        break;
      }

      // Extract text
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      if (!text) {
        lastErr = `${model} attempt ${attempt+1}: empty response`;
        console.log(`[outreach] ${lastErr}`);
        if (attempt < 2) { await sleep(RETRY_DELAYS[attempt]); continue; }
        break;
      }

      // Try to parse JSON from text (strip fences if any)
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/,'').trim();
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
      // Lenient fallback: extract fields via regex if strict JSON failed (handles unescaped newlines)
      if (!parsed || !parsed.message) {
        try {
          // Handle truncated JSON (message string cut off before closing ")
          let truncated = false;
          if (cleaned.startsWith("{") && cleaned.includes("\"message\"") && !cleaned.includes("\"subject\"")) {
            // truncated mid-message: extract what we have
            const m2 = cleaned.match(/"message"\s*:\s*"([\s\S]*)/);
            if (m2) {
              let partial = m2[1].replace(/\n/g, "\n").replace(/\\"/g, '"').replace(/\\\//g, '/');
              // trim trailing incomplete escape
              partial = partial.replace(/\\$/,"").replace(/"\s*[,}]?\s*$/,"");
              if (partial.length > 20) parsed = { message: partial.slice(0,2000).trim() + (partial.length>10?"...":""), subject: "Outreach — " + (cleaned.match(/"subject"/) ? "" : "Free audit"), cta: "" };
            }
          }
          const msgM = cleaned.match(/"message"\s*:\s*"([\s\S]*?)"\s*,\s*"subject"/);
          const subjM = cleaned.match(/"subject"\s*:\s*"([^"]*)"/);
          const ctaM = cleaned.match(/"cta"\s*:\s*"([^"]*)"/);
          if (msgM && msgM[1]) {
            // unescape \n and \"
            const rawMsg = msgM[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\//g, '/');
            parsed = { message: rawMsg, subject: subjM ? subjM[1] : '', cta: ctaM ? ctaM[1] : '' };
          }
        } catch {}
      }
      if (!parsed || !parsed.message) {
        // Ultimate fallback: Gemini returned plain text, treat whole text as message
        if (cleaned.length > 20 && !cleaned.includes('"message"')) {
          const lines = cleaned.split('\n').map(v=>v.trim()).filter(Boolean);
          const msg = cleaned.replace(/^```[\s\S]*?```/g,'').trim() || text.trim();
          if (msg.length > 20) parsed = { message: msg.slice(0, 2000), subject: lines[0]?.slice(0, 80) || 'Outreach', cta: msg.split('?')[0].split('.').pop()?.trim().slice(0,120) || '' };
        }
        if (!parsed || !parsed.message) {
          lastErr = `${model} attempt ${attempt+1}: could not parse JSON from: ${text.slice(0, 800)}`;
          console.log(`[outreach] ${lastErr}`);
          if (attempt < 2) { await sleep(RETRY_DELAYS[attempt]); continue; }
          break;
        }
      }

      // Success
      return json(res, 200, {
        message: String(parsed.message).trim(),
        subject: String(parsed.subject || '').trim(),
        cta: String(parsed.cta || '').trim(),
      });
    } catch (e) {
      lastErr = `${model} attempt ${attempt+1}: ${e.message}`;
      lastStatus = 502;
      console.log(`[outreach] exception ${lastErr}`);
      if (attempt < 2) { await sleep(RETRY_DELAYS[attempt]); continue; }
      break;
    }
    } // end attempt loop
  }

  // All Gemini attempts failed — static fallback (never a raw 503)
  const fb = staticFallback();
  console.log(`[outreach] all Gemini models failed (${lastErr}), using static fallback lang=${language} vertical=${lead.vertical || vertLabel}`);
  return json(res, 200, { ...fb, fallback: true, note: 'Gemini unavailable — using template' });
};
