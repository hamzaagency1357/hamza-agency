import "server-only";

import { NextResponse } from "next/server";
import type { PortalRole } from "@/lib/productExpansion/domain";
import { authorizeTenantRequest, type AuthorizedTenantRequest } from "@/lib/server/tenantAuthorization";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const portalRoles = new Set<PortalRole>(["creator", "client", "employee", "partner"]);
const requestTypes = new Set(["access", "download", "correction", "deletion", "consent_withdrawal"]);
const preferenceChannels = new Set(["in_app", "email", "push", "whatsapp"]);
const consentChannels = new Set(["email", "push", "whatsapp", "marketing"]);
const preferenceEvents = new Set(["task.assigned", "request.status", "order.status", "security.alert", "incident.update"]);

type ModuleConfig = { table: string; select: string; ownerColumn?: string; extra?: (userId: string) => string };
const modules: Record<PortalRole, Record<string, ModuleConfig>> = {
  creator: {
    tracking: { table: "agency_applications", select: "tracking_code,status,program_name,created_at", ownerColumn: "user_id" },
    tasks: { table: "tasks", select: "id,title,status,priority,due_at,related_type,related_id" },
  },
  client: {
    requests: { table: "service_requests", select: "tracking_code,status,service_name,created_at", ownerColumn: "user_id" },
    orders: { table: "marketplace_orders", select: "id,order_code,status,total,currency,payment_status,created_at", ownerColumn: "client_user_id" },
    files: { table: "portal_files", select: "id,category,visibility,status,created_at", ownerColumn: "owner_user_id" },
  },
  employee: {
    tasks: { table: "tasks", select: "id,title,status,priority,due_at,related_type,related_id" },
    queue: { table: "sla_events", select: "id,entity_type,entity_id,event_type,deadline_at,created_at" },
    escalations: { table: "sla_events", select: "id,entity_type,entity_id,event_type,deadline_at,created_at", extra: () => "&event_type=in.(warning,breached)" },
    performance: { table: "task_status_history", select: "id,task_id,from_status,to_status,changed_at", ownerColumn: "changed_by" },
  },
  partner: {
    offers: { table: "marketplace_listings", select: "id,slug,listing_type,status,price_amount,currency,updated_at", ownerColumn: "partner_user_id" },
    referrals: { table: "tasks", select: "id,title,status,priority,related_type,related_id" },
    reports: {
      table: "marketplace_orders",
      select: "id,order_code,status,total,currency,payment_status,created_at,marketplace_order_items!inner(listing_id,marketplace_listings!inner(partner_user_id))",
      extra: (userId) => `&marketplace_order_items.marketplace_listings.partner_user_id=eq.${encodeURIComponent(userId)}`,
    },
  },
};

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function input(request: Request): { role: PortalRole | null; section: string } {
  const url = new URL(request.url);
  const value = url.searchParams.get("role");
  return { role: portalRoles.has(value as PortalRole) ? value as PortalRole : null, section: url.searchParams.get("section") || "" };
}
async function authorize(request: Request, write: boolean): Promise<{ role: PortalRole; section: string; access: AuthorizedTenantRequest } | NextResponse> {
  const parsed = input(request);
  if (!parsed.role) return json(400, { ok: false, code: "invalid_role" });
  const access = await authorizeTenantRequest(request, { allowedRoles: [parsed.role], requirePlatformSession: write });
  if (!access.ok) return json(access.status, { ok: false, code: access.code });
  return { role: parsed.role, section: parsed.section, access };
}
function isResponse(value: unknown): value is NextResponse { return value instanceof NextResponse; }

export async function GET(request: Request) {
  const auth = await authorize(request, false);
  if (isResponse(auth)) return auth;
  const { role, section, access } = auth;
  const tenant = encodeURIComponent(access.tenantId);
  const user = encodeURIComponent(access.user.id);

  if (section === "profile") return read(`/portal_profiles?select=user_id,display_name,phone,locale,status,marketing_opt_in,ai_opt_out&user_id=eq.${user}&limit=1`, access, "profile_read_failed", "rows");
  if (section === "privacy") return read(`/privacy_requests?select=id,request_type,status,created_at,due_at&tenant_id=eq.${tenant}&user_id=eq.${user}&order=created_at.desc&limit=50`, access, "privacy_read_failed", "rows");
  if (section === "notifications") {
    const [preferences, consents] = await Promise.all([
      supabaseRestAsUser<unknown>(`/portal_notification_preferences?select=channel,event_key,enabled&tenant_id=eq.${tenant}&user_id=eq.${user}`, access.user),
      supabaseRestAsUser<unknown>(`/communication_consents?select=channel,opted_in,recorded_at,withdrawn_at&tenant_id=eq.${tenant}&user_id=eq.${user}`, access.user),
    ]);
    if (!preferences.ok || !consents.ok) return json(Math.max(preferences.status, consents.status), { ok: false, code: "notification_read_failed" });
    return json(200, { ok: true, preferences: preferences.data || [], consents: consents.data || [] });
  }
  if (section === "sessions") {
    const [sessions, alerts] = await Promise.all([
      supabaseRestAsUser<unknown>(`/user_sessions?select=id,device_label,platform,browser,last_active_at,suspicious,revoked_at&tenant_id=eq.${tenant}&user_id=eq.${user}&order=last_active_at.desc&limit=100`, access.user),
      supabaseRestAsUser<unknown>(`/security_alerts?select=id,alert_type,severity,metadata,acknowledged_at,created_at&tenant_id=eq.${tenant}&user_id=eq.${user}&order=created_at.desc&limit=50`, access.user),
    ]);
    if (!sessions.ok || !alerts.ok) return json(Math.max(sessions.status, alerts.status), { ok: false, code: "session_read_failed" });
    return json(200, { ok: true, sessions: sessions.data || [], alerts: alerts.data || [] });
  }

  const config = modules[role][section];
  if (!config) return json(404, { ok: false, code: "module_not_found" });
  let path = `/${config.table}?select=${encodeURIComponent(config.select)}&tenant_id=eq.${tenant}`;
  if (config.ownerColumn) path += `&${config.ownerColumn}=eq.${user}`;
  if (config.extra) path += config.extra(access.user.id);
  return read(`${path}&limit=50`, access, "module_read_failed", "rows");
}

async function read(path: string, access: AuthorizedTenantRequest, code: string, key: string) {
  const result = await supabaseRestAsUser<unknown>(path, access.user);
  return result.ok ? json(200, { ok: true, [key]: result.data || [] }) : json(result.status, { ok: false, code });
}

export async function PATCH(request: Request) {
  const auth = await authorize(request, true);
  if (isResponse(auth)) return auth;
  const { section, access } = auth;
  const body = object(await request.json().catch(() => null));
  const tenant = encodeURIComponent(access.tenantId);
  const user = encodeURIComponent(access.user.id);

  if (section === "profile") {
    const locale = body.locale === "en" || body.locale === "tr" ? body.locale : "ar";
    return write("/portal_profiles?on_conflict=user_id", access, {
      user_id: access.user.id,
      display_name: typeof body.display_name === "string" ? body.display_name.trim().slice(0, 160) : null,
      phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : null,
      locale,
      marketing_opt_in: body.marketing_opt_in === true,
      ai_opt_out: body.ai_opt_out === true,
      updated_at: new Date().toISOString(),
    }, "profile_write_failed", "POST", true);
  }
  if (section === "preference") {
    const channel = typeof body.channel === "string" ? body.channel : "";
    const eventKey = typeof body.event_key === "string" ? body.event_key : "";
    if (!preferenceChannels.has(channel) || !preferenceEvents.has(eventKey) || typeof body.enabled !== "boolean") return json(400, { ok: false, code: "invalid_preference" });
    return write("/portal_notification_preferences?on_conflict=tenant_id,user_id,channel,event_key", access, { tenant_id: access.tenantId, user_id: access.user.id, channel, event_key: eventKey, enabled: body.enabled, updated_at: new Date().toISOString() }, "preference_write_failed", "POST", true);
  }
  if (section === "consent") {
    const channel = typeof body.channel === "string" ? body.channel : "";
    if (!consentChannels.has(channel) || typeof body.opted_in !== "boolean") return json(400, { ok: false, code: "invalid_consent" });
    const now = new Date().toISOString();
    return write("/communication_consents?on_conflict=tenant_id,user_id,channel", access, { tenant_id: access.tenantId, user_id: access.user.id, channel, opted_in: body.opted_in, source: "portal_privacy_controls", recorded_at: now, withdrawn_at: body.opted_in ? null : now }, "consent_write_failed", "POST", true);
  }
  if (section === "alert") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { ok: false, code: "invalid_alert" });
    return write(`/security_alerts?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${tenant}&user_id=eq.${user}`, access, { acknowledged_at: new Date().toISOString() }, "alert_write_failed", "PATCH", false, 200, true);
  }
  return json(404, { ok: false, code: "section_not_found" });
}

export async function POST(request: Request) {
  const auth = await authorize(request, true);
  if (isResponse(auth)) return auth;
  const { section, access } = auth;
  const body = object(await request.json().catch(() => null));
  if (section === "privacy") {
    const requestType = typeof body.request_type === "string" ? body.request_type : "";
    if (!requestTypes.has(requestType)) return json(400, { ok: false, code: "invalid_privacy_request" });
    return write("/privacy_requests", access, { tenant_id: access.tenantId, user_id: access.user.id, request_type: requestType, status: "submitted", details: {}, due_at: new Date(Date.now() + 30 * 86_400_000).toISOString() }, "privacy_write_failed", "POST", false, 201);
  }
  if (section === "revoke-session") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { ok: false, code: "invalid_session" });
    return write("/rpc/revoke_own_platform_session", access, { p_session: id, p_reason: "user_requested" }, "session_revoke_failed", "POST");
  }
  if (section === "revoke-all-sessions") return write("/rpc/revoke_all_own_platform_sessions", access, { p_tenant: access.tenantId, p_reason: "user_requested_all" }, "sessions_revoke_failed", "POST");
  return json(404, { ok: false, code: "section_not_found" });
}

async function write(
  path: string,
  access: AuthorizedTenantRequest,
  body: Record<string, unknown>,
  code: string,
  method: "POST" | "PATCH",
  merge = false,
  success = 200,
  requireAffectedRow = false,
) {
  const result = await supabaseRestAsUser<unknown>(path, access.user, {
    method,
    headers: merge ? { Prefer: "resolution=merge-duplicates,return=representation" } : undefined,
    body: JSON.stringify(body),
  });
  if (!result.ok) return json(result.status, { ok: false, code });
  if (requireAffectedRow && Array.isArray(result.data) && result.data.length === 0) {
    return json(404, { ok: false, code: "owned_resource_not_found" });
  }
  return json(success, { ok: true, rows: result.data || [] });
}
