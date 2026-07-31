import process from "node:process";

export const PRODUCTION_HOSTS = new Set(["hamza-agency.com", "www.hamza-agency.com"]);
export const PRODUCTION_SUPABASE_REF = "fvaurkfnsvsfohpzguho";
export const SUPPORTED_MODES = new Set(["preview-readonly", "local-isolated", "production-readonly"]);
export const SUPPORTED_SUITES = new Set([
  "public", "translations", "tracking", "admin", "page-builder",
  "backup-restore", "trash", "notifications", "permissions", "security",
]);
export const WRITE_SUITES = new Set([
  "tracking", "admin", "page-builder", "backup-restore", "trash",
  "notifications", "permissions", "security-stateful",
]);

function fail(message) {
  throw new Error(`[closeout environment guard] ${message}`);
}

function parseUrl(name, value, required = true) {
  if (!value && !required) return null;
  if (!value) fail(`${name} is required`);
  try {
    return new URL(value);
  } catch {
    fail(`${name} must be an absolute URL`);
  }
}

export function supabaseRef(url) {
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const match = host.match(/^([a-z0-9]+)\.supabase\.(?:co|in)$/);
  return match?.[1] || null;
}

function isLoopback(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
}

export function assertCloseoutEnvironment(input = process.env) {
  const mode = input.CLOSEOUT_EXECUTION_MODE;
  const suite = input.CLOSEOUT_SUITE;
  const base = parseUrl("CLOSEOUT_TARGET_URL", input.CLOSEOUT_TARGET_URL);
  const supabase = parseUrl("CLOSEOUT_SUPABASE_URL", input.CLOSEOUT_SUPABASE_URL, mode === "local-isolated");
  const auth = parseUrl("CLOSEOUT_AUTH_URL", input.CLOSEOUT_AUTH_URL, mode === "local-isolated");
  const expectedSha = input.CLOSEOUT_EXPECTED_SHA;
  const actualSha = input.CLOSEOUT_ACTUAL_SHA || input.VERCEL_GIT_COMMIT_SHA || input.GITHUB_SHA;

  if (!SUPPORTED_MODES.has(mode)) fail(`unsupported execution mode: ${mode || "missing"}`);
  if (!SUPPORTED_SUITES.has(suite)) fail(`unsupported suite: ${suite || "missing"}`);
  if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) fail("CLOSEOUT_EXPECTED_SHA must be a full commit SHA");
  if (!actualSha || !/^[0-9a-f]{40}$/i.test(actualSha)) fail("actual execution Head SHA is required");
  if (actualSha.toLowerCase() !== expectedSha.toLowerCase()) fail(`Head mismatch: expected ${expectedSha}, received ${actualSha}`);

  const targetHost = base.hostname.toLowerCase();
  const ref = supabaseRef(supabase);
  const authRef = supabaseRef(auth);
  const isProdHost = PRODUCTION_HOSTS.has(targetHost);
  const isProdSupabase = ref === PRODUCTION_SUPABASE_REF || authRef === PRODUCTION_SUPABASE_REF;
  const writeSuite = WRITE_SUITES.has(suite) || input.CLOSEOUT_STATEFUL === "true";

  if (writeSuite && mode !== "local-isolated") fail(`stateful suite ${suite} requires local-isolated mode`);

  if (mode === "preview-readonly") {
    if (base.protocol !== "https:") fail("preview-readonly requires HTTPS");
    if (isProdHost) fail("preview-readonly cannot target a Production host");
    if (input.CLOSEOUT_PREVIEW_HOST && input.CLOSEOUT_PREVIEW_HOST.toLowerCase() !== targetHost) {
      fail(`preview host mismatch: expected ${input.CLOSEOUT_PREVIEW_HOST}, received ${targetHost}`);
    }
  }

  if (mode === "production-readonly") {
    if (base.protocol !== "https:") fail("production-readonly requires HTTPS");
    if (!isProdHost) fail("production-readonly must target an exact Production host");
    if (writeSuite) fail("Production writes are forbidden");
  }

  if (mode === "local-isolated") {
    if (isProdHost || isProdSupabase) fail("local-isolated mode points to Production");
    if (!supabase || !auth) fail("local-isolated requires explicit Supabase and Auth endpoints");

    const localTarget = isLoopback(base.hostname);
    const localSupabase = isLoopback(supabase.hostname);
    const localAuth = isLoopback(auth.hostname);
    const approvedIsolation = input.CLOSEOUT_ISOLATED_ENV_PROOF === "approved";

    if (!localTarget && !approvedIsolation) fail("non-local stateful target requires explicit isolated-environment proof");
    if ((!localSupabase || !localAuth) && !approvedIsolation) fail("cannot prove Supabase and Auth are local or isolated");
    if (auth.origin !== supabase.origin && !approvedIsolation) fail("Auth endpoint isolation is unproven");
  }

  return {
    mode,
    suite,
    targetOrigin: base.origin,
    targetHost,
    supabaseRef: ref,
    expectedSha: expectedSha.toLowerCase(),
    readonly: mode !== "local-isolated",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const safe = assertCloseoutEnvironment();
  console.log(JSON.stringify(safe));
}
