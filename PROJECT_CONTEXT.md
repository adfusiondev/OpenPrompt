# PROJECT_CONTEXT — OpenPrompt

## Purpose

OpenPrompt is a lead-generation tool for landing-page design work. Paste a Google
Maps URL of a real business (clinic, salon, restaurant…), and the agent extracts
real business data, enriches it with AI-generated USPs and patient/customer
sentiment insights, then generates production-ready prompts:

1. **Landing Page Prompt** (with USP + insights injection)
2. **Visual Identity Prompt** (with USP injection)
3. **Outreach Message** (trilingual, with USP suffix)

Prompts can be copied or opened directly in external AI design tools
(Claude, ChatGPT, v0, Lovable, Bolt).

## Core Constraints (never break)

- **Single self-contained `index.html`** — inline CSS + inline vanilla JS.
  No framework, no build step, no npm dependencies in the frontend. Opens from `file://`.
- **Persistence: localStorage only** — `op_history_v1` (client history) and
  `op_settings_v1` (`{proxyUrl, jina}`). No new keys without a migration story;
  history items gain optional fields only (tolerant reads required).
- **Trilingual outputs** — UI is English-only; generated outputs support
  EN, AR-RTL, FR (+ FR/AR and FR/AR/EN combos) via `options.lang` branches in
  `buildPrompts()`. Injected AI content (USP/insights) is instruction text, never page copy.
- **Dark terminal style** (opencode.ai look), monospace accents.
- **API keys never in the browser** — keys live server-side in `.env`;
  the frontend only talks to the proxy's `/api/*` endpoints.

## Architecture Summary

### Components

| Component | Role |
|---|---|
| `index.html` | Entire UI + logic (module-level globals: `client`, `options`, `lastPrompts`, `currentTab`, `currentId`) |
| `server.js` | Local Node/Express proxy (`npm start`, port 3000). Injects `SERPAPI_KEY` / `GEMINI_API_KEY` / `JINA_API_KEY` from `.env`; relays upstream HTTP status verbatim |

### Extraction pipeline (in `analyze()`, 45s total deadline)

Multi-layer, each layer skipped once its target fields are filled:

1. **L1 — SerpAPI** (`extractSerpAPI`): place details / local search via proxy
2. **L3 — Jina Reader** (`extractJinaReader`): regex extraction from page text (keyless fallback)
3. **L4 — Gemini enrichment** (`extractGeminiAI`): structured JSON fill-in for missing fields

(Layer 2, Google CSE, was removed when the proxy landed — do not reintroduce direct-API layers.)

Post-pipeline AI enrichment (gated on `serverKeys.gemini` + time budget, never blocking):

- `generateUSP()` → `client.usps` (3 radio options in `#uspCard`)
- `generatePatientInsights()` → `client.insights` (strengths/concerns/keywords in `#insightsCard`)

### Gemini integration

- All Gemini traffic goes through `callGemini(body, timeoutMs)` → `POST /api/gemini`.
- Model fallback chain: `GEMINI_MODELS` = `gemini-3.6-flash` → `gemini-flash-latest` →
  `gemini-2.5-flash`; advances only on 404/"not available"; 503 `NO_KEY` returns immediately.
- JSON responses use `responseMimeType:'application/json'` + `JSON.parse` with
  `\{[\s\S]*\}` regex fallback (`extractGeminiAI` pattern).

### DOM-safe rendering

- USP radios and insight groups are built with `createElement` + `textContent`
  (never `innerHTML` with AI-generated strings) to avoid markup injection.
- Cards (`#uspCard`, `#insightsCard`) hide themselves on empty/failed state;
  every AI failure logs a warn line and never blocks the flow.

### Proxy API contract

| Route | Contract |
|---|---|
| `GET /api/health` | `{ ok, service, keys: { serpapi, gemini, jina } }` |
| `GET /api/unshorten?url=` | Maps-host allowlist, returns final canonical URL |
| `GET /api/serpapi?<params>` | Whitelisted params forwarded with `SERPAPI_KEY` |
| `POST /api/jina` `{targetUrl}` | r.jina.ai reader, bearer key when set |
| `POST /api/gemini` `{model, prompt}` | generateContent relay, upstream status verbatim |

Missing key ⇒ `503 { error, code: "NO_KEY" }`. All errors use `{ error }` envelopes.

## See also

- `MASTER_PLAN.md` — phased roadmap (AR-first, bilingual)
- `P0_IMPLEMENTATION_SPEC.md` — line-level spec for the P0 feature set
- `AGENTS.md` — agent-facing conventions and gotchas
