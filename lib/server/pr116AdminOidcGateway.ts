import "server-only";

import { createHash, randomBytes } from "node:crypto";

const EDGE_FUNCTION_NAME = "pr116-admin-oidc-gateway";
const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";
const LOCAL_PUBLIC_SUPABASE_URL = "https://127.0.0.1:3443/__closeout_supabase";
const LOCAL_GATEWAY_URL = "http://127.0.0.1:3444/functions/v1/pr116-admin-oidc-gateway";
const LOCAL_WORKLOAD_SECRET_PATTERN = /^[a-f0-9]{64}$/;

export type Pr116AdminGatewayAction =
  | "application_status_update"
  | "application_internal_notes_update"
  | "support_action"
  | "knowledge_save"
  | "knowledge_promote"
  | "translation_save"
  | "translation_review"
  | "translation_publish";

export type Pr116AdminGatewayFailure =
  | "unconfigured"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "preview_forbidden"
  | "invalid_request"
  | "database_authentication_failed"
  | "database_function_missing"
  | "database_permission_rejected"
  | "database_contract_rejected"
  | "database_unavailable"
  | "gateway_unavailable"
  | "invalid_response";

export class Pr116AdminGatewayError extends Error {
  constructor(public readonly reason: Pr116AdminGatewayFailure) {
    super(`pr116_admin_gateway_${reason}`);
  }
}

type GatewayTarget = {
  url: string;
  workloadToken: string;
};

function normalizedSupabaseServerUrl() {
  return (process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
}

function hasLocalHarnessIntent() {
  return (
    process.env.CLOSEOUT_EXECUTION_MODE === "local-isolated" ||
    process.env.CLOSEOUT_STATEFUL === "true" ||
    Boolean(process.env.PR116_LOCAL_WORKLOAD_SECRET)
  );
}

function localHarnessTarget(): GatewayTarget | null {
  if (!hasLocalHarnessIntent()) return null;

  const exactLocalMode =
    process.env.CLOSEOUT_EXECUTION_MODE === "local-isolated" &&
    process.env.CLOSEOUT_STATEFUL === "true" &&
    !process.env.VERCEL_ENV &&
    process.env.CLOSEOUT_SUPABASE_URL === LOCAL_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL === LOCAL_PUBLIC_SUPABASE_URL;
  const secret = process.env.PR116_LOCAL_WORKLOAD_SECRET || "";

  if (!exactLocalMode || !LOCAL_WORKLOAD_SECRET_PATTERN.test(secret)) {
    throw new Pr116AdminGatewayError("unconfigured");
  }

  return { url: LOCAL_GATEWAY_URL, workloadToken: secret };
}

function gatewayTarget(): GatewayTarget {
  const local = localHarnessTarget();
  if (local) return local;

  const supabaseUrl = normalizedSupabaseServerUrl();
  const workloadToken = process.env.VERCEL_OIDC_TOKEN || "";
  if (!supabaseUrl || !workloadToken) throw new Pr116AdminGatewayError("unconfigured");
  return { url: `${supabaseUrl}/functions/v1/${EDGE_FUNCTION_NAME}`, workloadToken };
}

function safeFailureCode(value: unknown): Pr116AdminGatewayFailure | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const code = (value as { code?: unknown }).code;
  switch (code) {
    case "preview_forbidden":
    case "invalid_request":
    case "database_authentication_failed":
    case "database_function_missing":
    case "database_permission_rejected":
    case "database_contract_rejected":
    case "database_unavailable":
    case "gateway_unavailable":
      return code;
    default:
      return null;
  }
}

export async function callPr116AdminOidcGateway<T = Record<string, unknown>>(
  request: Request,
  userAccessToken: string,
  action: Pr116AdminGatewayAction | string,
  payload: Record<string, unknown>,
): Promise<T> {
  if (process.env.VERCEL_ENV === "preview") {
    throw new Pr116AdminGatewayError("preview_forbidden");
  }
  if (!action || !/^[a-z0-9_]{1,180}$/.test(action) || !userAccessToken) {
    throw new Pr116AdminGatewayError("invalid_request");
  }

  const target = gatewayTarget();
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = randomBytes(24).toString("base64url");
  const body = JSON.stringify(payload);
  const bodyDigest = createHash("sha256").update(body, "utf8").digest("hex");

  let response: Response;
  try {
    response = await fetch(target.url, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${target.workloadToken}`,
        "Content-Type": "application/json",
        "x-supabase-user-authorization": `Bearer ${userAccessToken}`,
      },
      body: JSON.stringify({ action, timestamp, nonce, body, bodyDigest }),
      signal: AbortSignal.timeout(7_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Pr116AdminGatewayError("timeout");
    }
    throw new Pr116AdminGatewayError("gateway_unavailable");
  }

  const data = (await response.json().catch(() => null)) as unknown;
  if (response.status === 401) throw new Pr116AdminGatewayError("unauthorized");
  if (response.status === 403) {
    const reason = safeFailureCode(data);
    throw new Pr116AdminGatewayError(reason === "preview_forbidden" ? "preview_forbidden" : "forbidden");
  }
  if (!response.ok) {
    throw new Pr116AdminGatewayError(
      safeFailureCode(data) || (response.status >= 500 ? "gateway_unavailable" : "invalid_response"),
    );
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Pr116AdminGatewayError("invalid_response");
  }
  return data as T;
}
