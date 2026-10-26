import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Source contracts only. These tests do not send invitations or write to a live database.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const invite = read("app/api/admin/team/invite/route.ts");
const activate = read("app/api/admin/team/activate/route.ts");
const ui = read("app/admin/permissions/page.tsx");
const gateway = read("supabase/functions/pr116-admin-oidc-gateway/index.ts");

for (const [name, source] of [["invite", invite], ["activate", activate]]) {
  test(`${name}: rejects preview writes and untrusted browser origins`, () => {
    assert.match(source, /VERCEL_ENV === "preview"/);
    assert.match(source, /origin_forbidden/);
  });
  test(`${name}: authenticates bearer identity and requires active super_admin`, () => {
    assert.match(source, /auth\.getUser\(/);
    assert.match(source, /actor\.is_active !== true/);
    assert.match(source, /actor\.role !== "super_admin"/);
    assert.match(source, /actor\.email\?\.toLowerCase\(\)/);
  });
}

test("invitation persists inactive scoped identity before sending email", () => {
  assert.match(invite, /\["deputy_super_admin", "program_admin"\]/);
  assert.match(invite, /invalid_program_assignment/);
  assert.match(invite, /email, role, assigned_program: canonicalProgram, is_active: false/);
  assert.ok(invite.indexOf("is_active: false") < invite.indexOf("inviteUserByEmail("));
  assert.match(invite, /pending_invite_requires_review/);
  assert.match(invite, /account_already_exists/);
  assert.match(invite, /pending_activation/);
});

test("activation requires accepted invitation, scoped program and deputy grants", () => {
  assert.match(activate, /target\.is_active !== false/);
  assert.match(activate, /!target\.user_id/);
  assert.match(activate, /target\.role === "program_admin" && !target\.assigned_program/);
  assert.match(activate, /email_confirmed_at/);
  assert.match(activate, /permissions_required_before_activation/);
  assert.match(activate, /\.eq\("is_active", false\)/);
});

test("admin UI only offers linked accounts for permission assignment", () => {
  assert.match(ui, /targetAdmin\.user_id/);
  assert.match(ui, /admin_user_id: targetAdmin\.id/);
  assert.match(ui, /\["dashboard", "applications", "programs"\]/);
  assert.match(ui, /\/api\/admin\/team\/invite/);
  assert.match(ui, /\/api\/admin\/team\/activate/);
});

test("gateway validates permission target and exact program on application writes", () => {
  assert.match(gateway, /admin\.role !== "super_admin"/);
  assert.match(gateway, /target_admin_id_mismatch/);
  assert.match(gateway, /target_admin_not_linked/);
  assert.match(gateway, /target !== assigned/);
});

test("pending invitation retry preserves role and scope and rejects linked accounts", () => {
  assert.match(invite, /prior\.is_active !== false \|\| prior\.user_id/);
  assert.match(invite, /prior\.role !== role/);
  assert.match(invite, /prior\.assigned_program \?\? null\) !== canonicalProgram/);
  assert.match(invite, /if \(prior\) \{\s*pending = \{ id: prior\.id \}/);
  assert.match(invite, /pending_invite_requires_review/);
});

const deactivate = read("app/api/admin/team/deactivate/route.ts");
test("deactivation is owner-only, fail-closed and concurrency guarded", () => {
  assert.match(deactivate, /VERCEL_ENV === "preview"/);
  assert.match(deactivate, /origin_forbidden/);
  assert.match(deactivate, /auth\.getUser\(/);
  assert.match(deactivate, /actor\.role !== "super_admin"/);
  assert.match(deactivate, /target\.id === actor\.id/);
  assert.match(deactivate, /target\.user_id === identity\.user\.id/);
  assert.match(deactivate, /\["deputy_super_admin", "program_admin"\]/);
  assert.match(deactivate, /\.eq\("is_active", true\)/);
  assert.match(deactivate, /\.eq\("role", target\.role\)/);
  assert.match(deactivate, /deactivate_admin_user/);
  assert.match(ui, /\/api\/admin\/team\/deactivate/);
});

test("application listing is scoped before fetch and uses exact program equality", () => {
  const applications = read("app/admin/applications/page.tsx");
  assert.match(applications, /query = query\.eq\("platform", assignedProgram!\)/);
  assert.match(applications, /item\.platform === assignedProgram/);
  assert.doesNotMatch(applications, /normalizeText\(item\.platform\)\.includes\(assignedProgram\)/);
});

for (const path of ["invite", "activate", "deactivate"]) {
  test(`${path}: does not report success when the audit insert fails`, () => {
    const source = read(`app/api/admin/team/${path}/route.ts`);
    assert.match(source, /error: auditError/);
    assert.match(source, /if \(auditError\) return (respond|fail)\(503, "state_changed_audit_failed"\)/);
  });
}

test("invitation resolves canonical program without untrusted PostgREST filter expressions", () => {
  assert.match(invite, /\.eq\("slug", assignedProgram\)/);
  assert.match(invite, /\.eq\("name", assignedProgram\)/);
  assert.match(invite, /new Set\(matches\.map\(\(item\) => item\.slug\)/);
  assert.match(invite, /uniqueSlugs\.length !== 1/);
  assert.doesNotMatch(invite, /\.or\(\`slug\.eq\./);
});
