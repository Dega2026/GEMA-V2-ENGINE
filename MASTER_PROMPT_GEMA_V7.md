# MASTER PROMPT: GEMA CLEAN CODE & UNIVERSAL CMS (V7.0)

انسخ النص التالي بالكامل والصقه للـ AI داخل VS Code/Cursor:

"المهمة: إعادة هيكلة مشروع GEMA بالكامل لتطبيق نظام Clear Code + Dynamic Universal CMS ككتلة واحدة مترابطة. نفّذ المطلوب أدناه End-to-End مع كود إنتاجي نظيف.

[Phase 1] The Database Hub (Universal Backend)
1) أنشئ/حدّث موديل: backend/models/PageContent.js
- كل صفحة لها slug فريد (مثل: home, about, logistics, contact, news, products...).
- الحقل content يحتوي اللغات الخمس: ar, en, de, zh, tr.
- كل لغة تخزن النصوص بصيغة Key: Value (مرن لدعم العناوين/الفقرات/الكروت/الأزرار).

2) أنشئ/حدّث راوتس: backend/routes/pageRoutes.js
- GET /api/pages/:slug?lang=en لجلب محتوى لغة واحدة.
- GET /api/pages/:slug?includeAll=1 لجلب كل اللغات.
- POST /api/pages/update لتحديث محتوى صفحة كاملة (slug + content).
- حماية التحديث بـ JWT + Roles (SuperAdmin, OperationsAdmin).

3) اربط الراوتس في: backend/server.js
- app.use('/api/pages', pageRoutes)
- تأكد من اتصال MongoDB وإظهار رسائل نجاح واضحة.

[Phase 2] Data Migration (From JS to DB)
4) أنشئ سكريبت: backend/scripts/seed-translations.js
- اقرأ الترجمات الحالية من: frontend/src/js/translations.js
- حوّلها إلى JSON.
- ارفعها إلى MongoDB داخل PageContent لصفحات الموقع الرئيسية.
- استخدم upsert لكل slug.

5) بعد نجاح الرفع:
- اجعل translations.js Legacy/Fallback فقط (لا تعتمد عليه كمصدر رئيسي).
- المصدر الأساسي للترجمة يصبح قاعدة البيانات عبر API.

[Phase 3] Pure Skeleton (HTML/CSS Cleanup)
6) نظّف ملفات HTML (index, about, news, contact, ...):
- احذف أي نصوص hardcoded.
- استبدلها بعناصر صامتة:
  - class='i18n'
  - data-key='translation_key'
  مثال:
  <h1 class='i18n' data-key='hero_title'></h1>

7) Separation of Concerns:
- ممنوع inline CSS.
- ممنوع inline JS.
- كل الستايل في ملفات css.
- كل المنطق في ملفات js.

[Phase 4] Smart Engine (Injection + Language Runtime)
8) في frontend/src/js/main.js أنشئ دالة globalLoader() تقوم بـ:
- تحديد الصفحة الحالية من URL أو data-page-slug.
- قراءة اللغة النشطة من localStorage.
- جلب البيانات من GET /api/pages/:slug?lang=<activeLang>.
- حقن النصوص داخل كل .i18n[data-key].
- حقن كلاس اللغة على body: lang-ar, lang-en, lang-de, lang-zh, lang-tr.
- ضبط الاتجاه تلقائياً: ar => rtl, غيره => ltr.

[Phase 5] Operations Control (Universal Admin)
9) في admin.html + admin-logic.js:
- أضف سكشن Universal Page Manager.
- Dropdown لاختيار أي صفحة (slug).
- حقول تحرير للغات الخمس.
- زر حفظ يرسل POST /api/pages/update.
- OperationsAdmin يصل لهذا السكشن فقط.

Code Quality Mandates (Imperial Rules)
- استخدم async/await + try/catch في كل I/O.
- تأكد من إغلاق كل الأقواس {} بدقة كاملة.
- لا تكسر السلوك الحالي للموقع.
- حافظ على الهوية البصرية الأسود/الذهبي.

Final Output Required
- اعرض قائمة الملفات المعدلة.
- اعرض API contract النهائي.
- اعرض أوامر التشغيل/المهاجرة:
  - node backend/scripts/seed-translations.js
  - node backend/server.js
- نفّذ فحص أخطاء نهائي واذكر النتائج.
"
