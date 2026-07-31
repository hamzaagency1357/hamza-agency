import process from "node:process";

const PRODUCTION_HOSTS = new Set(["hamza-agency.com", "www.hamza-agency.com"]);
const PRODUCTION_SUPABASE_REF = "fvaurkfnsvsfohpzguho";
const WRITE_SUITES = new Set([
  "tracking", "admin", "page-builder", "backup-restore", "trash",
  "notifications", "permissions", "security-stateful",
]);

function fail(message) {
  throw new Error(`[closeout environment guard] ${message}`);
}

function parseUrl(name, value, required = true) {
  if (!value && !required) return null;
  if (!value) fail(`${name} is required`);
  try { return new URL(value); } catch { fail(`${name} must be an absolute URL`); }
}

function supabaseRef(url) {
  const host = url.hostname.toLowerCase();
  const match = host.match(/^([a-z0-9]+)\.supabase\.(?:co|in)$/);
  return match?.[1] || null;
}

export function assertCloseoutEnvironment(input = process.env) {
  const mode = input.CLOSEOUT_EXECUTION_MODE;
  const suite = input.CLOSEOUT_SUITE;
  const base = parseUrl("CLOSEOUT_TARGET_URL", input.CLOSEOUT_TARGET_URL);
  const supabase = parseUrl("CLOSEOUT_SUPABASE_URL", input.CLOSEOUT_SUPABASE_URL, mode === "local-isolated");
  const auth = parseUrl("CLOSEOUT_AUTH_URL", input.CLOSEOUT_AUTH_URL, false);
  const expectedSha = input.CLOSEOUT_EXPECTED_SHA;
  const actualSha = input.GITHUB_SHA || input.VERCEL_GIT_COMMIT_SHA || input.CLOSEOUT_ACTUAL_SHA;

  if (!new Set(["preview-readonly", "local-isolated", "production-readonly"]).has(mode)) fail(`unsupported execution mode: ${mode || "missing"}`);
  if (!suite) fail("CLOSEOUT_SUITE is required");
  if (!expectedSha || !/^[0-9a-f]{40}$/i.test(expectedSha)) fail("CLOSEOUT_EXPECTED_SHA must be a full commit SHA");
  if (actualSha && actualSha !== expectedSha) fail(`Head mismatch: expected ${expectedSha}, received ${actualSha}`);

  const targetHost = base.hostname.toLowerCase();
  const ref = supabase ? supabaseRef(supabase) : null;
  const isProdHost = PRODUCTION_HOSTS.has(targetHost);
  const isProdSupabase = ref === PRODUCTION_SUPABASE_REF;
  const writeSuite = WRITE_SUITES.has(suite) || input.CLOSEOUT_STATEFUL === "true";

  if (writeSuite && mode !== "local-isolated") fail(`stateful suite ${suite} requires local-isolated mode`);
  if (mode === "local-isolated") {
    if (isProdHost || isProdSupabase) fail("local-isolated mode points to Production");
    if (!supabase || !ref && !new Set(["127.0.0.1", "localhost"]).has(supabase.hostname)) fail("cannot prove Supabase is local or isolated");
    if (!new Set(["127.0.0.1", "localhost"]).has(base.hostname) && input.CLOSEOUT_ISOLATED_ENV_PROOF !== "approved") fail("non-local stateful target requires explicit isolated-environment proof");
  }
  if (mode === "preview-readonly" && isProdHost) fail("preview-readonly cannot target the Production host");
  if (mode === "production-readonly" && !isProdHost) fail("production-readonly must target the exact Production host");
  if (mode === "production-readonly" && writeSuite) fail("Production writes are forbidden");
  if (auth && mode === "local-isolated" && auth.origin !== supabase?.origin && input.CLOSEOUT_ISOLATED_ENV_PROOF !== "approved") fail("Auth endpoint isolation is unproven");

  return { mode, suite, targetOrigin: base.origin, supabaseRef: ref, expectedSha };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const safe = assertCloseoutEnvironment();
  console.log(JSON.stringify(safe));
}
