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
const preparation=read("supabase/migrations/20260823084000_pr100_support_request_trusted_gateway_preparation.sql");
const lockdown=read("supabase/migrations/20260823085000_final_security_acl_lockdown.sql");
const stagedRuntime=read("scripts/closeout/pr-a-staged-runtime.sh");
const pr1RuntimeWorkflow=read(".github/workflows/hamza-closeout-pr1-runtime.yml");
const gatewayRolePolicy=await import(new URL("../supabase/functions/pr116-admin-oidc-gateway/admin-role-policy.ts",import.meta.url));
const serverRolePolicy=await import(new URL("../lib/server/adminMutationRolePolicy.ts",import.meta.url));

const UPSERT="pr116_permissions_page_entity_admin_permissions_upsert";
const DELETE="pr116_permissions_page_entity_admin_permissions_delete";

for(const operation of [
  ["upsert",UPSERT],
  ["update through upsert",UPSERT],
  ["delete",DELETE],
]){
  const [label,action]=operation;
  test(`super_admin ${label} admin_permissions: ALLOW`,()=>{
    assert.equal(serverRolePolicy.meetsAdminMutationRoleRequirement("super_admin","super_admin"),true);
    assert.equal(gatewayRolePolicy.isGeneratedActionRoleAllowed(action,"super_admin"),true);
  });
  test(`deputy_super_admin ${label} admin_permissions: DENY`,()=>{
    assert.equal(serverRolePolicy.meetsAdminMutationRoleRequirement("deputy_super_admin","super_admin"),false);
    assert.equal(gatewayRolePolicy.isGeneratedActionRoleAllowed(action,"deputy_super_admin"),false);
  });
}

test("Admin entity API requires explicit super_admin for admin_permissions before OIDC dispatch",()=>{
  assert.match(actionContracts,/pr116_permissions_page_entity_admin_permissions_upsert[\s\S]*?["']?table["']?\s*:\s*"admin_permissions"[\s\S]*?["']?method["']?\s*:\s*"upsert"/);
  assert.match(actionContracts,/pr116_permissions_page_entity_admin_permissions_delete[\s\S]*?["']?table["']?\s*:\s*"admin_permissions"[\s\S]*?["']?method["']?\s*:\s*"delete"/);
  assert.match(apiRoute,/contract\.kind === "entity" && contract\.table === "admin_permissions" \? "super_admin" : null/);
  assert.match(apiRoute,/authorizeAdminMutation\([\s\S]*?requiredRole/);
  assert.match(serverBoundary,/meetsAdminMutationRoleRequirement\(profile\.role, requiredRole\)/);
});

test("PR116 generated gateway independently rejects non-super admin permission mutations",()=>{
  assert.match(gatewayDispatch,/isGeneratedActionRoleAllowed\(input\.action, input\.admin\.role\)/);
  assert.match(gatewayDispatch,/status:\s*403/);
  assert.ok(gatewayRolePolicy.SUPER_ADMIN_ONLY_ACTIONS.has(UPSERT));
  assert.ok(gatewayRolePolicy.SUPER_ADMIN_ONLY_ACTIONS.has(DELETE));
});

test("Public support API has no anonymous Supabase write path",()=>{
  assert.doesNotMatch(supportRoute,/createClient|NEXT_PUBLIC_SUPABASE_(?:ANON|PUBLISHABLE)_KEY|\.rpc\s*\(\s*["'`]pr4_create_support_request/);
  assert.match(supportRoute,/callOidcGateway<SupportCreateResult>\(request,"support_request_create"/);
  assert.match(supportRoute,/MAX_BODY_BYTES=8192/);
  assert.match(supportRoute,/contactType&&!contactValue/);
  assert.match(signedGateway,/"support_request_create"/);
  assert.match(publicGateway,/"support_request_create"/);
});

test("Preparation migration is additive and preserves the legacy support ACL",()=>{
  assert.match(preparation,/pr100_gateway_nonces_action_check[\s\S]*?'support_request_create'/);
  assert.match(preparation,/when 'support_request_create'[\s\S]*?pr100_guard_ai_answer\([\s\S]*?pr4_create_support_request\(/);
  assert.match(preparation,/pr_a_preparation_old_support_acl_not_preserved/);
  assert.match(preparation,/pr_a_preparation_gateway_acl_invalid/);
  assert.doesNotMatch(preparation,/revoke\s+all\s+on\s+function\s+public\.pr4_create_support_request/i);
  assert.doesNotMatch(preparation,/revoke\s+all\s+on\s+function\s+public\.pr99_build_backup_payload/i);
  assert.doesNotMatch(preparation,/revoke\s+all\s+on\s+function\s+public\.pr99_restore_entity_rows/i);
  assert.doesNotMatch(preparation,/revoke\s+all\s+on\s+function\s+public\.pr4_audit_kb/i);
  assert.doesNotMatch(preparation,/revoke\s+all\s+on\s+function\s+public\.pr4_touch_kb/i);
});

test("ACL lockdown contains only the five reviewed SECURITY DEFINER privilege changes",()=>{
  assert.match(lockdown,/pr_a_lockdown_preparation_missing/);
  assert.match(lockdown,/revoke all on function public\.pr4_create_support_request\(text,text,text,text,text,boolean\)[\s\S]*?from public, anon, authenticated/);
  assert.match(lockdown,/grant execute on function public\.pr4_create_support_request\(text,text,text,text,text,boolean\)[\s\S]*?to service_role/);
  assert.match(lockdown,/revoke all on function public\.pr99_build_backup_payload\(text\[\]\) from public, anon, authenticated/);
  assert.match(lockdown,/revoke all on function public\.pr99_restore_entity_rows\(text,jsonb\) from public, anon, authenticated/);
  assert.match(lockdown,/revoke all on function public\.pr4_audit_kb\(\) from public, anon, authenticated/);
  assert.match(lockdown,/revoke all on function public\.pr4_touch_kb\(\) from public, anon, authenticated/);
  assert.match(lockdown,/pr_a_support_create_execute_contract_invalid/);
  assert.doesNotMatch(lockdown,/create or replace function public\.pr100_oidc_gateway/i);
  assert.doesNotMatch(lockdown,/pr116_apply_trusted_admin_actor_context/);
  assert.doesNotMatch(lockdown,/revoke\s+all\s+on\s+all\s+functions/i);
});

test("Isolated runtime proves preparation compatibility before ACL lockdown",()=>{
  assert.match(stagedRuntime,/acl_before="\$\(support_acl\)"/);
  assert.match(stagedRuntime,/20260823084000_pr100_support_request_trusted_gateway_preparation\.sql/);
  assert.match(stagedRuntime,/test "\$acl_before" = "\$acl_after_preparation"/);
  assert.match(stagedRuntime,/legacy_probe anon/);
  assert.match(stagedRuntime,/legacy_probe authenticated/);
  assert.match(stagedRuntime,/trusted_probe preparation/);
  assert.match(stagedRuntime,/20260823085000_final_security_acl_lockdown\.sql/);
  assert.match(stagedRuntime,/negative_direct_probe anon/);
  assert.match(stagedRuntime,/negative_direct_probe authenticated/);
  assert.match(stagedRuntime,/trusted_probe lockdown/);
  assert.match(pr1RuntimeWorkflow,/bash scripts\/closeout\/pr-a-staged-runtime\.sh "\$DB_URL"/);
  assert.doesNotMatch(pr1RuntimeWorkflow,/20260823083000_pr100_final_security_boundaries\.sql/);
});

test("Support creation remains production-only, replay-protected and DB-guarded",()=>{
  assert.match(signedGateway,/PRODUCTION_ONLY_ACTIONS[\s\S]*?"support_request_create"/);
  assert.match(publicGateway,/PRODUCTION_ONLY_ACTIONS[\s\S]*?"support_request_create"/);
  assert.match(preparation,/pr100_gateway_nonces_action_check[\s\S]*?'support_request_create'/);
  assert.match(preparation,/insert into public\.pr100_gateway_nonces/);
  assert.match(preparation,/when 'support_request_create'[\s\S]*?pr100_guard_ai_answer\([\s\S]*?if coalesce\(\(v_guard->>'allowed'\)::boolean, false\) is not true[\s\S]*?pr4_create_support_request\(/);
});

test("Legacy Admin email fallback remains intentionally untouched until provisioning invariant is proven",()=>{
  assert.match(serverBoundary,/user_id=is\.null&email=ilike/);
});
