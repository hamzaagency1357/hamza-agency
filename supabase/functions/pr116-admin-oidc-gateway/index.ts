import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "npm:jose@6.1.0";
import { GENERATED_ACTIONS, GENERATED_PERMISSIONS, dispatchGeneratedAdminAction } from "./generated-dispatch.ts";

const ISSUER = "https://oidc.vercel.com/hamzaagencysy-3009s-projects";
const AUDIENCE = "https://vercel.com/hamzaagencysy-3009s-projects";
const TEAM_ID = "team_gu9SOMWlOqS2uvLEZUYEbTPs";
const PROJECT_ID = "prj_YQw97FRAAwcnpQkudzGr01kXASvN";
const PROJECT_NAME = "hamza-agency";
const ALLOWED_ENVIRONMENT = "production";
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks`));
const encoder = new TextEncoder();

const ACTIONS = new Set([
  ...GENERATED_ACTIONS,
  "application_status_update",
  "application_internal_notes_update",
  "support_action",
  "knowledge_save",
  "knowledge_promote",
  "translation_save",
  "translation_review",
  "translation_publish",
]);

const ACTION_PERMISSIONS: Record<string, { module: string; permission: string }> = {
  ...GENERATED_PERMISSIONS,
  application_status_update: { module: "applications", permission: "can_edit" },
  application_internal_notes_update: { module: "applications", permission: "can_edit" },
  support_action: { module: "ai_support", permission: "can_edit" },
  knowledge_save: { module: "knowledge_base", permission: "can_edit" },
  knowledge_promote: { module: "knowledge_base", permission: "can_create" },
  translation_save: { module: "settings", permission: "can_edit" },
  translation_review: { module: "settings", permission: "can_edit" },
  translation_publish: { module: "settings", permission: "can_edit" },
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
function claim(payload: JWTPayload, name: string) {
  const value = payload[name];
  return typeof value === "string" ? value : "";
}
function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
function safeText(value: unknown, max: number, nullable = false): string | null | undefined {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || value.length > max) return undefined;
  return value;
}
function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}
function normalizeProgramScope(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
async function serviceFetch(url: string, key: string, path: string, init?: RequestInit) {
  return fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(6_000),
  });
}
async function resolveUser(supabaseUrl: string, anonKey: string, token: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return null;
  const value = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!value || typeof value.id !== "string") return null;
  return { id: value.id, email: typeof value.email === "string" ? value.email : "" };
}
async function resolveAdmin(supabaseUrl: string, serviceRole: string, user: { id: string; email: string }) {
  const fields = "id,user_id,email,role,assigned_program,is_active";
  const primary = await serviceFetch(supabaseUrl, serviceRole, `/admin_users?select=${fields}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
  let rows = primary.ok ? await primary.json().catch(() => []) as Record<string, unknown>[] : [];
  let row = rows[0] || null;
  if (!row && user.email) {
    const fallback = await serviceFetch(supabaseUrl, serviceRole, `/admin_users?select=${fields}&user_id=is.null&email=ilike.${encodeURIComponent(user.email)}&limit=1`);
    rows = fallback.ok ? await fallback.json().catch(() => []) as Record<string, unknown>[] : [];
    row = rows[0] || null;
  }
  if (!row || row.is_active === false || typeof row.role !== "string") return null;
  if (!["super_admin", "deputy_super_admin", "program_admin"].includes(row.role)) return null;
  return {
    id: Number(row.id),
    email: typeof row.email === "string" ? row.email : user.email,
    role: row.role,
    assignedProgram: typeof row.assigned_program === "string" ? row.assigned_program : null,
  };
}
async function hasPermission(supabaseUrl: string, serviceRole: string, admin: { id: number; email: string; role: string }, module: string, permission: string) {
  if (admin.role === "super_admin") return true;
  if (admin.role === "program_admin" && !["dashboard", "applications", "programs"].includes(module)) return false;
  const fields = "can_view,can_create,can_edit,can_delete,can_export,can_manage";
  const primary = await serviceFetch(supabaseUrl, serviceRole, `/admin_permissions?select=${fields}&admin_user_id=eq.${admin.id}&module_key=eq.${encodeURIComponent(module)}&limit=1`);
  let rows = primary.ok ? await primary.json().catch(() => []) as Record<string, unknown>[] : [];
  let row = rows[0] || null;
  if (!row && admin.email) {
    const fallback = await serviceFetch(supabaseUrl, serviceRole, `/admin_permissions?select=${fields}&admin_user_id=is.null&admin_email=ilike.${encodeURIComponent(admin.email)}&module_key=eq.${encodeURIComponent(module)}&limit=1`);
    rows = fallback.ok ? await fallback.json().catch(() => []) as Record<string, unknown>[] : [];
    row = rows[0] || null;
  }
  if (!row) return admin.role === "deputy_super_admin";
  return row.can_manage === true || row[permission] === true;
}
async function audit(supabaseUrl: string, serviceRole: string, actor: { id: string; email: string }, action: string, entityType: string, entityId: string | number | null, metadata: Record<string, unknown>, oldData?: unknown, newData?: unknown) {
  await serviceFetch(supabaseUrl, serviceRole, "/activity_logs", {
    method: "POST",
    body: JSON.stringify({
      admin_email: actor.email || null,
      actor_user_id: actor.id,
      action,
      entity_type: entityType,
      entity_id: entityId === null ? null : String(entityId),
      old_data: oldData === undefined ? null : JSON.stringify(oldData),
      new_data: newData === undefined ? null : JSON.stringify(newData),
      metadata,
      source_route: "/functions/v1/pr116-admin-oidc-gateway",
      outcome: "success",
    }),
  }).catch(() => null);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json(405, { ok: false, code: "method_not_allowed" });
  const oidcHeader = request.headers.get("authorization") || "";
  const oidcToken = oidcHeader.startsWith("Bearer ") ? oidcHeader.slice(7).trim() : "";
  if (!oidcToken) return json(401, { ok: false, code: "missing_oidc_token" });

  let oidc: JWTPayload;
  try {
    ({ payload: oidc } = await jwtVerify(oidcToken, JWKS, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ["RS256"],
      clockTolerance: 5,
      maxTokenAge: "2h",
    }));
  } catch {
    return json(401, { ok: false, code: "invalid_oidc_token" });
  }

  const environment = claim(oidc, "environment");
  const expectedSubject = `owner:hamzaagencysy-3009s-projects:project:${PROJECT_NAME}:environment:${environment}`;
  if (
    claim(oidc, "owner_id") !== TEAM_ID ||
    claim(oidc, "project_id") !== PROJECT_ID ||
    claim(oidc, "project") !== PROJECT_NAME ||
    oidc.sub !== expectedSubject ||
    typeof oidc.iat !== "number" ||
    typeof oidc.exp !== "number"
  ) return json(403, { ok: false, code: "invalid_oidc_claims" });
  if (environment !== ALLOWED_ENVIRONMENT) return json(403, { ok: false, code: "preview_forbidden" });

  const userHeader = request.headers.get("x-supabase-user-authorization") || "";
  const userToken = userHeader.startsWith("Bearer ") ? userHeader.slice(7).trim() : "";
  if (!userToken) return json(401, { ok: false, code: "missing_user_token" });

  let input: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    input = parsed as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, code: "invalid_request" });
  }
  const action = typeof input.action === "string" ? input.action : "";
  const timestamp = typeof input.timestamp === "number" ? Math.trunc(input.timestamp) : 0;
  const nonce = typeof input.nonce === "string" ? input.nonce : "";
  const body = typeof input.body === "string" ? input.body : "";
  const bodyDigest = typeof input.bodyDigest === "string" ? input.bodyDigest.toLowerCase() : "";
  const now = Math.floor(Date.now() / 1000);
  if (!ACTIONS.has(action)) return json(400, { ok: false, code: "invalid_action" });
  if (timestamp < now - 120 || timestamp > now + 30) return json(400, { ok: false, code: "stale_request" });
  if (!/^[A-Za-z0-9_-]{24,80}$/.test(nonce)) return json(400, { ok: false, code: "invalid_nonce" });
  if (!body || encoder.encode(body).byteLength > 50_000) return json(400, { ok: false, code: "invalid_payload" });
  if (!/^[a-f0-9]{64}$/.test(bodyDigest) || (await sha256(body)) !== bodyDigest) return json(400, { ok: false, code: "digest_mismatch" });

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid");
    payload = parsed as Record<string, unknown>;
  } catch {
    return json(400, { ok: false, code: "invalid_payload" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRole) return json(503, { ok: false, code: "gateway_unavailable" });

  const user = await resolveUser(supabaseUrl, anonKey, userToken);
  if (!user) return json(401, { ok: false, code: "invalid_user_session" });
  const admin = await resolveAdmin(supabaseUrl, serviceRole, user);
  if (!admin) return json(403, { ok: false, code: "forbidden" });
  const required = ACTION_PERMISSIONS[action];
  if (!required || !(await hasPermission(supabaseUrl, serviceRole, admin, required.module, required.permission))) {
    return json(403, { ok: false, code: "forbidden" });
  }

  try {
    if (action === "application_status_update" || action === "application_internal_notes_update") {
      const applicationId = positiveInt(payload.applicationId);
      if (!applicationId) return json(400, { ok: false, code: "invalid_request" });
      const currentRes = await serviceFetch(supabaseUrl, serviceRole, `/agency_applications?select=id,platform,status,internal_notes&id=eq.${applicationId}&limit=1`);
      const currentRows = currentRes.ok ? await currentRes.json().catch(() => []) as Record<string, unknown>[] : [];
      const current = currentRows[0] || null;
      if (!current) return json(404, { ok: false, code: "not_found" });
      if (admin.role === "program_admin") {
        const assigned = normalizeProgramScope(admin.assignedProgram);
        const target = normalizeProgramScope(typeof current.platform === "string" ? current.platform : "");
        if (!assigned || !target.includes(assigned)) return json(403, { ok: false, code: "forbidden" });
      }
      let patch: Record<string, unknown>;
      if (action === "application_status_update") {
        const status = safeText(payload.status, 40);
        if (!status || !["new", "under_review", "contacted", "accepted", "rejected", "archived"].includes(status)) return json(400, { ok: false, code: "invalid_request" });
        patch = { status };
      } else {
        const notes = safeText(payload.internalNotes, 5000);
        if (notes === undefined) return json(400, { ok: false, code: "invalid_request" });
        patch = { internal_notes: notes?.trim() || null };
      }
      const mutation = await serviceFetch(supabaseUrl, serviceRole, `/agency_applications?id=eq.${applicationId}`, { method: "PATCH", body: JSON.stringify(patch) });
      if (!mutation.ok) return json(502, { ok: false, code: "database_contract_rejected" });
      const rows = await mutation.json().catch(() => []) as Record<string, unknown>[];
      const updated = rows[0] || { ...current, ...patch };
      await audit(supabaseUrl, serviceRole, user, action, "agency_applications", applicationId, { action }, current, updated);
      return json(200, { ok: true, data: updated });
    }

    const generated = await dispatchGeneratedAdminAction({ action, payload, supabaseUrl, serviceRole, admin, user });
    if (generated) {
      if (generated.ok) await audit(supabaseUrl, serviceRole, user, action, action, null, { action });
      return json(generated.status, generated.body);
    }

    const rpc = async (name: string, rpcBody: Record<string, unknown>) => {
      const response = await serviceFetch(supabaseUrl, serviceRole, `/rpc/${name}`, { method: "POST", body: JSON.stringify(rpcBody) });
      const text = await response.text();
      if (!response.ok) return { ok: false, data: null };
      try { return { ok: true, data: text ? JSON.parse(text) : null }; } catch { return { ok: true, data: null }; }
    };

    let result: { ok: boolean; data: unknown };
    if (action === "support_action") {
      const requestId = positiveInt(payload.requestId);
      const supportAction = safeText(payload.action, 40);
      const value = safeText(payload.value, 5000, true);
      const note = safeText(payload.note, 5000, true);
      if (!requestId || !supportAction || !["accept", "priority", "assign", "status", "reply", "note"].includes(supportAction) || value === undefined || note === undefined) return json(400, { ok: false, code: "invalid_request" });
      result = await rpc("pr4_support_action", { p_request_id: requestId, p_action: supportAction, p_value: value, p_note: note });
    } else if (action === "knowledge_save") {
      result = await rpc("pr4_save_knowledge", payload.rpc as Record<string, unknown>);
    } else if (action === "knowledge_promote") {
      const suggestionId = positiveInt(payload.suggestionId);
      if (!suggestionId) return json(400, { ok: false, code: "invalid_request" });
      result = await rpc("pr4_promote_suggestion", { p_suggestion_id: suggestionId });
    } else if (action === "translation_save") {
      result = await rpc("save_translation_candidate_fields", payload.rpc as Record<string, unknown>);
    } else if (action === "translation_review") {
      result = await rpc("review_translation_candidate", payload.rpc as Record<string, unknown>);
    } else {
      result = await rpc("publish_translation_candidate", payload.rpc as Record<string, unknown>);
    }
    if (!result.ok) return json(502, { ok: false, code: "database_contract_rejected" });
    await audit(supabaseUrl, serviceRole, user, action, action, null, { action });
    return json(200, { ok: true, data: result.data });
  } catch {
    return json(502, { ok: false, code: "database_unavailable" });
  }
});
