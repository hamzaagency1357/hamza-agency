import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const fail = (status: number, code: string) => NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).origin !== request.nextUrl.origin) return fail(403, "origin_forbidden"); }
    catch { return fail(403, "origin_forbidden"); }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return fail(503, "admin_activation_unavailable");
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return fail(401, "unauthenticated");
  const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await publicClient.auth.getUser(authorization.slice(7));
  if (authError || !auth.user?.id || !auth.user.email) return fail(401, "unauthenticated");
  const service = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await service.from("admin_users")
    .select("id,email,role,is_active").eq("user_id", auth.user.id).maybeSingle();
  if (actorError || !actor || actor.is_active !== true || actor.role !== "super_admin" ||
      actor.email?.toLowerCase() !== auth.user.email.toLowerCase()) return fail(403, "forbidden");
  let body: unknown;
  try { body = await request.json(); } catch { return fail(400, "invalid_request"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "invalid_request");
  const id = (body as Record<string, unknown>).id;
  if (!Number.isSafeInteger(id) || (id as number) <= 0) return fail(400, "invalid_account_id");
  const { data: target, error: targetError } = await service.from("admin_users")
    .select("id,email,user_id,role,assigned_program,is_active").eq("id", id).maybeSingle();
  if (targetError || !target || target.is_active !== false || !target.user_id ||
      !["program_admin", "deputy_super_admin"].includes(target.role) ||
      (target.role === "program_admin" && !target.assigned_program)) return fail(409, "account_not_ready");
  const { data: authTarget, error: userError } = await service.auth.admin.getUserById(target.user_id);
  if (userError || !authTarget.user || authTarget.user.email?.toLowerCase() !== target.email?.toLowerCase() ||
      !authTarget.user.email_confirmed_at) return fail(409, "invitation_not_accepted");
  // The invite alone must not grant broad module privileges. The owner must
  // explicitly configure scoped permissions before a deputy becomes active.
  if (target.role === "deputy_super_admin") {
    const { data: grants, error: grantsError } = await service.from("admin_permissions")
      .select("module_key,can_view,can_create,can_edit,can_delete,can_export,can_manage")
      .eq("admin_email", target.email)
      .eq("admin_user_id", target.id);
    if (grantsError || !grants?.some((grant) =>
      grant.can_view === true || grant.can_create === true || grant.can_edit === true ||
      grant.can_delete === true || grant.can_export === true || grant.can_manage === true
    )) return fail(409, "permissions_required_before_activation");
  }
  const { data: activated, error: updateError } = await service.from("admin_users")
    .update({ is_active: true }).eq("id", id).eq("is_active", false).eq("user_id", target.user_id)
    .select("id").single();
  if (updateError || !activated) return fail(409, "activation_conflict");
  await service.from("activity_logs").insert({
    admin_email: auth.user.email, actor_user_id: auth.user.id,
    action: "activate_admin_user", entity_type: "admin_users", entity_id: String(id),
    metadata: { target_email: target.email, role: target.role },
    source_route: "/api/admin/team/activate", outcome: "success",
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
