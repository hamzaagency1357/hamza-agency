import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type AdminRole = "super_admin" | "deputy_super_admin" | "program_admin";

export type AdminModule =
  | "dashboard"
  | "applications"
  | "programs"
  | "pages"
  | "media"
  | "announcements"
  | "settings"
  | "service_requests"
  | "contact"
  | "requests"
  | "jobs"
  | "reviews"
  | "success_stories"
  | "partners"
  | "gallery"
  | "activity_logs"
  | "trash"
  | "backups"
  | "version_history"
  | "export_center"
  | "audit_mode"
  | "knowledge_base"
  | "ai_support"
  | "ai_settings"
  | "permissions"
  | "notifications"
  | "analytics"
  | "launch_checklist";

export type AdminProfile = {
  id: number;
  user_id: string | null;
  email: string;
  role: AdminRole;
  assigned_program: string | null;
  is_active: boolean;
};

export type AdminAccessResult = {
  isAuthorized: boolean;
  reason: "authorized" | "not_configured" | "not_signed_in" | "not_admin" | "inactive" | "forbidden";
  user: User | null;
  profile: AdminProfile | null;
};

export type AdminModulePermission = {
  admin_user_id: number | null;
  admin_email: string;
  module_key: AdminModule;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_manage: boolean;
  notes: string | null;
};

export type AdminPermissionAction =
  | "can_view"
  | "can_create"
  | "can_edit"
  | "can_delete"
  | "can_export"
  | "can_manage";

const platformModules: AdminModule[] = [
  "dashboard",
  "applications",
  "programs",
  "pages",
  "media",
  "announcements",
  "settings",
  "service_requests",
  "contact",
  "requests",
  "jobs",
  "reviews",
  "success_stories",
  "partners",
  "gallery",
  "activity_logs",
  "trash",
  "backups",
  "version_history",
  "export_center",
  "audit_mode",
  "knowledge_base",
  "ai_support",
  "ai_settings",
  "permissions",
  "notifications",
  "analytics",
  "launch_checklist",
];

const programAdminModules: AdminModule[] = ["dashboard", "applications", "programs"];

export function normalizeAdminRole(role: string | null | undefined): AdminRole | null {
  if (role === "super_admin") return "super_admin";
  if (role === "deputy_super_admin") return "deputy_super_admin";
  if (role === "program_admin") return "program_admin";
  return null;
}

export function getAllowedModulesForRole(role: AdminRole): AdminModule[] {
  return role === "program_admin" ? programAdminModules : platformModules;
}

export function canAccessAdminModule(role: AdminRole, module: AdminModule): boolean {
  return getAllowedModulesForRole(role).includes(module);
}

export async function getAdminModulePermission(
  profile: AdminProfile,
  module: AdminModule
): Promise<AdminModulePermission | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const fields =
    "admin_user_id, admin_email, module_key, can_view, can_create, can_edit, can_delete, can_export, can_manage, notes";

  let data: Record<string, unknown> | null = null;
  let queryError: unknown = null;

  const primary = await supabase
    .from("admin_permissions")
    .select(fields)
    .eq("admin_user_id", profile.id)
    .eq("module_key", module)
    .maybeSingle();

  data = primary.data as Record<string, unknown> | null;
  queryError = primary.error;

  if (queryError || !data) return null;

  return {
    admin_user_id: typeof data.admin_user_id === "number" ? data.admin_user_id : null,
    admin_email: typeof data.admin_email === "string" ? data.admin_email : profile.email,
    module_key: module,
    can_view: data.can_view === true,
    can_create: data.can_create === true,
    can_edit: data.can_edit === true,
    can_delete: data.can_delete === true,
    can_export: data.can_export === true,
    can_manage: data.can_manage === true,
    notes: typeof data.notes === "string" ? data.notes : null,
  };
}

export async function canUseAdminModulePermission(
  profile: AdminProfile,
  module: AdminModule,
  action: AdminPermissionAction = "can_view"
): Promise<boolean> {
  if (profile.role === "super_admin") return true;
  if (!canAccessAdminModule(profile.role, module)) return false;

  const permission = await getAdminModulePermission(profile, module);

  // Non-super admins require an explicit module permission row. This keeps the
  // browser view aligned with the authoritative server and OIDC gateway boundaries.
  if (!permission) return false;
  if (permission.can_manage) return true;
  return permission[action] === true;
}

export async function getCurrentAdminProfile(): Promise<AdminAccessResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { isAuthorized: false, reason: "not_configured", user: null, profile: null };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return { isAuthorized: false, reason: "not_signed_in", user: null, profile: null };
  }

  const fields = "id, user_id, email, role, assigned_program, is_active";
  const primary = await supabase
    .from("admin_users")
    .select(fields)
    .eq("user_id", session.user.id)
    .maybeSingle();

  const data = primary.data;
  const queryError = primary.error;
  const email = session.user.email?.trim() || "";

  if (queryError || !data) {
    return { isAuthorized: false, reason: "not_admin", user: session.user, profile: null };
  }

  const normalizedRole = normalizeAdminRole(data.role);
  if (!normalizedRole) {
    return { isAuthorized: false, reason: "not_admin", user: session.user, profile: null };
  }

  const profile: AdminProfile = {
    id: Number(data.id),
    user_id: data.user_id || null,
    email: data.email || email,
    role: normalizedRole,
    assigned_program: data.assigned_program || null,
    is_active: data.is_active !== false,
  };

  if (!profile.is_active) {
    return { isAuthorized: false, reason: "inactive", user: session.user, profile };
  }

  return { isAuthorized: true, reason: "authorized", user: session.user, profile };
}

export async function requireAdminModuleAccess(module: AdminModule): Promise<AdminAccessResult> {
  const result = await getCurrentAdminProfile();
  if (!result.isAuthorized || !result.profile) return result;

  const canView = await canUseAdminModulePermission(result.profile, module, "can_view");
  if (!canView) return { ...result, isAuthorized: false, reason: "forbidden" };
  return result;
}

export function shouldLimitToAssignedProgram(profile: AdminProfile | null): boolean {
  return profile?.role === "program_admin";
}

export function getAssignedProgramSlug(profile: AdminProfile | null): string | null {
  return profile?.assigned_program || null;
}
