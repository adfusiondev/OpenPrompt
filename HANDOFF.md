# HANDOFF — OpenPrompt

## Last Session Summary (P0 implementation → v2.0.0-p0)

Implemented the full P0 feature set from `MASTER_PLAN.md` as three surgical,
individually-committed edits to `index.html` (no other code files touched,
`server.js` unchanged):

| Commit | Feature |
|---|---|
| `cb42b52` | Open-in buttons (Claude / ChatGPT / v0 / Lovable / Bolt) via `openInTool()` |
| `84bc02e` | USP generator: `generateUSP()` + `#uspCard` radios + injection into all 3 prompts |
| `b8d0ec9` | Patient insights: `generatePatientInsights()` + `#insightsCard` + landing-only injection |

Supporting docs: `e6b2589` (`P0_IMPLEMENTATION_SPEC.md` — line-level spec).

All edits followed the spec's invariants: single-file constraint, all Gemini
traffic through `callGemini()` (model fallback intact), no new localStorage keys,
trilingual outreach branches untouched, DOM-safe rendering (`createElement` +
`textContent` for AI-generated strings), every AI failure non-blocking.

## Verified Smoke Tests (browser, file:// load)

- **Task 1**: `node --check` on extracted inline script passed; buttons render in `#s3` row.
- **Task 2 (12 assertions passed)**: `#uspCard` hidden by default; 3 radios render;
  selection sets `client.selectedUSP`; USP present in Landing/Identity/Outreach
  (tested on `fr_ar` branch); no-USP landing output byte-identical to pre-feature
  template; history pre-selection restore; card hides on empty `usps`.
- **Task 3 (17 assertions passed)**: `#insightsCard` hidden by default; 3 color-coded
  groups render (`--ok`/`--warn`/`--info`); `PATIENT INSIGHTS TO USE:` block in Landing
  only (between VISUAL TONE and SECTIONS); Identity/Outreach clean; USP suffix still in
  Outreach; no-insights landing byte-identical; partial insights render only present
  groups; card hides on empty insights.
- **Console**: only pre-existing Chromium `file://` unique-origin artifact; zero JS errors from new code.
- **Not yet done**: live end-to-end run against the real proxy with API keys
  (`npm start` + a real Maps URL) and history round-trip across page reload — see quickstart below.

## Instructions for the Next Agent Session

1. **Read first, always**: `AGENTS.md`, `PROJECT_CONTEXT.md`, `PROJECT_STATUS.md`,
   `P0_IMPLEMENTATION_SPEC.md`, and `MASTER_PLAN.md` — before touching any file.
2. **Read `index.html` completely** before editing; make minimal surgical edits,
   never rewrite the file (MASTER_PLAN golden rules).
3. **Verify after every edit**: extract the inline `<script>` and run `node --check`;
   then load `index.html` in a browser and exercise the changed path.
4. **Live validation quickstart**:
   `npm install && npm start` (keys in `.env`, see `.env.example`) → open `index.html`
   → paste `https://maps.app.goo.gl/W2fnE58QHCoc5A4N8` → walk all 5 steps →
   confirm USP + insights cards, prompt injection, open-in buttons, history round-trip.
5. **Never**: add frontend dependencies, move keys to the browser, call upstream
   APIs directly from `index.html`, change the history item shape incompatibly,
   or commit `.env` / real keys.
6. **Next work**: Phase 5 items in `PROJECT_STATUS.md` — one feature per session,
   spec-first, commit per phase.
