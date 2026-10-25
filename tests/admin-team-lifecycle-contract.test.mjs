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
