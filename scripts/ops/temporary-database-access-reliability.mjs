import { execFile as execFileCallback } from "node:child_process";
import { setTimeout as sleepTimer } from "node:timers/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import {
  TEMP_ACCESS,
  assertAllowedManagementRequest,
} from "./temporary-database-access.mjs";

const execFile = promisify(execFileCallback);
const JIT_LIST_PATH = `/projects/${TEMP_ACCESS.projectRef}/database/jit/list`;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const READINESS_RETRY_DELAYS_MS = Object.freeze([0, 2_000, 4_000, 8_000, 12_000]);

function fail(message) {
  throw new Error(`temporary database access reliability: ${message}`);
}

export function assertReliabilityManagementRequest(method, path) {
  const normalizedMethod = String(method).toUpperCase();
  const normalizedPath = String(path);
  if (normalizedMethod === "GET" && normalizedPath === JIT_LIST_PATH) return true;
  return assertAllowedManagementRequest(normalizedMethod, normalizedPath);
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function apiRequest(token, path, {
  method = "GET",
  expected = [200],
  fetchImpl = fetch,
} = {}) {
  assertReliabilityManagementRequest(method, path);
  const response = await fetchImpl(`${TEMP_ACCESS.apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = parseJson(await response.text());
  if (!expected.includes(response.status)) {
    fail(`${method} ${path} returned HTTP ${response.status}`);
  }
  return { status: response.status, data };
}

function assertUserId(userId) {
  if (!UUID_RE.test(String(userId))) fail("cleanup user id is invalid");
  return String(userId);
}

export function assertNoResidualJitMapping(data, { userId }) {
  const expectedUserId = assertUserId(userId);
  if (!data || !Array.isArray(data.items)) fail("JIT list response omitted items array");
  const residual = data.items.filter((item) => item?.user_id === expectedUserId);
  if (residual.length !== 0) fail("JIT user mapping remains after cleanup");
  return true;
}

export async function cleanupTemporaryDatabaseMapping({ token, userId, fetchImpl = fetch }) {
  if (typeof token !== "string" || token.length < 20 || /\s/.test(token)) fail("invalid Supabase token");
  const id = assertUserId(userId);
  const deletePath = `/projects/${TEMP_ACCESS.projectRef}/database/jit/${encodeURIComponent(id)}`;

  await apiRequest(token, deletePath, {
    method: "DELETE",
    expected: [200, 404],
    fetchImpl,
  });

  // The singular GET /database/jit returned 406 after Run #8's successful DELETE.
  // Verify deletion through the documented list endpoint instead. A non-200 list
  // response remains fail-closed; HTTP 406 is never normalized to success.
  const after = await apiRequest(token, JIT_LIST_PATH, { expected: [200], fetchImpl });
  assertNoResidualJitMapping(after.data, { userId: id });
  return true;
}

export function assertTemporaryDatabaseUrl(dbUrl) {
  let url;
  try {
    url = new URL(String(dbUrl));
  } catch {
    fail("temporary database URL is invalid");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") fail("temporary database URL is not Postgres");
  if (!url.hostname.endsWith(TEMP_ACCESS.poolerHostSuffix)) fail("temporary database URL is not a Supavisor host");
  if (url.port !== String(TEMP_ACCESS.poolerPort)) fail("temporary database URL is not Supavisor session mode port 5432");
  if (decodeURIComponent(url.username) !== `postgres.${TEMP_ACCESS.projectRef}`) fail("temporary database URL username mismatch");
  if (!url.password) fail("temporary database URL has no password");
  if (url.searchParams.get("sslmode") !== "require") fail("temporary database URL must require SSL");
  if (url.searchParams.get("options") !== "-c jit=true") fail("temporary database URL must enable JIT through startup options");
  return true;
}

export function readinessProbeArgs({ dbUrl, workdir }) {
  assertTemporaryDatabaseUrl(dbUrl);
  if (typeof workdir !== "string" || workdir.length === 0) fail("temporary database workdir is missing");
  return [
    "--workdir",
    workdir,
    "db",
    "query",
    "--db-url",
    dbUrl,
    "--output",
    "json",
    "select 1 as jit_ready;",
  ];
}

async function defaultRunProbe({ supabaseBin, args }) {
  await execFile(supabaseBin, args, {
    env: process.env,
    timeout: 20_000,
    maxBuffer: 128 * 1024,
  });
}

export async function waitForTemporaryDatabaseReady({
  supabaseBin,
  dbUrl,
  workdir,
  retryDelaysMs = READINESS_RETRY_DELAYS_MS,
  runProbe = defaultRunProbe,
  sleep = (ms) => sleepTimer(ms),
}) {
  if (typeof supabaseBin !== "string" || supabaseBin.length === 0) fail("SUPABASE_BIN is missing");
  if (!Array.isArray(retryDelaysMs) || retryDelaysMs.length === 0) fail("readiness retry schedule is empty");
  const args = readinessProbeArgs({ dbUrl, workdir });

  for (let index = 0; index < retryDelaysMs.length; index += 1) {
    const delayMs = retryDelaysMs[index];
    if (!Number.isSafeInteger(delayMs) || delayMs < 0) fail("invalid readiness retry delay");
    if (delayMs > 0) await sleep(delayMs);
    try {
      await runProbe({ supabaseBin, args, attempt: index + 1 });
      return index + 1;
    } catch {
      if (index + 1 < retryDelaysMs.length) {
        console.warn(`Temporary database access is not ready after attempt ${index + 1}; retrying.`);
      }
    }
  }

  fail(`temporary Postgres access did not become ready after ${retryDelaysMs.length} bounded attempts`);
}

async function main() {
  const command = process.argv[2];
  if (command === "wait") {
    const attempts = await waitForTemporaryDatabaseReady({
      supabaseBin: process.env.SUPABASE_BIN,
      dbUrl: process.env.FORWARD_DB_URL,
      workdir: process.env.FORWARD_WORKDIR,
    });
    console.log(`Supabase temporary Postgres access ready after ${attempts} attempt(s).`);
    return;
  }

  if (command === "cleanup") {
    const token = process.env.SUPABASE_PRODUCTION_JIT_TOKEN;
    const userId = process.env.FORWARD_JIT_USER_ID;
    if (!token || !userId) {
      console.log("No temporary JIT user mapping was recorded for cleanup.");
      return;
    }
    console.log(`::add-mask::${token}`);
    await cleanupTemporaryDatabaseMapping({ token, userId });
    console.log("Supabase temporary postgres JIT mapping removed and absence verified through the list endpoint.");
    return;
  }

  fail("expected command wait or cleanup");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
