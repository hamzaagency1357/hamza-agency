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
  REQUIRED_FINE_GRAINED_PERMISSIONS,
  TEMP_ACCESS,
  assertIpv4,
  assertSupportedPostgresVersion,
  buildJitDbUrl,
  buildJitRole,
  selectPoolerHost,
  validateJitMapping,
} from "../scripts/ops/temporary-database-access.mjs";

const mainSha = "1054fb9bd8617a0ca2c572d93b063e36b7d33b98";
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

function expectFailure(fn, pattern) {
  assert.throws(fn, pattern);
}

test("forward-only contract accepts only the reviewed trusted Admin bridge target", () => {
  assert.equal(TARGET.version, "20260827090000");
  assert.equal(TARGET.filename, "20260827090000_pr99_trusted_admin_actor_db_bridge.sql");
  assert.equal(validateInvocation({
    mode: "forward_preflight",
    target: TARGET.key,
    projectRef: PRODUCTION_REF,
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
  }), true);
  expectFailure(() => validateInvocation({
    mode: "forward_preflight",
    target: "20269999999999_arbitrary",
    projectRef: PRODUCTION_REF,
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
  }), /unauthorized target/);
});

test("wrong Production project ref and wrong reviewed SHA fail closed", () => {
  expectFailure(() => validateInvocation({
    mode: "forward_preflight",
    target: TARGET.key,
    projectRef: "wrong-project-ref",
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
  }), /wrong Production project ref/);
  expectFailure(() => validateInvocation({
    mode: "forward_preflight",
    target: TARGET.key,
    projectRef: PRODUCTION_REF,
    expectedMainSha: "a".repeat(40),
    actualMainSha: mainSha,
  }), /does not match/);
});

test("forward_apply requires the dedicated trusted Admin bridge approval token", () => {
  expectFailure(() => validateInvocation({
    mode: "forward_apply",
    target: TARGET.key,
    projectRef: PRODUCTION_REF,
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
    approval: "APPROVE_PRODUCTION",
  }), /approval token mismatch/);
  assert.equal(validateInvocation({
    mode: "forward_apply",
    target: TARGET.key,
    projectRef: PRODUCTION_REF,
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
    approval: TARGET.approval,
  }), true);
});

test("actual Production post-anchor baseline is exact and unknown history fails closed", () => {
  assert.deepEqual(BASELINE_POST_ANCHOR, [
    { version: "20260825141930", name: "pr120_support_request_trusted_gateway_preparation" },
    { version: "20260826003518", name: "final_security_acl_lockdown" },
  ]);
  assert.equal(validateHistory(baselineHistory, "target_preflight"), true);
  expectFailure(() => validateHistory([
    ...baselineHistory,
    { version: "20260826010000", name: "unexpected" },
  ], "target_preflight"), /history length/);
  expectFailure(() => validateHistory([
    { ...ANCHOR },
    { version: "20260825141930", name: "wrong_name" },
    BASELINE_POST_ANCHOR[1],
  ], "target_preflight"), /unexpected post-anchor migration/);
});

test("target is the sole allowed new post-baseline history row", () => {
  assert.equal(validateHistory([
    ...baselineHistory,
    { version: TARGET.version, name: TARGET.name },
  ], "target_post_apply"), true);
  expectFailure(() => validateHistory([
    ...baselineHistory,
    { version: "20260827080000", name: "other" },
  ], "target_post_apply"), /unexpected post-anchor migration/);
});

test("anchor and current ACL effects remain fail-closed", () => {
  assert.equal(validateAnchorEffects(healthyEffects), true);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, admin_permissions_browser_dml_denied: false }), /admin_permissions_browser_dml_denied/);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, gateway_authenticated_execute: true }), /gateway_authenticated_execute/);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, support_authenticated_execute: true }), /support_authenticated_execute/);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, backup_dry_run_anon_execute: true }), /backup_dry_run_anon_execute/);
});

test("trusted Admin bridge effects must be absent before and complete after target apply", () => {
  assert.equal(validateTargetEffects(healthyEffects, "target_preflight"), true);
  for (const key of ["trusted_actor_user_id_authoritative", "trusted_actor_rpc_allowlist_guard", "require_admin_uid_only"]) {
    expectFailure(() => validateTargetEffects({ ...healthyEffects, [key]: true }, "target_preflight"), /already present/);
  }
  const applied = {
    ...healthyEffects,
    trusted_actor_user_id_authoritative: true,
    trusted_actor_rpc_allowlist_guard: true,
    require_admin_uid_only: true,
  };
  assert.equal(validateTargetEffects(applied, "target_post_apply"), true);
  expectFailure(() => validateTargetEffects({ ...applied, require_admin_uid_only: false }, "target_post_apply"), /missing after apply/);
});

test("Gateway control-plane state is pinned to ACTIVE version 6", () => {
  assert.equal(validateGatewayControlPlane([{ slug: "pr100-vercel-oidc-gateway", version: 6, status: "ACTIVE" }]), true);
  expectFailure(() => validateGatewayControlPlane([{ slug: "pr100-vercel-oidc-gateway", version: 7, status: "ACTIVE" }]), /unexpected trusted gateway state/);
  expectFailure(() => validateGatewayControlPlane([{ slug: "pr100-vercel-oidc-gateway", version: 6, status: "INACTIVE" }]), /unexpected trusted gateway state/);
});

test("Production health must match the explicitly reviewed application SHA", () => {
  assert.equal(validateProductionHealth({ status: "ok", commitSha: mainSha }, mainSha), true);
  expectFailure(() => validateProductionHealth({ status: "ok", commitSha: "b".repeat(40) }, mainSha), /application SHA mismatch/);
});

test("target SQL is immutable, transactional and cryptographically locked", async () => {
  const sql = await readFile(TARGET.path, "utf8");
  const actual = sha256Text(sql);
  assert.equal(TARGET.path, "supabase/migrations/20260827090000_pr99_trusted_admin_actor_db_bridge.sql");
  assert.equal(actual, "ee8e342eef5e6e0a677f4fe981b66de8eac2bf2446896bc8260a9063a58decd5");
  assert.equal(TARGET.sha256, actual);
  assert.equal(validateTargetHash(actual), true);
  assert.equal(validateTargetSql(sql), true);
  expectFailure(() => validateTargetHash("0".repeat(64)), /SHA-256 mismatch/);
});

test("dry-run output must contain exactly the single approved target migration", () => {
  assert.equal(validateDryRunOutput(`DRY RUN\nWould push these migrations:\n • ${TARGET.filename}\n`), true);
  expectFailure(() => validateDryRunOutput("DRY RUN\nNo migrations to push\n"), /exactly one/);
  expectFailure(() => validateDryRunOutput(`Would push:\n${TARGET.filename}\n20260827090100_other.sql\n`), /exactly one/);
  expectFailure(() => validateDryRunOutput("Would push:\n20260827090100_other.sql\n"), /unauthorized migration/);
});

test("Production Postgres version meets Supabase Temporary Access minimum", () => {
  assert.equal(TEMP_ACCESS.minimumPostgresVersion, "17.6.1.081");
  assert.equal(assertSupportedPostgresVersion("17.6.1.127"), true);
  expectFailure(() => assertSupportedPostgresVersion("17.6.1.080"), /does not support/);
});

test("temporary access role is postgres-only, /32 IPv4-only, and expires within 45 minutes", () => {
  const nowMs = 1_800_000_000_000;
  const role = buildJitRole("20.30.40.50", nowMs);
  assert.deepEqual(role, {
    role: "postgres",
    allowed_networks: {
      allowed_cidrs: [{ cidr: "20.30.40.50/32" }],
      allowed_cidrs_v6: [],
    },
    expires_at: nowMs + (45 * 60 * 1000),
    branches_only: false,
  });
  assert.equal(validateJitMapping({ user_id: "user-1", user_roles: [role] }, {
    userId: "user-1",
    ipv4: "20.30.40.50",
    nowMs,
  }), true);
  expectFailure(() => assertIpv4("20.30.40.999"), /invalid runner IPv4/);
  expectFailure(() => validateJitMapping({ user_id: "user-1", user_roles: [{ ...role, role: "service_role" }] }, {
    userId: "user-1",
    ipv4: "20.30.40.50",
    nowMs,
  }), /role is not postgres/);
  expectFailure(() => validateJitMapping({ user_id: "user-1", user_roles: [{ ...role, allowed_networks: { allowed_cidrs: [{ cidr: "0.0.0.0/0" }], allowed_cidrs_v6: [] } }] }, {
    userId: "user-1",
    ipv4: "20.30.40.50",
    nowMs,
  }), /current runner IPv4/);
});

test("temporary access uses trusted IPv4 Supavisor session endpoint with SSL and jit option", () => {
  const host = selectPoolerHost([{
    database_type: "PRIMARY",
    connection_string: "postgresql://postgres.fvaurkfnsvsfohpzguho:placeholder@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  }]);
  assert.equal(host, "aws-0-eu-central-1.pooler.supabase.com");
  const dbUrl = new URL(buildJitDbUrl({ host, token: "sbp_test_token_12345678901234567890" }));
  assert.equal(dbUrl.hostname, host);
  assert.equal(dbUrl.port, "5432");
  assert.equal(dbUrl.username, `postgres.${PRODUCTION_REF}`);
  assert.equal(dbUrl.searchParams.get("sslmode"), "require");
  assert.equal(dbUrl.searchParams.get("options"), "-c jit=true");
  expectFailure(() => selectPoolerHost([{ database_type: "PRIMARY", connection_string: "postgresql://evil.example.com/postgres" }]), /trusted pooler/);
});

test("dedicated token permission contract excludes unrelated product and database write scopes", () => {
  assert.deepEqual(REQUIRED_FINE_GRAINED_PERMISSIONS, [
    "project_admin_read",
    "project_admin_write",
    "database_jit_read",
    "database_jit_write",
    "database_pooling_config_read",
    "database_ssl_config_read",
    "edge_functions_read",
  ]);
  for (const forbidden of [
    "database_write",
    "database_config_write",
    "database_migrations_write",
    "auth_config_read",
    "auth_config_write",
    "storage_config_read",
    "storage_config_write",
    "edge_functions_write",
    "api_gateway_keys_read",
    "api_gateway_keys_write",
  ]) {
    assert.equal(REQUIRED_FINE_GRAINED_PERMISSIONS.includes(forbidden), false, forbidden);
  }
});

test("workflow preserves hardened forward-only architecture and new exact target", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  const dryRunIndex = workflow.indexOf('db push --db-url "$FORWARD_DB_URL" --dry-run');
  const applyIndex = workflow.indexOf('migration up --db-url "$FORWARD_DB_URL"');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /target:\n[\s\S]*?type:\s*choice[\s\S]*?default:\s*pr99_trusted_admin_actor_db_bridge[\s\S]*?options:\n\s*- pr99_trusted_admin_actor_db_bridge/);
  assert.match(workflow, /20260827090000_pr99_trusted_admin_actor_db_bridge\.sql/);
  assert.doesNotMatch(workflow, /default:\s*pr120_support_gateway_preparation/);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /ref:\s*\$\{\{ inputs\.expected_main_sha \}\}/);
  assert.match(workflow, /environment:\s*production-database/);
  assert.match(workflow, /secrets\.SUPABASE_PRODUCTION_JIT_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.SUPABASE_ACCESS_TOKEN/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_PASSWORD/);
  assert.match(workflow, /test "\$\(\$cli --version\)" = "2\.109\.1"/);
  assert.match(workflow, /temporary-database-access\.mjs setup/);
  assert.match(workflow, /temporary-database-access\.mjs wait/);
  assert.match(workflow, /temporary-database-access\.mjs cleanup/);
  assert.match(workflow, /migration fetch --db-url "\$FORWARD_DB_URL"/);
  assert.match(workflow, /db push --db-url "\$FORWARD_DB_URL" --dry-run/);
  assert.match(workflow, /verify-dry-run "\$FORWARD_DRY_RUN_LOG"/);
  assert.match(workflow, /migration up --db-url "\$FORWARD_DB_URL"/);
  assert.ok(dryRunIndex >= 0 && applyIndex > dryRunIndex, "dry-run must occur before apply");
  assert.match(workflow, /APPROVE_HAMZA_PR99_TRUSTED_ADMIN_ACTOR_DB_BRIDGE/);
  assert.doesNotMatch(workflow, /migration repair/);
  assert.doesNotMatch(workflow, /schema_migrations\s+(?:insert|update|delete)/i);
  assert.doesNotMatch(workflow, /--include-all/);
  assert.doesNotMatch(workflow, /\blink --project-ref\b/);
});
