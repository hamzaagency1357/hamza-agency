import "server-only";

import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") return noStore({ ok: false }, 404);

  const oidcToken = request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || "";
  if (!oidcToken) return noStore({ ok: false, code: "missing_runtime_oidc" }, 503);

  const origin = request.nextUrl.origin;
  const headers = {
    "Content-Type": "application/json",
    "x-vercel-oidc-token": oidcToken,
  };
  const startedAt = new Date(Date.now() - 5_000).toISOString();

  const calls = [
    ["application_status", "/api/application-status", { trackingCode: "APP-2026-FFFFFFFFFF" }],
    ["service_status", "/api/service-status", { requestCode: "SR-2026-FFFFFFFFFF" }],
    ["ai_support", "/api/ai-support", { question: "كيف أتابع طلبي؟" }],
    ["password_reset_guard", "/api/public-submit", { type: "password_reset", payload: { email: "runtime-check@example.invalid" }, startedAt, honeypot: "blocked-runtime-check" }],
    ["application_form_guard", "/api/public-submit", { type: "application", payload: {}, startedAt, honeypot: "blocked-runtime-check" }],
    ["service_form_guard", "/api/public-submit", { type: "service_request", payload: {}, startedAt, honeypot: "blocked-runtime-check" }],
    ["job_form_guard", "/api/public-submit", { type: "job_application", payload: {}, startedAt, honeypot: "blocked-runtime-check" }],
    ["contact_form_guard", "/api/public-submit", { type: "contact", payload: {}, startedAt, honeypot: "blocked-runtime-check" }],
    ["ai_form_guard", "/api/public-submit", { type: "ai_support", payload: {}, startedAt, honeypot: "blocked-runtime-check" }],
  ] as const;

  const results: Record<string, number> = {};
  for (const [name, path, body] of calls) {
    const response = await fetch(`${origin}${path}`, {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12_000),
    });
    results[name] = response.status;
  }

  const successfulLookups = results.application_status === 200 && results.service_status === 200;
  const successfulAi = results.ai_support === 200;
  const guardsRejectedFixtures = [
    results.password_reset_guard,
    results.application_form_guard,
    results.service_form_guard,
    results.job_form_guard,
    results.contact_form_guard,
    results.ai_form_guard,
  ].every((status) => status === 400 || status === 429);

  return noStore({
    ok: successfulLookups && successfulAi && guardsRejectedFixtures,
    environment: "preview",
    results,
  }, successfulLookups && successfulAi && guardsRejectedFixtures ? 200 : 503);
}
