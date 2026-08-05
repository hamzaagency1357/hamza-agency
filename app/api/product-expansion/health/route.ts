import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getServerTenantRuntime } from "@/lib/productExpansion/serverTenantRuntime";
import { classifyOidcFailure, computeOverallHealth, passiveProviderStatus } from "@/lib/server/productExpansionHealthStatus.mjs";
import {
  callPr101OidcGateway,
  Pr101OidcGatewayError,
  type Pr101OidcGatewayFailure,
} from "@/lib/server/pr101OidcGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderStatus = "healthy" | "degraded" | "unavailable" | "disabled";

async function databaseHealth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { status: "unavailable" as const, latencyMs: null, reason: "unconfigured" };
  const started = Date.now();
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      cache: "no-store",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2_500),
    });
    return response.ok || response.status === 404
      ? { status: "healthy" as const, latencyMs: Date.now() - started }
      : { status: "degraded" as const, latencyMs: Date.now() - started, reason: "data_api_rejected" };
  } catch {
    return { status: "unavailable" as const, latencyMs: Date.now() - started, reason: "connection_failed" };
  }
}

function safeOidcReason(reason: Pr101OidcGatewayFailure) {
  return reason;
}

async function oidcHealth(request: NextRequest) {
  const started = Date.now();
  try {
    const result = await callPr101OidcGateway<{ ok?: boolean; status?: string; reason?: string }>(request, "health_probe", {});
    if (result.ok === true && result.status === "healthy") {
      return { status: "healthy" as const, latencyMs: Date.now() - started };
    }
    return {
      status: "degraded" as const,
      latencyMs: Date.now() - started,
      reason: typeof result.reason === "string" ? result.reason : "database_contract_rejected",
    };
  } catch (error) {
    const reason = error instanceof Pr101OidcGatewayError ? safeOidcReason(error.reason) : "gateway_unavailable";
    const status = classifyOidcFailure(reason) as ProviderStatus;
    return { status, latencyMs: Date.now() - started, reason };
  }
}

export async function GET(request: NextRequest) {
  const correlationId = request.headers.get("x-correlation-id")?.slice(0, 100) || randomUUID();
  const [tenant, database, oidc] = await Promise.all([
    getServerTenantRuntime(),
    databaseHealth(),
    oidcHealth(request),
  ]);

  const providers = {
    oidc,
    payment: { status: passiveProviderStatus(process.env.PAYMENT_PROVIDER_MODE, "unverified") },
    whatsapp: { status: passiveProviderStatus(process.env.WHATSAPP_PROVIDER_MODE, "unverified") },
    ai: { status: passiveProviderStatus(process.env.AI_PROVIDER_MODE, "rules_fallback") },
    push: { status: passiveProviderStatus(process.env.PUSH_PROVIDER_MODE, "unverified") },
  };

  const overall = computeOverallHealth(database.status, oidc.status);

  return NextResponse.json(
    {
      ok: overall !== "unavailable",
      status: overall,
      tenant: tenant.slug,
      database,
      providers,
      correlationId,
      checkedAt: new Date().toISOString(),
    },
    {
      status: overall === "unavailable" ? 503 : 200,
      headers: { "Cache-Control": "no-store", "X-Correlation-Id": correlationId },
    }
  );
}
