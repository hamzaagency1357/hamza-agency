# HAMZA AGENCY Admin usability inventory

Starting main: `cc6ce5b9fb04fa107f46afa69885755f981c11c5`

This phase changes information architecture and presentation only. Routes, functions, permission checks, data model, APIs, workflows, and public-site behavior remain unchanged.

## Inventory summary

- Actual `app/admin` page routes discovered: **62**.
- Existing Admin navigation entries preserved: **46 / 46**.
- New navigation groups: **5**.
- Removed features: **0**.
- Route renames: **0**.

Nested auth/detail/tool pages remain directly reachable even when they are not standalone sidebar entries.

## Navigation mapping

### العمل اليومي

- `/admin` → الرئيسية
- `/admin/requests` → مركز جميع الطلبات
- `/admin/applications` → طلبات الانضمام
- `/admin/service-requests` → طلبات الخدمات
- `/admin/reviews` → التقييمات
- `/admin/contact` → رسائل التواصل
- `/admin/notifications` → الإشعارات
- `/admin/jobs` → الوظائف

### المحتوى

- `/admin/programs` → البرامج
- `/admin/blog` → المدونة
- `/admin/pages` → الصفحات
- `/admin/sections` → الأقسام المنشورة
- `/admin/page-builder` → منشئ الصفحات المتقدم
- `/admin/media` → الوسائط والصور
- `/admin/gallery` → المعرض
- `/admin/announcements` → الإعلانات
- `/admin/faqs` → الأسئلة الشائعة
- `/admin/success-stories` → قصص النجاح
- `/admin/translations` → مركز إدارة الترجمات
- `/admin/translations/coverage` → تغطية الترجمات
- `/admin/translations/revisions` → مراجعة إصدارات الترجمة
- `/admin/translations/program-details` → مراجعة تفاصيل البرامج
- `/admin/translations/automation` → المساعدة في الترجمة

### الإدارة

- `/admin/partners` → الشركاء
- `/admin/product-operations` → إدارة التشغيل
- `/admin/analytics` → التحليلات التشغيلية
- `/admin/product-expansion` → حوكمة الوكالة ومساحات العمل
- `/admin/product-expansion/invitations` → الدعوات والعضويات
- `/admin/permissions` → الصلاحيات

### الإعدادات

- `/admin/settings` → إعدادات الموقع
- `/admin/settings/homepage` → إعدادات الصفحة الرئيسية
- `/admin/knowledge-base` → قاعدة المعرفة
- `/admin/ai-support` → الدعم الذكي
- `/admin/ai-settings` → إعدادات الدعم الذكي
- `/admin/ai-copilot` → مساعد الإدارة

### متقدم

- `/admin/product-analytics` → تحليلات المنتج المتقدمة
- `/admin/system-health` → صحة النظام
- `/admin/activity-logs` → سجل النشاطات
- `/admin/backups` → النسخ والاستعادة
- `/admin/version-history` → سجل الإصدارات
- `/admin/export-center` → مركز التصدير
- `/admin/trash` → سلة المحذوفات
- `/admin/visual-experience` → التجربة البصرية
- `/admin/white-label` → تجهيز نسخة وكالة مستقلة
- `/admin/audit-mode` → التدقيق المتقدم
- `/admin/launch-checklist` → فحص الجاهزية

## Preservation notes

Items that were already `superAdminOnly` remain role-aware in navigation. This UI grouping does not replace authorization checks inside routes. Existing direct URLs, nested routes, bookmarks, browser history, and deep links are intentionally preserved.
