import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const apiRoute=read("app/api/admin/mutations/entities/route.ts");
const serverBoundary=read("lib/server/adminMutationBoundary.ts");
const gatewayDispatch=read("supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts");
const actionContracts=read("lib/server/pr116AdminActionContracts.ts");
const supportRoute=read("app/api/support-request/route.ts");
const signedGateway=read("lib/server/pr100SignedGateway.ts");
const publicGateway=read("supabase/functions/pr100-vercel-oidc-gateway/index.ts");
const migration=read("supabase/migrations/20260823083000_pr100_final_security_boundaries.sql");
const rolePolicy=await import(new URL("../supabase/functions/pr116-admin-oidc-gateway/admin-role-policy.ts",import.meta.url));

const UPSERT="pr116_permissions_page_entity_admin_permissions_upsert";
const DELETE="pr116_permissions_page_entity_admin_permissions_delete";

for(const operation of [
  ["upsert",UPSERT],
  ["update through upsert",UPSERT],
  ["delete",DELETE],
]){
  const [label,action]=operation;
  test(`super_admin ${label} admin_permissions: ALLOW`,()=>{
    assert.equal(rolePolicy.isGeneratedActionRoleAllowed(action,"super_admin"),true);
  });
  test(`deputy_super_admin ${label} admin_permissions: DENY`,()=>{
    assert.equal(rolePolicy.isGeneratedActionRoleAllowed(action,"deputy_super_admin"),false);
  });
}

test("Admin entity API requires explicit super_admin for admin_permissions before OIDC dispatch",()=>{
  assert.match(actionContracts,/pr116_permissions_page_entity_admin_permissions_upsert[\s\S]*?table:\s*"admin_permissions"[\s\S]*?method:\s*"upsert"/);
  assert.match(actionContracts,/pr116_permissions_page_entity_admin_permissions_delete[\s\S]*?table:\s*"admin_permissions"[\s\S]*?method:\s*"delete"/);
  assert.match(apiRoute,/contract\.kind === "entity" && contract\.table === "admin_permissions" \? "super_admin" : null/);
  assert.match(apiRoute,/authorizeAdminMutation\([\s\S]*?requiredRole/);
  assert.match(serverBoundary,/requiredRole === "super_admin" && profile\.role !== "super_admin"/);
});

test("PR116 generated gateway independently rejects non-super admin permission mutations",()=>{
  assert.match(gatewayDispatch,/isGeneratedActionRoleAllowed\(input\.action, input\.admin\.role\)/);
  assert.match(gatewayDispatch,/status:\s*403/);
  assert.ok(rolePolicy.SUPER_ADMIN_ONLY_ACTIONS.has(UPSERT));
  assert.ok(rolePolicy.SUPER_ADMIN_ONLY_ACTIONS.has(DELETE));
});

test("Public support API has no anonymous Supabase write path",()=>{
  assert.doesNotMatch(supportRoute,/createClient|NEXT_PUBLIC_SUPABASE_(?:ANON|PUBLISHABLE)_KEY|\.rpc\s*\(\s*["'`]pr4_create_support_request/);
  assert.match(supportRoute,/callOidcGateway<SupportCreateResult>\(request,"support_request_create"/);
  assert.match(supportRoute,/MAX_BODY_BYTES=8192/);
  assert.match(supportRoute,/contactType&&!contactValue/);
  assert.match(signedGateway,/"support_request_create"/);
  assert.match(publicGateway,/"support_request_create"/);
});

test("Support creation is production-only, DB-guarded, replay-protected and service-only",()=>{
  assert.match(signedGateway,/PRODUCTION_ONLY_ACTIONS[\s\S]*?"support_request_create"/);
  assert.match(publicGateway,/PRODUCTION_ONLY_ACTIONS[\s\S]*?"support_request_create"/);
  assert.match(migration,/pr100_gateway_nonces_action_check[\s\S]*?'support_request_create'/);
  assert.match(migration,/when 'support_request_create'[\s\S]*?pr100_guard_ai_answer\([\s\S]*?if coalesce\(\(v_guard->>'allowed'\)::boolean, false\) is not true[\s\S]*?pr4_create_support_request\(/);
  assert.match(migration,/revoke all on function public\.pr4_create_support_request\(text,text,text,text,text,boolean\)[\s\S]*?from public, anon, authenticated/);
  assert.match(migration,/grant execute on function public\.pr4_create_support_request\(text,text,text,text,text,boolean\)[\s\S]*?to service_role/);
});

test("Targeted SECURITY DEFINER helper cleanup does not use a broad global revoke",()=>{
  assert.match(migration,/revoke all on function public\.pr99_build_backup_payload\(text\[\]\) from public, anon, authenticated/);
  assert.match(migration,/revoke all on function public\.pr99_restore_entity_rows\(text,jsonb\) from public, anon, authenticated/);
  assert.match(migration,/revoke all on function public\.pr4_audit_kb\(\) from public, anon, authenticated/);
  assert.match(migration,/revoke all on function public\.pr4_touch_kb\(\) from public, anon, authenticated/);
  assert.doesNotMatch(migration,/revoke\s+all\s+on\s+all\s+functions/i);
});

test("Legacy Admin email fallback remains intentionally untouched until provisioning invariant is proven",()=>{
  assert.match(serverBoundary,/user_id=is\.null&email=ilike/);
});
