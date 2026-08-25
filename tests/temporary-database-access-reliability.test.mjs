import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  TEMP_ACCESS,
  buildJitDbUrl,
  buildJitRole,
  validateJitMapping,
} from "../scripts/ops/temporary-database-access.mjs";
import {
  assertNoResidualJitMapping,
  assertTemporaryDatabaseUrl,
  cleanupTemporaryDatabaseMapping,
  waitForTemporaryDatabaseReady,
} from "../scripts/ops/temporary-database-access-reliability.mjs";

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

test("workflow gates forward reads on readiness and uses fail-closed list-based cleanup", async () => {
  const workflow = await readFile(".github/workflows/forward-production-migrations.yml", "utf8");
  assert.match(workflow, /temporary-database-access-reliability\.mjs wait/);
  assert.match(workflow, /temporary-database-access-reliability\.mjs cleanup/);
  assert.match(workflow, /if:\s*always\(\)/);
});

test("cleanup succeeds after a partial preflight failure when DELETE and list verification succeed", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push([init.method, new URL(url).pathname]);
    if (init.method === "DELETE") return response(200, {});
    return response(200, { items: [] });
  };

  assert.equal(await cleanupTemporaryDatabaseMapping({ token, userId, fetchImpl }), true);
  assert.deepEqual(calls, [
    ["DELETE", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/${userId}`],
    ["GET", `/v1/projects/${TEMP_ACCESS.projectRef}/database/jit/list`],
  ]);
});

test("cleanup is idempotent when the exact JIT mapping is already absent", async () => {
  const fetchImpl = async (_url, init) => {
    if (init.method === "DELETE") return response(404, {});
    return response(200, { items: [] });
  };

  assert.equal(await cleanupTemporaryDatabaseMapping({ token, userId, fetchImpl }), true);
});

test("HTTP 406 during cleanup verification remains fail-closed", async () => {
  const fetchImpl = async (_url, init) => {
    if (init.method === "DELETE") return response(200, {});
    return response(406, { message: "Not Acceptable" });
  };

  await assert.rejects(
    cleanupTemporaryDatabaseMapping({ token, userId, fetchImpl }),
    /GET .*database\/jit\/list returned HTTP 406/,
  );
});

test("cleanup fails if a residual mapping remains after DELETE", async () => {
  const residualRole = buildJitRole(ipv4, 1_800_000_000_000);
  const fetchImpl = async (_url, init) => {
    if (init.method === "DELETE") return response(200, {});
    return response(200, { items: [{ user_id: userId, user_roles: [residualRole] }] });
  };

  await assert.rejects(
    cleanupTemporaryDatabaseMapping({ token, userId, fetchImpl }),
    /JIT user mapping remains after cleanup/,
  );
});

test("residual mapping validator rejects malformed list responses", () => {
  assert.throws(
    () => assertNoResidualJitMapping({ mapping: [] }, { userId }),
    /JIT list response omitted items array/,
  );
});
