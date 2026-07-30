import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("unknown administrator roles are denied instead of promoted", async () => {
  const text = await source("lib/adminAccess.ts");
  assert.match(text, /export function normalizeAdminRole[\s\S]*AdminRole \| null/);
  assert.match(text, /if \(role === "program_admin"\) return "program_admin";[\s\S]*return null;/);
  assert.doesNotMatch(text, /return "super_admin";\s*\n}/);
});

test("tracking routes are supported but excluded from indexing and sitemap output", async () => {
  const locales = await source("lib/i18n/publicLocales.ts");
  const sitemap = await source("app/sitemap.ts");
  const robots = await source("app/robots.ts");

  assert.match(locales, /nonIndexablePublicPaths = new Set\(\[[^\]]*"\/track"/);
  assert.match(sitemap, /excludedPaths = new Set\(\[[\s\S]*"\/track"/);
  assert.match(robots, /"\/track"/);
  assert.match(robots, /"\/en\/track"/);
  assert.match(robots, /"\/tr\/track"/);
});

test("application PII is protected by action permissions and program-scoped RLS", async () => {
  const migrationPaths = [
    "supabase/migrations/20260730185634_pr100_comprehensive_audit_hardening.sql",
    "supabase/migrations/20260730185730_pr100_comprehensive_audit_hardening.sql",
    "supabase/migrations/20260730185735_pr100_comprehensive_audit_hardening.sql",
  ];
  const migrations = await Promise.all(migrationPaths.map(source));
  assert.equal(new Set(migrations).size, 1, "recorded duplicate migration versions must remain byte-identical");
  const migration = migrations[0];

  assert.match(migration, /admin_users_role_check/);
  assert.match(
    migration,
    /current_admin_has_module_permission\('applications', 'can_view'\)/,
  );
  assert.match(
    migration,
    /current_admin_has_module_permission\('applications', 'can_edit'\)/,
  );
  assert.match(migration, /admin_user\.role = 'program_admin'/);
  assert.match(
    migration,
    /regexp_replace\(lower\(coalesce\(agency_applications\.platform, ''\)\)/,
  );
});

test("tracking exports require the module export permission", async () => {
  const text = await source("components/admin/TrackingCodeConsole.tsx");
  assert.match(text, /canUseAdminModulePermission/);
  assert.match(text, /config\.module, "can_export"/);
  assert.match(text, /if \(!canExport\) return;/);
  assert.match(text, /\{canExport && \(/);
});
