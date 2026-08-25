import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ANCHOR,
  PREPARATION,
  PRODUCTION_REF,
  validateAnchorEffects,
  validateGatewayControlPlane,
  validateHistory,
  validateInvocation,
  validatePreparationHash,
  validatePreparationPrerequisites,
  validatePreparationSql,
  validateProductionHealth,
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

const mainSha = "d5c4de481c3894795eab40653f765dbabb218e19";
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
  support_anon_execute: true,
  support_authenticated_execute: true,
  support_service_execute: false,
  gateway_has_support_request_create: false,
};

function expectFailure(fn, pattern) {
  assert.throws(fn, pattern);
}

test("forward-only contract accepts only the reviewed Preparation target", () => {
  assert.equal(validateInvocation({
    mode: "forward_preflight",
    target: PREPARATION.key,
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

test("wrong Production project ref fails closed", () => {
  expectFailure(() => validateInvocation({
    mode: "forward_preflight",
    target: PREPARATION.key,
    projectRef: "wrong-project-ref",
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
  }), /wrong Production project ref/);
});

test("wrong expected main SHA fails closed", () => {
  expectFailure(() => validateInvocation({
    mode: "forward_preflight",
    target: PREPARATION.key,
    projectRef: PRODUCTION_REF,
    expectedMainSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    actualMainSha: mainSha,
  }), /does not match/);
});

test("forward_apply requires the dedicated Preparation approval token", () => {
  expectFailure(() => validateInvocation({
    mode: "forward_apply",
    target: PREPARATION.key,
    projectRef: PRODUCTION_REF,
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
    approval: "APPROVE_PRODUCTION",
  }), /approval token mismatch/);
  assert.equal(validateInvocation({
    mode: "forward_apply",
    target: PREPARATION.key,
    projectRef: PRODUCTION_REF,
    expectedMainSha: mainSha,
    actualMainSha: mainSha,
    approval: PREPARATION.approval,
  }), true);
});

test("anchor identity must be exact and no unknown post-anchor migration is accepted", () => {
  assert.equal(validateHistory([{ version: ANCHOR.version, name: ANCHOR.name }]), true);
  expectFailure(() => validateHistory([{ version: ANCHOR.version, name: "wrong_anchor" }]), /anchor identity/);
  expectFailure(() => validateHistory([
    { version: ANCHOR.version, name: ANCHOR.name },
    { version: "20260822000000", name: "unexpected" },
  ]), /unexpected post-anchor migration/);
});

test("already-applied Preparation target fails preflight", () => {
  expectFailure(() => validateHistory([
    { version: ANCHOR.version, name: ANCHOR.name },
    { version: PREPARATION.version, name: PREPARATION.name },
  ]), /already applied/);
  assert.equal(validateHistory([
    { version: ANCHOR.version, name: ANCHOR.name },
    { version: PREPARATION.version, name: PREPARATION.name },
  ], "preparation_post_apply"), true);
});

test("anchor security effects fail closed independently", () => {
  assert.equal(validateAnchorEffects(healthyEffects), true);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, admin_permissions_browser_dml_denied: false }), /admin_permissions_browser_dml_denied/);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, gateway_authenticated_execute: true }), /browser-executable/);
  expectFailure(() => validateAnchorEffects({ ...healthyEffects, trusted_actor_search_path_ok: false }), /trusted_actor_search_path_ok/);
});

test("Preparation prerequisites require current legacy Support compatibility", () => {
  assert.equal(validatePreparationPrerequisites(healthyEffects), true);
  expectFailure(() => validatePreparationPrerequisites({ ...healthyEffects, support_anon_execute: false }), /legacy Support ACL/);
  expectFailure(() => validatePreparationPrerequisites({ ...healthyEffects, gateway_has_support_request_create: true }), /already present/);
  assert.equal(validatePreparationPrerequisites({ ...healthyEffects, gateway_has_support_request_create: true }, "preparation_post_apply"), true);
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

test("Preparation SQL remains additive for direct Support ACL", async () => {
  const sql = await readFile(PREPARATION.path, "utf8");
  assert.equal(validatePreparationSql(sql), true);
  assert.match(sql, /support_request_create/);
  assert.match(sql, /pr100_guard_ai_answer/);
  assert.match(sql, /pr4_create_support_request/);
  assert.doesNotMatch(sql, /(?:revoke|grant)\s+[^;]*on\s+function\s+public\.pr4_create_support_request\b/i);
});

test("Preparation migration SHA-256 is cryptographically locked", async () => {
  const sql = await readFile(PREPARATION.path, "utf8");
  const actual = sha256Text(sql);
  assert.equal(actual, "778ef1eef0cf61d3ab4092d711c005a8a6031b6002e491519878627498f40b95");
  assert.equal(PREPARATION.sha256, actual);
  assert.equal(validatePreparationHash(actual), true);
  expectFailure(() => validatePreparationHash("0".repeat(64)), /SHA-256 mismatch/);
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

test("workflow is main-only, one-secret JIT access, and preserves the forward-only migration contract", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /forward_preflight/);
  assert.match(workflow, /forward_apply/);
  assert.match(workflow, /pr120_support_gateway_preparation/);
  assert.match(workflow, /refs\/heads\/main/);
  assert.match(workflow, /environment:\s*production-database/);
  assert.match(workflow, /secrets\.SUPABASE_PRODUCTION_JIT_TOKEN/);
  assert.doesNotMatch(workflow, /secrets\.SUPABASE_ACCESS_TOKEN/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_PASSWORD/);
  assert.match(workflow, /temporary-database-access\.mjs setup/);
  assert.match(workflow, /temporary-database-access-reliability\.mjs wait/);
  assert.match(workflow, /temporary-database-access-reliability\.mjs cleanup/);
  assert.match(workflow, /db query --db-url "\$FORWARD_DB_URL"/);
  assert.match(workflow, /migration fetch --db-url "\$FORWARD_DB_URL"/);
  assert.match(workflow, /db push --db-url "\$FORWARD_DB_URL" --dry-run/);
  assert.match(workflow, /migration up --db-url "\$FORWARD_DB_URL"/);
  assert.match(workflow, /APPROVE_HAMZA_PR120_SUPPORT_GATEWAY_PREPARATION/);
  assert.doesNotMatch(workflow, /migration repair/);
  assert.doesNotMatch(workflow, /schema_migrations\s+(?:insert|update|delete)/i);
  assert.doesNotMatch(workflow, /db push --include-all/);
  assert.doesNotMatch(workflow, /\blink --project-ref\b/);
});
