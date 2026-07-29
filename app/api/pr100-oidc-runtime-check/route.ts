import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { callOidcGateway } from "@/lib/server/pr100SignedGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GatewayResult = { allowed?: boolean; code?: string; found?: boolean };

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "preview") return noStore({ ok: false }, 404);

  const startedAt = new Date(Date.now() - 5_000).toISOString();
  const identity = "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";
  const calls = [
    ["application_status", "application_lookup", { trackingCode: "APP-2026-FFFFFFFFFF", requestFingerprint: identity }, true],
    ["service_status", "service_lookup", { requestCode: "SR-2026-FFFFFFFFFF", requestFingerprint: identity }, true],
    ["ai_support", "ai_guard", { identity, payload: { question: "كيف أتابع طلبي؟" } }, true],
    ["password_reset_guard", "password_reset_guard", { identity, payload: { email: "runtime-check@example.invalid" }, startedAt, honeypot: "blocked-runtime-check" }, false],
    ["application_form_guard", "application_submit", { identity, payload: {}, startedAt, honeypot: "blocked-runtime-check" }, false],
    ["service_form_guard", "service_request_submit", { identity, payload: {}, startedAt, honeypot: "blocked-runtime-check" }, false],
    ["job_form_guard", "job_application_submit", { identity, payload: {}, startedAt, honeypot: "blocked-runtime-check" }, false],
    ["contact_form_guard", "contact_submit", { identity, payload: {}, startedAt, honeypot: "blocked-runtime-check" }, false],
    ["ai_form_guard", "ai_support_submit", { identity, payload: {}, startedAt, honeypot: "blocked-runtime-check" }, false],
  ] as const;

  const results: Record<string, { allowed: boolean; code: string; found?: boolean }> = {};
  let ok = true;

  for (const [name, action, body, expectedAllowed] of calls) {
    try {
      const result = await callOidcGateway<GatewayResult>(request, action, body);
      const allowed = result?.allowed === true;
      results[name] = {
        allowed,
        code: typeof result?.code === "string" ? result.code : "unknown",
        ...(typeof result?.found === "boolean" ? { found: result.found } : {}),
      };
      if (allowed !== expectedAllowed) ok = false;
    } catch {
      results[name] = { allowed: false, code: "gateway_error" };
      ok = false;
    }
  }

  return noStore({ ok, environment: "preview", results }, ok ? 200 : 503);
}
