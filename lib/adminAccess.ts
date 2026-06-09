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
  | "jobs"
  | "reviews"
  | "success_stories"
  | "partners"
  | "gallery"
  | "activity_logs"
  | "trash"
  | "backups"
  | "permissions"
  | "notifications"
  | "analytics"
  | "launch_checklist";

export type AdminProfile = {
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

const superAdminModules: AdminModule[] = [
  "dashboard",
  "applications",
  "programs",
  "pages",
  "media",
  "announcements",
  "settings",
  "service_requests",
  "jobs",
  "reviews",
  "success_stories",
  "partners",
  "gallery",
  "activity_logs",
  "trash",
  "backups",
  "permissions",
  "notifications",
  "analytics",
  "launch_checklist",
];

const deputySuperAdminModules: AdminModule[] = [
  "dashboard",
  "applications",
  "programs",
  "pages",
  "media",
  "announcements",
  "settings",
  "service_requests",
  "jobs",
  "reviews",
  "success_stories",
  "partners",
  "gallery",
  "activity_logs",
  "trash",
  "backups",
  "permissions",
  "notifications",
  "analytics",
  "launch_checklist",
];

const programAdminModules: AdminModule[] = [
  "dashboard",
  "applications",
  "programs",
];

export function normalizeAdminRole(role: string | null | undefined): AdminRole {
  if (role === "deputy_super_admin") return "deputy_super_admin";
  if (role === "program_admin") return "program_admin";
  return "super_admin";
}

export function getAllowedModulesForRole(role: AdminRole): AdminModule[] {
  if (role === "super_admin") return superAdminModules;
  if (role === "deputy_super_admin") return deputySuperAdminModules;
  return programAdminModules;
}

export function canAccessAdminModule(role: AdminRole, module: AdminModule): boolean {
  return getAllowedModulesForRole(role).includes(module);
}

export async function getAdminModulePermission(
  adminEmail: string,
  module: AdminModule
): Promise<AdminModulePermission | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const email = adminEmail.trim().toLowerCase();
  if (!email) return null;

  const { data, error } = await supabase
    .from("admin_permissions")
    .select("admin_email, module_key, can_view, can_create, can_edit, can_delete, can_export, can_manage, notes")
    .ilike("admin_email", email)
    .eq("module_key", module)
    .maybeSingle();

  if (error || !data) return null;

  return {
    admin_email: data.admin_email || email,
    module_key: module,
    can_view: data.can_view === true,
    can_create: data.can_create === true,
    can_edit: data.can_edit === true,
    can_delete: data.can_delete === true,
    can_export: data.can_export === true,
    can_manage: data.can_manage === true,
    notes: data.notes || null,
  };
}

export async function getCurrentAdminProfile(): Promise<AdminAccessResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      isAuthorized: false,
      reason: "not_configured",
      user: null,
      profile: null,
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return {
      isAuthorized: false,
      reason: "not_signed_in",
      user: null,
      profile: null,
    };
  }

  const email = session.user.email || "";

  if (!email) {
    return {
      isAuthorized: false,
      reason: "not_signed_in",
      user: session.user,
      profile: null,
    };
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("email, role, assigned_program, is_active")
    .ilike("email", email)
    .maybeSingle();

  if (error || !data) {
    return {
      isAuthorized: false,
      reason: "not_admin",
      user: session.user,
      profile: null,
    };
  }

  const profile: AdminProfile = {
    email: data.email || email,
    role: normalizeAdminRole(data.role),
    assigned_program: data.assigned_program || null,
    is_active: data.is_active !== false,
  };

  if (!profile.is_active) {
    return {
      isAuthorized: false,
      reason: "inactive",
      user: session.user,
      profile,
    };
  }

  return {
    isAuthorized: true,
    reason: "authorized",
    user: session.user,
    profile,
  };
}

export async function requireAdminModuleAccess(
  module: AdminModule
): Promise<AdminAccessResult> {
  const result = await getCurrentAdminProfile();

  if (!result.isAuthorized || !result.profile) {
    return result;
  }

  if (!canAccessAdminModule(result.profile.role, module)) {
    return {
      ...result,
      isAuthorized: false,
      reason: "forbidden",
    };
  }

  return result;
}

export function shouldLimitToAssignedProgram(profile: AdminProfile | null): boolean {
  return profile?.role === "program_admin";
}

export function getAssignedProgramSlug(profile: AdminProfile | null): string | null {
  return profile?.assigned_program || null;
}
