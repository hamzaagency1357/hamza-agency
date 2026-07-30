import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseRestAsUser, verifySupabaseBearer } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Json = Record<string, unknown>;

function json(status: number, body: Json) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function cleanEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && email.length <= 254 ? email : null;
}

function cleanRole(value: unknown) {
  return ["creator", "client", "employee", "partner", "tenant_admin"].includes(String(value)) ? String(value) : null;
}

function cleanUuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

function cleanProgram(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
}

function cleanPermissions(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function tokenPair() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: createHash("sha256").update(raw, "utf8").digest("hex") };
}

function siteUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const origin = request.headers.get("origin");
  return origin && /^https?:\/\//i.test(origin) ? origin.replace(/\/+$/, "") : "https://hamza-agency.com";
}

function rpcPath(name: string) {
  return `/rpc/${name}`;
}

async function bodyOf(request: Request): Promise<Json | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as Json : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await verifySupabaseBearer(request);
  if (!user) return json(401, { ok: false, code: "unauthenticated" });
  const membership = await supabaseRestAsUser<Array<{ tenant_id: string }>>(
    "/tenant_memberships?select=tenant_id&user_id=eq." + encodeURIComponent(user.id) + "&status=eq.active&role=in.(super_admin,tenant_admin)&limit=1",
    user
  );
  const tenantId = membership.data?.[0]?.tenant_id;
  if (!membership.ok || !tenantId) return json(403, { ok: false, code: "forbidden" });
  const invitations = await supabaseRestAsUser<Json[]>(
    "/tenant_invitations?select=id,email,role,program_id,status,expires_at,last_sent_at,send_count,created_at&tenant_id=eq." + encodeURIComponent(tenantId) + "&order=created_at.desc&limit=100",
    user
  );
  if (!invitations.ok) return json(invitations.status, { ok: false, code: "invitations_read_failed" });
  return json(200, { ok: true, invitations: invitations.data ?? [] });
}

export async function POST(request: Request) {
  const user = await verifySupabaseBearer(request);
  if (!user) return json(401, { ok: false, code: "unauthenticated" });
  const input = await bodyOf(request);
  if (!input) return json(400, { ok: false, code: "invalid_json" });
  const action = typeof input.action === "string" ? input.action : "create";

  if (action === "create") {
    const email = cleanEmail(input.email);
    const role = cleanRole(input.role);
    const programId = cleanProgram(input.program_id);
    const days = Math.max(1, Math.min(Number(input.expires_in_days) || 7, 30));
    if (!email || !role || programId === undefined) return json(400, { ok: false, code: "invalid_invitation" });
    const token = tokenPair();
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    const result = await supabaseRestAsUser<Json[]>(rpcPath("create_tenant_invitation"), user, {
      method: "POST",
      body: JSON.stringify({
        p_email: email,
        p_role: role,
        p_program_id: programId,
        p_permissions: cleanPermissions(input.permissions),
        p_token_hash: token.hash,
        p_expires_at: expiresAt,
      }),
    });
    if (!result.ok) return json(result.status, { ok: false, code: "invitation_create_failed", detail: result.data });
    return json(201, {
      ok: true,
      invitation: result.data?.[0] ?? null,
      invite_url: `${siteUrl(request)}/portal/accept-invitation?token=${encodeURIComponent(token.raw)}`,
      delivery: "manual_copy_provider_disabled",
    });
  }

  if (action === "resend") {
    const invitationId = cleanUuid(input.invitation_id);
    const days = Math.max(1, Math.min(Number(input.expires_in_days) || 7, 30));
    if (!invitationId) return json(400, { ok: false, code: "invalid_invitation_id" });
    const token = tokenPair();
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    const result = await supabaseRestAsUser<Json[]>(rpcPath("resend_tenant_invitation"), user, {
      method: "POST",
      body: JSON.stringify({ p_invitation_id: invitationId, p_token_hash: token.hash, p_expires_at: expiresAt }),
    });
    if (!result.ok) return json(result.status, { ok: false, code: "invitation_resend_failed", detail: result.data });
    return json(200, {
      ok: true,
      invitation: result.data?.[0] ?? null,
      invite_url: `${siteUrl(request)}/portal/accept-invitation?token=${encodeURIComponent(token.raw)}`,
      delivery: "manual_copy_provider_disabled",
    });
  }

  if (action === "revoke") {
    const invitationId = cleanUuid(input.invitation_id);
    if (!invitationId) return json(400, { ok: false, code: "invalid_invitation_id" });
    const result = await supabaseRestAsUser<boolean>(rpcPath("revoke_tenant_invitation"), user, {
      method: "POST",
      body: JSON.stringify({ p_invitation_id: invitationId }),
    });
    if (!result.ok) return json(result.status, { ok: false, code: "invitation_revoke_failed", detail: result.data });
    return json(200, { ok: true, revoked: result.data === true });
  }

  if (action === "manage_membership") {
    const membershipId = cleanUuid(input.membership_id);
    const role = cleanRole(input.role);
    const status = ["active", "suspended", "revoked"].includes(String(input.status)) ? String(input.status) : null;
    const programId = cleanProgram(input.program_id);
    if (!membershipId || !role || !status || programId === undefined) return json(400, { ok: false, code: "invalid_membership_update" });
    const result = await supabaseRestAsUser<Json>(rpcPath("manage_tenant_membership"), user, {
      method: "POST",
      body: JSON.stringify({
        p_membership_id: membershipId,
        p_status: status,
        p_role: role,
        p_program_id: programId,
        p_permissions: cleanPermissions(input.permissions),
      }),
    });
    if (!result.ok) return json(result.status, { ok: false, code: "membership_update_failed", detail: result.data });
    return json(200, { ok: true, membership: result.data });
  }

  return json(400, { ok: false, code: "unsupported_action" });
}
