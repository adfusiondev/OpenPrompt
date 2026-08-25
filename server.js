/**
 * OpenPrompt local proxy server.
 *
 * Keeps upstream API keys off the browser: the frontend (index.html) calls
 * these /api/* endpoints and this server attaches the keys from .env.
 * Run:  npm install && npm start   (defaults to http://localhost:3000)
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const UPSTREAM_TIMEOUT = 15000;   // ms for normal upstream calls
const GEMINI_TIMEOUT = 30000;     // ms — Gemini can be slow
const UNSHORTEN_TIMEOUT = 8000;   // ms — redirect chains should be quick
const UA = 'Mozilla/5.0 (compatible; OpenPromptProxy/1.0)';

// CORS: restrict to ALLOWED_ORIGIN when set (comma-separated list),
// otherwise reflect any origin so file:// pages work during local dev.
const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json({ limit: '1mb' }));

function fail(res, status, message, code) {
  return res.status(status).json({ error: message, ...(code ? { code } : {}) });
}

function assertHttpUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  return u;
}

// Only resolve short/canonical Google Maps links through the proxy.
function isMapsHost(hostname) {
  const h = hostname.toLowerCase();
  return h === 'maps.app.goo.gl' ||
         h === 'goo.gl' ||
         /^maps\.google\.[a-z.]+$/.test(h);
}

/* ---------- health / key availability (used by Settings → Test connection) ---------- */
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'openprompt-proxy',
    keys: {
      serpapi: Boolean(process.env.SERPAPI_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
      jina: Boolean(process.env.JINA_API_KEY)
    }
  });
});

/* ---------- GET /api/unshorten?url=<maps short url> ----------
   Follows redirects server-side and returns the final canonical URL.
   Avoids CORS entirely (browsers cannot follow cross-origin redirects). */
app.get('/api/unshorten', async (req, res) => {
  const u = assertHttpUrl(req.query.url);
  if (!u) return fail(res, 400, 'Missing or invalid ?url= parameter');
  if (!isMapsHost(u.hostname)) return fail(res, 400, 'Only Google Maps URLs are supported');

  try {
    const r = await axios.get(u.href, {
      maxRedirects: 5,
      timeout: UNSHORTEN_TIMEOUT,
      responseType: 'stream',
      headers: { 'User-Agent': UA }
    });
    // follow-redirects exposes the final URL on the underlying response
    const finalUrl = (r.request && r.request.res && r.request.res.responseUrl) || '';
    r.data.destroy(); // we only needed the redirect chain, not the body
    res.json({ ok: true, url: finalUrl || u.href });
  } catch (e) {
    if (e.response && e.response.data && e.response.data.destroy) e.response.data.destroy();
    fail(res, 502, 'Could not resolve URL: ' + e.message, 'UNSHORTEN_FAILED');
  }
});

/* ---------- GET /api/serpapi?<serp params> ----------
   Forwards whitelisted query params to serpapi.com and injects SERPAPI_KEY.
   The browser never sees the key. */
const SERP_ALLOWED = ['engine', 'type', 'place_id', 'll', 'q', 'hl', 'google_domain'];
app.get('/api/serpapi', async (req, res) => {
  const key = process.env.SERPAPI_KEY;
  if (!key) return fail(res, 503, 'SERPAPI_KEY not configured on the proxy server (.env)', 'NO_KEY');

  const params = {};
  for (const k of SERP_ALLOWED) {
    const v = req.query[k];
    if (v != null && v !== '') params[k] = String(v);
  }
  if (Object.keys(params).length === 0) return fail(res, 400, 'Missing SerpAPI query parameters');
  params.api_key = key;

  try {
    const r = await axios.get('https://serpapi.com/search.json', { params, timeout: UPSTREAM_TIMEOUT });
    res.json(r.data);
  } catch (e) {
    if (e.response) {
      const msg = (e.response.data && e.response.data.error) || ('HTTP ' + e.response.status);
      return fail(res, e.response.status === 401 ? 401 : 502, 'SerpAPI error: ' + msg);
    }
    fail(res, 502, 'SerpAPI request failed: ' + e.message);
  }
});

/* ---------- POST /api/jina  body: {"url": "https://..."} ----------
   Server-side r.jina.ai reader. Attaches JINA_API_KEY when configured
   (r.jina.ai now rejects many keyless requests). */
app.post('/api/jina', async (req, res) => {
  const u = assertHttpUrl((req.body || {}).url);
  if (!u) return fail(res, 400, 'Body must be JSON: {"url": "https://..."}');

  const headers = { 'User-Agent': UA };
  if (process.env.JINA_API_KEY) headers.Authorization = 'Bearer ' + process.env.JINA_API_KEY;

  try {
    const r = await axios.get('https://r.jina.ai/' + u.href, {
      headers,
      timeout: UPSTREAM_TIMEOUT,
      responseType: 'text'
    });
    res.type('text/plain').send(typeof r.data === 'string' ? r.data : String(r.data));
  } catch (e) {
    const status = e.response ? e.response.status : undefined;
    let msg = 'Jina reader failed' + (status ? ' (HTTP ' + status + ')' : '') + ': ' + e.message;
    if (status === 401 && !process.env.JINA_API_KEY) msg += ' — set JINA_API_KEY in .env';
    fail(res, status && status >= 400 && status < 500 ? status : 502, msg, 'UPSTREAM_ERROR');
  }
});

/* ---------- POST /api/gemini  body: {"model": "...", "payload": {...}} ----------
   Relays generateContent calls with GEMINI_API_KEY attached. Upstream HTTP
   status is relayed verbatim so the client's model-fallback chain keeps
   working (it advances to the next model on 404/"not available"). */
app.post('/api/gemini', async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail(res, 503, 'GEMINI_API_KEY not configured on the proxy server (.env)', 'NO_KEY');

  const { model, payload } = req.body || {};
  if (!model || typeof model !== 'string' || !/^[\w.\-]+$/.test(model)) {
    return fail(res, 400, 'Body must be JSON: {"model": "...", "payload": {...}}');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return fail(res, 400, 'Missing Gemini payload object');
  }

  try {
    const r = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/' +
        encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(key),
      payload,
      { timeout: GEMINI_TIMEOUT, validateStatus: () => true, headers: { 'Content-Type': 'application/json' } }
    );
    res.status(r.status).json(r.data);
  } catch (e) {
    fail(res, 502, 'Gemini request failed: ' + e.message, 'UPSTREAM_ERROR');
  }
});

app.listen(PORT, () => {
  console.log('[openprompt-proxy] listening on http://localhost:' + PORT);
  console.log('[openprompt-proxy] keys configured:', {
    SERPAPI_KEY: Boolean(process.env.SERPAPI_KEY),
    GEMINI_API_KEY: Boolean(process.env.GEMINI_API_KEY),
    JINA_API_KEY: Boolean(process.env.JINA_API_KEY)
  });
});
