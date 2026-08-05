export type RuntimeHealthStatus = "healthy" | "degraded" | "unavailable" | "disabled";
export type PassiveProviderStatus = "configured" | "disabled" | "unverified" | "rules_fallback";
export function classifyOidcFailure(reason: string): RuntimeHealthStatus;
export function computeOverallHealth(databaseStatus: string, oidcStatus: string): "healthy" | "degraded" | "unavailable";
export function passiveProviderStatus(
  mode: string | undefined,
  fallback?: "disabled" | "unverified" | "rules_fallback"
): PassiveProviderStatus;
