import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
const fail = (status: number, code: string) =>
  NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  if (process.env.VERCEL_ENV === "preview") return fail(403, "preview_writes_forbidden");
  const origin = request.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).origin !== request.nextUrl.origin) return fail(403, "origin_forbidden"); }
    catch { return fail(403, "origin_forbidden"); }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return fail(503, "admin_deactivation_unavailable");
  const bearer = request.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) return fail(401, "unauthenticated");
  const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: identity, error: authError } = await publicClient.auth.getUser(bearer.slice(7));
  if (authError || !identity.user?.id || !identity.user.email) return fail(401, "unauthenticated");
  const service = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: actor, error: actorError } = await service.from("admin_users")
    .select("id,user_id,email,role,is_active").eq("user_id", identity.user.id).maybeSingle();
  if (actorError || !actor || actor.is_active !== true || actor.role !== "super_admin" ||
      actor.email?.toLowerCase() !== identity.user.email.toLowerCase()) return fail(403, "forbidden");
  let body: unknown;
  try { body = await request.json(); } catch { return fail(400, "invalid_request"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail(400, "invalid_request");
  const id = (body as Record<string, unknown>).id;
  if (!Number.isSafeInteger(id) || (id as number) <= 0) return fail(400, "invalid_account_id");
  const { data: target, error: targetError } = await service.from("admin_users")
    .select("id,user_id,email,role,is_active").eq("id", id).maybeSingle();
  if (targetError) return fail(502, "account_lookup_failed");
  if (!target || target.id === actor.id || target.user_id === identity.user.id ||
      !["deputy_super_admin", "program_admin"].includes(target.role) ||
      target.is_active !== true) return fail(409, "account_not_deactivatable");
  const { data: tenant, error: tenantError } = await service.from("tenants")
    .select("id").eq("is_primary", true).eq("status", "active").single();
  if (tenantError || !tenant?.id) return fail(503, "audit_tenant_unavailable");
  const { data: updated, error: updateError } = await service.from("admin_users")
    .update({ is_active: false }).eq("id", id).eq("is_active", true)
    .eq("role", target.role).eq("user_id", target.user_id)
    .select("id").single();
  if (updateError || !updated) return fail(409, "deactivation_conflict");
  await service.from("activity_logs").insert({
    admin_email: identity.user.email, actor_user_id: identity.user.id,
    action: "deactivate_admin_user", entity_type: "admin_users", entity_id: String(id),
    metadata: { target_email: target.email, role: target.role },
    tenant_id: tenant.id, source_route: "/api/admin/team/deactivate", outcome: "success",
  });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
