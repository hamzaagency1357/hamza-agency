export const SUPER_ADMIN_ONLY_ACTIONS = new Set([
  "pr116_permissions_page_entity_admin_permissions_upsert",
  "pr116_permissions_page_entity_admin_permissions_delete",
]);

export function isGeneratedActionRoleAllowed(action: string, role: string) {
  return !SUPER_ADMIN_ONLY_ACTIONS.has(action) || role === "super_admin";
}
