import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const portalComponents = [
  "components/portals/PortalDashboard.tsx",
  "components/portals/PortalAccountModule.tsx",
  "components/portals/PortalNotificationCenter.tsx",
  "components/portals/PortalSessionCenter.tsx",
  "components/portals/PortalModule.tsx",
];

function source(path) {
  return fs.readFileSync(path, "utf8");
}

test("portal components do not authorize by direct membership queries", () => {
  for (const path of portalComponents) {
    const content = source(path);
    assert.doesNotMatch(content, /from\(["']tenant_memberships["']\)/, path);
  }
});

test("sensitive portal components do not perform direct Supabase DML", () => {
  for (const path of portalComponents.slice(1)) {
    const content = source(path);
    assert.doesNotMatch(content, /\.from\([^)]*\)\.(?:insert|update|upsert|delete)\(/, path);
  }
});

test("portal API enforces role, tenant, ownership and platform-session boundaries", () => {
  const content = source("app/api/product-expansion/portal/route.ts");
  assert.match(content, /allowedRoles:\s*\[parsed\.role\]/);
  assert.match(content, /requirePlatformSession:\s*write/);
  assert.match(content, /tenant_id=eq\.\$\{tenant\}/);
  assert.match(content, /user_id=eq\.\$\{user\}/);
  assert.match(content, /owner_user_id/);
  assert.match(content, /client_user_id/);
  assert.match(content, /partner_user_id/);
  assert.match(content, /module_not_found/);
});

test("ownership-filtered writes fail closed instead of returning empty success", () => {
  const content = source("app/api/product-expansion/portal/route.ts");
  assert.match(content, /requireAffectedRow/);
  assert.match(content, /Array\.isArray\(result\.data\)\s*&&\s*result\.data\.length\s*===\s*0/);
  assert.match(content, /owned_resource_not_found/);
  assert.match(content, /security_alerts\?id=eq\.[\s\S]*tenant_id=eq\.\$\{tenant\}[\s\S]*user_id=eq\.\$\{user\}/);
});

test("registered platform sessions bind to the verified Supabase auth session", () => {
  const userSource = source("lib/server/supabaseUser.ts");
  const registerSource = source("app/api/product-expansion/sessions/register/route.ts");
  assert.match(userSource, /session_id/);
  assert.match(registerSource, /p_auth_session:\s*access\.user\.sessionId/);
  assert.doesNotMatch(registerSource, /p_auth_session:\s*null/);
});

test("portal API client forwards the registered platform-session identifier", () => {
  const content = source("lib/productExpansion/portalApiClient.ts");
  assert.match(content, /x-platform-session-id/);
  assert.match(content, /sessions\/register/);
  assert.match(content, /sessionStorage/);
});
