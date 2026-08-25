# AGENTS.md

OpenPrompt — a lead-gen tool that extracts real clinic data from Google Maps URLs and generates landing-page/identity/outreach prompts. Two components:

- `index.html` — the entire UI (inline CSS + inline JS, Dark Terminal style). No framework, no build step. Opens from `file://`.
- `server.js` — local Node.js + Express proxy (`npm start`, default port 3000). Holds all upstream API keys in `.env`; the browser never sees them.

## Run / verify

- Backend first: `npm install && npm start` (needs Node ≥ 18; keys optional per-layer but at least SerpAPI or Gemini makes extraction useful).
- Then open `index.html` in a browser (works from `file://`). ⚙ Settings auto-runs "Test connection" against `/api/health` and shows which keys the server has.
- There are no tests, linters, or CI. Manual verification = walk the 5-step flow with a Maps URL (e.g. `https://maps.app.goo.gl/W2fnE58QHCoc5A4N8`) and read the live log.
- Playwright was used for ad-hoc E2E checks during development (mocked `/api/*` fetch layer); it is NOT a repo dependency — don't add test tooling unless asked.

## Proxy API contract (server.js)

| Route | Contract |
|---|---|
| `GET /api/health` | `{ ok, service, keys: { serpapi, gemini, jina } }` |
| `GET /api/unshorten?url=` | Follows redirects server-side (Maps-host allowlist), returns `{ ok, url }` with the final canonical URL |
| `GET /api/serpapi?<params>` | Whitelisted params (`engine,type,place_id,ll,q,hl,google_domain`) forwarded to serpapi.com with `SERPAPI_KEY` injected; upstream errors surface as `{ error }` with 401/502 |
| `POST /api/jina` `{ targetUrl }` | GET r.jina.ai/<url>; adds `Authorization: Bearer` when `JINA_API_KEY` set; returns plain text |
| `POST /api/gemini` `{ model, prompt }` | Relays to generateContent with `GEMINI_API_KEY`; `prompt` may be a string (wrapped into contents) or a full request body; **upstream HTTP status is relayed verbatim** so client model-fallback keeps working |

Missing key ⇒ `503 { error, code: "NO_KEY" }`. All errors use `{ error }` envelopes.

## Gotchas inside index.html

- All state is module-level globals: `client`, `options`, `lastPrompts`, `currentTab`, `currentId`. The 5 UI steps are sections `#s0`–`#s4` toggled via `go(n)`; adding a step means touching `go()`, `STEPS`, and the section markup together.
- ALL third-party traffic must go through `apiFetch(path, opts, timeoutMs)` → `${apiBase()}/api/*`. Never call upstream hosts directly from feature code. Network failures come back as `{ ok:false, offline:true }`; log `proxyOfflineMsg()` ("⚠ Proxy backend offline (<base>). Ensure `npm start` is running.") for those.
- Settings shape is `{ proxyUrl, jina }` in `op_settings_v1` (LS_S); history is `op_history_v1` (LS_H) and its item shape is unchanged. Loads are tolerant (`||''` / `!==false` defaults) so no version bump is needed; saving replaces the old key-shaped blob entirely (deliberate: wipes leftover secrets from localStorage).
- All Gemini traffic goes through `callGemini(body, timeoutMs)` — no apiKey param anymore. It POSTs `{model, prompt}` to `/api/gemini` across the `GEMINI_MODELS` chain (gemini-3.6-flash → gemini-flash-latest → gemini-2.5-flash), advancing only on 404/"not available"; 503 NO_KEY returns immediately.
- Extraction pipeline order is SerpAPI (L1) → Jina (L3) → Gemini (L4). The old Layer 2 Google CSE was removed when the proxy landed — don't reintroduce direct-API layers. Each layer is skipped once its target fields are filled, under a 45s total deadline (`deadline`/`timeLeft`/`outOfTime` in `analyze()`). Merging uses `mergeData`: any non-empty value overwrites (later layers win). Preserve these semantics when refactoring.
- `analyze()` probes `/api/health` (2.5s budget) before anything else and gates each layer on `serverKeys.serpapi` / `serverKeys.gemini` (+ `s.jina !== false` for L3, which runs keyless if `JINA_API_KEY` isn't set on the proxy). If the backend is down it aborts early with an offline status line instead of running guaranteed-empty layers.
- Short `maps.app.goo.gl` URLs are resolved by `resolveShortUrl()`: proxy-first (`/api/unshorten`), then legacy fallback chain (r.jina.ai via `jinaHeaders()`, then public CORS proxies scanning for a canonical maps URL). Keep the fallbacks failing gracefully.
- `extractGeminiAI()` normalizes Gemini's response key `profession` to the app's `prof` (`normalizeGeminiKeys`) — never read raw Gemini JSON into `mergeData` without it.
- `isJunkUrl()` is the single gate for rejecting google./goo.gl/gstatic./ggpht. URLs in the website field — use it instead of ad-hoc `includes()` checks.
- Profession detection (`PROF_CATS`/`detectProfessionId`) pre-fills the profession field after extraction and drives the per-specialty services hint in `buildPrompts()`. Keep dental/beauty/etc. ordered before the generic `medical` catch-all regex.
- `parseMapsUrl` pulls placeId/coords/name/cid out of long Maps URLs and feeds every layer — changes there affect all extraction paths.

## Gotchas inside server.js

- Keys come only from env (`dotenv`): `PORT`, `ALLOWED_ORIGIN` (comma list; empty = reflect any origin so `file://` pages work), `SERPAPI_KEY`, `GEMINI_API_KEY`, `JINA_API_KEY`.
- `/api/unshorten` enforces a Google-Maps host allowlist — extend `isMapsHost()` before supporting other shorteners. It uses `responseType:'stream'` and destroys the body; keep that (redirect resolution shouldn't download pages).
- `/api/gemini` uses `validateStatus: () => true` on purpose — do not "fix" it into throwing on 404.
- CORS origin reflection (`origin: true`) is intentional for local dev/file:// usage; tighten via `ALLOWED_ORIGIN` when deploying.

## Conventions

- README.md is bilingual, Arabic-first. Match that style when updating docs.
- Never commit real API keys or `.env`; users configure keys server-side in `.env` (see `.env.example`). `.gitignore` blocks `.env`, `secrets.json`, `config.local.json`. `package-lock.json` IS committed — keep it in sync when bumping dependencies.
