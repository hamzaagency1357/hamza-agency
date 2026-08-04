import "server-only";

import { createHash, randomBytes } from "node:crypto";

type JsonObject = Record<string, unknown>;

const EDGE_FUNCTION_NAME = "pr101-vercel-oidc-gateway";
const ALLOWED_ACTIONS = new Set([
  "consent_record",
  "payment_webhook_record",
  "provider_event_enqueue",
  "provider_health_record",
  "health_probe",
]);

export type Pr101OidcGatewayFailure =
  | "unconfigured"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "database_unavailable"
  | "gateway_unavailable"
  | "invalid_response";

export class Pr101OidcGatewayError extends Error {
  constructor(public readonly reason: Pr101OidcGatewayFailure) {
    super(`pr101_oidc_gateway_${reason}`);
  }
}

function getRuntimeOidcToken(request: Request) {
  return request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || "";
}

export async function callPr101OidcGateway<T = JsonObject>(
  request: Request,
  action: string,
  body: JsonObject
): Promise<T> {
  if (!ALLOWED_ACTIONS.has(action)) throw new Pr101OidcGatewayError("invalid_response");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const oidcToken = getRuntimeOidcToken(request);
  if (!supabaseUrl || !oidcToken) throw new Pr101OidcGatewayError("unconfigured");

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(24).toString("base64url");
  const bodyText = JSON.stringify(body);
  const bodyDigest = createHash("sha256").update(bodyText, "utf8").digest("hex");

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/${EDGE_FUNCTION_NAME}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${oidcToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, timestamp, nonce, body: bodyText, bodyDigest }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Pr101OidcGatewayError("timeout");
    }
    throw new Pr101OidcGatewayError("gateway_unavailable");
  }

  if (response.status === 401) throw new Pr101OidcGatewayError("unauthorized");
  if (response.status === 403) throw new Pr101OidcGatewayError("forbidden");
  if (response.status === 502) throw new Pr101OidcGatewayError("database_unavailable");
  if (!response.ok) throw new Pr101OidcGatewayError("gateway_unavailable");

  const data = (await response.json().catch(() => null)) as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Pr101OidcGatewayError("invalid_response");
  }
  return data as T;
}
