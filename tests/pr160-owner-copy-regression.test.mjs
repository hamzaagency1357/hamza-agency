import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("owner dashboard guidance uses masculine rather than feminine imperatives", () => {
  const source = read("app/admin/page.tsx");
  for (const feminine of ["تريدين", "ابدئي", "انتقلي", "راجعي", "تابعي", "استخدمي"]) {
    assert.ok(!source.includes(feminine), `Unexpected feminine dashboard copy: ${feminine}`);
  }
  for (const masculine of ["ما الذي تريد إنجازه اليوم؟", "راجع الطلبات", "تابع البرامج", "ابدأ من طلبات الانضمام"]) {
    assert.ok(source.includes(masculine), `Missing approved dashboard copy: ${masculine}`);
  }
});

test("team mobile interface stays responsive without altering role/status API values", () => {
  const source = read("components/admin/TenantInvitationsConsole.tsx");
  for (const key of ["creator", "client", "employee", "partner", "tenant_admin"]) {
    assert.match(source, new RegExp(`\\b${key}\\b`));
  }
  assert.ok(source.includes('className="mt-4 hidden overflow-x-auto md:block"'));
  assert.ok(source.includes('className="mt-4 grid gap-3 md:hidden"'));
  assert.ok(source.includes("roleLabel(role)"));
  assert.ok(source.includes("statusLabel(status)"));
});

test("program images remain explicit opt-in updates and SEO status stays CMS-only", () => {
  const media = read("app/admin/programs/media/page.tsx");
  const pages = read("app/admin/pages/page.tsx");
  assert.ok(media.includes("onSubmit={save}"));
  assert.ok(media.includes("active.id"));
  assert.ok(media.includes("logo_url:safeUrl(form.logo_url)"));
  assert.ok(media.includes('href="/admin/media"'));
  assert.ok(pages.includes("مسارات أساسية بلا سجل CMS"));
  assert.ok(pages.includes("سجلات محرّر الصفحات"));
  assert.ok(pages.includes("الكلمات المفتاحية اختيارية"));
});
