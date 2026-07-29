import "server-only";

import { createHash, randomBytes } from "node:crypto";

type JsonObject = Record<string, unknown>;

const EDGE_FUNCTION_NAME = "pr100-vercel-oidc-gateway";
const ALLOWED_ACTIONS = new Set([
  "application_lookup",
  "service_lookup",
  "ai_guard",
  "password_reset_guard",
  "application_submit",
  "service_request_submit",
  "job_application_submit",
  "contact_submit",
  "ai_support_submit",
]);

function getRuntimeOidcToken(request: Request) {
  return request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || "";
}

export async function callOidcGateway<T = JsonObject>(
  request: Request,
  action: string,
  body: JsonObject,
): Promise<T> {
  if (!ALLOWED_ACTIONS.has(action)) throw new Error("oidc_gateway_invalid_action");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const oidcToken = getRuntimeOidcToken(request);
  if (!supabaseUrl || !oidcToken) throw new Error("oidc_gateway_unavailable");

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(24).toString("base64url");
  const bodyText = JSON.stringify(body);
  const bodyDigest = createHash("sha256").update(bodyText, "utf8").digest("hex");

  const response = await fetch(`${supabaseUrl}/functions/v1/${EDGE_FUNCTION_NAME}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${oidcToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action,
      timestamp,
      nonce,
      body: bodyText,
      bodyDigest,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error("oidc_gateway_rejected");
  const data = (await response.json()) as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("oidc_gateway_invalid_response");
  }
  return data as T;
}
