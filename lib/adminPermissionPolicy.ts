export type HardeningAdminRole = "super_admin" | "deputy_super_admin" | "program_admin";
export type HardeningPermissionAction =
  | "can_view"
  | "can_create"
  | "can_edit"
  | "can_delete"
  | "can_export"
  | "can_manage";

export type HardeningPermissionRow = Record<HardeningPermissionAction, boolean>;

const PROGRAM_ADMIN_MODULES = new Set(["dashboard", "applications", "programs"]);

export function evaluateAdminPermission(
  role: HardeningAdminRole,
  module: string,
  action: HardeningPermissionAction,
  permission: HardeningPermissionRow | null,
): boolean {
  if (role === "super_admin") return true;
  if (role === "program_admin" && !PROGRAM_ADMIN_MODULES.has(module)) return false;
  if (!permission) return false;
  return permission.can_manage === true || permission[action] === true;
}
