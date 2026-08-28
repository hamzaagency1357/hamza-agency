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
  createRunOwnedJitMapping,
  mappingMatchesRunOwnership,
  validateJitMapping,
  waitForTemporaryDatabaseReady,
} from "../scripts/ops/temporary-database-access.mjs";

const userId = "123e4567-e89b-42d3-a456-426614174000";
const otherUserId = "223e4567-e89b-42d3-a456-426614174000";
const runId = "33160851147";
const ipv4 = "203.0.113.10";
const nowMs = 1_800_000_000_000;
const token = "sbp_test-token-value-with-reserved_@:_chars";
const host = "aws-1-eu-central-1.pooler.supabase.com";
const dbUrl = buildJitDbUrl({ host, token });

function response(status, data) {
  return {
    status,
    text: async () => (data === undefined ? "" : JSON.stringify(data)),
  };
}

function createMockJitServer({ preexisting = null, ambiguousPut = false, malformedPutResponse = false } = {}) {
  let mapping = preexisting;
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const method = init.method ?? "GET";
    calls.push({ method, path, body: init.body ?? null });

    if (method === "GET" && path.endsWith(`/projects/${TEMP_ACCESS.projectRef}/database/jit/list`)) {
      return response(200, { items: mapping ? [mapping] : [] });
    }
    if (method === "PUT" && path.endsWith(`/projects/${TEMP_ACCESS.projectRef}/database/jit`)) {
      if (ambiguousPut) throw new Error("simulated network failure after request dispatch");
      const body = JSON.parse(init.body);
      assert.equal(body.user_id, userId);
      assert.ok(Array.isArray(body.user_roles), "current Supabase JIT request field must be user_roles");
      assert.equal(body.roles, undefined);
      mapping = { user_id: body.user_id, user_roles: body.user_roles };
      return response(200, malformedPutResponse ? { user_id: body.user_id, user_roles: [] } : mapping);
    }
    if (method === "DELETE" && path.endsWith(`/database/jit/${userId}`)) {
      mapping = null;
      return response(200, {});
    }
    if (method === "DELETE" && path.includes("/database/jit/")) {
      throw new Error("unexpected delete target");
    }
    throw new Error(`unexpected request ${method} ${path}`);
  };
  return { fetchImpl, calls, getMapping: () => mapping, setMapping: (value) => { mapping = value; } };
}

function captureEnv() {
  const env = new Map();
  return {
    env,
    writeEnvImpl: (name, value) => env.set(name, String(value)),
  };
}

function ownershipFromCapturedEnv(env) {
  assert.equal(env.get("FORWARD_JIT_CREATED_BY_THIS_RUN"), "true");
  return {
    createdByThisRun: true,
    runId: env.get("FORWARD_JIT_OWNER_RUN_ID"),
    userId: env.get("FORWARD_JIT_OWNED_USER_ID"),
    cidr: env.get("FORWARD_JIT_OWNED_CIDR"),
    expiresAt: Number(env.get("FORWARD_JIT_OWNED_EXPIRES_AT")),
  };
}

test("successful constrained JIT mapping produces a CLI-compatible temporary database URL", async () => {
  const role = buildJitRole(ipv4, nowMs);
  const mapping = { user_id: userId, user_roles: [role] };
  assert.equal(validateJitMapping(mapping, { userId, ipv4, nowMs }), true);
  assert.equal(assertTemporaryDatabaseUrl(dbUrl), true);

  let seenArgs;
  const attempts = await waitForTemporaryDatabaseReady({
    supabaseBin: "/tmp/supabase",
    dbUrl,
    workdir: "/tmp/forward",
    retryDelaysMs: [0],
    runProbe: async ({ args }) => { seenArgs = args; },
    sleep: async () => {},
  });

  assert.equal(attempts, 1);
  assert.deepEqual(seenArgs.slice(0, 4), ["--workdir", "/tmp/forward", "db", "query"]);
  assert.equal(seenArgs[seenArgs.indexOf("--db-url") + 1], dbUrl);
  assert.equal(seenArgs.at(-1), "select 1 as jit_ready;");
});

test("temporary database readiness uses bounded propagation retries", async () => {
  let probes = 0;
  const sleeps = [];
  const attempts = await waitForTemporaryDatabaseReady({
    supabaseBin: "/tmp/supabase",
    dbUrl,
    workdir: "/tmp/forward",
    retryDelaysMs: [0, 5, 10],
    runProbe: async () => {
      probes += 1;
      if (probes < 3) throw new Error("not ready");
    },
    sleep: async (ms) => sleeps.push(ms),
  });
  assert.equal(attempts, 3);
  assert.equal(probes, 3);
  assert.deepEqual(sleeps, [5, 10]);
});

test("workflow keeps always cleanup, serializes Production runs, and never cancels an active run", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /temporary-database-access\.mjs cleanup/);
  assert.match(workflow, /if:\s*always\(\)/);
  assert.match(workflow, /concurrency:\s*\n\s+group:\s*hamza-forward-production-migrations\s*\n\s+cancel-in-progress:\s*false/);
  assert.match(workflow, /if:\s*github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
});

test("empty Production PAT has an explicit safe diagnostic and no fallback credential", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /required Production Supabase JIT token is unavailable/);
  assert.match(workflow, /SUPABASE_PRODUCTION_JIT_TOKEN:\s*\$\{\{ secrets\.SUPABASE_PRODUCTION_JIT_TOKEN \}\}/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_PASSWORD|secrets\.SUPABASE_ACCESS_TOKEN/);
});

test("pre-existing mapping fails closed before PUT", async () => {
  const role = buildJitRole(ipv4, nowMs);
  const server = createMockJitServer({ preexisting: { user_id: userId, user_roles: [role] } });
  const captured = captureEnv();
  await assert.rejects(
    createRunOwnedJitMapping({ token, userId, ipv4, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl }),
    /pre-existing Production JIT mapping detected; refusing to modify it/,
  );
  assert.equal(server.calls.some((call) => call.method === "PUT"), false);
  assert.equal(server.calls.some((call) => call.method === "DELETE"), false);
  assert.equal(captured.env.has("FORWARD_JIT_CREATED_BY_THIS_RUN"), false);
});

test("resolving or knowing a user id alone never establishes cleanup ownership", async () => {
  const server = createMockJitServer();
  const result = await cleanupRunOwnedJitMapping({ token, ownership: null, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.deepEqual(result, { deleted: false, reason: "not-owned" });
  assert.equal(server.calls.length, 0);
});

test("successful PUT persists current-run ownership before later validation", async () => {
  const server = createMockJitServer({ malformedPutResponse: true });
  const captured = captureEnv();
  await assert.rejects(
    createRunOwnedJitMapping({ token, userId, ipv4, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl }),
    /exactly one role/,
  );
  const ownership = ownershipFromCapturedEnv(captured.env);
  assert.equal(ownership.runId, runId);
  assert.equal(ownership.userId, userId);
  assert.equal(ownership.cidr, `${ipv4}/32`);
  assert.equal(ownership.expiresAt, nowMs + TEMP_ACCESS.ttlMs);
});

test("confirmed PUT followed by validation failure can delete only the owned mapping", async () => {
  const server = createMockJitServer({ malformedPutResponse: true });
  const captured = captureEnv();
  await assert.rejects(
    createRunOwnedJitMapping({ token, userId, ipv4, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl }),
  );
  const ownership = ownershipFromCapturedEnv(captured.env);
  assert.equal(mappingMatchesRunOwnership(server.getMapping(), ownership), true);
  const result = await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.equal(result.deleted, true);
  assert.equal(server.getMapping(), null);
});

test("ambiguous or unconfirmed PUT failure never establishes ownership or issues blind DELETE", async () => {
  const server = createMockJitServer({ ambiguousPut: true });
  const captured = captureEnv();
  await assert.rejects(
    createRunOwnedJitMapping({ token, userId, ipv4, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl }),
    /simulated network failure/,
  );
  assert.equal(captured.env.has("FORWARD_JIT_CREATED_BY_THIS_RUN"), false);
  const deleteCountBefore = server.calls.filter((call) => call.method === "DELETE").length;
  await cleanupRunOwnedJitMapping({ token, ownership: null, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.equal(server.calls.filter((call) => call.method === "DELETE").length, deleteCountBefore);
});

test("pre-PUT failure never causes cleanup DELETE", async () => {
  const role = buildJitRole(ipv4, nowMs);
  const server = createMockJitServer({ preexisting: { user_id: userId, user_roles: [role] } });
  await assert.rejects(createRunOwnedJitMapping({ token, userId, ipv4, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: () => {} }));
  await cleanupRunOwnedJitMapping({ token, ownership: null, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.equal(server.calls.some((call) => call.method === "DELETE"), false);
});

test("dry-run failure, apply failure, post-apply failure, and success all clean up a confirmed owned mapping", async () => {
  for (const stage of ["dry-run failure", "apply failure", "post-apply failure", "success"]) {
    const server = createMockJitServer();
    const captured = captureEnv();
    const ownership = await createRunOwnedJitMapping({ token, userId, ipv4, runId, nowMs, fetchImpl: server.fetchImpl, writeEnvImpl: captured.writeEnvImpl });
    assert.equal(server.getMapping() !== null, true, stage);
    const result = await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl });
    assert.equal(result.deleted, true, stage);
    assert.equal(server.getMapping(), null, stage);
  }
});

test("ownership from another GitHub run id refuses DELETE", async () => {
  const role = buildJitRole(ipv4, nowMs);
  const server = createMockJitServer({ preexisting: { user_id: userId, user_roles: [role] } });
  const ownership = buildRunOwnership({ userId, runId: "999999", ipv4, expiresAt: role.expires_at });
  await assert.rejects(
    cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl }),
    /different GitHub run/,
  );
  assert.equal(server.calls.some((call) => call.method === "DELETE"), false);
});

test("foreign user ownership cannot delete another user's mapping", async () => {
  const role = buildJitRole(ipv4, nowMs);
  const server = createMockJitServer({ preexisting: { user_id: userId, user_roles: [role] } });
  const ownership = buildRunOwnership({ userId: otherUserId, runId, ipv4, expiresAt: role.expires_at });
  const result = await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.deepEqual(result, { deleted: false, reason: "already-absent" });
  assert.equal(server.calls.some((call) => call.method === "DELETE"), false);
});

test("current-run ownership cannot delete a same-user mapping with a foreign fingerprint", async () => {
  const foreignRole = buildJitRole("198.51.100.44", nowMs);
  const server = createMockJitServer({ preexisting: { user_id: userId, user_roles: [foreignRole] } });
  const ownership = buildRunOwnership({ userId, runId, ipv4, expiresAt: nowMs + TEMP_ACCESS.ttlMs });
  await assert.rejects(
    cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl }),
    /does not match this run ownership fingerprint/,
  );
  assert.equal(server.calls.some((call) => call.method === "DELETE"), false);
});

test("cleanup is idempotent when the exact owned mapping is already absent", async () => {
  const server = createMockJitServer();
  const ownership = buildRunOwnership({ userId, runId, ipv4, expiresAt: nowMs + TEMP_ACCESS.ttlMs });
  const first = await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl });
  const second = await cleanupRunOwnedJitMapping({ token, ownership, currentRunId: runId, fetchImpl: server.fetchImpl });
  assert.deepEqual(first, { deleted: false, reason: "already-absent" });
  assert.deepEqual(second, { deleted: false, reason: "already-absent" });
  assert.equal(server.calls.some((call) => call.method === "DELETE"), false);
});

test("residual mapping validator rejects malformed list responses", () => {
  assert.throws(
    () => assertNoResidualJitMapping({ mapping: [] }, { userId }),
    /JIT list response omitted items array/,
  );
});
