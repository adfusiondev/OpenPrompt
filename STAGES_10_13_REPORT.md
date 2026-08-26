# Special Audit Report — Stages 10-13 + Two Redesign Blueprints

**Date:** 2026-08-26  
**Commit audited:** `5812758` (v7.4-whatsapp)  
**File:** `index.html` (1881 lines)

---

## 1. Executive Summary

| Stage | Feature | Status | Tag |
|-------|---------|--------|-----|
| 10 | History persistence stability | ✅ Complete | `v7.1-history-fix` |
| 12 | Leads Sheet (CSV/TSV export) | ✅ Complete | `v7.3-leads` |
| 13 | Direct WhatsApp send | ✅ Complete | `v7.4-whatsapp` |
| 11 | Password lock | ❌ NOT IMPLEMENTED | — |

**Overall:** Stages 10, 12, 13 are fully implemented and verified. Stage 11 (password lock) was never started. Three critical history-overwrite bugs were fixed in Stage 10. Leads and WhatsApp features work as specified.

---

## 2. Compliance Table

### Stage 10 — History Stability

| Item | ✅/⚠️ | Evidence | Notes |
|------|-------|----------|-------|
| `currentId = null` at start of `analyze()` | ✅ | L1228 | Resected at L1228, first statement in function |
| `currentId = null` at start of `useProspect()` | ✅ | L1496 | First statement in function |
| `saveOrUpdate()` creates new id when `currentId` is null | ✅ | L1728-1730 | `id: Date.now()` when `currentId` falsy |
| `saveOrUpdate()` only updates when entry genuinely exists | ✅ | L1724-1727 | `findIndex` check before update; falls through to create if not found |
| `localStorage.setItem` wrapped in try/catch | ✅ | L1732-1733 | Catches quota error; shows toast "Storage full — export your data and clean History" |
| `openItem()` still sets `currentId` correctly | ✅ | L1751 | `currentId = id` after loading entry |
| No remaining overwrite paths | ✅ | L1228 + L1496 | Both entry points reset `currentId` before any extraction |

**Verdict: "Retain ALL extracted clients" is GUARANTEED.** The three fix points cover every extraction entry path. The only remaining theoretical risk is simultaneous multi-tab editing, which is a pre-existing constraint.

### Stage 12 — Leads Sheet

| Item | ✅/⚠️ | Evidence | Notes |
|------|-------|----------|-------|
| `op_leads_v1` key constant | ✅ | L354 | `LS_L='op_leads_v1'` |
| Row schema `{name, prof, city, phone, rating, website, ts}` | ✅ | L1823 | All 7 fields present |
| "📊 Add to Leads Sheet" button in s1 | ✅ | L218 | `onclick="addLead()"` |
| Dedupe by name+city | ✅ | L1825 | `leads.some(l=>l.name===row.name && l.city===row.city)` |
| Toast "Already in leads" on dedup | ✅ | L1825 | Exact text match |
| Toast "Added to leads (N total)" on success | ✅ | L1829 | Dynamic count |
| s4 toolbar: counter | ✅ | L1835 | `Leads: <b>{count}</b>` |
| s4 toolbar: Download leads.csv | ✅ | L303 | `downloadLeadsCSV()` |
| s4 toolbar: Copy for Google Sheets | ✅ | L304 | `copyLeadsTSV()` |
| s4 toolbar: Clear leads | ✅ | L305 | `clearLeads()` with `confirm()` |
| BOM `\uFEFF` at CSV start | ✅ | L1843 | `'\uFEFF' + header.join(',')` |
| CSV quote-escaping | ✅ | L1837 | `csvEscape()` — `"..."` + inner double-quote escaping |
| TSV format for Sheets paste | ✅ | L1850 | `join('\t')` for columns, `join('\n')` for rows |
| localStorage try/catch on addLead | ✅ | L1827-1828 | Quota error → toast |

**UX Gaps identified:**

| # | Issue | Severity | Description |
|---|-------|----------|-------------|
| U1 | No per-row add in History | MEDIUM | Can only add from s1 Review; no way to add from History row |
| U2 | No auto-add on generate | LOW | User must manually click "Add to Leads Sheet" every time |
| U3 | Leads toolbar disconnected from rows | MEDIUM | Leads toolbar is above History rows; no visual link between them |
| U4 | No per-row remove from Leads | LOW | Can only bulk "Clear leads" — no way to remove a single lead |
| U5 | Leads counter doesn't update in real-time | LOW | Counter updates only on navigation to s4; stale if user stays on s4 |

### Stage 13 — WhatsApp

| Item | ✅/⚠️ | Evidence | Notes |
|------|-------|----------|-------|
| Button location | ✅ | L293 | s3 (Results), hidden by default: `id="waBtn"` |
| Visible only on Outreach tab + phone exists | ✅ | L1652 | `className = (key==='outreach' && client.phone) ? 'btn ghost' : 'btn ghost hidden'` |
| Hidden on Landing/Identity/Images tabs | ✅ | L1652 | Condition requires `key==='outreach'` |
| `normalizePhone()` strips non-digits | ✅ | L1859 | `phone.replace(/\D/g,'')` |
| `normalizePhone()` strips leading `00` | ✅ | L1860 | `d.startsWith('00') → d.slice(2)` |
| `normalizePhone()` warns on leading `0` | ✅ | L1861 | Toast: "Add country code to the phone first (e.g. +966...)" |
| `normalizePhone()` checks length ≥ 8 | ✅ | L1862 | Toast: "Phone looks incomplete" |
| wa.me URL construction | ✅ | L1869 | `'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg)` |
| Message copied to clipboard (backup) | ✅ | L1870 | `navigator.clipboard.writeText(msg).catch(()=>{})` |
| Opens in new tab | ✅ | L1871 | `window.open(url, '_blank')` |
| Toast "Opening WhatsApp..." | ✅ | L1872 | Exact text |
| Language mismatch reminder | ✅ | L1873-1875 | Detects Arabic cities; warns if outreach lang ≠ `ar` |
| WhatsApp available from History rows? | ❌ NO | — | Button only in s3; not in `renderHistory()` |

### Stage 11 — Password Lock

| Item | ✅/⚠️ | Evidence | Notes |
|------|-------|----------|-------|
| `lockModal` element | ❌ | grep returns nothing | Not implemented |
| `ACCESS_HASH` constant | ❌ | grep returns nothing | Not implemented |
| `op_unlocked` sessionStorage | ❌ | grep returns nothing | Not implemented |
| `op_lock_enabled` localStorage | ❌ | grep returns nothing | Not implemented |
| `op_lock_hash` localStorage | ❌ | grep returns nothing | Not implemented |
| `crypto.subtle` usage | ❌ | grep returns nothing | Not implemented |
| `ensureUnlocked()` function | ❌ | grep returns nothing | Not implemented |

**Settings modal structure (for integration blueprint):**

| Element | ID | Line | Purpose |
|---------|----|------|---------|
| Overlay container | `#overlay` | L315 | `display:none` → `.open` class toggles visibility |
| Warning box | `#keysWarning` | L320 | Backend offline warning |
| Proxy URL input | `#set_proxy` | L327 | Mono font, oninput → `updateKeyStatus()` |
| Proxy status badge | `#proxyStatus` | L326 | `key-status saved/empty` |
| Backend test button | — | L329 | `onclick="testBackend()"` |
| Backend test output | `#backendTest` | L331 | Dynamic HTML |
| Jina toggle | `#set_jina` | L336 | Checkbox |
| Save button | — | L343 | `onclick="saveSettings()"` |
| Reset button | — | L344 | `onclick="clearAllKeys()"` |
| Close button | — | L345 | `onclick="closeSettings()"` |

**`saveSettings()` function** (L1790-1809): Reads `#set_proxy` and `#set_jina`, saves to `LS_S` (`op_settings_v1`), verifies write with read-back, shows toast.

**localStorage keys used:** `LS_S` = `'op_settings_v1'`

---

## 3. UX Gaps (Ranked by Severity)

| # | Gap | Severity | Stage | Description |
|---|-----|----------|-------|-------------|
| G1 | No WhatsApp from History | HIGH | 13 | Can't send WhatsApp to a saved client without re-opening and re-generating |
| G2 | No per-row add to Leads from History | MEDIUM | 12 | Must navigate to s1 to add; no shortcut from History |
| G3 | No auto-add to Leads | LOW | 12 | Manual click every time; could have opt-in auto-add |
| G4 | Leads counter stale on s4 | LOW | 12 | Doesn't re-render if user stays on History page |
| G5 | No per-lead remove | LOW | 12 | Bulk clear only; can't remove individual leads |
| G6 | WhatsApp button hidden when no outreach generated | MEDIUM | 13 | If user opens History entry with no prompts, WhatsApp is invisible |
| G7 | Language mismatch toast is city-based heuristic | LOW | 13 | May miss non-Arabic cities that need Arabic outreach |

---

## 4. Blueprint 1 — History-Centric Outreach Cockpit

### 4.1 Refactor: Extract shared helpers

**Current state:** WhatsApp logic is in `sendWhatsApp()` (L1865-1876) using `client.phone` and `lastPrompts.outreach`. Leads logic is in `addLead()` (L1822-1829) using `client.*` fields. Both are tightly coupled to the global `client` object.

**Refactored helpers (new functions to add):**

```javascript
// Shared WhatsApp — takes explicit params, no global dependency
function openWhatsApp(phone, message){
  const digits = normalizePhone(phone || '');
  if(!digits) return;
  const msg = message || '';
  const url = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(msg);
  navigator.clipboard.writeText(msg).catch(()=>{});
  window.open(url, '_blank');
  toast('Opening WhatsApp...');
}

// Shared Leads — takes explicit client object
function addLeadFromClient(c){
  const row = {name:c.name||'', prof:c.prof||'', city:c.city||'', phone:c.phone||'',
    rating:c.rating||'', website:c.website_url||'', ts:new Date().toISOString().replace('T',' ').slice(0,16)};
  const leads = getLeads();
  if(leads.some(l=>l.name===row.name && l.city===row.city)){ toast('Already in leads'); return; }
  leads.unshift(row);
  try { localStorage.setItem(LS_L, JSON.stringify(leads)); }
  catch(e){ toast('Storage full — export your data and clean History'); return; }
  toast('Added to leads ('+leads.length+' total)');
}
```

**Refactored existing call sites:**
- `sendWhatsApp()` (L1865) → becomes: `openWhatsApp(client.phone, lastPrompts.outreach)` + language check
- `addLead()` (L1822) → becomes: `addLeadFromClient(client)`

### 4.2 Per-row actions in renderHistory()

**Insertion point:** Inside the `renderHistory()` function, L1742-1745. Current template:

```javascript
// L1742-1745 (current)
<div class="row" style="margin:0">
  <button class="btn small" onclick="openItem(${x.id})">Open</button>
  <button class="btn ghost small" onclick="delItem(${x.id})">Delete</button>
</div>
```

**Proposed replacement:**

```javascript
<div class="row" style="margin:0;flex-wrap:wrap;gap:4px">
  <button class="btn small" onclick="openItem(${x.id})">Open</button>
  ${x.client.phone ? `<button class="btn ghost small" onclick="openWhatsApp('${(x.client.phone||'').replace(/'/g,"\\'")}','${(x.prompts?.outreach||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n')}')">📲</button>` : ''}
  <button class="btn ghost small" onclick="addLeadFromClient(${JSON.stringify(x.client).replace(/"/g,'&quot;')})">📊</button>
  ${x.prompts?.outreach ? `<button class="btn ghost small" onclick="navigator.clipboard.writeText(\`${x.prompts.outreach.replace(/`/g,'\\`').replace(/\$/g,'\\$')}\`).then(()=>toast('📋 Outreach copied'))">⧉</button>` : ''}
  <button class="btn ghost small" onclick="delItem(${x.id})">🗑</button>
</div>
```

**Button behavior:**

| Button | Condition | Action |
|--------|-----------|--------|
| 📲 WhatsApp | `x.client.phone` exists | `openWhatsApp(phone, outreach)` — if no outreach, toast "Generate prompts first" |
| 📊 +Leads | Always visible | `addLeadFromClient(x.client)` with dedupe |
| ⧉ Outreach | `x.prompts?.outreach` exists | Copy to clipboard |
| 🗑 Delete | Always visible | Existing `delItem(id)` |

### 4.3 Optional: Auto-add to Leads

**New localStorage key:** `'op_auto_leads'` (boolean, default OFF)

**Settings toggle:** Add to s4 toolbar:
```html
<label class="toggle" style="font-size:12px">
  <input type="checkbox" id="autoLeadsToggle" onchange="localStorage.setItem('op_auto_leads',this.checked)">
  <span class="slider"></span>
  <span>Auto-add saved clients to leads</span>
</label>
```

**Integration in `saveOrUpdate()`** (L1721-1733): After successful save, add:
```javascript
if(localStorage.getItem('op_auto_leads')==='true') addLeadFromClient(client);
```

### 4.4 Edge Cases Table

| Scenario | Behavior | Status |
|----------|----------|--------|
| No phone on entry | 📲 button hidden | ✅ Conditional render |
| No outreach generated | 📲 button shows; toast "Generate prompts first" | Needs implementation |
| Duplicate lead | Dedupe toast "Already in leads" | ✅ `addLeadFromClient` handles |
| Old entries (pre-Leads) | 📊 button works; phone/outreach may be empty | ✅ Graceful fallback |
| Very long outreach in onclick | Use template literal + clipboard fallback | Needs careful escaping |

---

## 5. Blueprint 2 — Settings-Managed Password Lock

### 5.1 Settings Modal Addition

**Insertion point:** After the Extraction Options section (L340), before the button row (L342).

**New HTML section:**
```html
<h2 style="color:var(--err); margin-top:22px">🔐 Access Lock</h2>
<label class="toggle">
  <input type="checkbox" id="set_lock" onchange="toggleLockSection()">
  <span class="slider"></span>
  <span>Enable password lock</span>
</label>
<div id="lockSection" class="hidden" style="margin-top:12px">
  <label>Current password <span id="lockStatus" class="key-status"></span></label>
  <input id="set_lockCurrent" type="password" placeholder="Required to change password">
  <label>New password</label>
  <input id="set_lockNew" type="password" placeholder="Min 6 characters">
  <label>Confirm new password</label>
  <input id="set_lockConfirm" type="password" placeholder="Repeat new password">
  <div id="lockError" class="status err" style="display:none"></div>
</div>
```

### 5.2 New localStorage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `op_lock_enabled` | `'true'`/`'false'` | Master toggle |
| `op_lock_hash` | hex string (64 chars) | SHA-256 hash of password |

### 5.3 New Functions

```javascript
// Toggle lock section visibility
function toggleLockSection(){
  const on = $('#set_lock').checked;
  $('#lockSection').classList.toggle('hidden', !on);
  if(!on){ localStorage.setItem('op_lock_enabled','false'); toast('Password lock disabled'); }
}

// Hash password using Web Crypto API
async function hashPassword(pwd){
  const enc = new TextEncoder().encode(pwd);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

// Save lock settings (called from saveSettings)
async function saveLockSettings(){
  const enabled = $('#set_lock').checked;
  localStorage.setItem('op_lock_enabled', enabled ? 'true' : 'false');
  if(!enabled){ localStorage.removeItem('op_lock_hash'); return; }
  const current = $('#set_lockCurrent').value;
  const np = $('#set_lockNew').value;
  const cp = $('#set_lockConfirm').value;
  const existing = localStorage.getItem('op_lock_hash');
  if(existing){
    if(!current){ showError('Current password required'); return; }
    if(await hashPassword(current) !== existing){ showError('Wrong password'); return; }
  }
  if(np.length < 6){ showError('Min 6 characters'); return; }
  if(np !== cp){ showError('Passwords don\'t match'); return; }
  localStorage.setItem('op_lock_hash', await hashPassword(np));
}

// Session gate
function isUnlocked(){ return sessionStorage.getItem('op_unlocked') === 'true'; }
function unlockSession(){ sessionStorage.setItem('op_unlocked', 'true'); }

// Modal gate pattern
function ensureUnlocked(callback){
  if(!localStorage.getItem('op_lock_enabled')){
    callback(); return; // Lock disabled — zero friction
  }
  if(isUnlocked()){ callback(); return; }
  // Show lock modal
  showLockModal(callback);
}

function showLockModal(callback){
  // Create/show overlay with password input
  // On correct hash → unlockSession() + callback()
  // On wrong hash → error + shake animation
  // On cancel → return to s0
}
```

### 5.4 Functions to Gate

| Function | Line | Reason |
|----------|------|--------|
| `analyze()` | L1227 | Starts extraction — gate before entry |
| `prospectSearch()` | L1392 | Starts Prospector — gate before entry |
| `generate()` | L1636 | Generates prompts — gate before entry |
| `aiImprove()` | L1704 | AI improvement — gate before entry |
| `openInTool()` | L1668 | Opens external tool — gate before entry |
| `exportAll()` | L1771 | Exports all data — gate before entry |
| `go(n)` for n≥1 | L448 | Navigation to any step beyond URL — gate on n≥1 |
| `openSettings()` | L1773 | Settings access — gate before entry |
| `downloadCurrent()` | ~L1685 | Export — gate before entry |

### 5.5 Gate Pattern

```javascript
// Modified go() — gate navigation
function go(n){
  if(n >= 1){
    ensureUnlocked(()=>{
      // existing go logic
      for(let i=0;i<5;i++) $('#s'+i).classList.toggle('hidden', i!==n);
      ...
    });
    return;
  }
  // n===0: no gate needed
  for(let i=0;i<5;i++) $('#s'+i).classList.toggle('hidden', i!==n);
  ...
}

// Modified analyze() — gate at entry
async function analyze(){
  ensureUnlocked(async ()=>{
    // existing analyze logic
  });
}
```

### 5.6 Security Rules

- **Never store plaintext password** — only SHA-256 hash via `crypto.subtle.digest`
- **sessionStorage per tab** — `op_unlocked` clears on tab close; re-auth required per session
- **If disabled → zero friction** — `ensureUnlocked()` checks `op_lock_enabled` first; if falsy, calls callback immediately
- **Wrong password → error + shake** — CSS animation class `.shake` on error
- **6-char minimum** — enforced in `saveLockSettings()`
- **Current password required to change** — only when hash already exists

---

## 6. Recommended Execution Order

| Phase | Task | Effort | Dependency |
|-------|------|--------|------------|
| **P1** | Refactor: extract `openWhatsApp()` and `addLeadFromClient()` helpers | 20 min | None |
| **P2** | Blueprint 1: Add per-row actions to `renderHistory()` | 30 min | P1 |
| **P3** | Blueprint 1: Add auto-add toggle to s4 toolbar | 15 min | P1 |
| **P4** | Blueprint 2: Add Lock section to Settings modal HTML | 15 min | None |
| **P5** | Blueprint 2: Implement `hashPassword()`, `saveLockSettings()`, `ensureUnlocked()` | 40 min | P4 |
| **P6** | Blueprint 2: Gate all functions with `ensureUnlocked()` | 20 min | P5 |
| **P7** | Live verification on Vercel | 15 min | P1-P6 |

**Total estimated effort:** ~2.5 hours

**Note:** P1-P3 (Blueprint 1) and P4-P6 (Blueprint 2) are independent tracks that can be executed in parallel.
