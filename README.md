# 🏥 OpenPrompt — Landing Page Prompt Generator

> مولّد برومبتات احترافية لصفحات الهبوط والهوية البصرية، مبني على بيانات حقيقية مستخرجة من Google Maps.
>
> An AI-powered prompt generator that builds production-ready prompts for landing pages and visual identities — using real business data extracted automatically from Google Maps.
>
> Formerly known as **PromptClinic**.

![Status](https://img.shields.io/badge/status-working-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20Vanilla%20JS-orange)

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

## ✨ الميزات الحالية

### 🔍 استخراج البيانات التلقائي (4 طبقات)
| الطبقة | المصدر | المجانية | الاستخدام |
|---|---|---|---|
| **Layer 1** | SerpAPI | 100 طلب/شهر | استخراج مباشر من Google Maps API |
| **Layer 2** | Google Custom Search | 100 طلب/يوم | بحث عام عن نشاط العميل |
| **Layer 3** | Jina AI Reader | مجانًا (بدون مفتاح) | قراءة محتوى صفحة Maps كـ plain text |
| **Layer 4** | Google Gemini | مجانًا بالكامل | استخراج ذكي + تحسين البرومبتات |

- النظام يستخدم **pipeline** يبدأ بالطبقة الأفضل وينتقل للتي بعدها تلقائيًا عند الفشل أو عند اكتمال الحقول
- كل طبقة لها مهلة زمنية، وسقف إجمالي ~45 ثانية لكامل خط الاستخراج مع تخطي واضح مسجّل في اللوج الحي
- بيانات الطبقات السابقة تُمرَّر كسياق للطبقات التالية، ولا تُستبدل أي قيمة غير فارغة بقيمة فارغة

### 🤖 Gemini model fallback
التطبيق يجرّب سلسلة موديلات تلقائيًا (`gemini-3.6-flash` → `gemini-flash-latest` → `gemini-2.5-flash`) عند عدم توفر الموديل (404 / "model not available")، في جميع المواضع: الاستخراج، زر التحسين، وزر اختبار المفتاح.

### 🏷️ كشف المهنة تلقائيًا
خريطة كلمات مفتاحية (أسنان، تجميل، عيون، صيدلية، مطاعم، محاماة... بالعربية والإنجليزية والفرنسية) تعبّئ حقل المهنة تلقائيًا من اسم النشاط، وتكيّف قسم الخدمات المقترح في برومبت صفحة الهبوط حسب التخصص.

### 🚪 أزرار التصدير المباشر
- **Copy for Claude** — ينسخ البرومبت ويفتح [claude.ai](https://claude.ai)
- **Open in AI Studio** — ينسخ البرومبت ويفتح [aistudio.google.com](https://aistudio.google.com)
- **Export full client report** — ملف Markdown واحد يجمع البيانات المستخرجة + الخيارات + البرومبتات الثلاثة

### 💾 إدارة البيانات
- ✅ حفظ جميع العملاء في History محلي (localStorage: `op_history_v1` / `op_settings_v1`)
- ✅ ترحيل تلقائي لمفاتيح الإصدار القديم (`pc_history_v1` / `pc_settings_v5`) — عملاؤك ومفاتيحك القديمة تنتقل بمجرد فتح الصفحة
- ✅ بحث/تصفية في السجل بالاسم أو المدينة
- ✅ فتح/تعديل/حذف أي عميل سابق + تصدير كل السجل JSON
- ✅ نسخ البرومبت بضغطة زر

### ⚙️ الإعدادات والمفاتيح
- كل المفاتيح تُدخل من نافذة ⚙ Settings وتُحفظ في localStorage فقط — لا مفاتيح مضمنة في الكود إطلاقًا
- 🧪 زر **Test key** لكل API + مؤشرات حالة (`✓ saved` / `⚠ unsaved` / `✗ not saved`)
- ⚠️ تحذير Incognito + تحقق كتابة/قراءة بعد كل حفظ
- على الأقل مفتاح واحد مطلوب؛ بدونه يوجّهك التطبيق إلى الإعدادات دون انهيار

---

## ⚡ التشغيل السريع

### الطريقة 1: فتح مباشر (الأسهل)
```bash
git clone https://github.com/YOUR_USERNAME/App.OpenPrompt.git
cd App.OpenPrompt

# افتح index.html في المتصفح:
# Windows: start index.html
# Mac:     open index.html
# Linux:   xdg-open index.html
```

### الطريقة 2: خادم ثابت (GitHub Pages)
ارفع المستودع كما هو وفعّل GitHub Pages — لا build ولا dependencies. أي خادم ثابت يعمل:
```bash
python3 -m http.server 8080
# ثم افتح http://localhost:8080
```

> ملاحظة: SerpAPI لا يدعم CORS فيُمرَّر عبر وكلاء عامين مع سلسلة fallback — أبقِها كما هي عند التعديل.

## 🧪 الاختبار اليدوي
افتح الصفحة وأدخل مفتاحًا واحدًا على الأقل في ⚙ Settings (اضغط Test key للتحقق)، ثم الصق رابط Google Maps مثل:
`https://maps.app.goo.gl/W2fnE58QHCoc5A4N8`
وتابع الخطوات الخمس. راقب اللوج الحي لكل خطوة استخراج.

---

## 🚧 Roadmap

- [ ] استخراج الصور من Google Maps (logo + photos) لبرومبت الهوية البصرية
- [ ] تصدير PDF مع branding
- [ ] Import clients from CSV
- [ ] Multi-language UI (واجهة عربية / فرنسية)
- [ ] Chrome Extension لتوليد برومبت بنقرة من Maps مباشرة
- [ ] Backend + Database لمشاركة الفريق (إن تحوّل لمنتج تجاري)

## 📄 License

MIT — انظر [LICENSE](LICENSE).
