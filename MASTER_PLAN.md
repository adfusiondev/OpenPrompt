# 📘 OpenPrompt — Master Development Plan
## الخطة الشاملة لتطوير الأداة — جميع المراحل والمتطلبات

**المشروع:** OpenPrompt (App.OpenPrompt)
**الرابط الحي:** https://open-prompt-three.vercel.app
**الغرض:** أداة شخصية لتسريع وتطوير عمل تصميم صفحات الهبوط للعملاء المستهدفين
**آخر تحديث:** المرحلة الحالية = P0

---

# 📋 فهرس المراحل

| المرحلة | الاسم | الوقت | نسبة النجاح المتوقعة | الحالة |
|---|---|---|---|---|
| 0 | النسخ الاحتياطي والتجهيز | 10 دقائق | 100% | ⬜ |
| 1 | أزرار Open-in (Claude/v0/Lovable...) | 15-30 دقيقة | 95% | ⬜ |
| 2 | مولّد USP (نقطة البيع الفريدة) | 30-45 دقيقة | 80% | ⬜ |
| 3 | Patient Insights (رؤى المرضى) | 30-45 دقيقة | 75% | ⬜ |
| 4 | الاختبار الشامل والنشر | 30 دقيقة | 100% | ⬜ |
| 5 | ميزات متقدمة (اختيارية) | لاحقًا | — | ⬜ |
| 6 | Prospector Mode (البحث عن العملاء) | 30-45 دقيقة | 95% | ✅ |
| 7 | Competitor Gap Analysis + Outreach Language | 45-60 دقيقة | 90% | ✅ |
| 7.5 | Unified Outreach Templates (AR/EN/FR) | 15 دقيقة | 100% | ✅ |

---

# 🎯 نظرة عامة على المشروع

## ما تفعله الأداة حاليًا (v1 — يعمل)
1. لصق رابط Google Maps لأي نشاط تجاري
2. استخراج البيانات عبر 4 طبقات: SerpAPI → Google CSE → Jina Reader → Gemini
3. مراجعة وتعديل البيانات يدويًا
4. اختيار اللغة (EN/AR-RTL/FR) + CTA + النبرة البصرية
5. توليد 3 مخرجات: Landing Page Prompt + Visual Identity Prompt + Outreach Message
6. حفظ العملاء في History + تصدير/نسخ

## القيود التقنية الصارمة (لا تُكسر أبدًا)
- ملف HTML واحد مكتفٍ ذاتيًا (CSS + JS داخلي)
- بدون backend، بدون build step، بدون npm dependencies
- التخزين: localStorage فقط
- واجهة إنجليزية فقط، والمخرجات تدعم 3 لغات
- التصميم الداكن monospace (نمط opencode.ai)
- المفاتيح في localStorage فقط — لا hardcode أبدًا

---

# 🥇 القواعد الذهبية للتعامل مع OpenCode

**أضف هذا البلوك في نهاية كل برومبت ترسله لـ OpenCode:**

```
## CRITICAL RULES:
1. Read index.html COMPLETELY before making any changes
2. Make MINIMAL, SURGICAL edits — do NOT rewrite the file
3. Preserve ALL existing functionality — never break working features
4. Before editing, briefly explain your plan in 3-5 lines
5. If unsure about existing code, ask before editing
6. Show me the exact lines you'll add/modify before committing
```

**قواعد العمل:**
- ✅ برومبت واحد صغير لكل مرحلة (لا تجمع الميزات)
- ✅ اختبر كل مرحلة قبل الانتقال للتالية
- ✅ commit بعد كل مرحلة ناجحة
- ❌ لا تسمح بإعادة كتابة index.html كاملة
- ❌ لا تطلب استخراج نصوص المراجعات من SerpAPI (غير متاح مجانًا)

---

# 🟢 المرحلة 0 — النسخ الاحتياطي والتجهيز

## 🎯 الهدف
تأمين نقطة رجوع آمنة قبل أي تعديل.

## ⏱️ الوقت: 10 دقائق

## 📝 المطلوب تنفيذه (أوامر Terminal)
```bash
cd ~/Documents/App.OpenPrompt
git add -A
git commit -m "checkpoint: v1 stable before P0 development"
git tag v1-stable
```

## ✅ معايير النجاح
- [ ] الأمر `git tag` يعرض `v1-stable`
- [ ] الأداة تعمل على Vercel بدون أخطاء

## 🚨 للرجوع للنقطة الآمنة في أي وقت
```bash
git checkout v1-stable -- index.html
```

---

# 🟡 المرحلة 1 — أزرار Open-in (الأعلى ROI)

## 🎯 الهدف
أزرار تفتح البرومبت مباشرة في أدوات التصميم (Claude, ChatGPT, v0, Lovable, Bolt) — توفر 30-60 ثانية لكل برومبت.

## ⏱️ الوقت: 15-30 دقيقة | 📈 النجاح: 95%

## 📝 البرومبت الكامل لـ OpenCode

```text
# TASK: Add "Open in [tool]" buttons to OpenPrompt

## File to modify: index.html (ONLY this file)

## What to do:
In the Results section (id="s3"), inside the .row div that contains
Copy/Download/AI buttons, ADD these 5 new buttons (same ghost style):

1. "↗ Claude"  — copies current prompt + opens https://claude.ai/new
2. "↗ ChatGPT" — copies + opens https://chatgpt.com
3. "↗ v0"      — copies + opens https://v0.dev
4. "↗ Lovable" — copies + opens https://lovable.dev
5. "↗ Bolt"    — copies + opens https://bolt.new

## Implementation details:
- Create ONE function: openInTool(toolName, url)
- Each button: onclick="openInTool('Claude', 'https://claude.ai/new')"
- The function must:
  1. Copy lastPrompts[currentTab] to clipboard
  2. Show toast "Copied! Opening [tool]..."
  3. setTimeout 300ms then window.open(url, '_blank')

## Constraints:
- DO NOT rewrite the file. MINIMAL edits only.
- Add buttons AFTER the existing "⧉ Copy" button.
- Same CSS classes (btn ghost) for visual consistency.
- Keep ALL existing functionality intact.

## Test:
Open app → generate prompts → click each new button →
verify clipboard content + new tab opens.

[PASTE THE CRITICAL RULES BLOCK HERE]
```

## ✅ معايير النجاح
- [ ] 5 أزرار جديدة تظهر في شاشة النتائج
- [ ] كل زر ينسخ البرومبت ويفتح الأداة الصحيحة
- [ ] الميزات القديمة تعمل كما كانت

## 🚨 إذا فشل
اطلب: "make minimal edits only, do not rewrite the file, show me the diff first"

## 💾 Commit
```bash
git add -A && git commit -m "feat: open-in buttons for AI design tools"
```

---

# 🟡 المرحلة 2 — مولّد USP (نقطة البيع الفريدة)

## 🎯 الهدف
توليد 3 خيارات USP لكل عميل بناءً على بياناته الحقيقية، تُدمج تلقائيًا في كل البرومبتات.

## ⏱️ الوقت: 30-45 دقيقة | 📈 النجاح: 80%

## 📝 البرومبت الكامل لـ OpenCode

```text
# TASK: Add USP Generator to OpenPrompt

## File to modify: index.html ONLY

## What to do:
After the extraction pipeline completes in analyze(), IF client has
name + prof + city, call: await generateUSP(client)

## generateUSP(client) function:
1. Use Gemini API (existing key from localStorage, existing model fallback)
2. Send this prompt:
   """
   Generate 3 distinct Unique Selling Proposition (USP) options.
   Business: [name], [prof], [city]
   Rating: [rating] stars ([reviews] reviews)
   Website: [website] | Hours: [hours]
   Each USP = one compelling sentence, max 15 words.
   Return JSON: {"usps": ["...", "...", "..."]}
   """
3. Store in client.usps
4. Render as 3 radio buttons in a new card in step s1

## UI to add (in section s1, after the preview div):
<div id="uspCard" class="hidden" style="margin-top:16px; padding:14px;
  background:#0a0a09; border:1px solid var(--border); border-radius:6px">
  <label style="color:var(--ok); font-weight:600">🎯 Select a USP:</label>
  <div id="uspOptions"></div>
</div>
Radio change → updates client.selectedUSP

## Integrate into prompts:
In buildPrompts(), if client.selectedUSP exists, add to ALL 3 outputs:
  "PRIMARY USP TO EMPHASIZE: [selectedUSP]"

## Constraints:
- MINIMAL edits, preserve existing code
- Hide uspCard if generation fails (never block the flow)

## Test:
Run full flow → USPs appear → select one → verify it appears
in landing + identity + outreach prompts.

[PASTE THE CRITICAL RULES BLOCK HERE]
```

## ✅ معايير النجاح
- [ ] 3 خيارات USP تظهر بعد الاستخراج
- [ ] الاختيار يُحفظ ويظهر في المخرجات الثلاثة
- [ ] الفشل في التوليد لا يكسر الـ flow

## 🚨 إذا فشل
بسّط: "generate 2 USPs instead of 3, and wrap in try/catch so failure is silent"

## 💾 Commit
```bash
git add -A && git commit -m "feat: USP generator with prompt integration"
```

---

# 🟡 المرحلة 3 — Patient Insights (رؤى المرضى)

## 🎯 الهدف
توليد رؤى واقعية عن نقاط قوة وشكاوى المرضى حسب التخصص، تُستخدم كشهادات وFAQ وSEO keywords.

**ملاحظة:** SerpAPI المجاني لا يوفر نصوص المراجعات، لذلك نستخدم Gemini لتوليد رؤى "محتملة واقعية" حسب التخصص.

## ⏱️ الوقت: 30-45 دقيقة | 📈 النجاح: 75%

## 📝 البرومبت الكامل لـ OpenCode

```text
# TASK: Add Patient Insights to OpenPrompt

## File to modify: index.html ONLY

## What to do:
In analyze(), after extraction completes, call:
  await generatePatientInsights(client)

## generatePatientInsights(client) function:
Send to Gemini:
  """
  You are a patient sentiment analyst. For a [prof] in [city]
  with [rating] stars from [reviews] reviews, generate realistic insights.
  Return JSON:
  {
    "strengths": [3 likely patient compliments with short quotes],
    "concerns": [3 likely patient pain points],
    "keywords": [5-8 phrases patients use when searching]
  }
  Be realistic and profession-specific (dental vs beauty vs medical).
  """
Store in client.insights

## UI to add (in section s1, after uspCard):
<div id="insightsCard" class="hidden" style="margin-top:16px; padding:14px;
  background:#0a0a09; border:1px solid var(--border); border-radius:6px">
  <label style="color:var(--info); font-weight:600">💬 Patient Insights:</label>
  <div id="insightsContent"></div>
</div>
Colors: strengths=green, concerns=orange, keywords=blue

## Integrate into landing prompt:
In buildPrompts(), if client.insights exists, add:
  "PATIENT INSIGHTS TO USE:
   - Testimonial inspiration: [strengths]
   - Address in FAQ: [concerns]
   - SEO keywords: [keywords]"

## Constraints:
- MINIMAL edits, use existing Gemini pattern
- Hide card silently if generation fails

## Test:
Run with a dental clinic URL → verify insights are profession-specific.

[PASTE THE CRITICAL RULES BLOCK HERE]
```

## ✅ معايير النجاح
- [ ] بطاقات الرؤى تظهر بألوان مميزة
- [ ] الرؤى تتغير حسب التخصص (أسنان ≠ تجميل)
- [ ] البرومبت النهائي يحتوي قسم Patient Insights

## 🚨 إذا فشل
اطلب: "skip insights silently on any error, never block the main flow"

## 💾 Commit
```bash
git add -A && git commit -m "feat: patient insights for richer prompts"
```

---

# 🔵 المرحلة 4 — الاختبار الشامل والنشر

## 🎯 الهدف
التأكد من أن كل شيء يعمل معًا، ثم النشر على Vercel.

## ⏱️ الوقت: 30 دقيقة

## 📝 قائمة الاختبار الكامل (نفّذها يدويًا)

### اختبار الـ Workflow الكامل
- [ ] لصق رابط: https://maps.app.goo.gl/W2fnE58QHCoc5A4N8
- [ ] الاستخراج يعمل (أو يوجّه للإعدادات بوضوح)
- [ ] USP يظهر ويمكن اختياره
- [ ] Patient Insights تظهر
- [ ] توليد البرومبتات الثلاثة
- [ ] أزرار Open-in الخمسة تعمل
- [ ] الحفظ في History يعمل
- [ ] فتح عميل قديم من History يعمل
- [ ] التصدير .md و JSON يعمل

### اختبار الأمان
- [ ] بدون مفاتيح API → الأداة توجه للإعدادات ولا تنهار
- [ ] وضع Incognito → تحذير واضح يظهر

## 📝 النشر على Vercel
```bash
cd ~/Documents/App.OpenPrompt
git add -A
git commit -m "release: P0 complete — open-in, USP, insights"
git tag v2-p0
git push origin main --tags
# Vercel ينشر تلقائيًا عند push
```

## ✅ معايير النجاح
- [ ] كل بنود الاختبار ✅
- [ ] الرابط الحي يعمل بالنسخة الجديدة

---

# 🟣 المرحلة 5 — ميزات متقدمة (اختيارية، لاحقًا)

**لا تبدأ هذه قبل إتمام P0 واختبارها على 3 عملاء حقيقيين.**

| الميزة | الوصف | الأولوية |
|---|---|---|
| Competitor Gap Analysis | استخراج 3 منافسين قريبين ومقارنة التقييم/الموقع | 🔴 عالية |
| 3 Prompt Variants | نسخ Conservative / Bold / Premium لكل عميل | 🟠 متوسطة |
| Image Prompts | برومبتات Midjourney/Flux للصور حسب التخصص | 🟠 متوسطة |
| Client Pipeline Tags | حالات: Hot Lead / Contacted / Won / Lost | 🟡 منخفضة |
| Color Palette Generator | لوحات ألوان جاهزة حسب القطاع | 🟡 منخفضة |
| Batch Processing | معالجة 10 روابط دفعة واحدة | 🟢 مستقبلية |
| Chrome Extension | زر توليد على صفحات Google Maps مباشرة | 🟢 مستقبلية |
| PDF Proposal | تقرير عرض احترافي للعميل | 🟢 مستقبلية |

**قاعدة:** عند البدء بأي ميزة هنا، اكتب برومبت منفصل صغير بنفس نمط المراحل 1-3.

---

# 🟢 المرحلة 6 — Prospector Mode (البحث عن العملاء)

## 🎯 الهدف
البحث المباشر عن أعمال محلية بدون مواقع إلكترونية — العملاء المثاليون لبيع صفحات الهبوط.

## ⏱️ الوقت: 30-45 دقيقة | 📈 النجاح: 95%

## الميزات المُنجزة
- ✅ بحث SerpAPI حسب المهنة + المدينة
- ✅ فلاتر: بدون موقع فقط / أدنى تقييم / أدنى مراجعات
- ✅ عرض النتائج كبطاقات مع badges (🎯 NO WEBSITE / HAS WEBSITE)
- ✅ "Use →" يعبأ جميع الحقول تلقائيًا وينتقل لخطوة المراجعة
- ✅ شارة 🎯 Prospected في History
- ✅ source: 'prospected' محفوظ مع كل عميل مُستجل

## ✅ معايير النجاح
- [ ] البحث يعرض نتائج حقيقية من SerpAPI
- [ ] فلتر "بدون موقع" يعمل
- [ ] فلاتر التقييم والمراجعات تعمل
- [ ] "Use →" يعبأ الخطوة 2 correctly
- [ ] History يعرض شارة 🎯
- [ ] الميزات القديمة لم تتأثر

---

# 🔵 المرحلة 7.5 — Unified Outreach Templates (AR/EN/FR)

## 🎯 الهدف
تحديث قالب buildOutreach ليضمن نظام التنافس لجميع اللغات (العربية/الإنجليزية/الفرنسية).

## ⏱️ الوقت: 15 دقيقة | 📈 النجاح: 100%

## التغييرات
- ✅ إعادة بناء بين القالب buildOutreach القديم
- ✅ قالب template موحدث للعلامات الناقصة لكل لغة
- ✅ العربية: greeting + observation + competitive landscape + position + CTA
- ✅ الإنجليزية: greeting + observation + competitive landscape + position + CTA
- ✅ الفرنسية: greeting + observation + competitive landscape + position + CTA
- ✅ تخطية الافتراضي من 'ar' إلى 'en'
- ✅ مرجع تمام بجميع الحالات (لا مصروفات)
- ✅ try/catch مع fallback إنجليزي عند فشل التمبوئ

## ✅ معايير النجاح
- [ ] رسالة AR تحتوي على المشهد التنافسي
- [ ] رسالة FR تحتوي على المشهد التنافسي
- [ ] رسالة EN تحتوي على المشهد التنافسي
- [ ] لا أخطاء في Console

---

# 🔵 المرحلة 7 — Competitor Gap Analysis + Outreach Language

## 🎯 الهدف
تحليل المنافسين المحليين وفصل لغة رسالة التواصل عن لغة الصفحة.

## ⏱️ الوقت: 45-60 دقيقة | 📈 النجاح: 90%

## الميزات المُنجزة
- ✅ استخراج 3 منافسين محليين عبر SerpAPI (ترتيب حسب التقييم × المراجعات)
- ✅ استبعاد العميل نفسه من قائمة المنافسين (مقارنة أسماء)
- ✅ تحليل الفجوات عبر Gemini: نقاط القوة، الفجوات، الفرص
- ✅ جدول المنافسين في s1 (العميل مميز بحدود ذهبية)
- ✅ عرض تحليل الفجوات أسفل الجدول (Strengths/Gaps/Opportunities)
- ✅ فصل لغة رسالة التواصل عن لغة صفحة الهبوط (`o_outreachLang`)
- ✅ كشف تلقائي للغة حسب المدينة (MENA→AR, francophone→FR, other→EN)
- ✅ رسالة التواصل تتضمن بيانات المنافسين والتحليل
- ✅ حفظ واستعادة `outreachLang` مع العميل في History
- ✅ فشل صامت: أخطاء المنافسين/التحليل لا تكسر الـ flow

## ✅ معايير النجاح
- [ ] 3 منافسين يظهران بعد الاستخراج
- [ ] تحليل الفجوات يظهرStrengths/Gaps/Opportunities
- [ ] رسالة التواصل بالعربية (تلقائي من الرياض)
- [ ] تغيير اللغة يدوياً يعمل
- [ ] لا أخطاء في Console
- [ ] الميزات القديمة لم تتأثر

---

# 📎 ملحق أ — الأثر المتوقع بعد إتمام P0

| المقياس | قبل | بعد |
|---|---|---|
| وقت الإعداد لكل عميل | ~3 ساعات | ~45 دقيقة |
| جودة البرومبت | 7/10 (عام) | 9/10 (مبني على بيانات) |
| معدل قبول العروض | 30-40% | 50-65% |
| الوقت الموفر شهريًا (10 عملاء) | — | ~22 ساعة |

---

# 📎 ملحق ب — استكشاف الأخطاء الشائعة

| المشكلة | الحل |
|---|---|
| OpenCode أعاد كتابة الملف كاملًا | اطلب: "minimal surgical edits only, show diff first" |
| ميزة جديدة كسرت ميزة قديمة | `git checkout v1-stable -- index.html` ثم أعد المحاولة أصغر |
| Gemini يفشل بصمت | تأكد من try/catch + إخفاء البطاقات عند الفشل |
| خطأ "model not available" | تأكد من وجود fallback chain للنماذج |
| المفاتيح اختفت | تأكد أنك لست في Incognito |

---

# 📎 ملحق ج — طريقة استخدام هذا الملف مع OpenCode

1. افتح OpenCode داخل المجلد: `cd ~/Documents/App.OpenPrompt && opencode`
2. اطلب أولًا: "Read MASTER_PLAN.md and index.html, then confirm you understand the project in 5 lines"
3. أرسل برومبت **مرحلة واحدة فقط** في كل جلسة
4. اختبر → commit → انتقل للمرحلة التالية

---

**نهاية الخطة — نفّذ بالترتيب، مرحلة واحدة في كل مرة. 🎯**