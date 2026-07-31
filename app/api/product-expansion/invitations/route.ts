import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  generateInvitationToken,
  invitationExpiresAt,
  normalizeInvitationEmail,
  normalizeInvitationExpiryDays,
  normalizeInvitationRole,
  type InvitationRole,
} from "@/lib/productExpansion/invitationSecurity";
import { authorizeTenantRequest } from "@/lib/server/tenantAuthorization";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Json = Record<string, unknown>;

const permissionsByRole: Record<InvitationRole, ReadonlySet<string>> = {
  creator: new Set(["profile.edit", "files.upload", "support.create", "applications.view", "tasks.view"]),
  client: new Set(["profile.edit", "files.upload", "support.create", "services.view", "orders.view"]),
  employee: new Set(["tasks.view", "tasks.comment", "tasks.status", "files.upload"]),
  partner: new Set(["profile.edit", "files.upload", "listings.manage", "orders.view", "referrals.view"]),
  tenant_admin: new Set(["tenant.manage", "members.manage", "tasks.manage", "marketplace.manage", "reports.view"]),
};

function json(status: number, body: Json) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
function cleanUuid(value: unknown) { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null; }
function cleanProgram(value: unknown) { if (value === null || value === undefined || value === "") return null; const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : undefined; }
function cleanPermissions(role: InvitationRole, value: unknown): Json | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Json = {};
  for (const [key, item] of Object.entries(value as Json)) {
    if (!permissionsByRole[role].has(key) || typeof item !== "boolean") return null;
    output[key] = item;
  }
  return output;
}
async function bodyOf(request: Request): Promise<Json | null> { try { const value = await request.json(); return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null; } catch { return null; } }
function internalFailure(correlationId: string, operation: string, detail: unknown) { console.error(JSON.stringify({ level: "error", event: "tenant_invitation_failure", correlation_id: correlationId, operation, detail })); }

async function authorize(request: Request) {
  const access = await authorizeTenantRequest(request, { allowedRoles: ["super_admin", "tenant_admin"] });
  if (!access.ok) {
    return { error: json(access.status, { ok: false, code: access.status === 401 ? "unauthenticated" : "request_rejected" }) } as const;
  }
  // The authorization guard already resolved this exact hostname through the reviewed
  // public tenant runtime RPC. Reusing that verified host avoids a second RLS query and
  // cannot redirect an invitation to another tenant.
  const protocol = process.env.NODE_ENV === "production" ? "https" : new URL(request.url).protocol.replace(":", "");
  const invitationOrigin = `${protocol}://${access.hostname}`;
  return {
    user: access.user,
    tenantId: access.tenantId,
    invitationOrigin,
    role: access.membership.role,
  } as const;
}

export async function GET(request: Request) {
  const access = await authorize(request); if ("error" in access) return access.error;
  const [invitations, memberships, programs] = await Promise.all([
    supabaseRestAsUser<Json[]>(`/tenant_invitations?select=id,email,role,program_id,status,expires_at,last_sent_at,send_count,created_at&tenant_id=eq.${encodeURIComponent(access.tenantId)}&order=created_at.desc&limit=100`, access.user),
    supabaseRestAsUser<Json[]>(`/tenant_memberships?select=id,user_id,role,status,program_id,permissions,mfa_required,created_at,updated_at&tenant_id=eq.${encodeURIComponent(access.tenantId)}&order=created_at.desc&limit=200`, access.user),
    supabaseRestAsUser<Json[]>(`/programs?select=id,title:name&tenant_id=eq.${encodeURIComponent(access.tenantId)}&order=id.asc&limit=200`, access.user),
  ]);
  if (!invitations.ok || !memberships.ok || !programs.ok) return json(503, { ok: false, code: "request_unavailable" });
  return json(200, {
    ok: true,
    tenant_id: access.tenantId,
    actor_role: access.role,
    invitations: invitations.data ?? [],
    memberships: memberships.data ?? [],
    programs: programs.data ?? [],
  });
}

export async function POST(request: Request) {
  const correlationId = randomUUID();
  const access = await authorize(request); if ("error" in access) return access.error;
  const input = await bodyOf(request); if (!input) return json(400, { ok: false, code: "request_rejected", correlation_id: correlationId });
  const action = typeof input.action === "string" ? input.action : "create";

  if (action === "create") {
    const email = normalizeInvitationEmail(input.email); const role = normalizeInvitationRole(input.role); const programId = cleanProgram(input.program_id);
    if (!email || !role || programId === undefined) return json(400, { ok: false, code: "request_rejected", correlation_id: correlationId });
    const permissions = cleanPermissions(role, input.permissions); if (!permissions) return json(400, { ok: false, code: "permission_not_allowed", correlation_id: correlationId });
    const token = generateInvitationToken();
    const expiresAt = invitationExpiresAt(normalizeInvitationExpiryDays(input.expires_in_days));
    const result = await supabaseRestAsUser<Json[]>("/rpc/create_tenant_invitation", access.user, { method: "POST", body: JSON.stringify({ p_tenant_id: access.tenantId, p_email: email, p_role: role, p_program_id: programId, p_permissions: permissions, p_token_hash: token.hash, p_expires_at: expiresAt }) });
    if (!result.ok) { internalFailure(correlationId, action, result.data); return json(result.status === 403 ? 403 : result.status === 429 ? 429 : 400, { ok: false, code: result.status === 429 ? "request_rate_limited" : "request_rejected", correlation_id: correlationId }); }
    return json(201, { ok: true, invitation: result.data?.[0] ?? null, invite_url: `${access.invitationOrigin}/portal/accept-invitation?token=${encodeURIComponent(token.raw)}`, delivery: "manual_copy_provider_disabled" });
  }

  if (action === "resend") {
    const invitationId = cleanUuid(input.invitation_id); if (!invitationId) return json(400, { ok: false, code: "request_rejected", correlation_id: correlationId });
    const token = generateInvitationToken();
    const expiresAt = invitationExpiresAt(normalizeInvitationExpiryDays(input.expires_in_days));
    const result = await supabaseRestAsUser<Json[]>("/rpc/resend_tenant_invitation", access.user, { method: "POST", body: JSON.stringify({ p_tenant_id: access.tenantId, p_invitation_id: invitationId, p_token_hash: token.hash, p_expires_at: expiresAt }) });
    if (!result.ok) { internalFailure(correlationId, action, result.data); return json(result.status === 403 ? 403 : result.status === 429 ? 429 : 400, { ok: false, code: result.status === 429 ? "request_rate_limited" : "request_rejected", correlation_id: correlationId }); }
    return json(200, { ok: true, invitation: result.data?.[0] ?? null, invite_url: `${access.invitationOrigin}/portal/accept-invitation?token=${encodeURIComponent(token.raw)}`, delivery: "manual_copy_provider_disabled" });
  }

  if (action === "revoke") {
    const invitationId = cleanUuid(input.invitation_id); if (!invitationId) return json(400, { ok: false, code: "request_rejected", correlation_id: correlationId });
    const result = await supabaseRestAsUser<boolean>("/rpc/revoke_tenant_invitation", access.user, { method: "POST", body: JSON.stringify({ p_tenant_id: access.tenantId, p_invitation_id: invitationId }) });
    if (!result.ok) { internalFailure(correlationId, action, result.data); return json(result.status === 403 ? 403 : 400, { ok: false, code: "request_rejected", correlation_id: correlationId }); }
    return json(200, { ok: true, revoked: result.data === true });
  }

  if (action === "manage_membership") {
    const membershipId = cleanUuid(input.membership_id); const role = normalizeInvitationRole(input.role); const status = ["active", "suspended", "revoked"].includes(String(input.status)) ? String(input.status) : null; const programId = cleanProgram(input.program_id);
    if (!membershipId || !role || !status || programId === undefined) return json(400, { ok: false, code: "request_rejected", correlation_id: correlationId });
    const permissions = cleanPermissions(role, input.permissions); if (!permissions) return json(400, { ok: false, code: "permission_not_allowed", correlation_id: correlationId });
    const result = await supabaseRestAsUser<Json>("/rpc/manage_tenant_membership", access.user, { method: "POST", body: JSON.stringify({ p_tenant_id: access.tenantId, p_membership_id: membershipId, p_status: status, p_role: role, p_program_id: programId, p_permissions: permissions }) });
    if (!result.ok) { internalFailure(correlationId, action, result.data); return json(result.status === 403 ? 403 : 400, { ok: false, code: "request_rejected", correlation_id: correlationId }); }
    return json(200, { ok: true, membership: result.data });
  }

  return json(400, { ok: false, code: "request_rejected", correlation_id: correlationId });
}
