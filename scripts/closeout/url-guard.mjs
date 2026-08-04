import { PRODUCTION_HOSTS } from "./environment-guard.mjs";

const BLOCKED_ACTION_PATH = /\/(?:logout|accept-invitation|invite|auth\/callback)(?:\/|$)|[?&](?:token|code)=/i;

export function buildUrlGuard({ expectedHost, allowedExternalHosts = [] }) {
  if (!expectedHost) throw new Error("expectedHost is required");
  const normalizedExpected = expectedHost.toLowerCase();
  const allowed = new Set(allowedExternalHosts.map((host) => host.toLowerCase()));

  return function assertSafeUrl(raw, context = "request") {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") throw new Error(`${context} left HTTPS: ${url.href}`);
    if (PRODUCTION_HOSTS.has(host)) throw new Error(`${context} reached Production: ${url.href}`);
    if (host !== normalizedExpected && !allowed.has(host)) {
      throw new Error(`${context} reached a host outside the allowlist: ${url.href}`);
    }
    if (BLOCKED_ACTION_PATH.test(`${url.pathname}${url.search}`)) {
      throw new Error(`${context} reached a state-changing action URL: ${url.href}`);
    }
    return url;
  };
}

export function parseAllowedHosts(value = "") {
  return String(value)
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}
