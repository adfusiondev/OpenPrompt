# AGENTS.md

OpenPrompt — a lead-gen tool that extracts real clinic data from Google Maps URLs and generates landing-page/identity/outreach prompts. Entire app lives in **one file**: `index.html` (inline CSS + inline JS). No framework, no build step, no dependencies by design ("HTML + Vanilla JS" stack).

## Run / verify

- Open `index.html` directly in a browser (works from `file://`). No server, install, or build needed.
- There are no tests, linters, or CI. Manual verification = open the page, walk the 5-step flow, use the ⚙ Settings "Test key" buttons for each API.
- Do not add Node/package tooling unless asked — `.gitignore` explicitly reserves `node_modules/` as "if added later".

## Gotchas inside index.html

- All state is module-level globals: `client`, `options`, `lastPrompts`, `currentTab`, `currentId`. The 5 UI steps are sections `#s0`–`#s4` toggled via `go(n)`; adding a step means touching `go()`, `STEPS`, and the section markup together.
- All Gemini traffic must go through `callGemini()` (single entry point with the `GEMINI_MODELS` fallback chain: gemini-3.6-flash → gemini-flash-latest → gemini-2.5-flash; retries next model only on 404/"not available"). Don't call the Gemini REST endpoint directly from call sites.
- localStorage keys are versioned: `op_history_v1` (LS_H), `op_settings_v1` (LS_S). Bump the version suffix when changing the stored shape, or users get stale/crashing saved data. Legacy `pc_history_v1`/`pc_settings_v5` are auto-migrated once on load by `migrateLegacyKeys()`.
- SerpAPI has no CORS support — calls go through a fallback chain of public proxies (corsproxy.io → allorigins → codetabs) in `extractSerpAPI`. Keep that chain intact; Google CSE, Gemini, and Jina are called directly.
- Extraction pipeline order is SerpAPI → Google CSE → Jina → Gemini, each layer skipped once its target fields are filled, under a 45s total deadline (`deadline`/`outOfTime` in `analyze()`). Merging uses `mergeData`: only non-empty values overwrite. Preserve these semantics when refactoring.
- Profession detection (`PROF_CATS`/`detectProfessionId`) pre-fills the profession field after extraction and drives the per-specialty services hint in `buildPrompts()`. Keep dental/beauty/etc. ordered before the generic `medical` catch-all regex.
- Short `maps.app.goo.gl` URLs are resolved by `resolveShortUrl()` (called at the top of `analyze()` before parsing; Jina first, then proxy fallbacks scanning for a canonical maps URL); `parseMapsUrl` pulls placeId/coords/name/cid out of long Maps URLs and feeds every layer — changes there affect all extraction paths.
- `extractGeminiAI()` normalizes Gemini's response key `profession` to the app's `prof` (`normalizeGeminiKeys`) — never read raw Gemini JSON into `mergeData` without it.
- `isJunkUrl()` is the single gate for rejecting google./goo.gl/gstatic./ggpht. URLs in the website field — use it instead of ad-hoc `includes()` checks.
- r.jina.ai now 401s many keyless requests. Both Jina call sites send `Authorization: Bearer` when optional `op_settings_v1.jinaKey` is set (`jinaHeaders()`); short-URL resolution falls back to public proxies scanning for a canonical maps URL. All layers must keep failing gracefully (logged warn + pipeline continues).

## Conventions

- README.md is bilingual, Arabic-first. Match that style when updating docs.
- Never commit real API keys; users enter keys at runtime (Settings → localStorage). `.gitignore` blocks `secrets.json` / `config.local.json`.
