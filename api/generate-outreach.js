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
  let lastErr = '';
  let lastStatus = 502;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 600 },
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        const t = typeof data === 'string' ? data : JSON.stringify(data || {});
        lastErr = `${model}: HTTP ${r.status} — ${t.slice(0, 400)}`;
        lastStatus = r.status;
        const isFallbackable = r.status === 404 || r.status === 429 ||
          (r.status === 503 && /high demand|overload|resource exhausted|temporarily unavailable/i.test(t)) ||
          /not found|not available|unsupported|deprecated/i.test(t);
        if (r.status === 503 && data && data.code === 'NO_KEY') {
          return json(res, 503, { error: 'GEMINI_API_KEY missing', code: 'NO_KEY' });
        }
        if (isFallbackable) continue;
        break;
      }

      // Extract text
      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
      if (!text) {
        lastErr = `${model}: empty response`;
        continue;
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
        // Try to extract JSON object
        const m = cleaned.match(/\{[\s\S]*\}/);
        if (m) {
          try { parsed = JSON.parse(m[0]); } catch {}
        }
      }
      if (!parsed || !parsed.message) {
        lastErr = `${model}: could not parse JSON from: ${text.slice(0, 300)}`;
        continue;
      }

      // Success
      return json(res, 200, {
        message: String(parsed.message).trim(),
        subject: String(parsed.subject || '').trim(),
        cta: String(parsed.cta || '').trim(),
      });
    } catch (e) {
      lastErr = `${GEMINI_MODELS[0]}: ${e.message}`;
      lastStatus = 502;
      break;
    }
  }

  return json(res, lastStatus === 404 ? 502 : lastStatus, { error: lastErr || 'Gemini request failed' });
};
