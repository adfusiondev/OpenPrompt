# 🏥 OpenPrompt — Landing Page Prompt Generator

> مولّد برومبتات احترافية لصفحات الهبوط والهوية البصرية، مبني على بيانات حقيقية مستخرجة من Google Maps.
>
> An AI-powered prompt generator that builds production-ready prompts for landing pages and visual identities — using real business data extracted automatically from Google Maps.
>
> Formerly known as **PromptClinic**.

![Status](https://img.shields.io/badge/status-working-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20Vanilla%20JS%20%2B%20Node%20Proxy-orange)

---

## 📖 ما هي هذه الأداة؟

**OpenPrompt** هي أداة ويب مجانية تساعدك على توليد برومبتات احترافية جاهزة لبناء صفحات هبوط وهويات بصرية لعملائك (خاصة أصحاب المهن الحرة: أطباء، عيادات تجميل، عيادات أسنان، إلخ).

### كيف تعمل؟
1. **تلصق رابط Google Maps** الخاص بأي عيادة
2. **تستخرج الأداة تلقائيًا** بيانات العميل الحقيقية (الاسم، الهاتف، التقييم، العنوان، الموقع الإلكتروني، ساعات العمل)
3. **تراجع البيانات وتعدلها** يدويًا
4. **تختار خيارات التوليد** (اللغة، CTA، النبرة البصرية)
5. **تحصل على 3 برومبتات جاهزة**: صفحة هبوط + هوية بصرية + رسالة تواصل مكتوبة بلغة الصفحة المختارة

كل هذا **مبني على بيانات العميل الحقيقية** — مما يجعل الصفحات المولّدة مقنعة وقابلة للبيع فعليًا.

---

## 🏗️ البنية المعمارية (إصدار البروكسي)

بدءًا من هذا الإصدار صار التطبيق مكوّنَين:

```
┌────────────────────────────┐         ┌─────────────────────────────────┐
│  index.html — الواجهة      │  HTTP   │  server.js — Node.js + Express  │
│  ملف واحد، بدون build      │ ──────► │  وكيل محلي على المنفذ 3000      │
│  صفر مفاتيح داخل المتصفح   │  /api/* │  يقرأ المفاتيح من .env ويضيفها  │
└────────────────────────────┘         └───────────────┬─────────────────┘
                                                       │
                                    ┌──────────────────┼──────────────────┐
                                    ▼                  ▼                  ▼
                                SerpAPI            r.jina.ai          Gemini API
                             (SERPAPI_KEY)      (JINA_API_KEY      (GEMINI_API_KEY)
                                                 اختياري)
```

**لماذا؟** أمن المفاتيح أولًا: المتصفح يستدعي `/api/*` على البروكسي فقط، والبروكسي هو من يحمل `SERPAPI_KEY` / `GEMINI_API_KEY` / `JINA_API_KEY` من ملف `.env` ويضيفها للطلبات الخارجة. كما يحلّ البروكسي مشكلتين تقنيتين كانتا تقتلان الاستخراج من المتصفح:

- **CORS**: SerpAPI لا يدعم CORS أصلًا (كان يُمرَّر عبر وكلاء عموميين غير مستقرين)، والآن يُستدعى من السيرفر مباشرة.
- **روابط Maps القصيرة**: `maps.app.goo.gl` يعاد توجيهها عبر دومينات متعددة فلا يمكن للمتصفح تتبعها؛ `GET /api/unshorten` يتبع سلسلة التحويلات server-side ويعيد الرابط القانوني.

### 🔌 مسارات البروكسي
| المسار | الوظيفة |
|---|---|
| `GET /api/health` | فحص الحالة + أيّ المفاتيح مضبوطة (يستخدمه زر Test connection) |
| `GET /api/unshorten?url=` | تتبع تحويلات روابط Maps القصيرة وإرجاع الرابط النهائي |
| `GET /api/serpapi?engine=…&place_id=…\|ll=…\|q=…` | تمريرة آمنة لـ SerpAPI مع حقن `SERPAPI_KEY` |
| `POST /api/jina` `{ targetUrl }` | قراءة الصفحة عبر r.jina.ai (يضيف `Authorization: Bearer` إن وُجد `JINA_API_KEY`) |
| `POST /api/gemini` `{ model, prompt }` | استدعاء generateContent مع `GEMINI_API_KEY`؛ يعيد حالة HTTP الأصلية كما هي |

---

## ✨ الميزات الحالية

### 🔍 استخراج البيانات التلقائي (خط أنابيب بطبقات)
| الطبقة | المصدر | المجانية | الاستخدام |
|---|---|---|---|
| **Layer 1** | SerpAPI (عبر البروكسي) | 100 طلب/شهر | استخراج مباشر من Google Maps (الأدق) |
| **Layer 3** | Jina AI Reader (عبر البروكسي) | مجانًا (أفضل مع مفتاح) | قراءة محتوى صفحة Maps كـ plain text |
| **Layer 4** | Google Gemini (عبر البروكسي) | مجانًا بالكامل | استخراج ذكي + تحسين البرومبتات |

- النظام يبدأ بالطبقة الأدق ويتخطى أي طبقة اكتملت حقولها المستهدفة، تحت سقف زمني ~45 ثانية مع لوج حي واضح لكل خطوة
- بيانات الطبقات السابقة تُمرَّر كسياق للطبقات التالية، ولا تُستبدل أي قيمة غير فارغة بقيمة فارغة (`mergeData`)
- قبل كل شيء يفحص التطبيق `/api/health`: إذا كان البروكسي متوقفًا ترى رسالة واضحة `⚠ Proxy backend offline … Ensure 'npm start' is running` بدل أخطاء شبكة غامضة، وإذا نقص مفتاح تُتخطى طبقته برسالة مثل `Layer 4 skipped: GEMINI_API_KEY not set in proxy .env`

### 🛡️ أمان المفاتيح (جديد)
- ❌ لا حقل لإدخال مفاتيح في المتصفح بعد الآن، و✅ لا مفاتيح في الكود أو localStorage إطلاقًا — الحفظ الجديد يمسح بقايا المفاتيح القديمة من `op_settings_v1`
- كل الاتصالات للخدمات الخارجية تمر عبر `apiFetch()` إلى البروكسي فقط؛ لا نداءات مباشرة لأي API من الصفحة
- `.env` مستثنى من git (انظر `.gitignore`) — لا ترفعه أبدًا

### 🤖 Gemini model fallback
التطبيق يجرّب سلسلة موديلات تلقائيًا (`gemini-3.6-flash` → `gemini-flash-latest` → `gemini-2.5-flash`) عند عدم توفر الموديل (404 / "model not available") في جميع المواضع: الاستخراج وزر ✨ Improve with AI. البروكسي يعيد حالة HTTP الأصلية كما هي حتى تبقى هذه المنطقية تعمل فوق الوكيل.

### 🏷️ كشف المهنة تلقائيًا
خريطة كلمات مفتاحية (أسنان، تجميل، عيون، صيدلية، مطاعم، محاماة... بالعربية والإنجليزية والفرنسية) تعبّئ حقل المهنة تلقائيًا من اسم النشاط، وتكيّف قسم الخدمات المقترح في برومبت صفحة الهبوط حسب التخصص.

### 🚪 أزرار التصدير المباشر
- **Copy for Claude** — ينسخ البرومبت ويفتح [claude.ai](https://claude.ai)
- **Open in AI Studio** — ينسخ البرومبت ويفتح [aistudio.google.com](https://aistudio.google.com)
- **Export full client report** — ملف Markdown واحد يجمع البيانات المستخرجة + الخيارات + البرومبتات الثلاثة
- **✏️ Inline prompt editing** — حرّر البرومبت المُولّد مباشرة في الصفحة (Edit) مع مزامنة فورية: النسخ والتنزيل وفتح الأدوات وحفظ History تستخدم نصّك المعدّل
- **📦 Project Pack** — ينزّل مجلدًا جاهزًا (AGENTS.md + PROJECT_CONTEXT.md + PROJECT_STATUS.md + index.html مولّد) تُفتح ملفاته في OpenCode/Cursor/Claude Code لبناء صفحة الهبوط كاملة

### 💾 إدارة البيانات
- ✅ حفظ جميع العملاء في History محلي (localStorage: `op_history_v1`) — لم يتغير شكل البيانات إطلاقًا
- ✅ الإعدادات في `op_settings_v1` أصبحت `{ proxyUrl, jina }` فقط (عنوان البروكسي + مفتاح تشغيل/إيقاف Jina)
- ✅ بحث/تصفية في السجل بالاسم أو المدينة، فتح/تعديل/حذف أي عميل، تصدير JSON كامل
- ✅ ترحيل تلقائي لسجل الإصدارات القديمة (`pc_history_v1` / `pc_settings_v5`)


### 🎯 Prospector Mode (جديد)
ابحث عن أعمال محلية بالمهنة والمدينة مباشرة — بدون لصق روابط Maps. الميزة تبحث عبر SerpAPI وتعرض النتائج مع فلاتر:
- **بدون موقع إلكتروني فقط** (مُفعّل افتراضيًا) — أفضل عملائك潜在的
- **أدنى تقييم ⭐** — تصفية حسب عدد النجوم
- **أدنى عدد مراجعات** — تصفية حسب ثقة العملاء

عند اختيار نتيجة، تُعبأ جميع الحقول تلقائيًا وتنتقل لخطوة المراجعة. العملاء المُستجلون من Prospector يحملون شارة 🎯 في History.

**التكلفة:** طلب SerpAPI واحد لكل بحث (الخطة المجانية تكفي — 100 طلب/شهر).

**طريقة الاستخدام:**
1. اضغط 🎯 Prospector Mode في أعلى الصفحة (بجانب ⚡ Extract data)
2. أدخل المهنة (مثلاً: dental clinic) والمدينة
3. عدّل الفلاتر حسب الحاجة
4. اضغط 🔍 Search prospects
5. اختر نتيجة واضغط Use →

### 🎯 UI Pattern Rules ( lintree设计规则)
🔵 **استخدام نمطج التبديل لكل الأزرار العلوية:**
- استخدام نمطج السطر: `.mode-row` + `.mode-btn` + `.active` state
- الأزرار المتساوية تستخدم فقط `btn` + `mode-btn` مع `.active` للتفعيل
- كل ميزة مستقبلة مستقبلة يجب أن تتبع النمطج بالفعل بدليل `.hidden`
- `switchMode()` هي الدالة المرجعة للتبديل بين الأرضاع

### ⚔️ Competitor Gap Analysis (جديد)
بعد استخراج بيانات العميل، تبحث الأداة تلقائيًا عن 3 منافسين محليين عبر SerpAPI وتعمل مقارنة:

- **جدول المنافسين**: العميل (باست덧ة ذهبية) + أعلى 3 منافسين مرتبين حسب التقييم × المراجعات
- **تحليل الفجوات** (Gemini): نقاط القوة، الفجوات، والفرص التسويقية — كلها مبنية على بيانات حقيقية
- التكلفة: طلب SerpAPI إضافي واحد فقط — لا تأثير على الخطة المجانية

### 📬 Outreach Language (جديد)
فصل لغة رسالة التواصل عن لغة صفحة الهبوط:

- **3 لغات**: العربية (MENA) / English / Français
- **كشف تلقائي**: زر "Auto-detect from city" يحدد اللغة حسب المدينة (الرياض→AR، باريس→FR، لندن→EN)
- **equivaleza موحدة لجميع اللغات**: الرسالة العربية والفرنسية الآن بنفس بنية الإنجليزية ( greeted + ملاحظة + مشهد تنافسي + تحليل فجوات + CTA)
- تُحفظ مع العميل في History وتُستعاد عند الفتح

### 🎨 Image Prompts (جديد)
تبويب رابع في صفحة النتائج يولّد 5 برومبتات صور جاهزة لتوليد الصور بالذكاء الاصطناعي:

- **5 deliverables**: Hero Image (16:9), Team Portrait (4:5), Interior (16:9), Social Media (1:1), Logo Direction
- **مشاهد حسب المهنة**: dental, beauty, eye, derma, physio, legal, medical, restaurant, pharmacy, veterinary
- **أنماط نبرة**: trust (طبيعي) / luxury (فاخر) / friendly (ودّي) / modern (عصري)
- **تأثيرات التصميم**: Bold → high contrast، Premium → luxury accents
- متوافق مع Midjourney / Flux / DALL-E
- يُحفظ في History ويُستعاد تلقائيًا
- **Per-row outreach actions**: 📲 WhatsApp | 📊 +Leads | ⧉ Outreach (from History)
- **📥 Import Leads**: CSV template → upload → entries tagged "imported" in History
- **🔐 Access Lock** (optional): session-based password lock managed from Settings
- **Clean History**: explicit Save/Discard at Results + Back navigation
- **🐞 Diagnostic Reporter**: one-click copyable bug report with errors, pipeline log & masked keys — paste to your developer/AI for fast fixes
- **💾 Backup & Restore**: one-click full backup (history + leads + settings) to JSON; restore on any browser with merge or replace mode

### 📍 Location Integration (جديد)
دمج بيانات الموقع في جميع البرومبتات المُولّدة:

- **Google Maps link**: يُضاف تلقائيًا لبرومبت صفحة الهبوط + رسالة التواصل
- **Map embed iframe**: خريطة مباشرة بدون مفتاح API (keyless)
- **Get Directions button**: زر للاتجاهات على الخريطة
- **إحداثيات GPS**: تُحفظ من رابط الخريطة أو Prospector
- **رسالة التواصل**: تتضمن رابط Google Maps القابل للنقر

---

---

## ⚡ التشغيل السريع

### المتطلبات
- [Node.js](https://nodejs.org) ≥ 18 (للبروكسي فقط)
- متصفح حديث — الواجهة نفسها لا تحتاج أي تثبيت

### الخطوات
```bash
git clone https://github.com/YOUR_USERNAME/App.OpenPrompt.git
cd App.OpenPrompt

# 1) ثبّت اعتمادات البروكسي
npm install

# 2) أنشئ ملف المفاتيح واملأ ما تريد (جميعها اختيارية لكن مفتاح واحد على الأقل يفعل الطبقات)
cp .env.example .env
#   عدّل .env وضع:
#   SERPAPI_KEY=...     ← serpapi.com/manage-api-key
#   GEMINI_API_KEY=...  ← aistudio.google.com/apikey
#   JINA_API_KEY=...    ← اختياري (r.jina.ai يرفض بعض الطلبات بدون مفتاح)

# 3) شغّل البروكسي (المنفذ 3000 افتراضيًا)
npm start
#   [openprompt-proxy] listening on http://localhost:3000

# 4) افتح الواجهة في المتصفح
open index.html        # Mac (وفي ويندوز: start index.html)
```

- لتغيير منفذ البروكسي: `PORT=4000` في `.env`. وللسماح لنطاق محدد فقط باستدعاء الوكيل: `ALLOWED_ORIGIN=http://localhost:5500` (اتركه فارغًا في التطوير المحلي).
- لو نشرت البروكسي على سيرفر آخر، ضع عنوانه في ⚙ Settings → Proxy URL واحفظ.
- الواجهة تُفتح بدون بروكسي لكن الاستخراج يحتاجه — سترى تنبيه Offline حتى يشغّله المستخدم.

## 🧪 الاختبار اليدوي
شغّل البروكسي ثم افتح الصفحة: زر ⚙ Settings يفحص الاتصال تلقائيًا ويعرض أيّ المفاتيح مضبوطة (`Test connection`). ثم الصق رابط Google Maps مثل:
`https://maps.app.goo.gl/W2fnE58QHCoc5A4N8`
وتابع الخطوات الخمس وراقب اللوج الحي: حل الرابط القصير ← الطبقات الثلاث ← تعبئة النموذج تلقائيًا.

---

## 🚧 Roadmap

- [ ] استخراج الصور من Google Maps (logo + photos) لبرومبت الهوية البصرية
- [ ] تصدير PDF مع branding
- [x] ~~Import clients from CSV~~ — done (v7.6)
- [ ] Multi-language UI (واجهة عربية / فرنسية)
- [ ] Chrome Extension لتوليد برومبت بنقرة من Maps مباشرة
- [x] ~~بروكسي خلفي آمن للمفاتيح~~ — تم (server.js + /api/*)
- [ ] نشر البروكسي على سيرفر عام + قاعدة بيانات لمشاركة الفريق

## 🖥️ Desktop build (macOS)

The live web app wrapped as a native macOS app via Electron (desktop = live web app window + offline fallback):

```bash
# node -v          (if missing: brew install node)
cd desktop && npm install
npm start        → run for testing
npm run dist     → builds OpenPrompt .dmg in desktop/dist/
```

- External links (WhatsApp, Claude, etc.) open in your default browser
- localStorage persists between sessions automatically
- Runs the deployed web app (`open-prompt-three.vercel.app`) — fixes go live in the desktop instantly
- Offline fallback: loads the bundled local copy shipped in the .dmg
- No modifications to the web app — the desktop wrapper is additive only

## 🏢 Brand & Contact

Built & maintained by **AdsFusion**

- 📲 WhatsApp: [+212 669-350062](https://wa.me/212669350062?text=Hello%20AdsFusion!%20I%27d%20like%20to%20know%20more%20about%20OpenPrompt.)

## 📄 License

MIT — انظر [LICENSE](LICENSE).
