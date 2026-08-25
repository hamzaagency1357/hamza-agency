import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  TEMP_ACCESS,
  assertNoResidualJitMapping,
  assertTemporaryDatabaseUrl,
  buildJitDbUrl,
  buildJitRole,
  cleanupTemporaryDatabaseMapping,
  validateJitMapping,
  waitForTemporaryDatabaseReady,
} from "../scripts/ops/temporary-database-access.mjs";

const userId = "123e4567-e89b-42d3-a456-426614174000";
const ipv4 = "203.0.113.10";
const token = "sbp_test-token-value-with-reserved_@:_chars";
const host = "aws-1-eu-central-1.pooler.supabase.com";
const dbUrl = buildJitDbUrl({ host, token });

function response(status, data) {
  return {
    status,
    text: async () => (data === undefined ? "" : JSON.stringify(data)),
  };
}

test("successful constrained JIT mapping produces a CLI-compatible temporary database URL", async () => {
  const nowMs = 1_800_000_000_000;
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
    runProbe: async ({ args }) => {
      seenArgs = args;
    },
    sleep: async () => {},
  });

  assert.equal(attempts, 1);
  assert.deepEqual(seenArgs.slice(0, 4), ["--workdir", "/tmp/forward", "db", "query"]);
  assert.equal(seenArgs[seenArgs.indexOf("--db-url") + 1], dbUrl);
  assert.equal(seenArgs.at(-1), "select 1 as jit_ready;");
  assert.match(dbUrl, /^postgresql:\/\//);
  assert.match(dbUrl, new RegExp(`postgres\\.${TEMP_ACCESS.projectRef}`));
  assert.equal(decodeURIComponent(new URL(dbUrl).password), token);
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

test("workflow gates forward reads on readiness and always runs fail-closed cleanup", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /temporary-database-access\.mjs wait/);
  assert.match(workflow, /temporary-database-access\.mjs cleanup/);
  assert.match(workflow, /if:\s*always\(\)/);
});

test("cleanup succeeds after partial preflight failure when mapping is removed and JIT was already enabled", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push([init.method, new URL(url).pathname]);
    if (init.method === "DELETE") return response(200, {});
    return response(200, { items: [] });
  };

  assert.equal(await cleanupTemporaryDatabaseMapping({ token, userId, jitWasEnabled: true, fetchImpl }), true);
  assert.deepEqual(calls, [
    ["DELETE", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/${userId}`],
    ["GET", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/list`],
  ]);
});

test("cleanup restores Temporary Access to disabled only when this workflow enabled it", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push([init.method, path, init.body ?? null]);
    if (init.method === "DELETE") return response(200, {});
    if (init.method === "GET") return response(200, { items: [] });
    assert.equal(path, `/v1/projects/${TEMP_ACCESS.projectRef}/jit-access`);
    assert.equal(init.body, JSON.stringify({ state: "disabled" }));
    return response(200, { state: "disabled", appliedSuccessfully: true });
  };

  assert.equal(await cleanupTemporaryDatabaseMapping({ token, userId, jitWasEnabled: false, fetchImpl }), true);
  assert.deepEqual(calls.map(([method, path]) => [method, path]), [
    ["DELETE", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/${userId}`],
    ["GET", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/list`],
    ["PUT", `/v1/projects/${TEMP_ACCESS.projectRef}/jit-access`],
  ]);
});

test("cleanup is idempotent when the exact JIT mapping is already absent", async () => {
  const fetchImpl = async (_url, init) => {
    if (init.method === "DELETE") return response(404, {});
    return response(200, { items: [] });
  };

  assert.equal(await cleanupTemporaryDatabaseMapping({ token, userId, jitWasEnabled: true, fetchImpl }), true);
});

test("HTTP 406 remains fail-closed but does not prevent restoring JIT to disabled", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push([init.method, path]);
    if (init.method === "DELETE") return response(200, {});
    if (init.method === "GET") return response(406, { message: "Not Acceptable" });
    return response(200, { state: "disabled", appliedSuccessfully: true });
  };

  await assert.rejects(
    cleanupTemporaryDatabaseMapping({ token, userId, jitWasEnabled: false, fetchImpl }),
    /cleanup failed closed:.*database\/jit\/list returned HTTP 406/,
  );
  assert.deepEqual(calls, [
    ["DELETE", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/${userId}`],
    ["GET", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/list`],
    ["PUT", `/v1/projects/${TEMP_ACCESS.projectRef}/jit-access`],
  ]);
});

test("cleanup fails if a residual mapping remains after DELETE", async () => {
  const residualRole = buildJitRole(ipv4, 1_800_000_000_000);
  const fetchImpl = async (_url, init) => {
    if (init.method === "DELETE") return response(200, {});
    return response(200, { items: [{ user_id: userId, user_roles: [residualRole] }] });
  };

  await assert.rejects(
    cleanupTemporaryDatabaseMapping({ token, userId, jitWasEnabled: true, fetchImpl }),
    /JIT user mapping remains after cleanup/,
  );
});

test("missing initial JIT state fails closed after still attempting mapping cleanup", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push([init.method, new URL(url).pathname]);
    if (init.method === "DELETE") return response(200, {});
    return response(200, { items: [] });
  };

  await assert.rejects(
    cleanupTemporaryDatabaseMapping({ token, userId, jitWasEnabled: undefined, fetchImpl }),
    /initial Temporary Access state was not recorded/,
  );
  assert.deepEqual(calls, [
    ["DELETE", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/${userId}`],
    ["GET", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/list`],
  ]);
});

test("residual mapping validator rejects malformed list responses", () => {
  assert.throws(
    () => assertNoResidualJitMapping({ mapping: [] }, { userId }),
    /JIT list response omitted items array/,
  );
});
