# 🏥 PromptClinic — Landing Page Prompt Generator

> مولّد برومبتات احترافية لصفحات الهبوط والهوية البصرية، مبني على بيانات حقيقية مستخرجة من Google Maps.
>
> An AI-powered prompt generator that builds production-ready prompts for landing pages and visual identities — using real business data extracted automatically from Google Maps.

![Status](https://img.shields.io/badge/status-working-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20Vanilla%20JS-orange)

---

## 📖 ما هي هذه الأداة؟

**PromptClinic** هي أداة ويب مجانية تساعدك على توليد برومبتات احترافية جاهزة لبناء صفحات هبوط وهويات بصرية لعملائك (خاصة أصحاب المهن الحرة: أطباء، عيادات تجميل، عيادات أسنان، إلخ).

### كيف تعمل؟
1. **تلصق رابط Google Maps** الخاص بأي عيادة
2. **تستخرج الأداة تلقائيًا** بيانات العميل الحقيقية (الاسم، الهاتف، التقييم، العنوان، الموقع الإلكتروني، ساعات العمل)
3. **تراجع البيانات وتعدلها** يدويًا
4. **تختار خيارات التوليد** (اللغة، CTA، النبرة البصرية)
5. **تحصل على 3 برومبتات جاهزة**:
   - 🎨 برومبت صفحة هبوط كاملة (Landing Page)
   - 🎭 برومبت هوية بصرية (Visual Identity)
   - 💬 رسالة واتساب تسويقية مخصصة

كل هذا **مبني على بيانات العميل الحقيقية** — مما يجعل الصفحات المولّدة مقنعة وقابلة للبيع فعليًا.

### لمن هذه الأداة؟
- 🎯 Freelancers الذين يبيعون خدمات تصميم صفحات الهبوط
- 🎯 وكالات التسويق الرقمي
- 🎯 مصممو الواجهات والـ UI/UX
- 🎯 أي شخص يستخدم Google Maps للعثور على عملاء محتملين (lead generation)

---

## ✨ الميزات الحالية (ما يعمل الآن)

### 🔍 استخراج البيانات التلقائي (4 طبقات)
| الطبقة | المصدر | المجانية | الاستخدام |
|---|---|---|---|
| **Layer 1** | SerpAPI | 100 طلب/شهر | استخراج مباشر من Google Maps API |
| **Layer 2** | Google Custom Search | 100 طلب/يوم | بحث عام عن نشاط العميل |
| **Layer 3** | Jina AI Reader | مجانًا بالكامل | قراءة محتوى صفحة Maps كـ plain text |
| **Layer 4** | Google Gemini 3.6 Flash | مجانًا بالكامل | استخراج ذكي + تحسين البرومبتات |

النظام يستخدم **خط أنابيب (pipeline)** — يبدأ بالطبقة الأفضل ويتنقل للطبقة التالية تلقائيًا عند الفشل.

### 🎛️ خيارات التوليد
- **3 لغات لصفحة الهبوط**: English، العربية (RTL)، Français
- **4 أهداف تحويل (CTA)**: واتساب، اتصال هاتفي، نموذج حجز، زيارة العيادة
- **4 نبرات بصرية**: موثوقة طبية، فاخرة، ودّية، عصرية تقنية

### 💾 إدارة البيانات
- ✅ حفظ جميع العملاء في History محلي (localStorage)
- ✅ فتح/تعديل/حذف أي عميل سابق
- ✅ تصدير كل السجل كملف JSON
- ✅ تحميل البرومبتات كملف `.md`
- ✅ نسخ البرومبت بضغطة زر

### 🎨 الواجهة
- تصميم داكن احترافي مستوحى من [opencode.ai](https://opencode.ai)
- خط `JetBrains Mono` للعناوين و `Inter` للنصوص
- Stepper واضح للخطوات
- Live log لعرض كل خطوة في الوقت الفعلي
- Preview فوري للبيانات المستخرجة
- Responsive بالكامل (يعمل على الموبايل)

### 🛡️ ميزات الأمان والتشخيص
- 🧪 زر **Test key** لكل API key
- ✅ مؤشرات بصرية لحالة كل مفتاح (`✓ saved` / `⚠ unsaved` / `✗ not saved`)
- ⚠️ تحذير إذا كنت في وضع Incognito
- 🗑 زر لمسح جميع المفاتيح

---

## 🚧 ما يحتاج تطوير لاحقًا (Roadmap)

### أولوية عالية 🔴
- [ ] **استخراج الصور** من Google Maps (logo + photos) لاستخدامها في برومبت الهوية البصرية
- [ ] **فتح البرومبت مباشرة** في Claude / AI Studio / Cursor بضغطة زر
- [ ] **قوالب جاهزة** للبرومبتات (Medical, Dental, Beauty, Legal...)

### أولوية متوسطة 🟡
- [ ] **نشر على GitHub Pages** لاستخدام الأداة من أي جهاز بدون تثبيت
- [ ] **تصدير PDF** للبرومبتات مع branding
- [ ] **Import clients from CSV** (استيراد قائمة عملاء دفعة واحدة)
- [ ] **AI-powered profession detection** أذكى
- [ ] **Multi-language UI** (واجهة عربية / فرنسية)

### أولوية منخفضة 🟢
- [ ] **Chrome Extension** لتوليد برومبت بنقرة من صفحة Google Maps مباشرة
- [ ] **Backend + Database** لمشاركة الفريق (لو تحول المشروع لمنتج تجاري)
- [ ] **CRM integration** (HubSpot, Notion, Airtable)
- [ ] **Template marketplace** لقوالب البرومبتات

---

## ⚡ التشغيل السريع

### الطريقة 1: فتح مباشر (الأسهل)
```bash
# 1. حمّل المشروع
git clone https://github.com/YOUR_USERNAME/promptclinic.git
cd promptclinic

# 2. افتح الملف في المتصفح
# Windows:
start index.html
# Mac:
open index.html
# Linux:
xdg-open index.html