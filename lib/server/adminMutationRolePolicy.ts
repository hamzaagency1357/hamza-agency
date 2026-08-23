import type { AdminRole } from "@/lib/adminAccess";

export type AdminMutationRoleRequirement = "super_admin" | null;

export function meetsAdminMutationRoleRequirement(
  role: AdminRole,
  requiredRole: AdminMutationRoleRequirement,
) {
  return requiredRole !== "super_admin" || role === "super_admin";
}
