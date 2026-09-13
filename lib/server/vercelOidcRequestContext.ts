import "server-only";

type VercelRequestContext = {
  headers?: Record<string, string>;
};

type VercelRequestContextProvider = {
  get?: () => VercelRequestContext;
};

const REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");
const OIDC_HEADER = "x-vercel-oidc-token";

/**
 * Return the request-scoped Vercel workload token injected by the Vercel runtime.
 *
 * Production must never fall back to process.env.VERCEL_OIDC_TOKEN here: that value
 * is a deployment snapshot and can expire while a deployment remains live. Reading
 * the request context on every gateway call keeps the workload credential scoped to
 * the current invocation and avoids caching it across requests.
 */
export function getRequestScopedVercelOidcToken() {
  const runtime = globalThis as typeof globalThis & { [key: symbol]: VercelRequestContextProvider | undefined };
  const context = runtime[REQUEST_CONTEXT_SYMBOL]?.get?.();
  const token = context?.headers?.[OIDC_HEADER];
  return typeof token === "string" ? token.trim() : "";
}
