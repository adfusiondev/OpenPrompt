# P0 Implementation Spec — OpenPrompt

**Feature set:** Open-in Buttons · USP Generator · Patient/Sentiment Insights
**Source:** MASTER_PLAN.md (Phases 1–3) mapped against the current codebase
**Branch at planning:** `main` (clean, at `e3a59c2`)
**Scope:** `index.html` ONLY. Zero changes to `server.js`. No new localStorage keys.
**Status:** Approved spec — no code modifications made yet.

---

## 0. Current Architecture (verified against code)

| Concern | Location | Notes |
|---|---|---|
| Global state | `index.html:279` | `client`, `options`, `lastPrompts`, `currentTab`, `currentId` |
| Gemini helper | `callGemini(body, timeoutMs)` — `index.html:306` | Walks `GEMINI_MODELS` chain (`index.html:281`), returns `{ok, model, data}` / `{ok:false, error}`; 503 NO_KEY returns immediately |
| JSON-from-Gemini pattern | `extractGeminiAI` — `index.html:637-691` | `responseMimeType:'application/json'` + parse with `\{[\s\S]*\}` regex fallback |
| Extraction pipeline | `analyze()` — `index.html:709-818` | Health probe → L1 SerpAPI → L3 Jina → L4 Gemini; 45s deadline via `deadline`/`timeLeft()`/`outOfTime()` |
| Prompt building | `collect()` `:842`, `buildPrompts()` `:851`, `generate()` `:922` | Trilingual outreach via 5 `options.lang` branches (`:909-919`); `LANG_FULL`/`CTA`/`TONE`/`SERVICES_HINT` maps |
| Results UI | section `#s3` `:201-218` | `.row` with Copy / Copy for Claude / AI Studio / Export / Improve buttons |
| Review UI | section `#s1` `:143-167` | fields grid + `#f_notes` textarea + Next/Back `.row` |
| Persistence | `saveOrUpdate()` `:999`, `openItem()` `:1021` | History item = `{id, ts, client, options, prompts}` — whole `client` object serialized |
| Toast | `toast(t)` `:1085` | |

**Server (`server.js`): zero changes needed.** `/api/gemini` (`server.js:144`) already relays arbitrary prompt bodies with key injection and verbatim status relay.

---

## 1. Architectural Approach (keep everything intact)

1. **Single-file constraint**: all edits inside `index.html`; surgical insertions only, no rewrites.
2. **All Gemini traffic through `callGemini()`** — inherits model fallback, NO_KEY handling, proxy-offline handling for free. No new upstream calls, no new `apiFetch` routes.
3. **localStorage compatibility**: no new LS keys, no version bump. `client` simply gains optional fields (`usps`, `selectedUSP`, `insights`) — `saveOrUpdate()` serializes the whole object automatically; old history items lack them, so all render code must be tolerant (`if(client.usps?.length)`). `collect()` (`:842`) only overwrites its known fields, so USP/insights survive form re-collection. Settings shape `{proxyUrl, jina}` untouched.
4. **Trilingual intact**: USP/insights are injected as *instruction lines to the AI tool* (English), never as page copy — `LANG_FULL` and the 5 outreach language branches keep controlling output language. The outreach USP suffix is appended once *after* the if/else chain so all 5 languages get it uniformly.
5. **Never block the flow**: both generators wrapped in try/catch, gated on `serverKeys.gemini` + `outOfTime()`, failures log a warn line and hide their card.
6. **Stale-state hygiene**: `analyze()` re-creates `client` fresh (`:750`), so old fields can't leak; both cards are explicitly hidden at `analyze()` start.

---

## 2. Task 1 — Open-in Buttons (MASTER_PLAN Phase 1)

**HTML insertion** — inside `#s3`'s `.row` (`index.html:209-216`), immediately after the `⧉ Copy` button (`:210`), before `claudeBtn`:

```
↗ Claude   → https://claude.ai/new
↗ ChatGPT  → https://chatgpt.com
↗ v0       → https://v0.dev
↗ Lovable  → https://lovable.dev
↗ Bolt     → https://bolt.new
```

Each: `class="btn ghost"` (matches existing row style; row already `flex-wrap`s), `onclick="openInTool('Claude','https://claude.ai/new')"` etc.

**JS insertion** — one new function `openInTool(toolName, url)` placed after `openInAIStudio()` (`index.html:952`), reusing existing primitives:

1. `navigator.clipboard.writeText(lastPrompts[currentTab]||'')`
2. `toast('⧉ Copied! Opening '+toolName+'...')`
3. `setTimeout(()=>window.open(url,'_blank'), 300)`

**Notes**

- Existing `copyForClaude` (`:942`) becomes partially redundant with "↗ Claude" — kept as-is per "preserve all functionality" (removal is optional).
- No state, storage, or pipeline changes. Lowest risk task; done first.

---

## 3. Task 2 — USP Generator (MASTER_PLAN Phase 2)

**A. New function `generateUSP()`** — inserted near `extractGeminiAI` (after `normalizeGeminiKeys`, `index.html:697`). Reuses the exact `extractGeminiAI` pattern:

- `callGemini({contents:[{parts:[{text:prompt}]}], generationConfig:{responseMimeType:'application/json', temperature:0.7}}, budget)` (0.7 for creative variety vs extraction's 0.2)
- Prompt per MASTER_PLAN: business name/prof/city, rating/reviews, website/hours → `Return JSON: {"usps":["...","...","..."]}`, one sentence ≤15 words each
- Parse: `JSON.parse` → regex fallback; validate `Array.isArray(data.usps)`, coerce to strings, `.slice(0,3)`
- Sets `client.usps`; returns boolean success; any error → `logLine(...,'warn')` + return false

**B. Call site in `analyze()`** — after the profession-detect block (`index.html:785-788`), before form-fill (`:790`):

```
if(serverKeys.gemini && client.name && client.prof && client.city && !outOfTime())
  → await generateUSP(timeLeft())
```

Plus `$('#uspCard').classList.add('hidden')` reset near `clearLog()` (`:718`).

**C. UI insertion** — in `#s1`, after the `#f_notes` textarea (`index.html:162`), before the Next/Back `.row` (`:163`). *(MASTER_PLAN says "after the preview div in s1", but `#preview` actually lives in `#s0` (`:137`) — the review section `#s1` after `#f_notes` is the correct intent.)*

- `#uspCard` div (hidden; same dark-card styling as MASTER_PLAN snippet) containing label + `#uspOptions`
- New `renderUSPCard()`: builds 3 radio inputs (name=`uspRadio`, inline `onchange` handler setting `client.selectedUSP`), pre-checks the radio matching existing `client.selectedUSP`, unhides card; hides when no usps

**D. `buildPrompts()` integration** (`index.html:851-921`) — gated on `client.selectedUSP`:

- New constant `const USP = client.selectedUSP ? 'PRIMARY USP TO EMPHASIZE: '+client.selectedUSP : ''` next to `PROOF`/`HOURS`/`NOTES` (`:874-876`)
- `landing`: interpolate `${USP}` after the `VISUAL TONE` line (`:893`)
- `identity`: append USP line to the identity template (`:899-901`)
- `outreach`: single insertion **after** the 5-branch if/else chain (`:919`): `if(client.selectedUSP) outreach += '\n\n✨ '+client.selectedUSP;` — covers all languages with one edit

**E. History restore** — in `openItem()` (`index.html:1021-1033`), after form fill: call `renderUSPCard()` so saved selections reappear.

---

## 4. Task 3 — Patient/Sentiment Insights (MASTER_PLAN Phase 3)

**A. New function `generatePatientInsights()`** — next to `generateUSP()`:

- Same `callGemini` JSON pattern; prompt per MASTER_PLAN (prof, city, rating, reviews) + detected specialty context: pass `detectProfessionId(client.prof+' '+client.name)` category label and `SERVICES_HINT[cat]` so output is genuinely specialty-specific (dental ≠ beauty ≠ medical)
- Wording tweak for the tool's non-medical categories (restaurant/legal/veterinary): prompt says "patients (or customers for non-medical businesses)" — prevents absurd "patient" language for restaurants
- Expected JSON `{strengths[3], concerns[3], keywords[5-8]}`; validate arrays; set `client.insights`; silent-warn on failure

**B. Call site** — directly after the USP call in `analyze()` (sequential, not parallel: keeps log output ordered like existing layers and respects the shared 45s budget), same gates (`serverKeys.gemini && !outOfTime()`); card reset at analyze start alongside uspCard.

**C. UI insertion** — `#insightsCard` immediately after `#uspCard` in `#s1`; `renderInsightsCard()` renders three labeled groups using existing CSS vars: strengths `var(--ok)` green, concerns `var(--warn)` orange, keywords `var(--info)` blue. Hidden on failure/absence.

**D. `buildPrompts()` integration — landing prompt only** (per spec):

- New constant `INSIGHTS` next to `USP` (`:874-876`), built from `client.insights`:

  ```
  PATIENT INSIGHTS TO USE:
  - Testimonial inspiration: [strengths joined]
  - Address in FAQ: [concerns joined]
  - SEO keywords: [keywords joined]
  ```

- Interpolate into `landing` template after `${USP}` (before SECTIONS line, `:895`). Identity/outreach untouched by insights.

**E. History restore** — `openItem()` also calls `renderInsightsCard()`.

**Optional (low cost, flag if unwanted):** add `['USP', client.selectedUSP]` and `['Insights keywords', ...]` rows to `downloadCurrent()`'s report table (`:954-959`).

---

## 5. Execution Order & Verification

1. **Task 1** → manual check: generate prompts, click each of 5 buttons, verify clipboard + new tab; old buttons still work.
2. **Task 2** → full flow with `https://maps.app.goo.gl/W2fnE58QHCoc5A4N8`: 3 USPs appear in s1, select one, verify `PRIMARY USP TO EMPHASIZE` present in all 3 tabs; kill `GEMINI_API_KEY` → flow completes, card hidden.
3. **Task 3** → same run: insights card colored correctly, content differs for dental vs restaurant URL, landing prompt contains the insights block (other two prompts don't).
4. **Regression**: history save → page reload → Open from history restores USP selection + insights; export .md/JSON; AR/FR/trilingual outputs unchanged in structure; `npm start` offline path still aborts cleanly.
5. Commit per phase (only when explicitly requested).

**Risks / mitigations**

| Risk | Mitigation |
|---|---|
| Gemini JSON shape drift | Array validation + hide card on invalid shape |
| Latency / budget exhaustion | Both generators budget-aware via `timeLeft()` / `outOfTime()` |
| Button row overflow | `.row` flex-wrap already present |
| Stale cards across clients | Cards hidden at `analyze()` start; `client` re-created fresh |
| Old history items missing new fields | All render paths tolerant of absent `usps`/`insights` |

---

*Spec generated from a full read of `index.html` (1091 lines), `MASTER_PLAN.md`, and `server.js`. No `.specify/` scaffolding exists in this repo; plan delivered as this document.*
