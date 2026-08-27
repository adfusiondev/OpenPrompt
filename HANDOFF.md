# HANDOFF — OpenPrompt (Final Release)

> Final handoff document for a new developer taking over **OpenPrompt**.
> Project is **DONE and released** (tag `v-final`). Replace this whole section's file whenever the next milestone ships.
> Companion docs to read fully before touching code: `AGENTS.md`, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`, `MASTER_PLAN.md`, `README.md`.

## 1. What it is

OpenPrompt is a lead-gen tool that turns a **Google Maps URL** into a ready-to-build
client landing page. It extracts real clinic/business data (SerpAPI → Jina → Gemini),
generates landing-page / brand-identity / outreach / image prompts, and lets you
download the whole thing as a **Project Pack** folder for OpenCode / Cursor / Claude Code.

Two components, no framework, no build step:

| File | Role |
|---|---|
| `index.html` (~2553 lines) | Entire UI — inline CSS + inline JS, Dark Terminal style, opens from `file://` |
| `server.js` (182 lines) | Local Node.js + Express proxy holding all upstream API keys; the browser never sees them |
| `desktop/` | macOS Electron wrapper (stage 17, tag `v11-desktop`) |

## 2. Run / verify

```bash
npm install && npm start          # → http://localhost:3000
open index.html                   # works from file://; ⚙ Settings auto-runs Test connection
```

Keys live in `.env` (see `.env.example`): `SERPAPI_KEY`, `GEMINI_API_KEY`, `JINA_API_KEY`
(all optional per-layer, but at least SerpAPI or Gemini makes extraction useful).
`PORT` (default 3000), `ALLOWED_ORIGIN` (comma list; empty = reflect any origin for `file://`).

**There are no tests, linters, or CI.** Manual verification = walk the 5-step UI flow with a
Maps URL, e.g. `https://maps.app.goo.gl/W2fnE58QHCoc5A4N8`, and read the live log.

## 3. Proxy API contract (server.js)

| Route | Contract |
|---|---|
| `GET /api/health` | `{ ok, service, keys: { serpapi, gemini, jina } }` |
| `GET /api/unshorten?url=` | Follows redirects server-side (Maps-host allowlist), returns `{ ok, url }` final canonical URL |
| `GET /api/serpapi?<params>` | Whitelisted params (`engine,type,place_id,ll,q,hl,google_domain`) forwarded with `SERPAPI_KEY` injected; upstream errors surface as `{ error }` 401/502 |
| `POST /api/jina` `{ targetUrl }` | GET `r.jina.ai/<url>`; adds `Authorization: Bearer` when `JINA_API_KEY` set; returns plain text |
| `POST /api/gemini` `{ model, prompt }` | Relays to `generateContent` with `GEMINI_API_KEY`; `prompt` may be a string (wrapped into `contents`) or a full body; **upstream HTTP status relayed verbatim** so client model-fallback works |

Missing key ⇒ `503 { error, code: "NO_KEY" }`. All errors use `{ error }` envelopes.

## 4. Frontend architecture (index.html)

- **State** — module-level globals: `client`, `options`, `lastPrompts`, `currentTab`, `currentId` (+ `editMode`).
  The 5 UI steps are sections `#s0`–`#s4` (`STEPS=['URL','Data','Options','Results','History']`)
  toggled via `go(n)` (lockGate-wrapped, line 558). Adding a step means touching `go()`, `STEPS`, and markup together.
- **Storage keys** — `LS_H='op_history_v1'` (history), `LS_S='op_settings_v1'` (settings → `{proxyUrl, jina}`),
  `LS_L='op_leads_v1'` (leads). Reads tolerant (`||''`); line 453 migrates legacy `pc_history_v1`/`pc_settings_v5`.
- **Networking** — ALL third-party traffic goes through `apiFetch(path, opts, timeoutMs)` → `${apiBase()}/api/*`
  (line 487). Never call upstream hosts directly from feature code. Offline ⇒ `{ ok:false, offline:true }` → log `proxyOfflineMsg()`.
  All Gemini via `callGemini(body, timeoutMs)` (line 501) over the `GEMINI_MODELS=['gemini-3.6-flash','gemini-flash-latest']`
  chain, advancing only on 404/"not available".
- **Extraction pipeline** — SerpAPI (L1) → Jina (L3) → Gemini (L4) under a 45s deadline
  (`deadline`/`timeLeft`/`outOfTime` in `analyze()`). Layers merge via `mergeData` (later non-empty values win),
  each skipped once its fields are filled. `analyze()` probes `/api/health` first and gates layers on `serverKeys.serpapi`/`.gemini`
  (+ `s.jina !== false` for L3). Do **not** reintroduce direct-API layers (old Layer 2 Google CSE was removed deliberately).
- **Feature landmarks** — `parseMapsUrl` feeds every layer; `resolveShortUrl()` resolves `maps.app.goo.gl` links
  (proxy-first, then grace-landing fallbacks); `isJunkUrl()` is the single gate for google./goo.gl/gstatic./ggpht.
  URLs in the website field; `PROF_CATS`/`detectProfessionId` pre-fill profession and drive per-specialty
  `SERVICES_HINT`; `normalizeGeminiKeys` maps raw Gemini `profession` → `prof` before `mergeData`.
- **Lock** — `lockGate(fn)` wraps `go`, `analyze`, `prospectSearch`, `generate`, `openInTool`, `aiImprove`, `exportAll`
  so the optional Access Lock (`isLockEnabled`/`ensureUnlocked`) gates every action.

## 5. Feature inventory (all shipped)

| Area | Where |
|---|---|
| 5-step flow (URL→Data→Options→Results→History) | `#s0`–`#s4` |
| Auto extraction + profession detection + per-specialty services | `analyze()`, `PROF_CATS` |
| USP generator (`generateUSP`) + injection into all 3 prompts | `#uspCard` |
| Patient insights (3 color-coded groups) + landing-only injection | `#insightsCard` |
| Open-in buttons (Claude/ChatGPT/v0/Lovable/Bolt) + copy-for-Claude / AI Studio | `openInTool`, `copyForClaude`, `openInAIStudio` |
| Trilingual outreach en/ar/fr + outreach language selector | `buildOutreach` |
| Image prompts + variants / mode switcher | `buildImagePrompts`, `VARIANT_DIRECTIVES` |
| Location block (coords, map embed, directions) | `parseMapsUrl`, `packMapData` |
| History save/discard + explicit save workflow | `saveOrUpdate`, `renderHistory` |
| Leads + import CSV + WhatsApp export + clean history | `getLeads`, import/export |
| Competitor Gap analysis | gap/competitors extraction |
| Prospector mode | `prospectSearch` |
| Access Lock | `isLockEnabled`/`isUnlocked` |
| Diagnostic error reporter (copyable report) | diag reporter |
| **Inline prompt edit mode** (✏️ Edit — live `oninput` sync so copy/download/save use edited text) | `toggleEdit`, `#promptOut` |
| **Project Pack** (⬇ Downloads one folder: generated `index.html` skeleton + `AGENTS.md` + `PROJECT_CONTEXT.md` + `PROJECT_STATUS.md` + `HANDOFF.md`, deterministic templates, no AI) | `buildPackIndex`, `buildPackAgents`, `buildPackContext`, `buildPackStatus`, `buildPackHandoff`, `PACK_FILES`, `dlPack`, `dlPackAll`, `copyHandoff` |
| **Full Backup & Restore** (`backupData`/`restoreData`) — tagged backup, confirm dialog: OK=MERGE (dedupe by id / name+city) vs Cancel=REPLACE all | `#s4` toolbar |
| macOS desktop Electron wrapper | `desktop/` |

## 6. Gotchas & conventions (non-negotiables)

- **Read `index.html` completely before editing. Minimal/surgical edits only — never rewrite the file.**
  Preserve every existing behavior; verify by grepping for your new names + `git diff --stat` (no test harnesses).
- README.md / MASTER_PLAN.md are **Arabic-first, bilingual** — match that style when updating docs.
- No tests/linters/CI; runtime testing is done by hand in the browser (`node --check server.js` for the proxy only).
- Never commit `.env`, real keys, `secrets.json`, or `config.local.json` (all gitignored; `.env.example` and `package-lock.json` ARE committed).
- The `/api/gemini` route uses `validateStatus: () => true` on purpose — flagged "fixes" that make it throw on 404 will break model fallback.
- `/api/unshorten` uses `responseType:'stream'` + destroys the body — redirect resolution must not download pages. Extend `isMapsHost()` before supporting other shorteners.
- CORS origin reflection is intentional for local/`file://` dev; tighten via `ALLOWED_ORIGIN` when deploying.
- Commit-per-milestone, tag releases (`v*`), push tags with the branch.

## 7. Release history (tags)

`v1-stable`, `v1.0.0-stable-backup` · `v2-p0`, `v2.0.1-backup`, `v2.1.0-variants-pre` · `v3-prospector` ·
`v4-competitors`, `v4.1-unified-outreach`, `v4.2-outreach-polish` · `v5-mode-switcher` ·
`v6-image-prompts`, `v6.1-location` · `v7.1-history-fix`, `v7.3-leads`, `v7.4-whatsapp`, `v7.5-history-actions`,
`v7.6-import-leads`, `v7.6-lock`, `v7.7-clean-history` · `v8-adsfusion-release`, `v8a-pack-md`,
`v8b-pack-index`, `v8c-edit-prompts` · `v9-backup`, `v9-diag` · `v10-backup` · `v11-desktop` · **`v-final`**.

Current `main` HEAD: `e5a8c3e` (feat: full backup & restore). Working tree clean.
