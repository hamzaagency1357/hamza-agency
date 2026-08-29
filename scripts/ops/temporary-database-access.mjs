import { execFile as execFileCallback } from "node:child_process";
import { appendFileSync } from "node:fs";
import { setTimeout as sleepTimer } from "node:timers/promises";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const execFile = promisify(execFileCallback);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_ID_RE = /^\d+$/;

export const TEMP_ACCESS = Object.freeze({
  apiBase: "https://api.supabase.com/v1",
  projectRef: "fvaurkfnsvsfohpzguho",
  minimumPostgresVersion: "17.6.1.081",
  postgresRole: "postgres",
  ttlSeconds: 45 * 60,
  ttlMs: 45 * 60 * 1000,
  poolerPort: 5432,
  poolerHostSuffix: ".pooler.supabase.com",
});

export const READINESS_RETRY_DELAYS_MS = Object.freeze([0, 2_000, 4_000, 8_000, 12_000]);
export const PREFERRED_SCOPED_PAT_PERMISSIONS = Object.freeze([
  "project_admin_read",
  "project_admin_write",
  "database_jit_read",
  "database_jit_write",
  "database_pooling_config_read",
  "database_ssl_config_read",
  "edge_functions_read",
]);
export const REQUIRED_FINE_GRAINED_PERMISSIONS = PREFERRED_SCOPED_PAT_PERMISSIONS;

const JIT_LIST_PATH = `/projects/${TEMP_ACCESS.projectRef}/database/jit/list`;
const JIT_MAPPING_PATH = `/projects/${TEMP_ACCESS.projectRef}/database/jit`;
const JIT_FEATURE_PRIMARY_PATH = `/projects/${TEMP_ACCESS.projectRef}/jit-access`;
const JIT_FEATURE_LEGACY_PATH = `/projects/${TEMP_ACCESS.projectRef}/database/jit-access`;
const EXACT_MANAGEMENT_API_ALLOWLIST = new Set([
  "GET /profile",
  `GET /projects/${TEMP_ACCESS.projectRef}`,
  `GET /projects/${TEMP_ACCESS.projectRef}/ssl-enforcement`,
  `GET ${JIT_FEATURE_PRIMARY_PATH}`,
  `PUT ${JIT_FEATURE_PRIMARY_PATH}`,
  `GET ${JIT_FEATURE_LEGACY_PATH}`,
  `PUT ${JIT_FEATURE_LEGACY_PATH}`,
  `PUT ${JIT_MAPPING_PATH}`,
  `GET ${JIT_MAPPING_PATH}`,
  `GET ${JIT_LIST_PATH}`,
  `GET /projects/${TEMP_ACCESS.projectRef}/config/database/pooler`,
]);

function fail(message) { throw new Error(`temporary database access: ${message}`); }
function errorMessage(error) { return error instanceof Error ? error.message : String(error); }
function assertUserId(value, label = "JIT user id") {
  const id = String(value || "");
  if (!UUID_RE.test(id)) fail(`${label} is invalid`);
  return id;
}
function assertRunId(value, label = "GitHub run id") {
  const runId = String(value || "");
  if (!RUN_ID_RE.test(runId)) fail(`${label} is invalid`);
  return runId;
}

export function assertAllowedManagementRequest(method, path) {
  const normalizedMethod = String(method).toUpperCase();
  const normalizedPath = String(path);
  if (!normalizedPath.startsWith("/") || normalizedPath.includes("?") || normalizedPath.includes("#")) {
    fail("Management API path is not a canonical allowlisted path");
  }
  if (EXACT_MANAGEMENT_API_ALLOWLIST.has(`${normalizedMethod} ${normalizedPath}`)) return true;
  const deletePrefix = `/projects/${TEMP_ACCESS.projectRef}/database/jit/`;
  if (normalizedMethod === "DELETE" && normalizedPath.startsWith(deletePrefix)) {
    const encoded = normalizedPath.slice(deletePrefix.length);
    let userId;
    try { userId = decodeURIComponent(encoded); } catch { fail("invalid encoded JIT cleanup user id"); }
    if (encoded.includes("/") || !UUID_RE.test(userId)) fail("JIT cleanup is not restricted to one valid user id");
    return true;
  }
  fail(`Management API request is outside the explicit allowlist: ${normalizedMethod} ${normalizedPath}`);
}

export function comparePgVersions(a, b) {
  const parse = (value) => {
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(String(value))) fail(`invalid Postgres version ${value}`);
    return String(value).split(".").map(Number);
  };
  const left = parse(a), right = parse(b);
  for (let i = 0; i < left.length; i += 1) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
export function assertSupportedPostgresVersion(version) {
  if (comparePgVersions(version, TEMP_ACCESS.minimumPostgresVersion) < 0) fail(`Postgres ${version} does not support Temporary Database Access`);
  return true;
}
export function assertIpv4(value) {
  const parts = String(value).trim().split(".");
  if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) fail(`invalid runner IPv4 ${value}`);
  return parts.map(Number).join(".");
}

export function buildJitRole(ipv4, nowMs = Date.now()) {
  const ip = assertIpv4(ipv4);
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) fail("invalid current time");
  return {
    role: TEMP_ACCESS.postgresRole,
    allowed_networks: { allowed_cidrs: [{ cidr: `${ip}/32` }], allowed_cidrs_v6: [] },
    expires_at: Math.floor(nowMs / 1000) + TEMP_ACCESS.ttlSeconds,
    branches_only: false,
  };
}

export function validateJitMapping(mapping, { userId, ipv4, nowMs = Date.now() }) {
  if (!mapping || mapping.user_id !== userId) fail("JIT mapping user mismatch");
  const roles = mapping.user_roles ?? mapping.roles;
  if (!Array.isArray(roles) || roles.length !== 1) fail("JIT mapping must contain exactly one role");
  const role = roles[0];
  if (role.role !== TEMP_ACCESS.postgresRole) fail("JIT mapping role is not postgres");
  if (role.branches_only === true) fail("JIT mapping is branches-only");
  const cidrs = role.allowed_networks?.allowed_cidrs;
  const cidrsV6 = role.allowed_networks?.allowed_cidrs_v6 ?? [];
  if (!Array.isArray(cidrs) || cidrs.length !== 1 || cidrs[0]?.cidr !== `${assertIpv4(ipv4)}/32`) fail("JIT mapping is not restricted to the current runner IPv4 /32");
  if (!Array.isArray(cidrsV6) || cidrsV6.length !== 0) fail("JIT mapping unexpectedly permits IPv6");
  if (!Number.isFinite(role.expires_at)) fail("JIT mapping has no finite expiry");
  const nowSeconds = Math.floor(nowMs / 1000);
  const remaining = role.expires_at - nowSeconds;
  if (remaining <= 0 || remaining > TEMP_ACCESS.ttlSeconds + 60) fail("JIT mapping expiry exceeds the 45-minute contract");
  return true;
}

export function findJitMappingForUser(data, { userId }) {
  const id = assertUserId(userId);
  if (!data || !Array.isArray(data.items)) fail("JIT list response omitted items array");
  return data.items.find((item) => item?.user_id === id) ?? null;
}
export function buildRunOwnership({ userId, runId, ipv4, expiresAt }) {
  const id = assertUserId(userId, "ownership user id");
  const ownerRunId = assertRunId(runId, "ownership GitHub run id");
  const cidr = `${assertIpv4(ipv4)}/32`;
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= 0) fail("ownership expiry is invalid");
  return Object.freeze({ createdByThisRun: true, userId: id, runId: ownerRunId, cidr, expiresAt });
}
export function mappingMatchesRunOwnership(mapping, ownership) {
  if (!mapping || !ownership?.createdByThisRun || mapping.user_id !== ownership.userId) return false;
  const roles = mapping.user_roles ?? mapping.roles;
  if (!Array.isArray(roles) || roles.length !== 1) return false;
  const role = roles[0];
  const cidrs = role?.allowed_networks?.allowed_cidrs;
  const cidrsV6 = role?.allowed_networks?.allowed_cidrs_v6 ?? [];
  return role?.role === TEMP_ACCESS.postgresRole && role?.branches_only !== true && Array.isArray(cidrs) && cidrs.length === 1
    && cidrs[0]?.cidr === ownership.cidr && Array.isArray(cidrsV6) && cidrsV6.length === 0 && role?.expires_at === ownership.expiresAt;
}

export function selectPoolerHost(config) {
  if (!Array.isArray(config) || config.length === 0) fail("missing Supavisor configuration");
  const primary = config.find((entry) => entry?.database_type === "PRIMARY") ?? config[0];
  for (const candidate of [primary.connection_string, primary.connectionString].filter(Boolean)) {
    try { const parsed = new URL(candidate); if (parsed.hostname.endsWith(TEMP_ACCESS.poolerHostSuffix)) return parsed.hostname; } catch {}
  }
  if (typeof primary.db_host === "string" && primary.db_host.endsWith(TEMP_ACCESS.poolerHostSuffix)) return primary.db_host;
  fail("Supavisor host is not a trusted pooler.supabase.com endpoint");
}
export function buildJitDbUrl({ host, token }) {
  if (typeof host !== "string" || !host.endsWith(TEMP_ACCESS.poolerHostSuffix)) fail("untrusted pooler host");
  if (typeof token !== "string" || token.length < 20 || /\s/.test(token)) fail("invalid Supabase token");
  const url = new URL(`postgresql://${host}:${TEMP_ACCESS.poolerPort}/postgres`);
  url.username = `postgres.${TEMP_ACCESS.projectRef}`;
  url.password = token;
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("options", "-c jit=on");
  return url.toString();
}
export function assertTemporaryDatabaseUrl(dbUrl) {
  let url; try { url = new URL(String(dbUrl)); } catch { fail("temporary database URL is invalid"); }
  if (!["postgresql:", "postgres:"].includes(url.protocol)) fail("temporary database URL is not Postgres");
  if (!url.hostname.endsWith(TEMP_ACCESS.poolerHostSuffix)) fail("temporary database URL is not a Supavisor host");
  if (url.port !== String(TEMP_ACCESS.poolerPort)) fail("temporary database URL is not Supavisor session mode port 5432");
  if (decodeURIComponent(url.username) !== `postgres.${TEMP_ACCESS.projectRef}`) fail("temporary database URL username mismatch");
  if (!url.password) fail("temporary database URL has no password");
  if (url.searchParams.get("sslmode") !== "require") fail("temporary database URL must require SSL");
  if (url.searchParams.get("options") !== "-c jit=on") fail("temporary database URL must enable JIT through startup options");
  return true;
}
export function readinessProbeArgs({ dbUrl, workdir }) {
  assertTemporaryDatabaseUrl(dbUrl);
  if (typeof workdir !== "string" || !workdir) fail("temporary database workdir is missing");
  return ["--workdir", workdir, "db", "query", "--db-url", dbUrl, "--output", "json", "select 1 as jit_ready;"];
}
async function defaultRunProbe({ supabaseBin, args }) {
  await execFile(supabaseBin, args, { env: process.env, timeout: 20_000, maxBuffer: 128 * 1024 });
}
export async function waitForTemporaryDatabaseReady({ supabaseBin, dbUrl, workdir, retryDelaysMs = READINESS_RETRY_DELAYS_MS, runProbe = defaultRunProbe, sleep = (ms) => sleepTimer(ms) }) {
  if (typeof supabaseBin !== "string" || !supabaseBin) fail("SUPABASE_BIN is missing");
  if (!Array.isArray(retryDelaysMs) || retryDelaysMs.length === 0) fail("readiness retry schedule is empty");
  const args = readinessProbeArgs({ dbUrl, workdir });
  for (let i = 0; i < retryDelaysMs.length; i += 1) {
    const delayMs = retryDelaysMs[i];
    if (!Number.isSafeInteger(delayMs) || delayMs < 0) fail("invalid readiness retry delay");
    if (delayMs > 0) await sleep(delayMs);
    try { await runProbe({ supabaseBin, args, attempt: i + 1 }); return i + 1; }
    catch { if (i + 1 < retryDelaysMs.length) console.warn(`Temporary database access is not ready after attempt ${i + 1}; retrying.`); }
  }
  fail(`temporary Postgres access did not become ready after ${retryDelaysMs.length} bounded attempts`);
}

function writeGithubEnv(name, value) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) fail("GITHUB_ENV is unavailable");
  if (String(value).includes("\n")) fail(`unsafe newline in ${name}`);
  appendFileSync(envFile, `${name}=${value}\n`, { encoding: "utf8", mode: 0o600 });
}
function diagnosticFromData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const code = typeof data.code === "string" ? data.code.slice(0, 80) : "";
  const message = typeof data.message === "string" ? data.message.slice(0, 240) : "";
  return [code && `code=${code}`, message && `message=${message}`].filter(Boolean).join(" ");
}
async function apiRequest(token, path, { method = "GET", body, expected = [200], fetchImpl = fetch } = {}) {
  assertAllowedManagementRequest(method, path);
  const response = await fetchImpl(`${TEMP_ACCESS.apiBase}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null; if (text) { try { data = JSON.parse(text); } catch { data = null; } }
  if (!expected.includes(response.status)) {
    const diagnostic = diagnosticFromData(data);
    fail(`${method} ${path} returned HTTP ${response.status}${diagnostic ? ` (${diagnostic})` : ""}`);
  }
  return { status: response.status, data };
}
async function jitFeatureRequest(token, { method = "GET", body, fetchImpl = fetch } = {}) {
  const primary = await apiRequest(token, JIT_FEATURE_PRIMARY_PATH, { method, body, expected: [200, 404], fetchImpl });
  if (primary.status !== 404) return primary;
  return apiRequest(token, JIT_FEATURE_LEGACY_PATH, { method, body, expected: [200], fetchImpl });
}
async function getRunnerIpv4() {
  const response = await fetch("https://api.ipify.org", { headers: { Accept: "text/plain" } });
  if (!response.ok) fail(`runner IPv4 discovery returned HTTP ${response.status}`);
  return assertIpv4(await response.text());
}
function getProjectDatabaseVersion(project) {
  const version = project?.database?.version ?? project?.database?.version_string ?? project?.postgres_version;
  if (!version) fail("Management API project response omitted Postgres version");
  return String(version);
}
function getProfileUserId(profile) {
  const userId = profile?.gotrue_id ?? profile?.id;
  if (!UUID_RE.test(String(userId))) fail("Management API profile omitted a valid gotrue user id");
  return String(userId);
}
function persistRunOwnership(ownership, writeEnvImpl = writeGithubEnv) {
  writeEnvImpl("FORWARD_JIT_CREATED_BY_THIS_RUN", "true");
  writeEnvImpl("FORWARD_JIT_OWNER_RUN_ID", ownership.runId);
  writeEnvImpl("FORWARD_JIT_OWNED_USER_ID", ownership.userId);
  writeEnvImpl("FORWARD_JIT_OWNED_CIDR", ownership.cidr);
  writeEnvImpl("FORWARD_JIT_OWNED_EXPIRES_AT", String(ownership.expiresAt));
}

export async function createRunOwnedJitMapping({ token, userId, ipv4, runId, nowMs = Date.now(), fetchImpl = fetch, writeEnvImpl = writeGithubEnv }) {
  const id = assertUserId(userId), ownerRunId = assertRunId(runId);
  const before = await apiRequest(token, JIT_LIST_PATH, { expected: [200], fetchImpl });
  if (findJitMappingForUser(before.data, { userId: id })) fail("pre-existing Production JIT mapping detected; refusing to modify it");
  const role = buildJitRole(ipv4, nowMs);
  const ownership = buildRunOwnership({ userId: id, runId: ownerRunId, ipv4, expiresAt: role.expires_at });
  let mapping;
  try {
    mapping = (await apiRequest(token, JIT_MAPPING_PATH, {
      method: "PUT",
      body: { user_id: id, roles: [role] },
      expected: [200],
      fetchImpl,
    })).data;
    persistRunOwnership(ownership, writeEnvImpl);
  } catch (error) {
    const reconciled = await apiRequest(token, JIT_LIST_PATH, { expected: [200], fetchImpl }).catch(() => null);
    const live = reconciled ? findJitMappingForUser(reconciled.data, { userId: id }) : null;
    if (live && mappingMatchesRunOwnership(live, ownership)) {
      persistRunOwnership(ownership, writeEnvImpl);
      mapping = live;
    } else {
      throw error;
    }
  }
  validateJitMapping(mapping, { userId: id, ipv4, nowMs });
  const after = await apiRequest(token, JIT_LIST_PATH, { expected: [200], fetchImpl });
  const verified = findJitMappingForUser(after.data, { userId: id });
  if (!verified) fail("created JIT mapping was not found during verification");
  validateJitMapping(verified, { userId: id, ipv4, nowMs });
  if (!mappingMatchesRunOwnership(verified, ownership)) fail("created JIT mapping ownership fingerprint mismatch");
  return ownership;
}

export function assertNoResidualJitMapping(data, { userId }) {
  const id = assertUserId(userId, "cleanup user id");
  if (!data || !Array.isArray(data.items)) fail("JIT list response omitted items array");
  if (data.items.some((item) => item?.user_id === id)) fail("JIT user mapping remains after cleanup");
  return true;
}
export async function cleanupRunOwnedJitMapping({ token, ownership, currentRunId, fetchImpl = fetch }) {
  if (typeof token !== "string" || token.length < 20 || /\s/.test(token)) fail("invalid Supabase token");
  if (!ownership?.createdByThisRun) return { deleted: false, reason: "not-owned" };
  const runId = assertRunId(currentRunId, "current GitHub run id");
  if (assertRunId(ownership.runId, "ownership GitHub run id") !== runId) fail("cleanup ownership belongs to a different GitHub run; refusing JIT delete");
  const id = assertUserId(ownership.userId, "cleanup ownership user id");
  const before = await apiRequest(token, JIT_LIST_PATH, { expected: [200], fetchImpl });
  const current = findJitMappingForUser(before.data, { userId: id });
  if (!current) return { deleted: false, reason: "already-absent" };
  if (!mappingMatchesRunOwnership(current, ownership)) fail("current JIT mapping does not match this run ownership fingerprint; refusing JIT delete");
  await apiRequest(token, `${JIT_MAPPING_PATH}/${encodeURIComponent(id)}`, { method: "DELETE", expected: [200, 404], fetchImpl });
  const after = await apiRequest(token, JIT_LIST_PATH, { expected: [200], fetchImpl });
  assertNoResidualJitMapping(after.data, { userId: id });
  return { deleted: true, reason: "owned" };
}
export async function cleanupRunOwnedTemporaryAccess({ token, ownership, currentRunId, featureEnabledByThisRun = false, featureOwnerRunId = "", fetchImpl = fetch }) {
  const errors = [];
  try { await cleanupRunOwnedJitMapping({ token, ownership, currentRunId, fetchImpl }); } catch (error) { errors.push(errorMessage(error)); }
  if (featureEnabledByThisRun) {
    try {
      const runId = assertRunId(currentRunId, "current GitHub run id");
      if (assertRunId(featureOwnerRunId, "feature ownership GitHub run id") !== runId) fail("Temporary Access feature ownership belongs to a different GitHub run; refusing state change");
      const mappings = await apiRequest(token, JIT_LIST_PATH, { expected: [200], fetchImpl });
      if (!Array.isArray(mappings.data?.items)) fail("JIT list response omitted items array");
      if (mappings.data.items.length === 0) {
        const restored = (await jitFeatureRequest(token, { method: "PUT", body: { state: "disabled" }, fetchImpl })).data;
        if (restored?.state !== "disabled" || restored?.appliedSuccessfully === false) fail("Temporary Database Access state was not restored to disabled");
      } else console.warn("Temporary Access remains enabled because another JIT mapping now exists; refusing unrelated state change.");
    } catch (error) { errors.push(errorMessage(error)); }
  }
  if (errors.length > 0) fail(`cleanup failed closed: ${errors.join("; ")}`);
  return true;
}

async function setup() {
  const token = process.env.SUPABASE_PRODUCTION_JIT_TOKEN;
  const runId = process.env.GITHUB_RUN_ID;
  if (!token) fail("SUPABASE_PRODUCTION_JIT_TOKEN is missing");
  assertRunId(runId);
  const profile = (await apiRequest(token, "/profile")).data;
  const userId = getProfileUserId(profile);
  writeGithubEnv("FORWARD_JIT_USER_ID", userId);
  const preexisting = await apiRequest(token, JIT_LIST_PATH, { expected: [200] });
  if (findJitMappingForUser(preexisting.data, { userId })) fail("pre-existing Production JIT mapping detected; refusing to modify it");
  const project = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}`)).data;
  if (project?.ref !== TEMP_ACCESS.projectRef && project?.id !== TEMP_ACCESS.projectRef) fail("Management API project-ref mismatch");
  assertSupportedPostgresVersion(getProjectDatabaseVersion(project));
  const ssl = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/ssl-enforcement`)).data;
  if (ssl?.currentConfig?.database !== true || ssl?.appliedSuccessfully === false) fail("Production SSL enforcement must already be enabled; workflow will not mutate SSL settings");
  let jitState = (await jitFeatureRequest(token)).data;
  const wasEnabled = jitState?.state === "enabled";
  if (!wasEnabled) {
    jitState = (await jitFeatureRequest(token, { method: "PUT", body: { state: "enabled" } })).data;
    if (jitState?.state !== "enabled" || jitState?.appliedSuccessfully === false) fail("Temporary Database Access is not enabled");
    writeGithubEnv("FORWARD_JIT_FEATURE_ENABLED_BY_THIS_RUN", "true");
    writeGithubEnv("FORWARD_JIT_FEATURE_OWNER_RUN_ID", runId);
  }
  const ipv4 = await getRunnerIpv4();
  await createRunOwnedJitMapping({ token, userId, ipv4, runId });
  const pooler = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/config/database/pooler`)).data;
  const dbUrl = buildJitDbUrl({ host: selectPoolerHost(pooler), token });
  console.log(`::add-mask::${dbUrl}`);
  writeGithubEnv("SUPABASE_ACCESS_TOKEN", token);
  writeGithubEnv("FORWARD_DB_URL", dbUrl);
  writeGithubEnv("FORWARD_JIT_CIDR", `${ipv4}/32`);
  console.log("Supabase Temporary Database Access prepared with one run-owned postgres role, runner /32 restriction, and 45-minute expiry.");
}
function ownershipFromEnvironment() {
  if (process.env.FORWARD_JIT_CREATED_BY_THIS_RUN !== "true") return null;
  return buildRunOwnership({
    userId: process.env.FORWARD_JIT_OWNED_USER_ID,
    runId: process.env.FORWARD_JIT_OWNER_RUN_ID,
    ipv4: String(process.env.FORWARD_JIT_OWNED_CIDR || "").replace(/\/32$/, ""),
    expiresAt: Number(process.env.FORWARD_JIT_OWNED_EXPIRES_AT),
  });
}
async function cleanup() {
  const token = process.env.SUPABASE_PRODUCTION_JIT_TOKEN;
  const currentRunId = process.env.GITHUB_RUN_ID;
  const ownership = ownershipFromEnvironment();
  const featureEnabledByThisRun = process.env.FORWARD_JIT_FEATURE_ENABLED_BY_THIS_RUN === "true";
  if (!token || (!ownership && !featureEnabledByThisRun)) { console.log("No run-owned temporary JIT state was recorded for cleanup."); return; }
  assertRunId(currentRunId);
  await cleanupRunOwnedTemporaryAccess({ token, ownership, currentRunId, featureEnabledByThisRun, featureOwnerRunId: process.env.FORWARD_JIT_FEATURE_OWNER_RUN_ID || "" });
  console.log("Run-owned Supabase temporary JIT state cleanup completed without touching unrelated mappings.");
}
async function main() {
  const command = process.argv[2];
  if (command === "setup") return setup();
  if (command === "wait") {
    const attempts = await waitForTemporaryDatabaseReady({ supabaseBin: process.env.SUPABASE_BIN, dbUrl: process.env.FORWARD_DB_URL, workdir: process.env.FORWARD_WORKDIR });
    console.log(`Supabase temporary Postgres access ready after ${attempts} attempt(s).`);
    return;
  }
  if (command === "cleanup") return cleanup();
  fail("expected command setup, wait, or cleanup");
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => { console.error(errorMessage(error)); process.exitCode = 1; });
