import "server-only";

import { NextResponse } from "next/server";
import type { PortalRole } from "@/lib/productExpansion/domain";
import { authorizeTenantRequest } from "@/lib/server/tenantAuthorization";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = new Set<PortalRole>(["creator", "client", "employee", "partner"]);
const requestTypes = new Set(["access", "download", "correction", "deletion", "consent_withdrawal"]);
const preferenceChannels = new Set(["in_app", "email", "push", "whatsapp"]);
const consentChannels = new Set(["email", "push", "whatsapp", "marketing"]);
const preferenceEvents = new Set(["task.assigned", "request.status", "order.status", "security.alert", "incident.update"]);

type ModuleConfig = { table: string; select: string; ownerColumn?: string; extra?: (userId: string) => string };
const modules: Record<PortalRole, Record<string, ModuleConfig>> = {
  creator: {
    tracking: { table: "agency_applications", select: "tracking_code,status,program_name,created_at", ownerColumn: "user_id" },
    tasks: { table: "tasks", select: "id,title,status,priority,due_at,related_type,related_id" },
    support: { table: "knowledge_base", select: "id,title,category,status,updated_at" },
  },
  client: {
    requests: { table: "service_requests", select: "tracking_code,status,service_name,created_at", ownerColumn: "user_id" },
    orders: { table: "marketplace_orders", select: "id,order_code,status,total,currency,payment_status,created_at", ownerColumn: "client_user_id" },
    files: { table: "portal_files", select: "id,category,visibility,status,created_at", ownerColumn: "owner_user_id" },
    support: { table: "tasks", select: "id,title,status,priority,due_at,related_type,related_id" },
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

function queryInput(request: Request) {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  const section = url.searchParams.get("section") || "";
  return { role: roles.has(role as PortalRole) ? role as PortalRole : null, section };
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function authorized(request: Request, write = false) {
  const input = queryInput(request);
  if (!input.role) return { input, access: null, rejection: json(400, { ok: false, code: "invalid_role" }) };
  const access = await authorizeTenantRequest(request, {
    allowedRoles: [input.role],
    requirePlatformSession: write,
  });
  if (!access.ok) return { input, access: null, rejection: json(access.status, { ok: false, code: access.code }) };
  return { input, access, rejection: null };
}

export async function GET(request: Request) {
  const { input, access, rejection } = await authorized(request);
  if (rejection || !access) return rejection;
  const tenant = encodeURIComponent(access.tenantId);
  const user = encodeURIComponent(access.user.id);

  if (input.section === "profile") {
    const result = await supabaseRestAsUser<unknown>(`/portal_profiles?select=user_id,display_name,phone,locale,status,marketing_opt_in,ai_opt_out&user_id=eq.${user}&limit=1`, access.user);
    return result.ok ? json(200, { ok: true, rows: result.data || [] }) : json(result.status, { ok: false, code: "profile_read_failed" });
  }
  if (input.section === "privacy") {
    const result = await supabaseRestAsUser<unknown>(`/privacy_requests?select=id,request_type,status,created_at,due_at&tenant_id=eq.${tenant}&user_id=eq.${user}&order=created_at.desc&limit=50`, access.user);
    return result.ok ? json(200, { ok: true, rows: result.data || [] }) : json(result.status, { ok: false, code: "privacy_read_failed" });
  }
  if (input.section === "notifications") {
    const [preferences, consents] = await Promise.all([
      supabaseRestAsUser<unknown>(`/portal_notification_preferences?select=channel,event_key,enabled&tenant_id=eq.${tenant}&user_id=eq.${user}`, access.user),
      supabaseRestAsUser<unknown>(`/communication_consents?select=channel,opted_in,recorded_at,withdrawn_at&tenant_id=eq.${tenant}&user_id=eq.${user}`, access.user),
    ]);
    if (!preferences.ok || !consents.ok) return json(Math.max(preferences.status, consents.status), { ok: false, code: "notification_read_failed" });
    return json(200, { ok: true, preferences: preferences.data || [], consents: consents.data || [] });
  }
  if (input.section === "sessions") {
    const [sessions, alerts] = await Promise.all([
      supabaseRestAsUser<unknown>(`/user_sessions?select=id,device_label,platform,browser,last_active_at,suspicious,revoked_at&tenant_id=eq.${tenant}&user_id=eq.${user}&order=last_active_at.desc&limit=100`, access.user),
      supabaseRestAsUser<unknown>(`/security_alerts?select=id,alert_type,severity,metadata,acknowledged_at,created_at&tenant_id=eq.${tenant}&user_id=eq.${user}&order=created_at.desc&limit=50`, access.user),
    ]);
    if (!sessions.ok || !alerts.ok) return json(Math.max(sessions.status, alerts.status), { ok: false, code: "session_read_failed" });
    return json(200, { ok: true, sessions: sessions.data || [], alerts: alerts.data || [] });
  }

  const config = modules[input.role]?.[input.section];
  if (!config) return json(404, { ok: false, code: "module_not_found" });
  let path = `/${config.table}?select=${encodeURIComponent(config.select)}&tenant_id=eq.${tenant}`;
  if (config.ownerColumn) path += `&${config.ownerColumn}=eq.${user}`;
  if (config.extra) path += config.extra(access.user.id);
  path += "&limit=50";
  const result = await supabaseRestAsUser<unknown>(path, access.user);
  return result.ok ? json(200, { ok: true, rows: result.data || [] }) : json(result.status, { ok: false, code: "module_read_failed" });
}

export async function PATCH(request: Request) {
  const { input, access, rejection } = await authorized(request, true);
  if (rejection || !access) return rejection;
  const body = object(await request.json().catch(() => null));
  const tenant = encodeURIComponent(access.tenantId);
  const user = encodeURIComponent(access.user.id);

  if (input.section === "profile") {
    const locale = body.locale === "en" || body.locale === "tr" ? body.locale : "ar";
    const payload = {
      user_id: access.user.id,
      display_name: typeof body.display_name === "string" ? body.display_name.trim().slice(0, 160) : null,
      phone: typeof body.phone === "string" ? body.phone.trim().slice(0, 40) : null,
      locale,
      marketing_opt_in: body.marketing_opt_in === true,
      ai_opt_out: body.ai_opt_out === true,
      updated_at: new Date().toISOString(),
    };
    const result = await supabaseRestAsUser<unknown>("/portal_profiles?on_conflict=user_id", access.user, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    });
    return result.ok ? json(200, { ok: true, rows: result.data || [] }) : json(result.status, { ok: false, code: "profile_write_failed" });
  }

  if (input.section === "preference") {
    const channel = typeof body.channel === "string" ? body.channel : "";
    const eventKey = typeof body.event_key === "string" ? body.event_key : "";
    if (!preferenceChannels.has(channel) || !preferenceEvents.has(eventKey) || typeof body.enabled !== "boolean") return json(400, { ok: false, code: "invalid_preference" });
    const result = await supabaseRestAsUser<unknown>("/portal_notification_preferences?on_conflict=tenant_id,user_id,channel,event_key", access.user, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ tenant_id: access.tenantId, user_id: access.user.id, channel, event_key: eventKey, enabled: body.enabled, updated_at: new Date().toISOString() }),
    });
    return result.ok ? json(200, { ok: true }) : json(result.status, { ok: false, code: "preference_write_failed" });
  }

  if (input.section === "consent") {
    const channel = typeof body.channel === "string" ? body.channel : "";
    if (!consentChannels.has(channel) || typeof body.opted_in !== "boolean") return json(400, { ok: false, code: "invalid_consent" });
    const now = new Date().toISOString();
    const result = await supabaseRestAsUser<unknown>("/communication_consents?on_conflict=tenant_id,user_id,channel", access.user, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ tenant_id: access.tenantId, user_id: access.user.id, channel, opted_in: body.opted_in, source: "portal_privacy_controls", recorded_at: now, withdrawn_at: body.opted_in ? null : now }),
    });
    return result.ok ? json(200, { ok: true }) : json(result.status, { ok: false, code: "consent_write_failed" });
  }

  if (input.section === "alert") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { ok: false, code: "invalid_alert" });
    const result = await supabaseRestAsUser<unknown>(`/security_alerts?id=eq.${encodeURIComponent(id)}&tenant_id=eq.${tenant}&user_id=eq.${user}`, access.user, {
      method: "PATCH",
      body: JSON.stringify({ acknowledged_at: new Date().toISOString() }),
    });
    return result.ok ? json(200, { ok: true }) : json(result.status, { ok: false, code: "alert_write_failed" });
  }

  return json(404, { ok: false, code: "section_not_found" });
}

export async function POST(request: Request) {
  const { input, access, rejection } = await authorized(request, true);
  if (rejection || !access) return rejection;
  const body = object(await request.json().catch(() => null));

  if (input.section === "privacy") {
    const requestType = typeof body.request_type === "string" ? body.request_type : "";
    if (!requestTypes.has(requestType)) return json(400, { ok: false, code: "invalid_privacy_request" });
    const result = await supabaseRestAsUser<unknown>("/privacy_requests", access.user, {
      method: "POST",
      body: JSON.stringify({ tenant_id: access.tenantId, user_id: access.user.id, request_type: requestType, status: "submitted", details: {}, due_at: new Date(Date.now() + 30 * 86_400_000).toISOString() }),
    });
    return result.ok ? json(201, { ok: true, rows: result.data || [] }) : json(result.status, { ok: false, code: "privacy_write_failed" });
  }

  if (input.section === "revoke-session") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { ok: false, code: "invalid_session" });
    const result = await supabaseRestAsUser<unknown>("/rpc/revoke_own_platform_session", access.user, {
      method: "POST",
      body: JSON.stringify({ p_session: id, p_reason: "user_requested" }),
    });
    return result.ok ? json(200, { ok: true }) : json(result.status, { ok: false, code: "session_revoke_failed" });
  }

  if (input.section === "revoke-all-sessions") {
    const result = await supabaseRestAsUser<unknown>("/rpc/revoke_all_own_platform_sessions", access.user, {
      method: "POST",
      body: JSON.stringify({ p_tenant: access.tenantId, p_reason: "user_requested_all" }),
    });
    return result.ok ? json(200, { ok: true, count: result.data || 0 }) : json(result.status, { ok: false, code: "sessions_revoke_failed" });
  }

  return json(404, { ok: false, code: "section_not_found" });
}
