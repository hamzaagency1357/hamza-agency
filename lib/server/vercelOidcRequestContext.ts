import "server-only";

type VercelRequestContext = {
  headers?: Record<string, string>;
};

const REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
const OIDC_HEADER = "x-vercel-oidc-token";

type GlobalWithVercelRequestContext = typeof globalThis & {
  [REQUEST_CONTEXT_SYMBOL]?: { get?: () => VercelRequestContext };
};

/**
 * Return the request-scoped Vercel workload token injected by the Vercel runtime.
 *
 * Production must never fall back to process.env.VERCEL_OIDC_TOKEN here: that value
 * is a deployment snapshot and can expire while a deployment remains live. Reading
 * the request context on every gateway call keeps the workload credential scoped to
 * the current invocation and avoids caching it across requests.
 */
export function getRequestScopedVercelOidcToken() {
  const context = (globalThis as GlobalWithVercelRequestContext)[REQUEST_CONTEXT_SYMBOL]?.get?.();
  const token = context?.headers?.[OIDC_HEADER];
  return typeof token === "string" ? token.trim() : "";
}
