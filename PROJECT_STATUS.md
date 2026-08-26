# PROJECT_STATUS — OpenPrompt

## Current Version: `v2.0.1` (stable, live on Vercel)

### v2.0.1 — Bug-fix patch (verified live 2026-08-26)

| Fix | What | Verified |
|---|---|---|
| Fix 1 — URL Resolution Hardening | 429 retry with 2s backoff, server-side Jina fallback (`POST /api/jina`), `logLine` on all silent paths, diagnostic tip on total failure | ✓ live (Vercel) |
| Fix 2 — Gemini 429/503 Model Fallback | `callGemini` advances to next model on HTTP 429 and 503-overload ("high demand", "overload", "resource exhausted", "temporarily unavailable") | ✓ live (Vercel) |
| Fix 3 — Insights Generation Guard | Mirrors USP gate: requires `client.prof && client.city` before calling Gemini; logs skip reason; prevents junk `client.insights` | ✓ live (Vercel) |

**Known limitation (maintenance cycle):** `gemini-2.5-flash` in `GEMINI_MODELS` is deprecated by Google (HTTP 404). Update the model list in a future patch.

## Active Branch: `main`

## Completed Features

### Base pipeline (v1)
- Google Maps URL ingestion (long + `maps.app.goo.gl` short-link resolution)
- Multi-layer extraction: SerpAPI → Jina Reader → Gemini enrichment (45s deadline)
- Review/edit step, profession auto-detection (`PROF_CATS`), services hints
- Trilingual prompt generation (EN / AR-RTL / FR / FR+AR / FR+AR+EN)
- Client history (localStorage), `.md` report + JSON export
- Local Express proxy (`server.js`) holding all upstream API keys
- Copy for Claude / Open in AI Studio / Improve with AI (Gemini rewrite)

### P0 — Open-in Buttons (v2.0.0-p0)
- 5 quick-action buttons in the results section: ↗ Claude, ↗ ChatGPT, ↗ v0, ↗ Lovable, ↗ Bolt
- `openInTool(toolName, url)`: copies `lastPrompts[currentTab]`, toasts, opens tool after 300ms

### P0 — USP Generator (v2.0.0-p0)
- `generateUSP()`: 3 distinct USPs (≤15 words each) from real client data via Gemini (temp 0.7, JSON mode)
- `#uspCard` in the review step with radio selection → `client.selectedUSP`
- Injection: `PRIMARY USP TO EMPHASIZE:` in Landing + Identity prompts; `✨ <USP>` suffix on Outreach (all 5 language branches)
- Persisted via history; restored by `openItem()` → `renderUSPCard()`

### P0 — Patient/Sentiment Insights (v2.0.0-p0)
- `generatePatientInsights()`: strengths / concerns / SEO keywords, profession-specific
  (category + services-hint context; patients↔customers switch for restaurant/legal)
- `#insightsCard` with color-coded groups: strengths `var(--ok)`, concerns `var(--warn)`, keywords `var(--info)`
- Injection: `PATIENT INSIGHTS TO USE:` block in the Landing prompt only (Identity/Outreach unaffected)
- Persisted via history; restored by `openItem()` → `renderInsightsCard()`

## Upcoming Roadmap (Phase 5 — advanced, optional)

| Feature | Priority |
|---|---|
| Competitor Gap Analysis (3 nearby competitors, rating/location compare) | 🔴 High |
| 3 Prompt Variants (Conservative / Bold / Premium) | 🟠 Medium |
| Image Prompts (Midjourney/Flux per specialty) | 🟠 Medium |
| Client Pipeline Tags (Hot Lead / Contacted / Won / Lost) | 🟡 Low |
| Color Palette Generator (per industry) | 🟡 Low |
| Batch Processing (10 URLs at once) | 🟢 Future |
| Chrome Extension (generate from Maps pages) | 🟢 Future |
| PDF Proposal export | 🟢 Future |

**Rule:** do not start Phase 5 before P0 is validated with 3 real clients. Current stable: v2.0.1.
One small, single-feature prompt per session (see MASTER_PLAN.md golden rules).
