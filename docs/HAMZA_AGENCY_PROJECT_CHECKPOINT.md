# HAMZA AGENCY — Project Checkpoint Reference

هذا الملف هو المرجع الرسمي الحالي لحالة مشروع HAMZA AGENCY داخل GitHub.
الغرض منه منع تكرار تنفيذ نفس الخطوات في هذه المحادثة أو أي محادثة لاحقة.

## قاعدة العمل المعتمدة

قبل اقتراح أو تنفيذ أي خطوة جديدة، يجب مراجعة هذا الملف والتأكد أن الخطوة ليست ضمن المنجزات المعتمدة.
أي بند ضمن قائمة المنجزات يعتبر مغلقاً ولا يعاد تنفيذه إلا بطلب صريح من صاحب المشروع.
إذا ظهر Deploy فاشل على Vercel، يتم إيقاف أي تنفيذ جديد وإصلاح سبب الفشل أو التراجع عنه قبل المتابعة.
أي خطوة كبيرة يجب أن تنفذ وحدها، ثم يتم فحص Vercel قبل الانتقال لما بعدها.

---

## آخر حالة رسمية معتمدة

المشروع من ناحية الكود والصفحات الأساسية ولوحات الإدارة الرئيسية جاهز للإغلاق التشغيلي الحالي.

بعد دفعة التحسينات الثانية، تم نقل عدة ميزات كانت اختيارية أو محلية إلى حالة أكثر تقدماً وثباتاً، خصوصاً في Supabase والإدارة.

الحالة العامة المعتمدة الآن:

- لا يوجد بند تطوير كود ضروري متبقٍ للإطلاق الحالي.
- المشروع في مرحلة Final QA + External Setup + توثيق التسليم.
- أي تطوير لاحق هو تحسين اختياري أو توسعة Enterprise وليس شرط إطلاق.

---

## آخر دفعة تحسينات متقدمة تم اعتمادها

### 1. Activity Logs داخل app/admin/page.tsx

تم فحص الدالتين:

- updateStatus
- saveInternalNotes

النتيجة:

- التنفيذ موجود مسبقاً داخل app/admin/page.tsx.
- الدالتان تستخدمان logAdminActivity فعلياً.
- لم يتم تعديل أي ملف.
- لا يوجد commit جديد لهذه النقطة.
- هذا البند مغلق ولا يعاد إدراجه كنقص.

### 2. Notification Center المتقدم

الملف الأساسي:

- app/admin/notifications/page.tsx

ما تم:

- حفظ حالات الإشعارات: مقروء، غير مقروء، مؤرشف، محذوف.
- محاولة الحفظ عبر Supabase أولاً.
- fallback محلي آمن عند عدم جاهزية الجدول أو الصلاحيات.
- ربط آمن بتحديثات Realtime للجداول التشغيلية:
  - agency_applications
  - service_requests
  - job_applications
- إصلاح أخطاء TypeScript.
- إصلاح cleanup عند احتمال أن supabase يكون null.

Commits موثقة من محادثة التحسينات:

- f8318071049897888e91a4eee75d67881c211a52 — Persist admin notification states safely
- a0dfbd46bcca4fa6030e3159676b16c0131866aa — Fix notification state typing build error
- 819b8d0c3fd35f6caad002a375910d0c7bd88124 — Add safe realtime refresh to admin notifications
- 4b57e056183a6589556aeee41d5109d1f4b75790 — Fix realtime notification cleanup null check

الحالة:

- مغلق كمرحلة متقدمة آمنة.
- تطوير مستقبلي ممكن: توحيد جدول notifications رسمياً وربط Realtime أوسع.

### 3. Translation Panel وتحويله إلى حفظ دائم

الملفات المرتبطة:

- lib/publicTranslations.ts
- docs/sql/content_translations.sql
- app/admin/translations/page.tsx
- app/programs/page.tsx
- components/LanguageSwitcher.tsx

ما تم:

- إنشاء أساس الترجمة العامة في lib/publicTranslations.ts.
- إنشاء schema لجدول content_translations داخل docs/sql/content_translations.sql.
- تشغيل SQL في Supabase يدوياً.
- تشغيل GRANT يدوي في Supabase لأن توثيقه داخل ملف SQL حُظر من أداة GitHub.
- تحويل Translation Panel للحفظ في Supabase.
- إبقاء localStorage كاحتياط فقط.
- إضافة reviewed وpublished.
- اختبار ترجمة BIGO LIVE إلى الإنجليزية وحفظها في Supabase.
- ربط صفحة /programs بالترجمات المنشورة جزئياً.
- عند اختيار EN تظهر ترجمات البرامج المتوفرة.
- عند اختيار AR تظهر النصوص العربية الأصلية.
- العناصر غير المترجمة تبقى بالنص الأصلي.
- لا توجد مسارات /en أو /tr حالياً.
- لا يوجد SEO منفصل لكل لغة حتى الآن.

Commits موثقة من محادثة التحسينات:

- 2a62e88b265e67c0afb2154eb0e529b15e685569 — Add safe public translation foundation
- 080f1a1f1c9b5f79ba2dc9164723cd4a2dd9083b — Add content translations database schema
- 97bf03e2466d68189b5bce3ca9684a4b6bd3990f — Persist translation panel to Supabase
- f46dc1a8128081609987a33cb325be2e9a20cac0 — Keep translation panel usable when translations query fails
- 91e4196 — Add translated public programs grid
- 1d6d5c7 — Use translated programs grid on public page
- 322d2c3 — Update language switcher translation scope text

الحالة:

- Translation Panel لم يعد localStorage فقط.
- أصبح دائماً وعملياً عبر Supabase.
- الربط العام حالياً محدود بصفحة /programs.
- توسيع الترجمة لباقي الموقع العام مؤجل لاحقاً.

### 4. White Label

ما تم:

- إنشاء schema لجدول white_label_projects.
- تشغيل SQL في Supabase.
- حل صلاحيات GRANT يدوياً في Supabase.
- ربط صفحة /admin/white-label بالحفظ الدائم في Supabase.
- اختبار عملي بحفظ Test Agency ثم تحديث الصفحة والتأكد من بقاء البيانات.

Commits موثقة من محادثة التحسينات:

- 7ac5380 — Add white label projects schema
- b8312e4 — Persist white label workspace to Supabase

الحالة:

- White Label أصبح مساحة إعداد داخلية محفوظة دائماً.
- لم يتحول بعد إلى نظام نسخ وكالات فعلي متعدد العملاء.
- إنشاء نسخ فعلية أو دومينات منفصلة أو Template بيع كامل مؤجل كمرحلة لاحقة.

### 5. Page Builder

ما تم:

- إنشاء schema لجدول page_builder_sections.
- تشغيل SQL في Supabase.
- إضافة GRANT المطلوب.
- ربط صفحة /admin/page-builder بالحفظ الدائم في Supabase.
- لم يتم نشر الصفحات العامة تلقائياً، وهذا مقصود لحماية الموقع العام من تغييرات غير معتمدة.

Commits موثقة من محادثة التحسينات:

- 7467e67 — Add page builder sections schema
- 1d517db — Persist page builder sections to Supabase

الحالة:

- Page Builder صار عنده بنية تخزين دائمة.
- النشر العام الكامل للصفحات المبنية يحتاج مرحلة مستقلة لاحقاً.
- لا يوجد تكرار مع CMS Pages، بل هو مساحة مرنة لبناء أقسام/محتوى.

### 6. Visual Experience

الملفات المرتبطة:

- app/admin/visual-experience/page.tsx
- docs/sql/visual_experience_settings.sql

ما تم:

- فحص الصفحة وتبين أنها كانت تستخدم localStorage فقط.
- إنشاء schema لجدول visual_experience_settings.
- الجدول يحفظ:
  - preset_name
  - background
  - motion
  - glow
  - glass
  - animated_cards
  - cards_scope
  - cards
  - notes
  - status
  - apply_to_public
  - approved_by
  - approved_at
- تم وضع شرط حماية مهم:
  - لا يمكن تطبيق الإعدادات على العام إلا إذا apply_to_public = true وstatus = approved وapproved_by وapproved_at موجودان.
- تشغيل SQL في Supabase.
- ربط صفحة Visual Experience بالحفظ في Supabase.
- localStorage بقي احتياطاً فقط.
- apply_to_public بقي false دائماً في هذه المرحلة.
- لم يتم تطبيق أي خلفية أو حركة على الموقع العام.

Commits موثقة من محادثة التحسينات:

- beeee03af7d0b4bc5c2158b83ea738ed8fcc4595 — Add visual experience settings schema
- 485b8afb4d2a306933e443a58f9cdc420571bdaa — Persist visual experience settings to Supabase

الحالة:

- Visual Experience أصبح حفظه دائماً في Supabase.
- التطبيق العام مقفل لحين موافقة بصرية صريحة.
- اختبار الحفظ العملي بعد الضغط على حفظ دائم ثم refresh لم يتم تأكيده نهائياً، فيبقى فحصاً عملياً مطلوباً.

### 7. Export Center

الملف:

- app/admin/export-center/page.tsx

ما تم:

- تحويل Export Center من مركز روابط إلى تصدير فعلي من Supabase.
- إضافة تصدير JSON.
- إضافة تصدير CSV.
- بدون مكتبات إضافية.
- بدون Excel حالياً.
- بدون لمس Backup System.
- بدون لمس الموقع العام.

مصادر التصدير المفعلة:

- service_requests
- agency_applications
- job_applications
- programs
- partners
- reviews
- success_stories

المصدر المحمي:

- settings

Commit موثق:

- 844accda96f8188d1063a9e30d097cb3b203dd88 — Add CSV and JSON export actions

اختبار عملي:

- تم تصدير service_requests بصيغة CSV.
- ظهرت رسالة نجاح وعدد الصفوف.

الحالة:

- Export Center صار فعلياً لـ CSV وJSON.
- Excel الحقيقي .xlsx مؤجل لأنه يحتاج مكتبة أو تنفيذ منفصل.

### 8. Trash System

ما تم:

- فحص /admin/trash وتبين أنه موجود ويقرأ من trash_items ويدعم الاسترجاع.
- إنشاء helper موحد للسلة:
  - lib/adminTrash.ts
- ربط Media Library بالسلة:
  - app/admin/media/page.tsx
- عند الحذف الآمن من Media Library:
  - يحفظ نسخة في trash_items.
  - يعطل الوسيط ويؤرشفه.
  - لا يحذف الملف من Storage.
  - لا ينفذ حذفاً نهائياً.

Commits موثقة:

- fab392208b715e46004c19279de2cdb7def7d0ce — Add admin trash helper
- 18f2784936cc266c064b33c43089b1efcbfb800d — Record archived media in trash

تصحيحات Supabase اليدوية:

- إضافة أعمدة مفقودة إلى trash_items:
  - deleted_by
  - deleted_at
  - item_data
  - item_type
  - item_id
  - item_title
- إضافة صلاحيات وسياسة insert للأدمن على trash_items.

اختبار عملي:

- حذف آمن من /admin/media نجح.
- ظهر العنصر داخل /admin/trash.
- تم استرجاع العنصر.
- رجع إلى /admin/media.
- الملف لم يحذف نهائياً.

ملاحظة تحسين لاحقة:

- بعد الاسترجاع رجع العنصر كـ general-archived وغير مفعّل.
- المطلوب لاحقاً تحسين الاسترجاع ليعيد التصنيف والحالة الأصلية بشكل أوضح.

الحالة:

- Trash System عملي على Media Library كمرحلة أولى آمنة.
- توسيعه لباقي الصفحات يجب أن يتم صفحة صفحة وليس دفعة واحدة.

### 9. Supabase Security Advisor

وصل تنبيه أمني من Supabase.

ما تم:

- فحص الجداول التي RLS غير مفعلة عليها، وكانت النتيجة No rows returned.
- ظهر أن المشكلة ليست جداول بدون RLS، بل Security Definer View.

Views التي ظهرت:

- cms_pages_publish_status
- cms_pages_seo_status
- cms_sections_publish_status
- cms_settings_overview

تم تشغيل SQL يدوياً في Supabase لتحويلها إلى:

- security_invoker = true

بعد Refresh في Security Advisor ظهرت النتيجة:

- No errors detected

الحالة:

- أخطاء Security Advisor مغلقة حسب الفحص اليدوي.
- لا توجد أخطاء أمنية ظاهرة حالياً حسب التقرير.

---

## الأشياء المنفذة والمعتمدة — لا نكررها

### الموقع العام

1. الصفحة الرئيسية تعمل.
2. صفحة البرامج تعمل.
3. صفحات تفاصيل البرامج تعمل: TikTok، BIGO LIVE، Yaahlan، Xena، Catchii.
4. نموذج الانضمام يعمل.
5. تتبع طلب الانضمام يعمل.
6. طلب الخدمة يعمل.
7. تتبع طلب الخدمة يعمل.
8. صفحة الوظائف تعمل.
9. زر التقديم على وظيفة تم إصلاحه ويعمل.
10. صفحة FAQ العامة تعمل.
11. مركز المعرفة يعمل.
12. المعرض يعمل.
13. الشركاء يعملون.
14. التقييمات وقصص النجاح مضبوطة بدون ادعاءات مبالغ فيها.
15. الفوتر وروابطه تعمل.
16. زر اللغة يعمل وثابت.
17. روابط الإدارة مخفية عن الموقع العام.
18. زر قائمة الموقع العامة PublicQuickNav تم تنظيفه وظيفياً، وقرار إظهاره أو إخفائه النهائي يبقى ضمن الفحص البصري.
19. صفحة /programs تدعم الآن الترجمات المنشورة جزئياً عند اختيار EN/TR حسب الترجمات المتوفرة.

### لوحة الإدارة

1. لوحة الإدارة الأساسية تعمل.
2. صفحات الإدارة الأساسية تعمل.
3. /admin/settings أعيد تصميمها كواجهة إعدادات منظمة.
4. /admin/programs يعمل.
5. /admin/pages يعمل.
6. /admin/media يعمل، والحذف الآمن منه أصبح يسجل في trash_items.
7. /admin/applications يعمل.
8. /admin/service-requests يعمل.
9. /admin/jobs يعمل.
10. /admin/reviews يعمل.
11. /admin/success-stories يعمل.
12. /admin/partners يعمل.
13. /admin/notifications تم تطويره كمركز إشعارات متقدم مع حفظ آمن وRealtime Refresh.
14. /admin/analytics موجود.
15. /admin/backups يعمل كنسخ احتياطي يدوي.
16. /admin/activity-logs يستخدم صلاحية activity_logs.
17. /admin/permissions يعمل كأساس للصلاحيات.
18. /admin/faqs تم إنشاؤه وربطه وإصلاح RLS الخاص به.
19. /admin/ai-support تم ربطه بالدعم الذكي وقاعدة المعرفة.
20. /admin/audit-mode أصبح متصلاً بـ activity_logs ويدعم old/new comparison.
21. /admin/translations موجود ويحفظ في Supabase مع localStorage كاحتياط.
22. /admin/white-label موجود ويحفظ في Supabase.
23. /admin/page-builder موجود ويحفظ في Supabase.
24. /admin/visual-experience موجود ويحفظ في Supabase، والتطبيق العام مقفل.
25. /admin/export-center أصبح يدعم تصدير CSV وJSON.
26. /admin/trash يعمل واسترجاع Media Library تم اختباره.

### SEO وStructured Data

1. SEO العام تم تحسينه.
2. sitemap و robots تم ضبطهما.
3. Google Search Console اكتشف الصفحات.
4. FAQPage structured data مضاف لصفحة /faq.
5. Service structured data مضاف لصفحة /services.
6. Breadcrumb structured data مضاف.
7. JobPosting structured data مضاف لصفحة /jobs عبر components/StructuredData.tsx.
8. Organization وWebSite وWebPage وBreadcrumbList موجودة من المكوّن العام.

### Activity Logs وAudit

1. تم إنشاء مساعد تسجيل موحّد: lib/adminActivityLogger.ts.
2. تمت إضافة Activity Logs إلى أغلب صفحات الإدارة الأساسية.
3. app/admin/page.tsx يستخدم logAdminActivity داخل updateStatus وsaveInternalNotes حسب فحص محادثة التحسينات.
4. Activity Logs تعرض أعمدة مثل entity_type وentity_id وnew_data وold_data.
5. Audit Mode يعرض سجلات فعلية من activity_logs.
6. Audit Mode يدعم الفلاتر والبحث والإحصائيات الأساسية.
7. Audit Mode يدعم مقارنة old/new وعرض الفروقات عند توفرها.

---

## ما لم يغلق بعد — قائمة تنفيذ لاحقة

هذه هي البنود المتبقية بعد دفعة التحسينات الثانية.

### أولوية قريبة قبل الإغلاق التشغيلي

1. Backup System.
   - فحص الموجود أولاً لأنه كان يعمل سابقاً.
   - تحديد هل يحتاج توسيع فعلي أم لا.
   - لا يعاد بناؤه من الصفر.

2. Roles / Permissions Deep Test.
   - اختبار super_admin.
   - اختبار deputy_super_admin.
   - اختبار program_admin.
   - التأكد أن program_admin لا يدخل صفحات حساسة مثل Export وBackup وSettings وWhite Label وPage Builder وVisual Experience إن لم تكن مسموحة.

3. Public Text Audit.
   - مراجعة النصوص العامة.
   - إزالة أي نص تقني أو تجريبي أو داخلي.
   - إزالة الادعاءات غير المثبتة.
   - توحيد الأسلوب العام.

4. Visual / Responsive QA.
   - فحص موبايل.
   - فحص ديسكتوب.
   - فحص الأزرار العائمة.
   - فحص Language Switcher.
   - فحص AI Support.
   - فحص القائمة.
   - فحص صفحات الإدارة والترجمات.

5. Final Documentation.
   - دليل التشغيل.
   - دليل لوحة الإدارة.
   - ملاحظات Supabase.
   - ملاحظات Vercel.
   - ملاحظات Search Console.
   - ملاحظات الأمان.
   - قائمة المنجز والمؤجل.

6. اختبار حفظ Visual Experience عملياً.
   - الضغط على حفظ دائم.
   - تحديث الصفحة.
   - التأكد أن الإعدادات بقيت محفوظة.

7. اختبار reset password من الموقع نفسه.
   - التأكد من Supabase redirect URLs.
   - تجربة إعادة التعيين عملياً.

8. اختبار FAQ Admin عملياً.
   - إضافة سؤال من /admin/faqs.
   - التأكد من ظهوره في /faq.

### تحسينات اختيارية غير مانعة للإطلاق

1. توسيع Trash System لباقي الصفحات صفحة صفحة.
2. تحسين استرجاع Media Library ليعيد التصنيف والحالة الأصلية بدل الرجوع كـ archived وغير مفعّل.
3. Excel الحقيقي .xlsx داخل Export Center.
4. توسيع الترجمة لباقي صفحات الموقع العام، وليس /programs فقط.
5. SEO منفصل لكل لغة بعد اعتماد نظام لغات كامل.
6. تحويل White Label إلى نظام نسخ وكالات فعلي متعدد العملاء.
7. تحويل Page Builder إلى نشر صفحات عامة فعلياً.
8. تطبيق Visual Experience على الموقع العام بعد موافقة بصرية صريحة.
9. توسيع Notification Center بجدول موحد وRealtime أوسع إن لزم.
10. توسيع Backup System لتصدير أشمل وسجلات أقوى.

---

## المتبقي الخارجي للإطلاق الكامل

1. إنشاء بريد رسمي للدومين.
2. الفحص البصري النهائي من جهاز صاحب المشروع.
3. متابعة Google Search Console.
4. إضافة روابط السوشيال الرسمية عند توفرها.

---

## ملاحظات تشغيلية مهمة

1. بعض الخطوات تمت يدوياً في Supabase SQL Editor، وليست كلها ممثلة داخل commits.
2. GRANT الخاص ببعض الجداول تم تشغيله يدوياً بسبب حظر أداة GitHub لبعض تعديلات SQL.
3. تعديلات Security Advisor تمت يدوياً في Supabase وتم إغلاق الأخطاء حسب التقرير.
4. لا يتم إعادة فتح أي بند مغلق إلا بطلب صريح.
5. أي توسعة مستقبلية يجب تنفيذها صفحة صفحة أو ميزة ميزة مع فحص Vercel بعد كل commit.

---

## خلاصة الحالة النهائية

تم إنجاز جزء كبير جداً من التحسينات الاختيارية وتحويل عدة مساحات كانت محلية أو تجهيزية إلى حفظ دائم في Supabase.
أهم إنجازات المرحلة الأخيرة: Notification Center، Translation Panel، White Label، Page Builder، Visual Experience، Export Center، Trash System، وإغلاق أخطاء Security Advisor.

لا يوجد بند تطوير كود ضروري متبقٍ للإطلاق الحالي.
المشروع حالياً في مرحلة: Backup/Permissions/Text Audit/QA/Documentation + External Setup.
