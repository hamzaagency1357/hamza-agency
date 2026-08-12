import "server-only";

import type { AdminModule, AdminPermissionAction, AdminRole } from "@/lib/adminAccess";
import {
  supabaseRestAsUser,
  verifySupabaseBearer,
  type VerifiedSupabaseUser,
} from "@/lib/server/supabaseUser";

export const PREVIEW_READ_ONLY_MESSAGE =
  "المعاينة مخصصة للعرض والتحقق فقط، ولا تحفظ تغييرات على البيانات الفعلية.";

export type AuthorizedAdminMutation = {
  user: VerifiedSupabaseUser;
  profile: {
    id: number;
    userId: string | null;
    email: string;
    role: AdminRole;
    assignedProgram: string | null;
  };
};

type AdminUserRow = {
  id: number;
  user_id: string | null;
  email: string;
  role: string;
  assigned_program: string | null;
  is_active: boolean;
};

type PermissionRow = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_manage: boolean;
};

const PROGRAM_ADMIN_MODULES = new Set<AdminModule>(["dashboard", "applications", "programs"]);

function normalizeRole(value: string): AdminRole | null {
  if (value === "super_admin" || value === "deputy_super_admin" || value === "program_admin") return value;
  return null;
}

async function readProfile(user: VerifiedSupabaseUser): Promise<AuthorizedAdminMutation["profile"] | null> {
  const fields = "id,user_id,email,role,assigned_program,is_active";
  const primary = await supabaseRestAsUser<AdminUserRow[]>(
    `/admin_users?select=${fields}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
    user,
  );
  let row = primary.ok && Array.isArray(primary.data) ? primary.data[0] : null;

  if (!row && user.email) {
    const fallback = await supabaseRestAsUser<AdminUserRow[]>(
      `/admin_users?select=${fields}&user_id=is.null&email=ilike.${encodeURIComponent(user.email)}&limit=1`,
      user,
    );
    row = fallback.ok && Array.isArray(fallback.data) ? fallback.data[0] : null;
  }

  if (!row || row.is_active === false) return null;
  const role = normalizeRole(row.role);
  if (!role) return null;
  return {
    id: Number(row.id),
    userId: row.user_id,
    email: row.email || user.email || "",
    role,
    assignedProgram: row.assigned_program || null,
  };
}

async function hasPermission(
  actor: AuthorizedAdminMutation,
  module: AdminModule,
  action: AdminPermissionAction,
): Promise<boolean> {
  if (actor.profile.role === "super_admin") return true;
  if (actor.profile.role === "program_admin" && !PROGRAM_ADMIN_MODULES.has(module)) return false;

  const fields = "can_view,can_create,can_edit,can_delete,can_export,can_manage";
  const primary = await supabaseRestAsUser<PermissionRow[]>(
    `/admin_permissions?select=${fields}&admin_user_id=eq.${actor.profile.id}&module_key=eq.${encodeURIComponent(module)}&limit=1`,
    actor.user,
  );
  let permission = primary.ok && Array.isArray(primary.data) ? primary.data[0] : null;
  if (!permission && actor.profile.email) {
    const fallback = await supabaseRestAsUser<PermissionRow[]>(
      `/admin_permissions?select=${fields}&admin_user_id=is.null&admin_email=ilike.${encodeURIComponent(actor.profile.email)}&module_key=eq.${encodeURIComponent(module)}&limit=1`,
      actor.user,
    );
    permission = fallback.ok && Array.isArray(fallback.data) ? fallback.data[0] : null;
  }

  if (!permission) return actor.profile.role === "deputy_super_admin";
  return permission.can_manage === true || permission[action] === true;
}

export async function authorizeAdminMutation(
  request: Request,
  module: AdminModule,
  action: AdminPermissionAction,
): Promise<{ ok: true; actor: AuthorizedAdminMutation } | { ok: false; status: number; message: string }> {
  const user = await verifySupabaseBearer(request);
  if (!user) return { ok: false, status: 401, message: "انتهت جلسة الإدارة. سجل الدخول مجددًا." };

  const profile = await readProfile(user);
  if (!profile) return { ok: false, status: 403, message: "لا تملك صلاحية تنفيذ هذا الإجراء." };
  const actor = { user, profile };
  if (!(await hasPermission(actor, module, action))) {
    return { ok: false, status: 403, message: "لا تملك صلاحية تنفيذ هذا الإجراء." };
  }

  // First mandatory defense-in-depth layer. The Supabase PR116 OIDC gateway
  // independently checks the Vercel OIDC environment claim and accepts only production.
  if (process.env.VERCEL_ENV === "preview") {
    return { ok: false, status: 403, message: PREVIEW_READ_ONLY_MESSAGE };
  }

  return { ok: true, actor };
}

export function normalizeProgramScope(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
