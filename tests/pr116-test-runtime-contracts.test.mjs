import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migration = readFileSync(join(root, "supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql"), "utf8");
const wrapper = readFileSync(join(root, "supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts"), "utf8");
const trusted = readFileSync(join(root, "supabase/functions/pr116-admin-oidc-gateway/trusted-rpc-dispatch.ts"), "utf8");
const proxy = readFileSync(join(root, "scripts/closeout/local-https-proxy.mjs"), "utf8");
const gatewayClient = readFileSync(join(root, "lib/server/pr116AdminOidcGateway.ts"), "utf8");
const closeoutWorkflow = readFileSync(join(root, ".github/workflows/hamza-closeout-suite.yml"), "utf8");
const macroWorkflow = readFileSync(join(root, ".github/workflows/hamza-macro-runtime-suite.yml"), "utf8");
const localContract = readFileSync(join(root, "tests/pr116-local-migration-contract.sql"), "utf8");
const coreFixtures = readFileSync(join(root, "scripts/closeout/core-runtime-fixtures.mjs"), "utf8");

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

test("PR116 local isolated workload auth is ephemeral, loopback-only, and fail closed", () => {
  assert.match(localContract, /20260810203000_pr116_admin_oidc_boundary_lockdown\.sql/);
  assert.match(proxy, /CLOSEOUT_EXECUTION_MODE !== "local-isolated"/);
  assert.match(proxy, /const closeoutStateful = process\.env\.CLOSEOUT_STATEFUL === "true"/);
  assert.match(proxy, /closeoutStateful !== Boolean\(supabaseUpstream\)/);
  assert.match(proxy, /closeout_stateful_supabase_boundary_mismatch/);
  assert.match(proxy, /process\.env\.CLOSEOUT_SUPABASE_ENV_FILE/);
  assert.match(proxy, /closeout_supabase_env_file_required/);
  assert.match(proxy, /function parseEnvValue\(rawValue\)/);
  assert.match(proxy, /const first = raw\[0\]/);
  assert.match(proxy, /const last = raw\[raw\.length - 1\]/);
  assert.match(proxy, /return raw\.slice\(1, -1\)/);
  assert.match(proxy, /process\.env\.PR116_LOCAL_WORKLOAD_SECRET/);
  assert.match(proxy, /\^\[a-f0-9\]\{64\}\$/);
  assert.match(proxy, /timingSafeEqual/);
  assert.match(proxy, /gatewayServer\.listen\(3444, "127\.0\.0\.1"/);
  assert.doesNotMatch(proxy, /pr116-closeout-local-isolated-oidc-token/);
  assert.doesNotMatch(gatewayClient, /pr116-closeout-local-isolated-oidc-token/);
  assert.match(gatewayClient, /LOCAL_GATEWAY_URL = "http:\/\/127\.0\.0\.1:3444\/functions\/v1\/pr116-admin-oidc-gateway"/);
  assert.match(gatewayClient, /CLOSEOUT_EXECUTION_MODE === "local-isolated"/);
  assert.match(gatewayClient, /CLOSEOUT_STATEFUL === "true"/);
  assert.match(gatewayClient, /!process\.env\.VERCEL_ENV/);
  assert.match(gatewayClient, /CLOSEOUT_SUPABASE_URL === LOCAL_SUPABASE_URL/);
  assert.match(gatewayClient, /NEXT_PUBLIC_SUPABASE_URL === LOCAL_PUBLIC_SUPABASE_URL/);
  assert.match(gatewayClient, /const workloadToken = process\.env\.VERCEL_OIDC_TOKEN \|\| ""/);
  assert.doesNotMatch(gatewayClient, /request\.headers\.get\("x-vercel-oidc-token"\)/);
  assert.match(gatewayClient, /process\.env\.VERCEL_ENV === "preview"/);
  assert.match(gatewayClient, /preview_forbidden/);
});

test("PR116 stateful workflows wire env-file and masked 256-bit run secret without leaking to stateless or Preview", () => {
  assert.match(closeoutWorkflow, /echo "CLOSEOUT_SUPABASE_ENV_FILE=\/tmp\/closeout-supabase\.env" >> "\$GITHUB_ENV"/);
  assert.match(closeoutWorkflow, /workload_secret="\$\(openssl rand -hex 32\)"/);
  assert.match(closeoutWorkflow, /echo "::add-mask::\$workload_secret"/);
  assert.match(closeoutWorkflow, /echo "PR116_LOCAL_WORKLOAD_SECRET=\$workload_secret" >> "\$GITHUB_ENV"/);
  assert.match(closeoutWorkflow, /test -z "\$\{CLOSEOUT_SUPABASE_ENV_FILE:-\}"/);
  assert.match(closeoutWorkflow, /test -z "\$\{PR116_LOCAL_WORKLOAD_SECRET:-\}"/);
  assert.match(macroWorkflow, /workload_secret="\$\(openssl rand -hex 32\)"/);
  assert.match(macroWorkflow, /echo "::add-mask::\$workload_secret"/);
  assert.match(macroWorkflow, /test -f "\$CLOSEOUT_SUPABASE_ENV_FILE"/);
  assert.match(macroWorkflow, /test -n "\$\{PR116_LOCAL_WORKLOAD_SECRET:-\}"/);
  assert.doesNotMatch(closeoutWorkflow, /NEXT_PUBLIC_PR116_LOCAL_WORKLOAD_SECRET/);
  assert.doesNotMatch(macroWorkflow, /NEXT_PUBLIC_PR116_LOCAL_WORKLOAD_SECRET/);
  const serviceRoleEnvPattern = new RegExp(["SERVICE", "ROLE", "KEY"].join("_") + "=.*GITHUB_ENV");
  assert.doesNotMatch(closeoutWorkflow, serviceRoleEnvPattern);
  assert.doesNotMatch(macroWorkflow, serviceRoleEnvPattern);
});

test("PR116 positive local-isolated Admin fixture binds the exact authenticated actor identity", () => {
  assert.match(coreFixtures, /insert into public\.admin_users\(user_id,email,role,is_active\)/);
  assert.match(coreFixtures, /fixture\.accounts\.employee\.id/);
  assert.match(coreFixtures, /user_id=\$\{q\(fixture\.accounts\.employee\.id\)\}::uuid/);
  assert.doesNotMatch(coreFixtures, /insert into public\.admin_permissions/i);
});
