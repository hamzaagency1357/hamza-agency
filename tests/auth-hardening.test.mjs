import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function evaluateAdminPermission(role, module, action, permission) {
  if (role === "super_admin") return true;
  if (role === "program_admin" && !new Set(["dashboard", "applications", "programs"]).has(module)) return false;
  if (!permission) return false;
  return permission.can_manage === true || permission[action] === true;
}

test("non-super admins fail closed without an explicit permission row", () => {
  assert.equal(evaluateAdminPermission("deputy_super_admin", "settings", "can_edit", null), false);
  assert.equal(evaluateAdminPermission("program_admin", "applications", "can_edit", null), false);
});

test("explicit permission and can_manage are honored", () => {
  const row = { can_view: true, can_create: false, can_edit: true, can_delete: false, can_export: false, can_manage: false };
  assert.equal(evaluateAdminPermission("deputy_super_admin", "settings", "can_edit", row), true);
  assert.equal(evaluateAdminPermission("deputy_super_admin", "settings", "can_delete", row), false);
  assert.equal(evaluateAdminPermission("program_admin", "settings", "can_view", { ...row, can_manage: true }), false);
  assert.equal(evaluateAdminPermission("program_admin", "applications", "can_delete", { ...row, can_manage: true }), true);
});

test("super_admin remains explicit and cannot be client supplied", () => {
  assert.equal(evaluateAdminPermission("super_admin", "settings", "can_manage", null), true);
  const boundary = read("app/api/admin/mutations/entities/route.ts");
  assert.match(boundary, /requiredRole = contract\.kind === "entity" && contract\.table === "admin_permissions" \? "super_admin" : null/);
  assert.doesNotMatch(boundary, /body\.(?:role|permission|adminRole)/);
});

test("legacy email authority fallback is absent from authoritative admin lookups", () => {
  for (const file of [
    "lib/adminAccess.ts",
    "lib/server/adminMutationBoundary.ts",
    "supabase/functions/pr116-admin-oidc-gateway/index.ts",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /user_id=is\.null/);
    assert.doesNotMatch(source, /admin_user_id=is\.null/);
  }
});

test("OIDC gateway token is server sourced and preview is denied", () => {
  const source = read("lib/server/pr116AdminOidcGateway.ts");
  assert.match(source, /process\.env\.VERCEL_OIDC_TOKEN/);
  assert.doesNotMatch(source, /request\.headers\.get\("x-vercel-oidc-token"\)/);
  assert.match(source, /process\.env\.VERCEL_ENV === "preview"/);
});

test("disabled admins are denied at every authoritative boundary", () => {
  for (const file of [
    "lib/adminAccess.ts",
    "lib/server/adminMutationBoundary.ts",
    "supabase/functions/pr116-admin-oidc-gateway/index.ts",
  ]) {
    assert.match(read(file), /is_active/);
  }
});

test("MFA enrollment is prepared but not globally enforced", () => {
  const login = read("app/admin/login/page.tsx");
  const security = read("app/admin/security/page.tsx");
  assert.match(login, /auth\.mfa/);
  assert.match(security, /auth\.mfa\.enroll/);
  assert.doesNotMatch(login, /OWNER_MFA_REQUIRED|ENFORCE_MFA|forceMfa/i);
});

test("runtime dependency contract stays within approved majors", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  const p = lock.packages;
  assert.equal(pkg.engines.node, "24.x");
  assert.equal(p["node_modules/next"].version, "15.5.22");
  assert.equal(p["node_modules/sharp"].version, "0.35.3");
  assert.equal(p["node_modules/postcss"].version, "8.5.26");
  assert.equal(p["node_modules/nanoid"].version, "3.3.18");
  assert.equal(p["node_modules/@playwright/test"].version, "1.62.1");
  assert.equal(Number(p["node_modules/next"].version.split(".")[0]), 15);
});
