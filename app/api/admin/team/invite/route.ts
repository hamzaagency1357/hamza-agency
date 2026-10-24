import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function respond(status: number, code: string) {
  return NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
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

  const { data: existing, error: existingError } = await admin.from("admin_users")
    .select("id").eq("email", email).limit(1);
  if (existingError) return respond(502, "lookup_failed");
  if (existing?.length) return respond(409, "account_already_exists");

  // A pending, inactive record is created first. The invite is sent only after
  // its role/scope are persisted, and no access is granted until activation.
  const { data: pending, error: pendingError } = await admin.from("admin_users").insert({
    email, role, assigned_program: role === "program_admin" ? assignedProgram : null, is_active: false,
  }).select("id").single();
  if (pendingError || !pending?.id) return respond(502, "pending_account_failed");

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
  if (inviteError || !invited.user?.id) {
    await admin.from("activity_logs").insert({
      admin_email: identity.user.email, actor_user_id: identity.user.id,
      action: "invite_admin_failed", entity_type: "admin_users", entity_id: String(pending.id),
      metadata: { invited_email: email, reason: "auth_invite_failed" },
      source_route: "/api/admin/team/invite", outcome: "failure",
    });
    return respond(502, "invite_failed_pending_account_inactive");
  }

  const { data: linked, error: linkError } = await admin.from("admin_users")
    .update({ user_id: invited.user.id, is_active: true })
    .eq("id", pending.id).eq("email", email).eq("is_active", false)
    .select("id").single();
  if (linkError || !linked?.id) {
    await admin.from("activity_logs").insert({
      admin_email: identity.user.email, actor_user_id: identity.user.id,
      action: "invite_admin_link_failed", entity_type: "admin_users", entity_id: String(pending.id),
      metadata: { invited_email: email, reason: "database_link_failed" },
      source_route: "/api/admin/team/invite", outcome: "failure",
    });
    return respond(502, "account_link_failed_requires_review");
  }

  await admin.from("activity_logs").insert({
    admin_email: identity.user.email, actor_user_id: identity.user.id,
    action: "invite_admin_user", entity_type: "admin_users", entity_id: invited.user.id,
    metadata: { invited_email: email, role, assigned_program: role === "program_admin" ? assignedProgram : null },
    source_route: "/api/admin/team/invite", outcome: "success",
  });
  return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
