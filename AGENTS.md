# AGENTS.md

PromptClinic — a lead-gen tool that extracts real clinic data from Google Maps URLs and generates landing-page/identity/outreach prompts. Entire app lives in **one file**: `index.html` (inline CSS + inline JS). No framework, no build step, no dependencies by design ("HTML + Vanilla JS" stack).

## Run / verify

- Open `index.html` directly in a browser (works from `file://`). No server, install, or build needed.
- There are no tests, linters, or CI. Manual verification = open the page, walk the 5-step flow, use the ⚙ Settings "Test key" buttons for each API.
- Do not add Node/package tooling unless asked — `.gitignore` explicitly reserves `node_modules/` as "if added later".

## Gotchas inside index.html

- All state is module-level globals: `client`, `options`, `lastPrompts`, `currentTab`, `currentId`. The 5 UI steps are sections `#s0`–`#s4` toggled via `go(n)`; adding a step means touching `go()`, `STEPS`, and the section markup together.
- **Gemini model name (`gemini-3.6-flash`) is hardcoded in 3 places**: `extractGeminiAI`, `testGemini`, `doImprove`. Update all three or the test button will lie about what production uses.
- localStorage keys are versioned: `pc_history_v1` (LS_H), `pc_settings_v5` (LS_S). Bump the version suffix when changing the stored shape, or users get stale/crashing saved data.
- SerpAPI has no CORS support — calls go through a fallback chain of public proxies (corsproxy.io → allorigins → codetabs) in `extractSerpAPI`. Keep that chain intact; Google CSE, Gemini, and Jina are called directly.
- Extraction pipeline order is SerpAPI → Google CSE → Jina → Gemini, each layer skipped once its target fields are filled. Merging uses `mergeData`: only non-empty values overwrite. Preserve these semantics when refactoring `analyze()`.
- Short `maps.app.goo.gl` URLs are resolved via Jina reader (`resolveShortUrl`); `parseMapsUrl` pulls placeId/coords/name/cid out of long Maps URLs and feeds every layer — changes there affect all extraction paths.

## Conventions

- README.md is bilingual, Arabic-first. Match that style when updating docs.
- Never commit real API keys; users enter keys at runtime (Settings → localStorage). `.gitignore` blocks `secrets.json` / `config.local.json`.
