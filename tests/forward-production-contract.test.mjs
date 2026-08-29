import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ANCHOR,
  BASELINE_POST_ANCHOR,
  TARGET,
  PRODUCTION_REF,
  validateAnchorEffects,
  validateDryRunOutput,
  validateGatewayControlPlane,
  validateHistory,
  validateInvocation,
  validateProductionHealth,
  validateTargetEffects,
  validateTargetHash,
  validateTargetSql,
  sha256Text,
} from "../scripts/ops/forward-production-contract.mjs";
import {
  buildProductionDeploymentEvidence,
  isTrustedVercelProductionDeployment,
  validateProductionDeploymentEvidence,
} from "../scripts/ops/vercel-production-attestation.mjs";
import {
  REQUIRED_FINE_GRAINED_PERMISSIONS,
  TEMP_ACCESS,
  assertIpv4,
  assertSupportedPostgresVersion,
  buildJitDbUrl,
  buildJitRole,
  selectPoolerHost,
  validateJitMapping,
} from "../scripts/ops/temporary-database-access.mjs";

const mainSha = "d767ef11f3fed91cd0d8f0f5cd2111211347ea30";
const repository = "hamzaagency1357/hamza-agency";
const inspector = "https://vercel.com/hamzaagencysy-3009s-projects/hamza-agency/contractEvidence123";
const deploymentStatusTargetUrl = "https://example.invalid/deployment-status-informational";
const baselineHistory = [ANCHOR, ...BASELINE_POST_ANCHOR].map(({ version, name }) => ({ version, name }));
const healthyEffects = {
  anchor_history_exact: true,
  admin_permissions_browser_dml_denied: true,
  admin_permissions_service_contract_ok: true,
  gateway_exists: true,
  gateway_anon_execute: false,
  gateway_authenticated_execute: false,
  gateway_service_execute: true,
  sensitive_rpc_acl_ok: true,
  trusted_actor_exists: true,
  trusted_actor_security_definer: true,
  trusted_actor_search_path_ok: true,
  authenticator_pre_request_ok: true,
  support_rpc_exists: true,
  support_anon_execute: false,
  support_authenticated_execute: false,
  support_service_execute: true,
  backup_dry_run_exists: true,
  backup_dry_run_anon_execute: false,
  backup_dry_run_authenticated_execute: false,
  backup_dry_run_service_execute: true,
  trusted_actor_user_id_authoritative: false,
  trusted_actor_rpc_allowlist_guard: false,
  require_admin_uid_only: false,
};
const trustedProductionEvidence = {
  source: "github-vercel-deployment",
  deploymentId: 123,
  statusId: 456,
  trustedApp: "vercel-status",
  repository,
  environment: "Production",
  productionEnvironment: true,
  readyState: "READY",
  gitSha: mainSha,
  deploymentUrl: inspector,
  deploymentStatusTargetUrl,
};
const productionFunctions = [
  { slug: "pr100-vercel-oidc-gateway", version: 6, status: "ACTIVE", verify_jwt: false },
  { slug: "pr116-admin-oidc-gateway", version: 1, status: "ACTIVE", verify_jwt: false },
];

function expectFailure(fn, pattern) { assert.throws(fn, pattern); }

test("forward-only contract accepts only the reviewed target and exact apply approval", () => {
  assert.equal(TARGET.version, "20260827090000");
  assert.equal(TARGET.filename, "20260827090000_pr99_trusted_admin_actor_db_bridge.sql");
  assert.equal(validateInvocation({ mode: "forward_preflight", target: TARGET.key, projectRef: PRODUCTION_REF, expectedMainSha: mainSha, actualMainSha: mainSha }), true);
  expectFailure(() => validateInvocation({ mode: "forward_preflight", target: "other", projectRef: PRODUCTION_REF, expectedMainSha: mainSha, actualMainSha: mainSha }), /unauthorized target/);
  expectFailure(() => validateInvocation({ mode: "forward_apply", target: TARGET.key, projectRef: PRODUCTION_REF, expectedMainSha: mainSha, actualMainSha: mainSha, approval: "APPROVE_PRODUCTION" }), /approval token mismatch/);
  assert.equal(validateInvocation({ mode: "forward_apply", target: TARGET.key, projectRef: PRODUCTION_REF, expectedMainSha: mainSha, actualMainSha: mainSha, approval: TARGET.approval }), true);
});

test("wrong project and reviewed SHA fail closed", () => {
  expectFailure(() => validateInvocation({ mode: "forward_preflight", target: TARGET.key, projectRef: "wrong", expectedMainSha: mainSha, actualMainSha: mainSha }), /wrong Production project ref/);
  expectFailure(() => validateInvocation({ mode: "forward_preflight", target: TARGET.key, projectRef: PRODUCTION_REF, expectedMainSha: "a".repeat(40), actualMainSha: mainSha }), /does not match/);
});

test("Production post-anchor history is exact before and after the one target", () => {
  assert.deepEqual(BASELINE_POST_ANCHOR, [
    { version: "20260825141930", name: "pr120_support_request_trusted_gateway_preparation" },
    { version: "20260826003518", name: "final_security_acl_lockdown" },
  ]);
  assert.equal(validateHistory(baselineHistory, "target_preflight"), true);
  assert.equal(validateHistory([...baselineHistory, { version: TARGET.version, name: TARGET.name }], "target_post_apply"), true);
  expectFailure(() => validateHistory([...baselineHistory, { version: "20260827080000", name: "other" }], "target_post_apply"), /unexpected post-anchor migration/);
});

test("anchor ACL effects and target phase effects fail closed", () => {
  assert.equal(validateAnchorEffects(healthyEffects), true);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, gateway_authenticated_execute: true }), /gateway_authenticated_execute/);
  assert.equal(validateTargetEffects(healthyEffects, "target_preflight"), true);
  const applied = { ...healthyEffects, trusted_actor_user_id_authoritative: true, trusted_actor_rpc_allowlist_guard: true, require_admin_uid_only: true };
  assert.equal(validateTargetEffects(applied, "target_post_apply"), true);
  expectFailure(() => validateTargetEffects({ ...applied, require_admin_uid_only: false }, "target_post_apply"), /missing after apply/);
});

test("gateway control plane requires both trusted pr100 and the actual PR116 Admin gateway", () => {
  assert.equal(validateGatewayControlPlane(productionFunctions), true);
  expectFailure(() => validateGatewayControlPlane(productionFunctions.filter((fn) => fn.slug !== "pr116-admin-oidc-gateway")), /PR116 Admin gateway identity is missing/);
  expectFailure(() => validateGatewayControlPlane(productionFunctions.map((fn) => fn.slug === "pr116-admin-oidc-gateway" ? { ...fn, status: "INACTIVE" } : fn)), /unexpected PR116 Admin gateway state/);
  expectFailure(() => validateGatewayControlPlane(productionFunctions.map((fn) => fn.slug === "pr116-admin-oidc-gateway" ? { ...fn, verify_jwt: true } : fn)), /verify_jwt=false/);
  expectFailure(() => validateGatewayControlPlane(productionFunctions.map((fn) => fn.slug === "pr100-vercel-oidc-gateway" ? { ...fn, version: 7 } : fn)), /unexpected trusted gateway state/);
});

test("Production health and exact Vercel READY evidence remain required", () => {
  assert.equal(validateProductionHealth({ status: "ok" }), true);
  expectFailure(() => validateProductionHealth({ status: "degraded" }), /api\/health is not ok/);
  assert.equal(validateProductionDeploymentEvidence(trustedProductionEvidence, mainSha), true);
  const deployment = { id: 123, sha: mainSha, environment: "Production", production_environment: false, performed_via_github_app: null };
  const status = { id: 456, state: "success", target_url: deploymentStatusTargetUrl };
  const commitStatus = { context: "Vercel", state: "success", target_url: inspector };
  assert.equal(isTrustedVercelProductionDeployment(deployment), true);
  assert.deepEqual(buildProductionDeploymentEvidence(deployment, status, mainSha, commitStatus, repository), trustedProductionEvidence);
  expectFailure(() => validateProductionDeploymentEvidence({ ...trustedProductionEvidence, gitSha: "b".repeat(40) }, mainSha), /SHA mismatch/);
});

test("target SQL is hash locked and relies on CLI transaction boundary", async () => {
  const sql = await readFile(TARGET.path, "utf8");
  const actual = sha256Text(sql);
  assert.equal(actual, "52dc558d547d4978d60dc5e32562fc528fd867e58a88ccfba3082bb6e940db83");
  assert.equal(TARGET.sha256, actual);
  assert.equal(validateTargetHash(actual), true);
  assert.equal(validateTargetSql(sql), true);
  assert.doesNotMatch(sql.replace(/^(?:\s*--[^\n]*(?:\n|$))*/g, "").trimStart(), /^begin\s*;/i);
  assert.doesNotMatch(sql, /\bcommit\s*;\s*$/i);
  expectFailure(() => validateTargetHash("0".repeat(64)), /SHA-256 mismatch/);
  expectFailure(() => validateTargetSql(`-- test\nbegin;\n${sql}\ncommit;`), /implicit transaction/);
});

test("dry-run output must contain exactly one approved target", () => {
  assert.equal(validateDryRunOutput(`DRY RUN\nWould push:\n${TARGET.filename}\n`), true);
  expectFailure(() => validateDryRunOutput("No migrations to push"), /exactly one/);
  expectFailure(() => validateDryRunOutput(`Would push:\n${TARGET.filename}\n20260827090100_other.sql\n`), /exactly one/);
});

test("Temporary Access JIT role uses current Supabase seconds schema and bounded runner CIDR", () => {
  const nowMs = 1_800_000_000_000;
  const role = buildJitRole("20.30.40.50", nowMs);
  assert.deepEqual(role, {
    role: "postgres",
    allowed_networks: { allowed_cidrs: [{ cidr: "20.30.40.50/32" }], allowed_cidrs_v6: [] },
    expires_at: Math.floor(nowMs / 1000) + (45 * 60),
    branches_only: false,
  });
  assert.equal(validateJitMapping({ user_id: "user-1", roles: [role] }, { userId: "user-1", ipv4: "20.30.40.50", nowMs }), true);
  assert.equal(validateJitMapping({ user_id: "user-1", user_roles: [role] }, { userId: "user-1", ipv4: "20.30.40.50", nowMs }), true);
  expectFailure(() => assertIpv4("20.30.40.999"), /invalid runner IPv4/);
});

test("temporary DB URL uses trusted Supavisor session endpoint with SSL and jit=on", () => {
  const host = selectPoolerHost([{ database_type: "PRIMARY", connection_string: "postgresql://postgres.fvaurkfnsvsfohpzguho:placeholder@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" }]);
  const dbUrl = new URL(buildJitDbUrl({ host, token: "sbp_test_token_12345678901234567890" }));
  assert.equal(dbUrl.hostname, "aws-0-eu-central-1.pooler.supabase.com");
  assert.equal(dbUrl.port, "5432");
  assert.equal(dbUrl.username, `postgres.${PRODUCTION_REF}`);
  assert.equal(dbUrl.searchParams.get("sslmode"), "require");
  assert.equal(dbUrl.searchParams.get("options"), "-c jit=on");
});

test("least-privilege PAT contract excludes unrelated write scopes", () => {
  assert.deepEqual(REQUIRED_FINE_GRAINED_PERMISSIONS, [
    "project_admin_read", "project_admin_write", "database_jit_read", "database_jit_write",
    "database_pooling_config_read", "database_ssl_config_read", "edge_functions_read",
  ]);
  for (const forbidden of ["database_write", "database_migrations_write", "auth_config_write", "storage_config_write", "edge_functions_write"]) {
    assert.equal(REQUIRED_FINE_GRAINED_PERMISSIONS.includes(forbidden), false, forbidden);
  }
});

test("workflow preserves exact forward-only architecture", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  const dryRunIndex = workflow.indexOf('db push --db-url "$FORWARD_DB_URL" --dry-run');
  const applyIndex = workflow.indexOf('migration up --db-url "$FORWARD_DB_URL"');
  const vercelIndex = workflow.indexOf("node scripts/ops/vercel-production-attestation.mjs");
  const credentialIndex = workflow.indexOf("Mask and require short-lived Production PAT");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /environment:\s*production-database/);
  assert.match(workflow, /secrets\.SUPABASE_PRODUCTION_JIT_TOKEN/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_PASSWORD/);
  assert.match(workflow, /test "\$\(\$cli --version\)" = "2\.109\.1"/);
  assert.match(workflow, /temporary-database-access\.mjs setup/);
  assert.match(workflow, /temporary-database-access\.mjs wait/);
  assert.match(workflow, /temporary-database-access\.mjs cleanup/);
  assert.match(workflow, /functions list --project-ref "fvaurkfnsvsfohpzguho" --output json/);
  assert.match(workflow, /migration fetch --db-url "\$FORWARD_DB_URL"/);
  assert.match(workflow, /db push --db-url "\$FORWARD_DB_URL" --dry-run/);
  assert.match(workflow, /migration up --db-url "\$FORWARD_DB_URL"/);
  assert.ok(vercelIndex >= 0 && credentialIndex > vercelIndex);
  assert.ok(dryRunIndex >= 0 && applyIndex > dryRunIndex);
  assert.match(workflow, /APPROVE_HAMZA_PR99_TRUSTED_ADMIN_ACTOR_DB_BRIDGE/);
  assert.doesNotMatch(workflow, /migration repair|--include-all/);
});
