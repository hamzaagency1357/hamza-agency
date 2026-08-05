/** @typedef {"healthy" | "degraded" | "unavailable" | "disabled"} RuntimeHealthStatus */
/** @typedef {"configured" | "disabled" | "unverified" | "rules_fallback"} PassiveProviderStatus */

const UNAVAILABLE_OIDC_REASONS = new Set([
  "unauthorized",
  "forbidden",
  "database_authentication_failed",
  "database_unavailable",
  "gateway_unavailable",
]);

/** @param {string} reason @returns {RuntimeHealthStatus} */
export function classifyOidcFailure(reason) {
  if (reason === "unconfigured") return "disabled";
  if (UNAVAILABLE_OIDC_REASONS.has(reason)) return "unavailable";
  return "degraded";
}

/** @param {string} databaseStatus @param {string} oidcStatus */
export function computeOverallHealth(databaseStatus, oidcStatus) {
  if (databaseStatus === "unavailable" || oidcStatus === "unavailable") return "unavailable";
  if (databaseStatus === "degraded" || oidcStatus === "degraded" || oidcStatus === "disabled") return "degraded";
  return "healthy";
}

/** @param {string | undefined} mode @param {"disabled" | "unverified" | "rules_fallback"} fallback @returns {PassiveProviderStatus} */
export function passiveProviderStatus(mode, fallback = "disabled") {
  return mode === "live" || mode === "sandbox" ? "configured" : fallback;
}
