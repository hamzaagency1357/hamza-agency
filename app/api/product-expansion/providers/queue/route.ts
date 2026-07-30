import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { safePushPayload, stableEventKey, validateWhatsAppTemplate } from "@/lib/productExpansion/providerAdapters";
import { callPr101OidcGateway } from "@/lib/server/pr101OidcGateway";
import { supabaseRestAsUser, verifySupabaseBearer } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 12_000;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function firstRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : null;
  return row && typeof row === "object" && !Array.isArray(row) ? row as Record<string, unknown> : null;
}

export async function POST(request: NextRequest) {
  const user = await verifySupabaseBearer(request);
  if (!user) return json(401, { ok: false, code: "authentication_required" });
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return json(400, { ok: false, code: "invalid_request" });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return json(400, { ok: false, code: "invalid_request" }); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(400, { ok: false, code: "invalid_request" });
  const input = parsed as Record<string, unknown>;
  const kind = input.kind === "whatsapp" || input.kind === "push" ? input.kind : null;
  if (!kind) return json(400, { ok: false, code: "invalid_provider_kind" });

  const membershipQuery = `/tenant_memberships?select=tenant_id,role,status&user_id=eq.${encodeURIComponent(user.id)}&status=eq.active&limit=1`;
  const membership = firstRow((await supabaseRestAsUser<unknown>(membershipQuery, user)).data);
  const tenantId = typeof membership?.tenant_id === "string" ? membership.tenant_id : "";
  const role = typeof membership?.role === "string" ? membership.role : "";
  if (!tenantId) return json(403, { ok: false, code: "active_membership_required" });

  const targetUserId = typeof input.targetUserId === "string" && /^[0-9a-f-]{36}$/i.test(input.targetUserId) ? input.targetUserId : user.id;
  if (targetUserId !== user.id && !["super_admin", "tenant_admin", "employee"].includes(role)) return json(403, { ok: false, code: "target_not_allowed" });
  const flag = firstRow((await supabaseRestAsUser<unknown>(`/tenant_feature_flags?select=enabled,configuration&tenant_id=eq.${tenantId}&feature_key=eq.${kind}&limit=1`, user)).data);
  if (flag?.enabled !== true) return json(202, { ok: true, queued: false, code: `${kind}_provider_disabled` });

  let payload: Record<string, unknown>;
  if (kind === "whatsapp") {
    const consent = firstRow((await supabaseRestAsUser<unknown>(`/communication_consents?select=opted_in,withdrawn_at&tenant_id=eq.${tenantId}&user_id=eq.${targetUserId}&channel=eq.whatsapp&limit=1`, user)).data);
    if (consent?.opted_in !== true || consent.withdrawn_at) return json(409, { ok: false, code: "whatsapp_opt_in_required" });
    const templateKey = typeof input.templateKey === "string" ? input.templateKey.slice(0, 100) : "";
    const locale = input.locale === "en" || input.locale === "tr" ? input.locale : "ar";
    const template = firstRow((await supabaseRestAsUser<unknown>(`/whatsapp_templates?select=template_key,locale,body,variables,status&tenant_id=eq.${tenantId}&template_key=eq.${encodeURIComponent(templateKey)}&locale=eq.${locale}&status=eq.approved&limit=1`, user)).data);
    if (!template || typeof template.body !== "string" || !Array.isArray(template.variables)) return json(404, { ok: false, code: "approved_template_not_found" });
    const variables = template.variables.filter((value): value is string => typeof value === "string");
    const values = input.values && typeof input.values === "object" && !Array.isArray(input.values) ? input.values as Record<string, string> : {};
    const rendered = validateWhatsAppTemplate(template.body, variables, values);
    if (!rendered.ok || !rendered.rendered) return json(400, { ok: false, code: rendered.code });
    payload = { templateKey, locale, rendered: rendered.rendered, targetUserId, approvedTemplate: true, optInVerified: true };
  } else {
    const preference = firstRow((await supabaseRestAsUser<unknown>(`/portal_notification_preferences?select=enabled&tenant_id=eq.${tenantId}&user_id=eq.${targetUserId}&channel=eq.push&event_key=eq.${encodeURIComponent(String(input.eventKey || "general"))}&limit=1`, user)).data);
    if (preference && preference.enabled === false) return json(202, { ok: true, queued: false, code: "push_preference_disabled" });
    payload = { ...safePushPayload({ title: String(input.title || "HAMZA AGENCY"), body: String(input.body || ""), href: typeof input.href === "string" ? input.href : "/portal", sensitive: input.sensitive !== false }), targetUserId };
  }

  const hostname = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "hamza-agency.com").split(",")[0].trim().toLowerCase();
  const eventKey = stableEventKey([tenantId, kind, String(input.eventKey || input.templateKey || "general"), targetUserId, JSON.stringify(payload).slice(0, 500)]);
  try {
    const result = await callPr101OidcGateway<{ allowed?: boolean; duplicate?: boolean; id?: string }>(request, "provider_event_enqueue", { tenantId, hostname, providerType: kind, providerKey: "disabled-default-adapter", eventKey, payload });
    return result.allowed === true ? json(202, { ok: true, queued: true, duplicate: result.duplicate === true, id: result.id ?? null, mode: "queue_only" }) : json(400, { ok: false, code: "provider_queue_rejected" });
  } catch {
    return json(503, { ok: false, code: "provider_gateway_unavailable" });
  }
}
