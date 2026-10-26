import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function respond(status: number, code: string) {
  return NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });
}

// Require an exact Origin match for cookie-independent bearer requests as an
// additional browser-side defense; never trust an arbitrary forwarded host.
function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients still require a valid user token.
  try { return new URL(origin).origin === request.nextUrl.origin; } catch { return false; }
}

export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV === "preview") return respond(403, "preview_writes_forbidden");
  if (!originAllowed(request)) return respond(403, "origin_forbidden");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return respond(503, "admin_invites_unavailable");
  const bearer = request.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) return respond(401, "unauthenticated");
  const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: authError } = await userClient.auth.getUser(bearer.slice(7));
  if (authError || !identity.user?.id || !identity.user.email) return respond(401, "unauthenticated");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await admin.from("admin_users")
    .select("id,role,is_active,user_id,email").eq("user_id", identity.user.id).maybeSingle();
  if (actorError || !actor || actor.is_active !== true || actor.role !== "super_admin" ||
      actor.email?.toLowerCase() !== identity.user.email.toLowerCase()) return respond(403, "forbidden");

  const { data: primaryTenant, error: tenantError } = await admin.from("tenants")
    .select("id").eq("is_primary", true).eq("status", "active").single();
  if (tenantError || !primaryTenant?.id) return respond(503, "audit_tenant_unavailable");
  let input: unknown;
  try { input = await request.json(); } catch { return respond(400, "invalid_request"); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return respond(400, "invalid_request");
  const values = input as Record<string, unknown>;
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : "";
  const role = values.role;
  const assignedProgram = typeof values.assigned_program === "string" ? values.assigned_program.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      !["deputy_super_admin", "program_admin"].includes(String(role)) ||
      (role === "program_admin" && (!assignedProgram || assignedProgram.length > 100)) ||
      (role !== "program_admin" && assignedProgram)) return respond(400, "invalid_request");

  let canonicalProgram: string | null = null;
  if (role === "program_admin") {
    // Use parameterized PostgREST equality filters, never interpolate user input into .or().
    const { data: bySlug, error: slugError } = await admin.from("programs")
      .select("slug,name").eq("slug", assignedProgram).limit(2);
    if (slugError) return respond(502, "program_lookup_failed");
    const { data: byName, error: nameError } = await admin.from("programs")
      .select("slug,name").eq("name", assignedProgram).limit(2);
    if (nameError) return respond(502, "program_lookup_failed");
    const matches = [...(bySlug || []), ...(byName || [])];
    const uniqueSlugs = [...new Set(matches.map((item) => item.slug).filter(Boolean))];
    if (uniqueSlugs.length !== 1) return respond(400, "invalid_program_assignment");
    canonicalProgram = uniqueSlugs[0];
  }

  const { data: existing, error: existingError } = await admin.from("admin_users")
    .select("id,user_id,role,assigned_program,is_active").eq("email", email).limit(2);
  if (existingError) return respond(502, "lookup_failed");
  // Fail closed if legacy data contains multiple accounts with the same email.
  if ((existing?.length ?? 0) > 1) return respond(409, "duplicate_account_requires_review");
  // Recover only an unlinked, inactive invitation with exactly the same
  // persisted role and program. Never alter an existing account's privileges.
  const prior = existing?.[0];
  if (prior && (prior.is_active !== false || prior.user_id ||
      prior.role !== role || (prior.assigned_program ?? null) !== canonicalProgram)) {
    return respond(409, prior.is_active === false ? "pending_invite_requires_review" : "account_already_exists");
  }

  // A pending, inactive record is created first. The invite is sent only after
  // its role/scope are persisted, and no access is granted until activation.
  let pending: { id: number } | null = null;
  if (prior) {
    pending = { id: prior.id };
  } else {
    const { data: created, error: pendingError } = await admin.from("admin_users").insert({
      email, role, assigned_program: canonicalProgram, is_active: false,
    }).select("id").single();
    if (pendingError || !created?.id) return respond(502, "pending_account_failed");
    pending = created;
  }

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited.user?.id) {
    await admin.from("activity_logs").insert({
      admin_email: identity.user.email, actor_user_id: identity.user.id,
      action: "invite_admin_failed", entity_type: "admin_users", entity_id: String(pending.id),
      metadata: { invited_email: email, reason: "auth_invite_failed" },
      tenant_id: primaryTenant.id, source_route: "/api/admin/team/invite", outcome: "failure",
    });
    return respond(502, "invite_failed_pending_account_inactive");
  }

  // Only attach the Auth identity here. Activation is a separate explicit
  // super-admin approval step; invitations must not grant privileges by default.
  const { data: linked, error: linkError } = await admin.from("admin_users")
    .update({ user_id: invited.user.id })
    .eq("id", pending.id).eq("email", email).eq("is_active", false)
    .select("id").single();
  if (linkError || !linked?.id) {
    await admin.from("activity_logs").insert({
      admin_email: identity.user.email, actor_user_id: identity.user.id,
      action: "invite_admin_link_failed", entity_type: "admin_users", entity_id: String(pending.id),
      metadata: { invited_email: email, reason: "database_link_failed" },
      tenant_id: primaryTenant.id, source_route: "/api/admin/team/invite", outcome: "failure",
    });
    return respond(502, "account_link_failed_requires_review");
  }

  const { error: auditError } = await admin.from("activity_logs").insert({
    admin_email: identity.user.email, actor_user_id: identity.user.id,
    action: "invite_admin_user", entity_type: "admin_users", entity_id: invited.user.id,
    metadata: { invited_email: email, role, assigned_program: canonicalProgram },
    tenant_id: primaryTenant.id, source_route: "/api/admin/team/invite", outcome: "success",
  });
  if (auditError) return respond(503, "state_changed_audit_failed");
  return NextResponse.json({ ok: true, status: "pending_activation" }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
