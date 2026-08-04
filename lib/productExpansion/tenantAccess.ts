import { supabase } from "@/lib/supabase";

export type PortalRole = "creator" | "client" | "employee" | "partner" | "tenant_admin" | "super_admin";

export async function getActiveTenantMembership(role?: PortalRole) {
  if (!supabase) return { membership: null, user: null, error: "Supabase is not configured" };
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { membership: null, user: null, error: "unauthenticated" };
  let query = supabase
    .from("tenant_memberships")
    .select("id,tenant_id,user_id,role,status,permissions,mfa_required,tenants(id,slug,name,status,default_locale,supported_locales)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1);
  if (role) query = query.eq("role", role);
  const { data, error } = await query.maybeSingle();
  return { membership: data, user, error: error?.message ?? null };
}

export async function requireTenantAdmin() {
  const result = await getActiveTenantMembership();
  const role = result.membership?.role as PortalRole | undefined;
  return { ...result, authorized: role === "tenant_admin" || role === "super_admin" };
}

export function safeTenantId(value: unknown) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}
