import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { createHash, timingSafeEqual } from "node:crypto";
import { GENERATED_ACTIONS, GENERATED_PERMISSIONS, dispatchGeneratedAdminAction } from "../../supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts";

const LOCAL_OIDC_TOKEN = "pr116-closeout-local-isolated-oidc-token";
const keyPath = process.env.CLOSEOUT_TLS_KEY || "";
const certPath = process.env.CLOSEOUT_TLS_CERT || "";
if (!keyPath || !certPath) throw new Error("closeout_tls_files_required");
if (process.env.CLOSEOUT_EXECUTION_MODE !== "local-isolated") {
  throw new Error("closeout_https_proxy_requires_local_isolated");
}
const closeoutStateful = process.env.CLOSEOUT_STATEFUL === "true";

const key = fs.readFileSync(keyPath);
const cert = fs.readFileSync(certPath);
const port = Number(process.env.CLOSEOUT_HTTPS_PORT || 3443);
if (port !== 3443) throw new Error("closeout_https_port_not_allowed");

function localUpstream(name, rawValue, expectedPort) {
  const value = rawValue || `http://127.0.0.1:${expectedPort}`;
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || Number(url.port) !== expectedPort) {
    throw new Error(`${name}_must_be_exact_loopback_http_${expectedPort}`);
  }
  return url;
}
function localServiceRole() {
  const envPath = process.env.CLOSEOUT_SUPABASE_ENV_FILE || "";
  if (!envPath || !fs.existsSync(envPath)) throw new Error("closeout_supabase_env_file_required");
  const source = fs.readFileSync(envPath, "utf8");
  const keyName = ["SERVICE", "ROLE", "KEY"].join("_");
  const line = source.split(/\r?\n/).find((entry) => entry.startsWith(`${keyName}=`));
  const raw = line ? line.slice(line.indexOf("=") + 1).trim() : "";
  const value = raw.replace(/^(["'])|\1$/g, "").trim();
  if (!value) throw new Error("closeout_local_service_role_missing");
  return value;
}

const applicationUpstream = localUpstream("application_upstream", process.env.CLOSEOUT_UPSTREAM_URL, 3000);
const supabaseValue = process.env.CLOSEOUT_SUPABASE_UPSTREAM_URL || "";
const supabaseUpstream = supabaseValue ? localUpstream("supabase_upstream", supabaseValue, 54321) : null;
if (closeoutStateful !== Boolean(supabaseUpstream)) {
  throw new Error("closeout_stateful_supabase_boundary_mismatch");
}
const supabasePrefix = "/__closeout_supabase";
const localGatewayPath = `${supabasePrefix}/functions/v1/pr116-admin-oidc-gateway`;
const localAnonKey = process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRole = supabaseUpstream ? localServiceRole() : "";
const generatedActions = new Set(GENERATED_ACTIONS);

if (supabaseUpstream && !localAnonKey) throw new Error("closeout_local_anon_key_missing");

function targetFor(rawPath) {
  const path = rawPath || "/";
  if (supabaseUpstream && (path === supabasePrefix || path.startsWith(`${supabasePrefix}/`))) {
    const stripped = path.slice(supabasePrefix.length) || "/";
    return { upstream: supabaseUpstream, path: stripped };
  }
  return { upstream: applicationUpstream, path };
}
function forwardedHeaders(request, upstream) {
  const headers = { ...request.headers };
  delete headers.connection;
  delete headers["proxy-connection"];
  delete headers.upgrade;
  headers.host = upstream.host;
  headers["x-forwarded-host"] = request.headers.host || `127.0.0.1:${port}`;
  headers["x-forwarded-proto"] = "https";
  return headers;
}
function record(value) { return !!value && typeof value === "object" && !Array.isArray(value); }
function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}
async function readBody(request, maxBytes = 70_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("closeout_local_gateway_payload_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function exactLocalToken(value) {
  const actual = Buffer.from(value || "", "utf8");
  const expected = Buffer.from(LOCAL_OIDC_TOKEN, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
async function serviceFetch(path, init = {}) {
  return fetch(new URL(`/rest/v1${path}`, supabaseUpstream), {
    ...init,
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(8_000),
  });
}
async function resolveUser(request) {
  const userAuthorization = request.headers["x-supabase-user-authorization"] || "";
  if (typeof userAuthorization !== "string" || !userAuthorization.startsWith("Bearer ")) return null;
  const response = await fetch(new URL("/auth/v1/user", supabaseUpstream), {
    headers: { apikey: localAnonKey, Authorization: userAuthorization },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;
  const value = await response.json().catch(() => null);
  if (!record(value) || typeof value.id !== "string") return null;
  return { id: value.id, email: typeof value.email === "string" ? value.email : "" };
}
async function resolveAdmin(user) {
  const fields = "id,user_id,email,role,assigned_program,is_active";
  const primary = await serviceFetch(`/admin_users?select=${fields}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
  let rows = primary.ok ? await primary.json().catch(() => []) : [];
  let row = rows[0] || null;
  if (!row && user.email) {
    const fallback = await serviceFetch(`/admin_users?select=${fields}&user_id=is.null&email=ilike.${encodeURIComponent(user.email)}&limit=1`);
    rows = fallback.ok ? await fallback.json().catch(() => []) : [];
    row = rows[0] || null;
  }
  if (!row || row.is_active === false || !["super_admin", "deputy_super_admin", "program_admin"].includes(row.role)) return null;
  return { id: Number(row.id), email: typeof row.email === "string" ? row.email : user.email, role: row.role, assignedProgram: typeof row.assigned_program === "string" ? row.assigned_program : null };
}
async function hasPermission(admin, module, permission) {
  if (admin.role === "super_admin") return true;
  if (admin.role === "program_admin" && !["dashboard", "applications", "programs"].includes(module)) return false;
  const fields = "can_view,can_create,can_edit,can_delete,can_export,can_manage";
  const primary = await serviceFetch(`/admin_permissions?select=${fields}&admin_user_id=eq.${admin.id}&module_key=eq.${encodeURIComponent(module)}&limit=1`);
  let rows = primary.ok ? await primary.json().catch(() => []) : [];
  let row = rows[0] || null;
  if (!row && admin.email) {
    const fallback = await serviceFetch(`/admin_permissions?select=${fields}&admin_user_id=is.null&admin_email=ilike.${encodeURIComponent(admin.email)}&module_key=eq.${encodeURIComponent(module)}&limit=1`);
    rows = fallback.ok ? await fallback.json().catch(() => []) : [];
    row = rows[0] || null;
  }
  if (!row) return admin.role === "deputy_super_admin";
  return row.can_manage === true || row[permission] === true;
}
async function audit(user, action) {
  await serviceFetch("/activity_logs", { method: "POST", body: JSON.stringify({
    admin_email: user.email || null,
    actor_user_id: user.id,
    action,
    entity_type: action,
    entity_id: null,
    old_data: null,
    new_data: null,
    metadata: { action, source: "closeout-local-isolated" },
    source_route: "/functions/v1/pr116-admin-oidc-gateway",
    outcome: "success",
  }) }).catch(() => null);
}
async function handleLocalGateway(request, response) {
  if (!supabaseUpstream || request.method !== "POST") return sendJson(response, 405, { ok: false, code: "method_not_allowed" });
  const authorization = request.headers.authorization || "";
  const token = typeof authorization === "string" && authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!exactLocalToken(token)) return sendJson(response, 401, { ok: false, code: "invalid_oidc_token" });

  let envelope;
  try { envelope = JSON.parse(await readBody(request)); } catch { return sendJson(response, 400, { ok: false, code: "invalid_request" }); }
  if (!record(envelope)) return sendJson(response, 400, { ok: false, code: "invalid_request" });
  const action = typeof envelope.action === "string" ? envelope.action : "";
  const timestamp = Number.isSafeInteger(envelope.timestamp) ? envelope.timestamp : 0;
  const nonce = typeof envelope.nonce === "string" ? envelope.nonce : "";
  const body = typeof envelope.body === "string" ? envelope.body : "";
  const bodyDigest = typeof envelope.bodyDigest === "string" ? envelope.bodyDigest.toLowerCase() : "";
  const now = Math.floor(Date.now() / 1000);
  if (!generatedActions.has(action)) return sendJson(response, 400, { ok: false, code: "invalid_action" });
  if (timestamp < now - 120 || timestamp > now + 30) return sendJson(response, 400, { ok: false, code: "stale_request" });
  if (!/^[A-Za-z0-9_-]{24,80}$/.test(nonce)) return sendJson(response, 400, { ok: false, code: "invalid_nonce" });
  if (!body || Buffer.byteLength(body, "utf8") > 50_000) return sendJson(response, 400, { ok: false, code: "invalid_payload" });
  if (!/^[a-f0-9]{64}$/.test(bodyDigest) || createHash("sha256").update(body, "utf8").digest("hex") !== bodyDigest) return sendJson(response, 400, { ok: false, code: "digest_mismatch" });

  let payload;
  try { payload = JSON.parse(body); } catch { return sendJson(response, 400, { ok: false, code: "invalid_payload" }); }
  if (!record(payload)) return sendJson(response, 400, { ok: false, code: "invalid_payload" });

  const user = await resolveUser(request);
  if (!user) return sendJson(response, 401, { ok: false, code: "invalid_user_session" });
  const admin = await resolveAdmin(user);
  if (!admin) return sendJson(response, 403, { ok: false, code: "forbidden" });
  const required = GENERATED_PERMISSIONS[action];
  if (!required || !(await hasPermission(admin, required.module, required.permission))) return sendJson(response, 403, { ok: false, code: "forbidden" });

  const result = await dispatchGeneratedAdminAction({ action, payload, supabaseUrl: supabaseUpstream.origin, serviceRole, admin, user });
  if (!result) return sendJson(response, 400, { ok: false, code: "invalid_action" });
  if (result.ok) await audit(user, action);
  return sendJson(response, result.status, result.body);
}

const server = https.createServer({ key, cert }, async (request, response) => {
  const pathname = new URL(request.url || "/", `https://127.0.0.1:${port}`).pathname;
  if (pathname === localGatewayPath) {
    try { return await handleLocalGateway(request, response); }
    catch (error) {
      console.error("closeout local Admin gateway error", error instanceof Error ? error.message : "unknown");
      return sendJson(response, 503, { ok: false, code: "gateway_unavailable" });
    }
  }

  const selected = targetFor(request.url);
  const proxy = http.request({
    hostname: selected.upstream.hostname,
    port: selected.upstream.port,
    method: request.method,
    path: selected.path,
    headers: forwardedHeaders(request, selected.upstream),
  }, (upstreamResponse) => {
    const headers = { ...upstreamResponse.headers };
    if (supabaseUpstream && typeof headers.location === "string" && headers.location.startsWith(supabaseUpstream.origin)) {
      headers.location = `https://127.0.0.1:${port}${supabasePrefix}${headers.location.slice(supabaseUpstream.origin.length)}`;
    }
    response.writeHead(upstreamResponse.statusCode || 502, headers);
    upstreamResponse.pipe(response);
  });
  proxy.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    response.end("local proxy error");
  });
  request.pipe(proxy);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Closeout HTTPS proxy listening on https://127.0.0.1:${port}`);
});
