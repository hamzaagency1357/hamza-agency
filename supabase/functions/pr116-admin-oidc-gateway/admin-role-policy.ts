export const SUPER_ADMIN_ONLY_ACTIONS = new Set([
  "pr116_permissions_page_entity_admin_permissions_upsert",
  "pr116_permissions_page_entity_admin_permissions_delete",
]);

export function isGeneratedActionRoleAllowed(action: string, role: string) {
  return !SUPER_ADMIN_ONLY_ACTIONS.has(action) || role === "super_admin";
}

/** Call only after Supabase Auth has verified this exact bearer and returned its user. */
export function hasRequiredAdminAssurance(verifiedToken: string, factors: unknown) {
  const hasVerifiedFactor = Array.isArray(factors) && factors.some((factor) => factor?.status === "verified");
  if (!hasVerifiedFactor) return true;

  try {
    const claims = verifiedToken.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(claims)).aal === "aal2";
  } catch {
    return false;
  }
}
