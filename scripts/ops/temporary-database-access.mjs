import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const TEMP_ACCESS = Object.freeze({
  apiBase: "https://api.supabase.com/v1",
  projectRef: "fvaurkfnsvsfohpzguho",
  minimumPostgresVersion: "17.6.1.081",
  postgresRole: "postgres",
  ttlMs: 45 * 60 * 1000,
  poolerPort: 5432,
  poolerHostSuffix: ".pooler.supabase.com",
});

// Preferred least-privilege boundary if Supabase exposes Scoped PAT creation to this account.
// The current operational fallback is a short-lived classic PAT, so these permissions are
// documentation/test evidence rather than a runtime credential claim.
export const PREFERRED_SCOPED_PAT_PERMISSIONS = Object.freeze([
  "project_admin_read",
  "project_admin_write",
  "database_jit_read",
  "database_jit_write",
  "database_pooling_config_read",
  "database_ssl_config_read",
  "edge_functions_read",
]);

// Backward-compatible export retained so the pre-existing PR #122 contract test keeps pinning
// the least-privilege target. It must not be interpreted as proof that the runtime PAT is scoped.
export const REQUIRED_FINE_GRAINED_PERMISSIONS = PREFERRED_SCOPED_PAT_PERMISSIONS;

const EXACT_MANAGEMENT_API_ALLOWLIST = new Set([
  "GET /profile",
  `GET /projects/${TEMP_ACCESS.projectRef}`,
  `GET /projects/${TEMP_ACCESS.projectRef}/ssl-enforcement`,
  `GET /projects/${TEMP_ACCESS.projectRef}/jit-access`,
  `PUT /projects/${TEMP_ACCESS.projectRef}/jit-access`,
  `PUT /projects/${TEMP_ACCESS.projectRef}/database/jit`,
  `GET /projects/${TEMP_ACCESS.projectRef}/database/jit`,
  `GET /projects/${TEMP_ACCESS.projectRef}/config/database/pooler`,
]);

function fail(message) {
  throw new Error(`temporary database access: ${message}`);
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
    const encodedUserId = normalizedPath.slice(deletePrefix.length);
    let userId;
    try {
      userId = decodeURIComponent(encodedUserId);
    } catch {
      fail("invalid encoded JIT cleanup user id");
    }
    if (
      encodedUserId.includes("/") ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
    ) {
      fail("JIT cleanup is not restricted to one valid user id");
    }
    return true;
  }

  fail(`Management API request is outside the explicit allowlist: ${normalizedMethod} ${normalizedPath}`);
}

export function comparePgVersions(a, b) {
  const parse = (value) => {
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(String(value))) fail(`invalid Postgres version ${value}`);
    return String(value).split(".").map((part) => Number(part));
  };
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

export function assertSupportedPostgresVersion(version) {
  if (comparePgVersions(version, TEMP_ACCESS.minimumPostgresVersion) < 0) {
    fail(`Postgres ${version} does not support Temporary Database Access`);
  }
  return true;
}

export function assertIpv4(value) {
  const parts = String(value).trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
    fail(`invalid runner IPv4 ${value}`);
  }
  return parts.map(Number).join(".");
}

export function buildJitRole(ipv4, nowMs = Date.now()) {
  const ip = assertIpv4(ipv4);
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) fail("invalid current time");
  return {
    role: TEMP_ACCESS.postgresRole,
    allowed_networks: {
      allowed_cidrs: [{ cidr: `${ip}/32` }],
      allowed_cidrs_v6: [],
    },
    expires_at: nowMs + TEMP_ACCESS.ttlMs,
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
  if (!Array.isArray(cidrs) || cidrs.length !== 1 || cidrs[0]?.cidr !== `${assertIpv4(ipv4)}/32`) {
    fail("JIT mapping is not restricted to the current runner IPv4 /32");
  }
  if (!Array.isArray(cidrsV6) || cidrsV6.length !== 0) fail("JIT mapping unexpectedly permits IPv6");
  if (!Number.isFinite(role.expires_at)) fail("JIT mapping has no finite expiry");
  const remaining = role.expires_at - nowMs;
  if (remaining <= 0 || remaining > TEMP_ACCESS.ttlMs + 60_000) fail("JIT mapping expiry exceeds the 45-minute contract");
  return true;
}

export function selectPoolerHost(config) {
  if (!Array.isArray(config) || config.length === 0) fail("missing Supavisor configuration");
  const primary = config.find((entry) => entry?.database_type === "PRIMARY") ?? config[0];
  const candidates = [primary.connection_string, primary.connectionString].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.hostname.endsWith(TEMP_ACCESS.poolerHostSuffix)) return parsed.hostname;
    } catch {
      // Continue to the next candidate.
    }
  }
  if (typeof primary.db_host === "string" && primary.db_host.endsWith(TEMP_ACCESS.poolerHostSuffix)) {
    return primary.db_host;
  }
  fail("Supavisor host is not a trusted pooler.supabase.com endpoint");
}

export function buildJitDbUrl({ host, token }) {
  if (typeof host !== "string" || !host.endsWith(TEMP_ACCESS.poolerHostSuffix)) fail("untrusted pooler host");
  if (typeof token !== "string" || token.length < 20 || /\s/.test(token)) fail("invalid Supabase token");
  const url = new URL(`postgresql://${host}:${TEMP_ACCESS.poolerPort}/postgres`);
  url.username = `postgres.${TEMP_ACCESS.projectRef}`;
  url.password = token;
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("options", "-c jit=true");
  return url.toString();
}

function writeGithubEnv(name, value) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) fail("GITHUB_ENV is unavailable");
  if (String(value).includes("\n")) fail(`unsafe newline in ${name}`);
  appendFileSync(envFile, `${name}=${value}\n`, { encoding: "utf8", mode: 0o600 });
}

async function apiRequest(token, path, { method = "GET", body, expected = [200] } = {}) {
  assertAllowedManagementRequest(method, path);
  const response = await fetch(`${TEMP_ACCESS.apiBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!expected.includes(response.status)) fail(`${method} ${path} returned HTTP ${response.status}`);
  return { status: response.status, data };
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(userId))) {
    fail("Management API profile omitted a valid gotrue user id");
  }
  return String(userId);
}

async function setup() {
  const token = process.env.SUPABASE_PRODUCTION_JIT_TOKEN;
  if (!token) fail("SUPABASE_PRODUCTION_JIT_TOKEN is missing");
  console.log(`::add-mask::${token}`);

  const profile = (await apiRequest(token, "/profile")).data;
  const userId = getProfileUserId(profile);
  writeGithubEnv("FORWARD_JIT_USER_ID", userId);

  const project = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}`)).data;
  if (project?.ref !== TEMP_ACCESS.projectRef && project?.id !== TEMP_ACCESS.projectRef) fail("Management API project-ref mismatch");
  assertSupportedPostgresVersion(getProjectDatabaseVersion(project));

  const ssl = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/ssl-enforcement`)).data;
  if (ssl?.currentConfig?.database !== true || ssl?.appliedSuccessfully === false) {
    fail("Production SSL enforcement must already be enabled; workflow will not mutate SSL settings");
  }

  let jitState = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/jit-access`)).data;
  if (jitState?.state !== "enabled") {
    jitState = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/jit-access`, {
      method: "PUT",
      body: { state: "enabled" },
    })).data;
  }
  if (jitState?.state !== "enabled" || jitState?.appliedSuccessfully === false) fail("Temporary Database Access is not enabled");

  const ipv4 = await getRunnerIpv4();
  const nowMs = Date.now();
  const role = buildJitRole(ipv4, nowMs);
  const mapping = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/database/jit`, {
    method: "PUT",
    body: { user_id: userId, roles: [role] },
  })).data;
  validateJitMapping(mapping, { userId, ipv4, nowMs });

  const verifiedMapping = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/database/jit`)).data;
  validateJitMapping(verifiedMapping, { userId, ipv4, nowMs });

  const pooler = (await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/config/database/pooler`)).data;
  const host = selectPoolerHost(pooler);
  const dbUrl = buildJitDbUrl({ host, token });
  console.log(`::add-mask::${dbUrl}`);
  writeGithubEnv("SUPABASE_ACCESS_TOKEN", token);
  writeGithubEnv("FORWARD_DB_URL", dbUrl);
  writeGithubEnv("FORWARD_JIT_CIDR", `${ipv4}/32`);
  console.log("Supabase Temporary Database Access prepared with one postgres role, runner /32 restriction, and 45-minute expiry.");
}

async function cleanup() {
  const token = process.env.SUPABASE_PRODUCTION_JIT_TOKEN;
  const userId = process.env.FORWARD_JIT_USER_ID;
  if (!token || !userId) {
    console.log("No temporary JIT user mapping was recorded for cleanup.");
    return;
  }
  console.log(`::add-mask::${token}`);
  await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/database/jit/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    expected: [200, 404],
  });
  const after = await apiRequest(token, `/projects/${TEMP_ACCESS.projectRef}/database/jit`, { expected: [200, 404] });
  if (after.status === 200) {
    const roles = after.data?.user_roles ?? after.data?.roles ?? [];
    if (Array.isArray(roles) && roles.some((entry) => entry?.role === TEMP_ACCESS.postgresRole)) {
      fail("postgres JIT role remains after cleanup");
    }
  }
  console.log("Supabase temporary postgres JIT mapping removed.");
}

async function main() {
  const command = process.argv[2];
  if (command === "setup") return setup();
  if (command === "cleanup") return cleanup();
  fail("expected command setup or cleanup");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
