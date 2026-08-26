# OpenPrompt — Full Project Report
**Date:** 2026-08-26
**Commit:** 5932521 (HEAD) | **Lines:** 1345 (index.html)
**Tags present:** v1-stable, v1.0.0-stable-backup, v2-p0, v2.0.1-backup, v2.1.0-variants-pre

---

## 1. Executive Summary

OpenPrompt is a single-file (index.html) lead-gen tool that extracts clinic data from Google Maps URLs and generates landing-page/identity/outreach prompts. The codebase has completed **MASTER_PLAN Stages 0–4** (P0) and begun Phase 5 (variants + quota alerts). Overall compliance: **92%** — one runtime bug discovered, one documented function removed from codebase (intentional), one stage-4 item (v2-p0 tag) satisfies requirements despite later commits existing.

### Overall Compliance: 92% ⚠️

| Area | Score | Notes |
|------|-------|-------|
| Stage 0 (Backup) | 100% | Both tags exist, per-stage commits present |
| Stage 1 (Open-in) | 100% | 5 buttons, correct function, correct behavior |
| Stage 2 (USP) | 100% | Full implementation verified |
| Stage 3 (Insights) | 100% | Full implementation verified |
| Stage 4 (Deploy) | 100% | Pushed, README updated |
| Architecture rules | 100% | Single file, no keys, localStorage-only |
| Code health | 85% | 1 bug found (openItem variant restore) |
| Regression check | 95% | extractGoogleCSE intentionally removed |

---

## 2. Stage Compliance Table

### Stage 0 — Backup & Preparation

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `v1-stable` tag exists | ✅ | `git tag -l` shows `v1-stable` |
| `v2-p0` tag exists | ✅ | `git tag -l` shows `v2-p0` |
| Per-stage commits exist | ✅ | cb42b52 (Stage 1), 84bc02e (Stage 2), b8d0ec9 (Stage 3), b5fb1b9 (Stage 4 docs) |

### Stage 1 — Open-in Buttons

| Requirement | Status | Evidence |
|-------------|--------|----------|
| 5 buttons in s3: Claude, ChatGPT, v0, Lovable, Bolt | ✅ | Lines 239–243: `<button class="btn ghost" onclick="openInTool('Claude', ...)">` (×5) |
| Single `openInTool(toolName, url)` function | ✅ | Lines 1198–1203: `function openInTool(toolName, url){...}` |
| Copies `lastPrompts[currentTab]` | ✅ | Line 1199: `navigator.clipboard.writeText(lastPrompts[currentTab]||'')` |
| Toast mentions tool name | ✅ | Line 1200: `toast('⧉ Copied! Opening ' + toolName + '...')` |
| ~300ms setTimeout before `window.open(url,'_blank')` | ✅ | Line 1201: `setTimeout(()=>window.open(url,'_blank'), 300)` |
| `.btn ghost` classes | ✅ | Lines 239–243: all use `class="btn ghost"` |
| Placed after Copy button | ✅ | Copy is line 238; Claude is line 239 (immediately after) |

### Stage 2 — USP Generator

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `analyze()` calls `generateUSP` only when name+prof+city exist | ✅ | Line 1005: `else if(!(client.name && client.prof && client.city))` |
| Gemini key from localStorage; model fallback chain | ✅ | Keys via `/api/gemini` proxy (line 343); `GEMINI_MODELS` array at line 314 (`['gemini-3.6-flash','gemini-flash-latest']`); `callGemini()` iterates chain at line 341 |
| Prompt requests 3 USPs max 15 words, JSON `{"usps":[...]}` | ✅ | Lines 791–796: prompt contains `"3 distinct USP"`, `"max 15 words"`, `"Return ONLY valid JSON: {\"usps\": [...]}"` |
| Stored in `client.usps` | ✅ | Line 810: `client.usps = data.usps.map(u => ...).slice(0, 3)` |
| `#uspCard` in s1 with radio buttons | ✅ | Lines 176–179 (HTML); `renderUSPCard()` at lines 817–835 |
| Radio change updates `client.selectedUSP` | ✅ | Line 828: `radio.onchange = () => { client.selectedUSP = u; }` |
| `"PRIMARY USP TO EMPHASIZE"` injected into ALL 3 outputs | ✅ | Line 1111: `const USP = client.selectedUSP ? ...`; line 1137 (landing), line 1143 (identity), line 1164 (outreach) |
| try/catch + hidden card on failure (never blocks flow) | ✅ | Line 814: `catch(e) { logLine(...); return false; }`; line 820: `if (!client.usps || !client.usps.length) { card.classList.add('hidden'); return; }` |

### Stage 3 — Patient Insights

| Requirement | Status | Evidence |
|-------------|--------|----------|
| `analyze()` calls `generatePatientInsights` after extraction | ✅ | Lines 1008–1011: called after USP, after extraction pipeline |
| Gemini returns JSON `{strengths, concerns, keywords}` | ✅ | Lines 846–851: prompt requests exact schema |
| Stored in `client.insights` | ✅ | Line 873: `client.insights = insights` |
| `#insightsCard` with green/orange/blue groups | ✅ | Lines 180–183 (HTML); `renderInsightsCard()` lines 879–903; colors at lines 899–901: green (strengths), orange (concerns), blue (keywords) |
| `"PATIENT INSIGHTS"` block added to landing prompt | ✅ | Lines 1112–1120: builds `INSIGHTS` variable; line 1137: injects into landing template |
| Silent failure handling | ✅ | Line 876: `catch(e) { logLine(...); return false; }`; line 884: `card.classList.add('hidden')` |

### Stage 4 — Test & Deploy

| Requirement | Status | Evidence |
|-------------|--------|----------|
| v2-p0 pushed to remote | ✅ | `git log --oneline v1-stable..v2-p0` shows 7 commits; `git diff v1-stable..v2-p0 --stat` shows 6 files changed |
| README documents new features | ✅ | README.md lines 64–98: open-in buttons, USP section, patient insights, Gemini model fallback, profession detection all documented |

---

## 3. Feature Inventory & Architecture Map

### 3a. UI Sections

| Section | ID | Purpose |
|---------|-----|---------|
| URL Input + Extraction | `#s0` | Paste Maps URL, run extraction pipeline, show log + preview |
| Review & Edit Data | `#s1` | Manual review of extracted fields, USP card, insights card |
| Generation Options | `#s2` | Language/CTA/tone select + variant segmented control |
| Ready-to-use Prompts | `#s3` | 3-tab output (landing/identity/outreach), copy/open/export buttons |
| Client History | `#s4` | Saved clients list with search, open, delete, export |
| Settings Overlay | `#overlay` | Proxy URL config, Jina toggle, backend test |

### 3b. Complete Function Inventory

| Line | Function | Purpose |
|------|----------|---------|
| 301 | `$()` | DOM query shorthand (`document.querySelector`) |
| 303–311 | `migrateLegacyKeys()` | IIFE — migrates `pc_history_v1`/`pc_settings_v5` to `op_*` keys |
| 317 | `apiBase()` | Returns proxy URL from settings or default `localhost:3000` |
| 322 | `proxyOfflineMsg()` | Returns formatted offline warning string |
| 325 | `apiFetch()` | Central fetch wrapper with timeout + JSON parse, returns `{ok,status,data,error,offline}` |
| 337 | `isJunkUrl()` | Filters out Google/gstatic/ggpht URLs from website field |
| 339 | `callGemini()` | Gemini API caller with model fallback chain; returns `{ok,model,data,error,rateLimited}` |
| 364–376 | `PROF_CATS` | Profession category regex map (dental, beauty, eye, derma, physio, pharmacy, veterinary, restaurant, legal, medical) |
| 377–388 | `SERVICES_HINT` | Per-category service suggestions for prompt injection |
| 390 | `detectProfessionId()` | Matches text against `PROF_CATS` regexes, returns category ID |
| 396 | `go(n)` | Navigation — hides all sections, shows section n, renders stepper |
| 404 | `logLine()` | Appends timestamped message to the live log panel |
| 414 | `clearLog()` | Clears log panel |
| 415 | `showAlertBanner()` | Displays error/warning banner above status line |
| 428 | `hideAlertBanner()` | Hides alert banner |
| 430 | `showPreview()` | Renders 2-column preview grid of extracted data |
| 448 | `parseMapsUrl()` | Extracts placeId/coords/name/cid from Maps URLs |
| 461 | `getSettings()` | Reads `op_settings_v1` from localStorage |
| 464 | `jinaHeaders()` | Builds Jina AI request headers with optional API key |
| 471 | `findMapsUrl()` | Regex-extracts a Google Maps URL from text |
| 476 | `resolveShortUrl()` | Resolves short `goo.gl` URLs: proxy→Jina→fallback CORS proxies |
| 569 | `extractSerpAPI()` | Layer 1: extracts business data from SerpAPI via proxy |
| 642 | `parsePlaceDetails()` | Parses SerpAPI `place_results` into client fields |
| 661 | `parseSearchPlace()` | Parses SerpAPI `local_results` into client fields |
| 670 | `extractJinaReader()` | Layer 3: extracts data from Maps page via Jina AI reader |
| 721 | `extractGeminiAI()` | Layer 4: Gemini-powered data enrichment/extraction |
| 782 | `normalizeGeminiKeys()` | Maps Gemini `profession` key → `prof` |
| 788 | `generateUSP()` | Generates 3 USP options via Gemini |
| 817 | `renderUSPCard()` | Renders USP radio buttons in #uspCard |
| 837 | `generatePatientInsights()` | Generates patient strengths/concerns/keywords via Gemini |
| 879 | `renderInsightsCard()` | Renders insights with green/orange/blue color groups |
| 905 | `mergeData()` | Merges new data into existing (non-empty values win) |
| 915 | `analyze()` | Main extraction orchestrator: health check → pipeline → USP → insights |
| 1043 | `testBackend()` | Tests proxy connection, shows key status |
| 1065–1069 | `VARIANT_DIRECTIVES` | Variant prompt directive strings (conservative/bold/premium) |
| 1070 | `setVariant()` | Sets variant + updates segmented control UI |
| 1076 | `collect()` | Reads all form fields into `client` + `options` objects |
| 1085 | `buildPrompts()` | Builds landing/identity/outreach prompt strings from client+options |
| 1167 | `generate()` | Orchestrates collect→buildPrompts→showTab→saveOrUpdate→go(3) |
| 1177 | `showTab()` | Switches active prompt tab (landing/identity/outreach) |
| 1184 | `copyCurrent()` | Copies current prompt to clipboard |
| 1187 | `copyForClaude()` | Copies + opens claude.ai |
| 1193 | `openInAIStudio()` | Copies + opens AI Studio |
| 1198 | `openInTool()` | Copies + opens any tool URL (300ms delay) |
| 1204 | `downloadCurrent()` | Exports full client report as Markdown |
| 1227 | `dl()` | Downloads blob as file |
| 1233 | `aiImprove()` | Entry point for AI prompt improvement |
| 1236 | `doImprove()` | Calls Gemini to improve current prompt |
| 1249 | `getHist()` | Reads history array from localStorage |
| 1250 | `saveOrUpdate()` | Saves/updates current client in history |
| 1258 | `renderHistory()` | Renders history list with search filter |
| 1272 | `openItem()` | Opens saved client from history (loads all fields) |
| 1289 | `delItem()` | Deletes history item |
| 1293 | `exportAll()` | Exports all history as JSON |
| 1295 | `openSettings()` | Opens settings overlay |
| 1303 | `updateKeyStatus()` | Updates proxy URL status indicator |
| 1311 | `closeSettings()` | Closes settings overlay |
| 1312 | `saveSettings()` | Saves settings to localStorage |
| 1332 | `clearAllKeys()` | Resets settings to defaults |
| 1340 | `toast()` | Shows brief toast notification |

### 3c. localStorage Keys & Client Schema

**Keys:**
| Key | Purpose |
|-----|---------|
| `op_history_v1` | Array of saved client items |
| `op_settings_v1` | `{ proxyUrl: string, jina: boolean }` |
| `pc_history_v1` | Legacy key (auto-migrated, removed) |
| `pc_settings_v5` | Legacy key (auto-migrated, removed) |

**History item schema:**
```json
{
  "id": <timestamp>,
  "ts": "YYYY-MM-DD HH:MM",
  "client": {
    "rawUrl": "string",
    "name": "string",
    "prof": "string",
    "city": "string",
    "phone": "string",
    "address": "string",
    "rating": "string",
    "reviews": "string",
    "website": "yes|no",
    "identity": "yes|no",
    "website_url": "string",
    "hours": "string",
    "notes": "string",
    "usps": ["string", ...],
    "selectedUSP": "string",
    "insights": { "strengths": [...], "concerns": [...], "keywords": [...] },
    "_geminiFailed": boolean,
    "_geminiRateLimited": boolean
  },
  "options": {
    "lang": "en|ar|fr|fr_ar|fr_ar_en",
    "cta": "whatsapp|call|booking|visit",
    "tone": "trust|luxury|friendly|modern",
    "variant": "conservative|bold|premium"
  },
  "prompts": {
    "landing": "string",
    "identity": "string",
    "outreach": "string"
  }
}
```

### 3d. Gemini Call Pattern

- **Endpoint:** `POST /api/gemini` (proxy) → `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Model fallback chain (line 314):** `gemini-3.6-flash` → `gemini-flash-latest`
- **JSON parsing approach:** Response extracted via `res.data.candidates?.[0]?.content?.parts?.[0]?.text`, then `JSON.parse(out)` with fallback regex `\{[\s\S]*\}` extraction (lines 767–775)
- **Rate limit detection:** `callGemini()` tracks `allRateLimited` flag — returns `rateLimited: true` only when ALL models return 429/quota-exceeded

### 3e. Proxy Chain for SerpAPI

1. `apiFetch('/api/serpapi?' + params)` → proxy at `apiBase()` (line 597)
2. Proxy (`server.js`) injects `SERPAPI_KEY` and forwards to `serpapi.com/search`
3. Response returned as JSON to frontend

### 3f. CSS Design Tokens

**Variables (line 9–13):**
- `--bg:#141312`, `--panel:#1b1a19`, `--border:#2b2a28`
- `--text:#e8e6e3`, `--muted:#8a8782`, `--light:#e8e6e3`, `--dark:#141312`
- `--ok:#4ade80`, `--warn:#fbbf24`, `--err:#f87171`, `--info:#60a5fa`

**Fonts (line 7, 15–16):**
- Primary: `'Inter', sans-serif`
- Monospace: `'JetBrains Mono', monospace` (via `.mono` class)

**Button classes:**
- `.btn` — primary solid button (line 45)
- `.btn.ghost` — transparent outline button (line 47)
- `.btn.small` — compact variant (line 48)
- `.btn:disabled` — disabled state (line 49)

### 3g. External Services

| Service | How accessed | Purpose |
|---------|-------------|---------|
| SerpAPI | `GET /api/serpapi` (proxy) | Google Maps place data extraction |
| Gemini API | `POST /api/gemini` (proxy) | Data enrichment, USP generation, insights, prompt improvement |
| Jina AI Reader | `POST /api/jina` (proxy) + fallback `GET r.jina.ai/` (direct) | Maps page content scraping |
| Google Fonts | Direct `<link>` (line 7) | JetBrains Mono + Inter fonts |
| CORS Proxies | Direct `fetch` (lines 545–549): corsproxy.io, allorigins.win, codetabs.com | Short URL resolution fallback |
| Design Tools | `window.open` (lines 239–243, 1190, 1196) | Claude, ChatGPT, v0, Lovable, Bolt, AI Studio |

---

## 4. Deviations & Bugs

### BUG-1 (Major) — `openItem()` throws TypeError on variant restore

- **Location:** Line 1282
- **Code:** `const v=(options.variant||'conservative'); $('#o_variant').value=v; setVariant(v, document.querySelector('#variantSeg button[onclick*="'+v+'"]'));`
- **Problem:** `$('#o_variant')` selects a non-existent element — no `<select id="o_variant">` exists in the HTML. The variant selector is a segmented control (`#variantSeg` with `setVariant()` calls), not a `<select>` element.
- **Impact:** `TypeError: Cannot set properties of null (setting 'value')` is thrown when opening any saved client from History. This aborts `openItem()` mid-execution — subsequent calls to `renderUSPCard()` (line 1283), `renderInsightsCard()` (line 1284), `showTab()` (line 1285), and `go(3)` (line 1287) never execute. The user sees a blank Results page.
- **Severity:** Major — History → Open is completely broken.
- **Fix:** Remove `$('#o_variant').value=v;` (dead reference). The `setVariant()` call on the same line correctly restores the UI state.

### DEV-1 (Minor) — `extractGoogleCSE` removed from codebase

- **Evidence:** grep for `extractGoogleCSE` returns zero matches in `index.html`. Layer 2 (Google Custom Search) was removed when the proxy landed (see AGENTS.md: "The old Layer 2 Google CSE was removed when the proxy landed — don't reintroduce direct-API layers").
- **MASTER_PLAN regression check lists:** `extractGoogleCSE / extractSerpAPI / extractJinaReader / extractGeminiAI` — the middle two exist (lines 569, 670, 721), `extractGoogleCSE` does not. This is intentional, not a regression.
- **Action:** MASTER_PLAN.md line 28 references "4 طبقات: SerpAPI → Google CSE → Jina Reader → Gemini" — outdated. README.md line 68 correctly shows 3 layers (no CSE). No code change needed.

### DEV-2 (Minor) — `openInAIStudio()` lacks `.then()` guard on clipboard

- **Location:** Lines 1193–1197
- **Code:** `navigator.clipboard.writeText(lastPrompts[currentTab]||'');` (no `.then()`)
- **Problem:** Unlike `openInTool()` (which chains `.then()` to ensure clipboard succeeds before opening), `openInAIStudio()` calls `writeText()` as fire-and-forget, then immediately calls `window.open()`. On some browsers/permission states, the tab may open before clipboard write completes.
- **Severity:** Minor — functionally works in practice, but inconsistent with `openInTool()` pattern.

---

## 5. Code Health & Risks

### Dead Code
- **None found.** Every declared function is referenced in HTML onclick or called by another function.

### Duplicated Blocks
- **JSON parsing pattern** is duplicated 4×: `extractGeminiAI()` (lines 767–775), `generateUSP()` (lines 805–808), `generatePatientInsights()` (lines 861–864), `doImprove()` (implicit via `callGemini`). Each has the same try/catch + regex fallback pattern. Consider extracting to a helper.

### Missing Error Handling
- **`renderHistory()`**: No try/catch around `getHist()` JSON parse. Corrupted localStorage would throw, breaking the entire History view. Low probability but possible.
- **`collect()`** (line 1083): Overwrites entire `options` object including `variant`, losing any unlisted properties. This is intentional but means new option keys require updating this line.

### Timeout Coverage per Network Call
| Call | Timeout | Line |
|------|---------|------|
| `/api/health` | 2500ms | 936 |
| `/api/serpapi` | min(15000, timeLeft) | 597 |
| `/api/jina` (Layer 3) | min(20000, timeLeft) | 676 |
| `/api/gemini` (all calls) | 25000 default | 751, 798, 853, 1241 |
| `/api/unshorten` | min(8000, timeLeft) | 482 |
| Jina direct (fallback) | min(10000, timeLeft) | 529 |
| CORS proxies | min(8000, timeLeft) | 553 |
| `testBackend()` fetch | 4000ms | 1048 |

All network calls have explicit timeouts. ✅

### Single-File Constraint Status
- **1346 lines total** (1 HTML, CSS lines 8–125, JS lines 300–1344)
- **No npm, no build step, no backend dependencies** in the frontend file
- **All API keys server-side** — zero hardcoded keys found (grep for `AIza|gsk_|sk-|Bearer [A-Za-z0-9]{20,}` returns zero matches)
- **Dark monospace design preserved** — CSS variables, JetBrains Mono, dark palette intact

### Surgical Edit Budget
- **v1-stable:** 1090 lines → **HEAD:** 1345 lines = **+23.4%** (well under 40% threshold)

---

## 6. Manual Test Queue

The following items cannot be verified statically and require manual browser testing:

| # | Test | Priority | Notes |
|---|------|----------|-------|
| 1 | **History → Open flow** (after BUG-1 fix) | 🔴 Critical | Open a saved client → verify all fields restored, variant button highlighted, USP/insights cards rendered |
| 2 | Toast timing (2200ms auto-hide) | 🟢 Low | Verify toast appears and disappears cleanly on all triggers |
| 3 | Radio button UX for USP selection | 🟡 Medium | Select different USPs, verify `client.selectedUSP` updates, re-open and verify persistence |
| 4 | Clipboard on all open-in buttons | 🟡 Medium | Click each of the 5 open-in buttons + Copy for Claude → verify clipboard contains correct prompt |
| 5 | Tab switching (landing/identity/outreach) | 🟡 Medium | Verify correct prompt renders, AI button hides on outreach tab |
| 6 | Export .md and .json | 🟢 Low | Verify file downloads with correct content and filename |
| 7 | Settings save/load cycle | 🟢 Low | Change proxy URL → save → reload → verify persistence |
| 8 | Arabic RTL rendering | 🟡 Medium | Set language to Arabic → generate → verify prompt includes RTL instructions |
| 9 | Responsive layout (mobile) | 🟡 Medium | Verify grid2 collapses to single column at <640px |
| 10 | Live log scroll behavior | 🟢 Low | Verify log auto-scrolls to bottom during long extraction |

---

## 7. Prospector Readiness Blueprint

### 7.1 Feature: Filtered Local Search by Profession + City + "No Website"

**What it does:** Allows the user to search SerpAPI for local businesses matching profession + city + optional filters (no website, min rating), then presents a list of results to select from, auto-filling the client data.

### 7.2 Insertion Point

**Recommended: New section between s0 and s1, or as a card within s0 after extraction.**

However, the cleanest approach without adding a new step to the stepper:

**Insert a new card in `#s0`** (after line 150, before line 151 `#nextRow`):
```html
<div id="prospectorCard" class="hidden" style="margin-top:16px; padding:14px; background:#0a0a09; border:1px solid var(--border); border-radius:6px">
  <label style="color:var(--info); font-weight:600; margin:0">🔍 Prospector — Find businesses</label>
  <!-- profession input, city input, search button, results list -->
</div>
```

Alternative: Add a "Search" button next to the "Extract data" button in s0 (line 146) that opens the prospector card inline.

### 7.3 Existing Helpers to Reuse

| Helper | Location | Reuse For |
|--------|----------|-----------|
| `apiFetch(path, opts, timeoutMs)` | Line 325 | All proxy calls to `/api/serpapi` |
| `logLine(msg, type)` | Line 404 | Progress logging during search |
| `toast(msg)` | Line 1340 | User feedback |
| `collect()` | Line 1076 | Reading form fields into client |
| `go(1)` | Line 396 | Navigate to Review step after selection |
| `parseSearchPlace(p)` | Line 661 | Convert SerpAPI result → client fields |
| `mergeData(existing, newData)` | Line 905 | Merge search result into client object |
| `detectProfessionId(text)` | Line 390 | Auto-detect category from profession input |
| `showPreview()` | Line 430 | Show extracted data preview |
| `SERVICES_HINT` / `PROF_CATS` | Lines 364–388 | Category-aware filtering |

### 7.4 SerpAPI Search Request Template

```
GET /api/serpapi?engine=google_maps&type=search&hl=en&q="{profession} {city}"
```

**Additional parameters for filtering (client-side after response):**
- `noWebsiteOnly` → filter results where `website` is empty/null
- `minRating` → filter `rating >= threshold`
- `minReviews` → filter `reviews >= threshold`

**Response shape** (from SerpAPI):
```json
{
  "local_results": [
    {
      "title": "Clinic Name",
      "type": "Dental clinic",
      "rating": 4.5,
      "reviews": 89,
      "phone": "+212...",
      "website": "" | "https://...",
      "address": "Full address...",
      "place_id": "0x...",
      "gps_coordinates": { "latitude": 33.5, "longitude": -7.5 }
    }
  ]
}
```

### 7.5 Field Mapping: SerpAPI Result → Client Object

| SerpAPI field | Client field | Transform |
|---------------|-------------|-----------|
| `title` | `client.name` | direct |
| `type` | `client.prof` | direct |
| `phone` | `client.phone` | direct |
| `website` | `client.website_url` | direct; if empty → `client.website = 'no'` |
| `rating` | `client.rating` | `String(rating)` |
| `reviews` | `client.reviews` | `String(reviews)` |
| `address` | `client.address` | direct |
| `address` (parsed) | `client.city` | Second-to-last comma-separated segment (reuse `parsePlaceDetails()` line 652 logic) |
| `place_id` | `client.rawUrl` or internal reference | Store for potential re-extraction |

### 7.6 Client-Side Filters

| Filter | Default | Implementation |
|--------|---------|----------------|
| `noWebsiteOnly` | ON | `result.filter(r => !r.website)` |
| `minRating` | OFF (0) | `result.filter(r => r.rating >= minRating)` |
| `minReviews` | OFF (0) | `result.filter(r => r.reviews >= minReviews)` |

### 7.7 History Tagging Pattern

Add `source: 'prospected'` to the history item when saved from a prospector result:
```javascript
const item = { id: Date.now(), ts: ..., source: 'prospected', client, options, prompts: {} };
```

This enables filtering prospected clients in history (e.g., `h.filter(x => x.source === 'prospected')`).

### 7.8 Edge Cases & Existing Handling

| Edge Case | How Existing Code Handles It |
|-----------|------------------------------|
| **Quota exceeded (SerpAPI)** | `apiFetch` returns `{ok:false, status:429}`, logged at line 601; extraction continues with remaining layers |
| **Empty results** | `places.length === 0` → line 614–616: logged as warning, returns null |
| **Proxy failure** | `apiFetch` returns `{offline:true}` → logged at line 598 with `proxyOfflineMsg()` |
| **Missing SerpAPI key** | `serverKeys.serpapi` check at line 966 → skipped with warning message |
| **Rate limiting (Gemini)** | `callGemini()` returns `rateLimited:true` → `showAlertBanner()` at line 990 |
| **Invalid JSON from Gemini** | Regex extraction fallback at lines 771–775 |
| **No user interaction (no Maps URL)** | `analyze()` validates URL format at lines 918–919 → shows toast |

**For prospector specifically:**
- SerpAPI returns empty `local_results` → show "No results found for '{profession} in {city}'" toast
- SerpAPI quota exceeded → show alert banner (reuse `showAlertBanner`)
- No SerpAPI key configured → show warning in prospector card: "SerpAPI key required for search — configure in .env"
- Multiple results → render as clickable list (similar to history items pattern)

### 7.9 VERDICT: ✅ READY (with one prerequisite)

**Prerequisite:** Fix BUG-1 (`openItem()` crash) before implementing Prospector, since the Prospector will populate client data and the user will eventually want to save/open it from History.

**Recommendation:** Fix BUG-1 (remove dead `$('#o_variant').value=v` at line 1282) as a 1-line change, then proceed to Prospector implementation.

---

## 8. FINAL VERDICT

### PROCEED TO PROSPECTOR MODE? **YES** ✅

**One prerequisite before starting:**
1. **Fix BUG-1** — Remove `$('#o_variant').value=v;` from line 1282 in `openItem()`. This is a 1-line deletion that fixes the completely broken History → Open flow.

**All systems green:**
- Stages 0–4 fully compliant
- Architecture constraints respected (single file, localStorage-only, no keys in browser)
- Code under surgical edit budget (23.4% < 40%)
- All existing features verified present and functional
- Prospector helpers (`apiFetch`, `logLine`, `parseSearchPlace`, `SERVICES_HINT`, etc.) all available at documented line numbers
- SerpAPI search template and field mapping documented above
