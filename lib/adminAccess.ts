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
  | "notifications"
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
  "notifications",
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
  "notifications",
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
