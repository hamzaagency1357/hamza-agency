import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  TEMP_ACCESS,
  assertNoResidualJitMapping,
  assertTemporaryDatabaseUrl,
  buildJitDbUrl,
  buildJitRole,
  buildRunOwnership,
  cleanupRunOwnedJitMapping,
  cleanupRunOwnedTemporaryAccess,
  createRunOwnedJitMapping,
  mappingMatchesRunOwnership,
  safeProbeDiagnostic,
  validateJitMapping,
  waitForTemporaryDatabaseReady,
} from "../scripts/ops/temporary-database-access.mjs";

const userId = "123e4567-e89b-42d3-a456-426614174000";
const otherUserId = "223e4567-e89b-42d3-a456-426614174000";
const runId = "33160851147";
const nowMs = 1_800_000_000_000;
const token = "sbp_test-token-value-with-reserved_@:_chars";
const host = "aws-1-eu-central-1.pooler.supabase.com";
const dbUrl = buildJitDbUrl({ host, token });

function response(status, data) {
  return { status, text: async () => (data === undefined ? "" : JSON.stringify(data)) };
}

function createMockJitServer({
  preexisting = null,
  ambiguousAfterMutation = false,
  ambiguousBeforeMutation = false,
  malformedPutResponse = false,
  apiError = null,
  canonicalFeatureMissing = false,
  normalizeEmptyNetworks = false,
} = {}) {
  let mapping = preexisting;
  let featureState = "enabled";
  const calls = [];
  const canonicalFeaturePath = `/projects/${TEMP_ACCESS.projectRef}/jit-access`;
  const legacyFeaturePath = `/projects/${TEMP_ACCESS.projectRef}/database/jit-access`;
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const method = init.method ?? "GET";
    calls.push({ method, path, body: init.body ?? null });
    if (method === "GET" && path.endsWith(`/projects/${TEMP_ACCESS.projectRef}/database/jit/list`)) {
      return response(200, { items: mapping ? [mapping] : [] });
    }
    if (method === "PUT" && path.endsWith(`/projects/${TEMP_ACCESS.projectRef}/database/jit`)) {
      if (apiError) return response(apiError.status, apiError.data);
      if (ambiguousBeforeMutation) throw new Error("network failure before mutation evidence");
      const body = JSON.parse(init.body);
      assert.equal(body.user_id, userId);
      assert.ok(Array.isArray(body.roles), "current Supabase JIT request field must be roles");
      assert.equal(body.user_roles, undefined);
      const roles = body.roles.map((role) => normalizeEmptyNetworks
        ? { ...role, allowed_networks: { allowed_cidrs: [], allowed_cidrs_v6: [] } }
        : role);
      mapping = { user_id: body.user_id, user_roles: roles };
      if (ambiguousAfterMutation) throw new Error("network failure after server mutation");
      return response(200, malformedPutResponse ? { user_id: body.user_id, user_roles: [] } : mapping);
    }
    if (method === "DELETE" && path.endsWith(`/database/jit/${userId}`)) {
      mapping = null;
      return response(200, {});
    }
    if ((method === "GET" || method === "PUT") && path.endsWith(canonicalFeaturePath)) {
      if (canonicalFeatureMissing) return response(404, { message: "not found" });
      if (method === "PUT") featureState = JSON.parse(init.body).state;
      return response(200, { state: featureState, appliedSuccessfully: true });
    }
    if ((method === "GET" || method === "PUT") && path.endsWith(legacyFeaturePath)) {
      if (method === "PUT") featureState = JSON.parse(init.body).state;
      return response(200, { state: featureState, appliedSuccessfully: true });
    }
    throw new Error(`unexpected request ${method} ${path}`);
  };
  return {
    fetchImpl,
    calls,
    getMapping: () => mapping,
    setMapping: (value) => { mapping = value; },
    getFeatureState: () => featureState,
  };
}

function captureEnv() {
  const env = new Map();
  return { env, writeEnvImpl: (name, value) => env.set(name, String(value)) };
}
function ownershipFromCapturedEnv(env) {
  assert.equal(env.get("FORWARD_JIT_CREATED_BY_THIS_RUN"), "true");
  assert.equal(env.has("FORWARD_JIT_OWNED_CIDR"), false);
  return {
    createdByThisRun: true,
    runId: env.get("FORWARD_JIT_OWNER_RUN_ID"),
    userId: env.get("FORWARD_JIT_OWNED_USER_ID"),
    expiresAt: Number(env.get("FORWARD_JIT_OWNED_EXPIRES_AT")),
  };
}

test("JIT role follows current Supabase schema with short expiry and no unstable runner-IP pinning", () => {
  const role = buildJitRole(nowMs);
  assert.equal(role.expires_at, Math.floor(nowMs / 1000) + TEMP_ACCESS.ttlSeconds);
  assert.equal(TEMP_ACCESS.ttlSeconds, 25 * 60);
  assert.equal(role.role, "postgres");
  assert.equal(role.allowed_networks, undefined);
  assert.equal(validateJitMapping({ user_id: userId, roles: [role] }, { userId, nowMs }), true);
  assert.equal(validateJitMapping({ user_id: userId, user_roles: [{ ...role, allowed_networks: { allowed_cidrs: [], allowed_cidrs_v6: [] } }] }, { userId, nowMs }), true);
  assert.throws(
    () => validateJitMapping({ user_id: userId, user_roles: [{ ...role, allowed_networks: { allowed_cidrs: [{ cidr: "203.0.113.10/32" }], allowed_cidrs_v6: [] } }] }, { userId, nowMs }),
    /network restriction/,
  );
});

test("successful JIT mapping sends user_id + roles and produces CLI-compatible URL", async () => {
  const server = createMockJitServer({ normalizeEmptyNetworks: true });
  const captured = captureEnv();
  const ownership = await createRunOwnedJitMapping({ token, userId, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl });
  const put = server.calls.find((call) => call.method === "PUT" && call.path.endsWith("/database/jit"));
  const body = JSON.parse(put.body);
  assert.equal(body.user_id, userId);
  assert.equal(body.user_roles, undefined);
  assert.equal(body.roles.length, 1);
  assert.equal(body.roles[0].expires_at, Math.floor(nowMs / 1000) + TEMP_ACCESS.ttlSeconds);
  assert.equal(body.roles[0].allowed_networks, undefined);
  assert.equal(mappingMatchesRunOwnership(server.getMapping(), ownership), true);
  assert.equal(assertTemporaryDatabaseUrl(dbUrl), true);
  const parsed = new URL(dbUrl);
  assert.equal(parsed.searchParams.get("options"), "-c jit=on");
});

test("temporary database readiness uses bounded retries and exact explicit DB URL", async () => {
  let probes = 0;
  const sleeps = [];
  let finalArgs;
  const attempts = await waitForTemporaryDatabaseReady({
    supabaseBin: "/tmp/supabase",
    dbUrl,
    workdir: "/tmp/forward",
    retryDelaysMs: [0, 5, 10],
    runProbe: async ({ args }) => {
      probes += 1;
      finalArgs = args;
      if (probes < 3) throw new Error("not ready");
    },
    sleep: async (ms) => sleeps.push(ms),
  });
  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [5, 10]);
  assert.equal(finalArgs[finalArgs.indexOf("--db-url") + 1], dbUrl);
  assert.equal(finalArgs.at(-1), "select 1 as jit_ready;");
});

test("readiness failure preserves a bounded safe diagnostic without token or database URL", async () => {
  const error = new Error(`connection failed ${dbUrl} token=${token}`);
  error.stderr = `FATAL: password authentication failed for ${dbUrl}; Bearer ${token}; sbp_secretmaterial123456789`;
  await assert.rejects(
    waitForTemporaryDatabaseReady({
      supabaseBin: "/tmp/supabase",
      dbUrl,
      workdir: "/tmp/forward",
      retryDelaysMs: [0],
      runProbe: async () => { throw error; },
      sleep: async () => {},
      diagnosticSecrets: [token, dbUrl],
    }),
    (failure) => {
      assert.match(failure.message, /last probe:/);
      assert.match(failure.message, /password authentication failed/);
      assert.equal(failure.message.includes(token), false);
      assert.equal(failure.message.includes(dbUrl), false);
      assert.doesNotMatch(failure.message, /postgresql:\/\//);
      assert.doesNotMatch(failure.message, /sbp_secretmaterial/);
      return true;
    },
  );
  const direct = safeProbeDiagnostic(error, [token, dbUrl]);
  assert.ok(direct.length <= 240);
});

test("pre-existing mapping fails before mutation and cleanup never deletes it", async () => {
  const role = buildJitRole(nowMs);
  const server = createMockJitServer({ preexisting: { user_id: userId, user_roles: [role] } });
  const captured = captureEnv();
  await assert.rejects(createRunOwnedJitMapping({ token, userId, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl }), /pre-existing Production JIT mapping/);
  assert.equal(server.calls.some((call) => call.method === "PUT"), false);
  assert.equal(captured.env.has("FORWARD_JIT_CREATED_BY_THIS_RUN"), false);
});

test("ambiguous PUT after exact server mutation is reconciled into owned state and safely cleaned", async () => {
  const server = createMockJitServer({ ambiguousAfterMutation: true });
  const captured = captureEnv();
  const ownership = await createRunOwnedJitMapping({ token, userId, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl });
  assert.equal(mappingMatchesRunOwnership(server.getMapping(), ownership), true);
  assert.equal(ownershipFromCapturedEnv(captured.env).runId, runId);
  const result = await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.deepEqual(result, { deleted: true, reason: "owned" });
  assert.equal(server.getMapping(), null);
});

test("ambiguous PUT without exact mapping never establishes ownership or blind deletes", async () => {
  const server = createMockJitServer({ ambiguousBeforeMutation: true });
  const captured = captureEnv();
  await assert.rejects(createRunOwnedJitMapping({ token, userId, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl }), /network failure before mutation evidence/);
  assert.equal(captured.env.has("FORWARD_JIT_CREATED_BY_THIS_RUN"), false);
  const result = await cleanupRunOwnedJitMapping({ token, ownership: null, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.deepEqual(result, { deleted: false, reason: "not-owned" });
  assert.equal(server.calls.some((call) => call.method === "DELETE"), false);
});

test("confirmed mapping with malformed response records ownership before validation failure", async () => {
  const server = createMockJitServer({ malformedPutResponse: true });
  const captured = captureEnv();
  await assert.rejects(createRunOwnedJitMapping({ token, userId, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl }), /exactly one role/);
  const ownership = ownershipFromCapturedEnv(captured.env);
  assert.equal(mappingMatchesRunOwnership(server.getMapping(), ownership), true);
  const result = await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.equal(result.deleted, true);
});

test("cleanup refuses foreign run, foreign fingerprint, and unrelated user state", async () => {
  const role = buildJitRole(nowMs);
  const server = createMockJitServer({ preexisting: { user_id: userId, user_roles: [role] } });
  const otherRunOwnership = buildRunOwnership({ userId, runId: "999999", expiresAt: role.expires_at });
  await assert.rejects(cleanupRunOwnedJitMapping({ token, ownership: otherRunOwnership, currentRunId: runId, fetchImpl: server.fetchImpl }), /different GitHub run/);
  const foreignFingerprint = buildRunOwnership({ userId, runId, expiresAt: role.expires_at + 1 });
  await assert.rejects(cleanupRunOwnedJitMapping({ token, ownership: foreignFingerprint, currentRunId: runId, fetchImpl: server.fetchImpl }), /does not match this run ownership fingerprint/);
  const otherUser = buildRunOwnership({ userId: otherUserId, runId, expiresAt: role.expires_at });
  assert.deepEqual(await cleanupRunOwnedJitMapping({ token, ownership: otherUser, currentRunId: runId, fetchImpl: server.fetchImpl }), { deleted: false, reason: "already-absent" });
  assert.equal(server.getMapping() !== null, true);
});

test("cleanup is idempotent after an owned mapping is absent", async () => {
  const ownership = buildRunOwnership({ userId, runId, expiresAt: buildJitRole(nowMs).expires_at });
  const server = createMockJitServer();
  assert.deepEqual(await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl }), { deleted: false, reason: "already-absent" });
  assert.deepEqual(await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl }), { deleted: false, reason: "already-absent" });
});

test("Temporary Access feature restore occurs only for current-run ownership and zero residual mappings", async () => {
  const server = createMockJitServer();
  await cleanupRunOwnedTemporaryAccess({ token, ownership: null, currentRunId: runId, featureEnabledByThisRun: true, featureOwnerRunId: runId, fetchImpl: server.fetchImpl });
  assert.equal(server.getFeatureState(), "disabled");
  assert.equal(server.calls.some((call) => call.method === "PUT" && call.path.endsWith(`/projects/${TEMP_ACCESS.projectRef}/jit-access`)), true);
  const foreignServer = createMockJitServer();
  await assert.rejects(cleanupRunOwnedTemporaryAccess({ token, ownership: null, currentRunId: runId, featureEnabledByThisRun: true, featureOwnerRunId: "999999", fetchImpl: foreignServer.fetchImpl }), /different GitHub run/);
  assert.equal(foreignServer.getFeatureState(), "enabled");
});

test("Temporary Access uses documented path first and bounded legacy fallback only on 404", async () => {
  const server = createMockJitServer({ canonicalFeatureMissing: true });
  await cleanupRunOwnedTemporaryAccess({ token, ownership: null, currentRunId: runId, featureEnabledByThisRun: true, featureOwnerRunId: runId, fetchImpl: server.fetchImpl });
  const featurePuts = server.calls.filter((call) => call.method === "PUT" && call.path.endsWith("jit-access"));
  assert.deepEqual(featurePuts.map((call) => call.path), [
    `/v1/projects/${TEMP_ACCESS.projectRef}/jit-access`,
    `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit-access`,
  ]);
  assert.equal(server.getFeatureState(), "disabled");
});

test("safe Management API diagnostic exposes only bounded structured code/message", async () => {
  const server = createMockJitServer({ apiError: { status: 400, data: { code: "validation_failed", message: "roles must be supplied", secret: token } } });
  await assert.rejects(
    createRunOwnedJitMapping({ token, userId, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: () => {} }),
    (error) => {
      assert.match(error.message, /HTTP 400/);
      assert.match(error.message, /code=validation_failed/);
      assert.match(error.message, /message=roles must be supplied/);
      assert.equal(error.message.includes(token), false);
      return true;
    },
  );
});

test("workflow keeps always cleanup, serialization, and no credential fallback", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /temporary-database-access\.mjs cleanup/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /concurrency:\s*\n\s+group:\s*hamza-forward-production-migrations\s*\n\s+cancel-in-progress:\s*false/);
  assert.match(workflow, /required Production Supabase JIT token is unavailable/);
  assert.match(workflow, /SUPABASE_PRODUCTION_JIT_TOKEN:\s*\$\{\{ secrets\.SUPABASE_PRODUCTION_JIT_TOKEN \}\}/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_PASSWORD|secrets\.SUPABASE_ACCESS_TOKEN/);
});

test("no residual mapping assertion is exact-user scoped", () => {
  assert.equal(assertNoResidualJitMapping({ items: [] }, { userId }), true);
  assert.throws(() => assertNoResidualJitMapping({ items: [{ user_id: userId }] }, { userId }), /remains after cleanup/);
});
