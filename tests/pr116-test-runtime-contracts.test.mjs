import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migration = readFileSync(join(root, "supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql"), "utf8");
const wrapper = readFileSync(join(root, "supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts"), "utf8");
const trusted = readFileSync(join(root, "supabase/functions/pr116-admin-oidc-gateway/trusted-rpc-dispatch.ts"), "utf8");
const proxy = readFileSync(join(root, "scripts/closeout/local-https-proxy.mjs"), "utf8");
const localContract = readFileSync(join(root, "tests/pr116-local-migration-contract.sql"), "utf8");

function protectedRpcNames() {
  const match = migration.match(/p\.proname\s*=\s*any\(array\[(.*?)\]\)/s);
  assert.ok(match, "OIDC protected RPC list missing");
  return [...match[1].matchAll(/'([^']+)'/g)].map((item) => item[1]);
}

function directRpcCalls(source) {
  return [...source.matchAll(/\brpc\s*\(\s*[^,]+,\s*[^,]+,\s*["']([^"']+)["']/g)].map((item) => item[1]);
}

test("PR116 closeout specs do not call gateway-owned RPCs directly", () => {
  const protectedNames = new Set(protectedRpcNames());
  const dir = join(root, "e2e/closeout");
  for (const name of readdirSync(dir).filter((entry) => entry.endsWith(".spec.mjs"))) {
    const source = readFileSync(join(dir, name), "utf8");
    const stale = directRpcCalls(source).filter((rpcName) => protectedNames.has(rpcName));
    assert.deepEqual(stale, [], `${name} still calls protected RPC(s) directly: ${stale.join(", ")}`);
  }
});

test("PR116 trusted RPC bridge preserves browser denial and verified actor context", () => {
  assert.match(migration, /revoke execute on function %s from public, anon, authenticated/);
  assert.match(migration, /grant execute on function %s to service_role/);
  assert.match(migration, /v_request_role <> 'service_role'/);
  assert.match(migration, /x-pr116-admin-user-id/);
  assert.match(migration, /x-pr116-admin-email/);
  assert.match(migration, /current_setting\('request\.path', true\)/);
  assert.match(migration, /pr116_actor_context_rpc_not_allowed/);
  assert.match(migration, /grant execute on function public\.pr116_apply_trusted_admin_actor_context\(\) to anon, authenticated, service_role/);
  assert.match(migration, /pgrst\.db_pre_request = 'public\.pr116_apply_trusted_admin_actor_context'/);
  for (const rpcName of protectedRpcNames()) {
    assert.match(trusted, new RegExp(`rpcName: "${rpcName}"`), `trusted bridge missing ${rpcName}`);
    assert.ok(migration.split(`'${rpcName}'`).length - 1 >= 2, `actor-context RPC allowlist missing ${rpcName}`);
  }
  assert.match(trusted, /Authorization: `Bearer \$\{input\.serviceRole\}`/);
  assert.match(trusted, /"x-pr116-admin-user-id": input\.user\.id/);
  assert.match(trusted, /"x-pr116-admin-email": actorEmail/);
  assert.match(wrapper, /dispatchTrustedRpcAction/);
  assert.match(wrapper, /dispatchBaseGeneratedAdminAction/);
});

test("PR116 local isolated evidence applies OIDC lockdown and uses typed Admin boundary", () => {
  assert.match(localContract, /20260810203000_pr116_admin_oidc_boundary_lockdown\.sql/);
  assert.match(proxy, /CLOSEOUT_EXECUTION_MODE !== "local-isolated"/);
  assert.match(proxy, /CLOSEOUT_STATEFUL !== "true"/);
  const gatewayClient = readFileSync(join(root, "lib/server/pr116AdminOidcGateway.ts"), "utf8");
  assert.match(proxy, /__closeout_supabase/);
  assert.match(proxy, /pr116-admin-oidc-gateway/);
  assert.match(proxy, /dispatchGeneratedAdminAction/);
  assert.doesNotMatch(proxy, /\b(?:SUPABASE_SERVICE_ROLE(?:_KEY)?|SERVICE_ROLE_KEY)\b\s*[:=]/);
  assert.match(gatewayClient, /CLOSEOUT_EXECUTION_MODE === "local-isolated"/);
  assert.match(gatewayClient, /CLOSEOUT_STATEFUL === "true"/);
  assert.match(gatewayClient, /CLOSEOUT_LOCAL_OIDC_TOKEN/);
});
