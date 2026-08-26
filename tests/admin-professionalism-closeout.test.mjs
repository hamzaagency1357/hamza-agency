import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("backup and restore primary UX is Arabic, guarded, and non-technical", async () => {
  const text = await source("components/AdminBackupRestoreOperations.tsx");
  for (const token of [
    "النسخ الاحتياطي والاستعادة",
    "فحص سلامة النسخة",
    "استعادة العناصر المحددة",
    "تفاصيل تقنية",
    "الاستعادة ستغيّر البيانات",
  ]) assert.ok(text.includes(token), token);

  for (const forbidden of ["Backup / Restore", "Dry Run", "Transactionally", "RESTORE SELECTED ENTITIES"]) {
    assert.ok(!text.includes(forbidden), forbidden);
  }

  assert.ok(text.includes('"pr116_admin_backup_create"'));
  assert.ok(text.includes('"pr116_admin_backup_dry_run"'));
  assert.ok(text.includes('"pr116_admin_backup_restore"'));
});

test("system health keeps technical deployment data out of the primary presentation", async () => {
  const text = await source("app/admin/system-health/page.tsx");
  for (const token of [
    "حالة النظام",
    "الحالة العامة",
    "يعمل بشكل طبيعي",
    "يحتاج انتباه",
    "يوجد خلل",
    "تفاصيل تقنية للمسؤول",
  ]) assert.ok(text.includes(token), token);

  assert.ok(text.includes("technical: true"));
  assert.ok(text.includes("Commit SHA:"), "commit identity remains available only as a technical detail");
  assert.ok(text.includes("secret values are not displayed"));
});

test("activity log humanizes events and redacts sensitive diagnostic values", async () => {
  const text = await source("app/admin/activity-logs/page.tsx");
  assert.ok(text.includes("سجل النشاطات"));
  assert.ok(!text.includes(">Activity Log<"));
  assert.ok(text.includes("تم تحديث الصلاحيات"));
  assert.ok(text.includes("تم تغيير حالة طلب الدعم"));
  assert.ok(text.includes("تم نشر المحتوى"));
  assert.ok(text.includes("تفاصيل تقنية"));
  assert.ok(text.includes("sensitiveKeyPattern"));
  assert.ok(text.includes("[محجوب]"));
  assert.ok(text.includes("بواسطة:"));
  assert.ok(text.includes("العنصر المتأثر:"));
});

test("permission UX keeps authorization logic but hides raw keys from primary controls", async () => {
  const text = await source("app/admin/permissions/page.tsx");
  assert.ok(text.includes('requireAdminModuleAccess("permissions")'));
  assert.ok(text.includes('access.profile.role !== "super_admin"'));
  assert.ok(text.includes("إدارة كاملة للقسم"));
  assert.ok(text.includes("قد يتأثر وصول هذا الحساب"));
  assert.ok(text.includes("تفاصيل تقنية"));
  assert.ok(!text.includes("{module.label} — {module.key}"));
  assert.ok(!text.includes("saveError.message"));
  assert.ok(!text.includes("deleteError.message"));
});

test("programs keep existing mutations while moving technical fields to advanced details", async () => {
  const text = await source("app/admin/programs/page.tsx");
  assert.ok(text.includes('"pr116_programs_page_entity_programs_update"'));
  assert.ok(text.includes('"pr116_programs_page_entity_programs_insert"'));
  assert.ok(text.includes("إعدادات متقدمة"));
  assert.ok(text.includes("الرابط المختصر"));
  assert.ok(text.includes("رمز الحالة"));
  assert.ok(text.includes("الأسئلة الشائعة"));
  assert.ok(!text.includes('placeholder="slug مثل tiktok"'));
  assert.ok(!text.includes('placeholder="status مثل active"'));
});

test("reviewer name requirement remains locked", async () => {
  const text = await source("app/admin/reviews/page.tsx");
  assert.ok(text.includes("if (!form.reviewerName.trim())"));
  assert.ok(text.includes("يرجى كتابة اسم صاحب التقييم."));
});

test("admin navigation and dashboard retain the existing owner-approved structure", async () => {
  const navigationTest = await source("tests/admin-usability-navigation.test.mjs");
  const dashboard = await source("app/admin/page.tsx");
  assert.ok(navigationTest.includes("Admin navigation must keep exactly the 46 existing navigation entries"));
  assert.ok(navigationTest.includes('"العمل اليومي": true'));
  assert.ok(navigationTest.includes('aria-expanded={expanded}'));
  assert.ok(dashboard.includes('data-testid="admin-quick-actions"'));
  assert.ok(dashboard.includes("ما الذي تريدين إنجازه اليوم؟"));
});
