import "server-only";

import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getServerTenantRuntime } from "@/lib/productExpansion/serverTenantRuntime";
import { callPr101OidcGateway } from "@/lib/server/pr101OidcGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function databaseHealth() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { status: "down" as const, latencyMs: null };
  const started = Date.now();
  try {
    const response = await fetch(`${url}/rest/v1/`, { method: "HEAD", cache: "no-store", headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(2500) });
    return { status: response.ok || response.status === 404 ? "healthy" as const : "degraded" as const, latencyMs: Date.now() - started };
  } catch { return { status: "down" as const, latencyMs: Date.now() - started }; }
}

export async function GET(request: NextRequest) {
  const correlationId = request.headers.get("x-correlation-id")?.slice(0, 100) || randomUUID();
  const [tenant, database] = await Promise.all([getServerTenantRuntime(), databaseHealth()]);
  const providers = {
    oidc: { status: process.env.VERCEL_OIDC_TOKEN || request.headers.get("x-vercel-oidc-token") ? "healthy" : "disabled" },
    payment: { status: process.env.PAYMENT_PROVIDER_MODE === "live" || process.env.PAYMENT_PROVIDER_MODE === "sandbox" ? "configured" : "disabled" },
    whatsapp: { status: process.env.WHATSAPP_PROVIDER_MODE === "live" || process.env.WHATSAPP_PROVIDER_MODE === "sandbox" ? "configured" : "disabled" },
    ai: { status: process.env.AI_PROVIDER_MODE === "live" || process.env.AI_PROVIDER_MODE === "sandbox" ? "configured" : "rules_fallback" },
    push: { status: process.env.PUSH_PROVIDER_MODE === "live" || process.env.PUSH_PROVIDER_MODE === "sandbox" ? "configured" : "disabled" },
  };
  const overall = database.status === "down" ? "down" : database.status === "degraded" ? "degraded" : "healthy";
  const hostname = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "hamza-agency.com").split(",")[0].trim().toLowerCase();
  if (tenant.id) {
    void callPr101OidcGateway(request, "provider_health_record", { tenantId: tenant.id, hostname, providerType: "database", providerKey: "supabase", status: database.status, latencyMs: database.latencyMs, detail: { correlationId } }).catch(() => undefined);
  }
  return NextResponse.json({ ok: overall !== "down", status: overall, tenant: tenant.slug, database, providers, correlationId, checkedAt: new Date().toISOString() }, { status: overall === "down" ? 503 : 200, headers: { "Cache-Control": "no-store", "X-Correlation-Id": correlationId } });
}
