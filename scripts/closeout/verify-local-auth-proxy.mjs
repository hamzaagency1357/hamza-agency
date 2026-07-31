import { readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-portal-fixtures.json";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const exactOrigin = "https://127.0.0.1:3443/__closeout_supabase";
if (supabaseUrl !== exactOrigin || !anonKey) throw new Error("local_auth_proxy_environment_invalid");

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const account = fixture?.accounts?.authProbe;
if (!account?.email || !account?.password) throw new Error("local_auth_probe_fixture_invalid");

const requestPath = "/tmp/hamza-closeout-auth-request.json";
const responsePath = "/tmp/hamza-closeout-auth-response.json";
await writeFile(requestPath, JSON.stringify({ email: account.email, password: account.password }), { mode: 0o600 });
try {
  const result = spawnSync("curl", [
    "--silent", "--show-error", "--insecure", "--output", responsePath,
    "--write-out", "%{http_code}", "--request", "POST",
    "--header", `apikey: ${anonKey}`,
    "--header", "Content-Type: application/json",
    "--data-binary", `@${requestPath}`,
    `${exactOrigin}/auth/v1/token?grant_type=password`,
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0 || result.stdout.trim() !== "200") throw new Error("local_auth_proxy_request_failed");
  const response = JSON.parse(await readFile(responsePath, "utf8"));
  if (typeof response?.access_token !== "string" || response.access_token.split(".").length !== 3) throw new Error("local_auth_proxy_token_missing");
  console.log(JSON.stringify({ ok: true, authenticated: true, origin: "loopback-same-origin" }));
} finally {
  await rm(requestPath, { force: true });
  await rm(responsePath, { force: true });
}
