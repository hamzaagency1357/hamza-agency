import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";

/**
 * Vercel replaces client-supplied X-Forwarded-For at ingress. Do not mix
 * User-Agent into the abuse identity: it is trivially changed by a caller.
 * This hash is a short-lived rate dimension, not a persistent visitor ID.
 * Vercel deployment requests without a valid proxy IP fail closed.
 */
export function trustedClientFingerprint(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const onVercel = process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview";
  if (onVercel && !isIP(forwarded)) throw new Error("trusted_proxy_ip_unavailable");
  const source = isIP(forwarded) ? forwarded : "local-development-no-proxy";
  return createHash("sha256").update(`hamza:trusted-source:v1:${source}`).digest("hex");
}
