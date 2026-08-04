import "server-only";

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { callPr101OidcGateway } from "@/lib/server/pr101OidcGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return response(413, { ok: false, code: "payload_too_large" });
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return response(400, { ok: false, code: "invalid_request" });
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return response(400, { ok: false, code: "invalid_request" }); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return response(400, { ok: false, code: "invalid_request" });
  const input = value as Record<string, unknown>;
  const anonymousId = typeof input.anonymousId === "string" && /^[0-9a-f-]{36}$/i.test(input.anonymousId) ? input.anonymousId : "";
  const consentVersion = typeof input.consentVersion === "string" ? input.consentVersion.slice(0, 50) : "";
  if (!anonymousId || !consentVersion) return response(400, { ok: false, code: "invalid_request" });
  const hostname = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "hamza-agency.com").split(",")[0].trim().toLowerCase();
  const fingerprint = createHash("sha256")
    .update(`${request.headers.get("user-agent") || "unknown"}|${anonymousId}`, "utf8")
    .digest("hex");
  try {
    const result = await callPr101OidcGateway<{ allowed?: boolean; id?: string }>(request, "consent_record", {
      hostname,
      anonymousId,
      consentVersion,
      necessary: true,
      analytics: input.analytics === true,
      preferences: input.preferences === true,
      marketing: input.marketing === true,
      withdrawn: input.withdrawn === true,
      region: typeof input.region === "string" ? input.region.slice(0, 40) : "unknown",
      fingerprint,
    });
    return result.allowed === true
      ? response(201, { ok: true, id: result.id ?? null })
      : response(400, { ok: false, code: "consent_rejected" });
  } catch {
    // Browser-side consent remains effective even when durable audit storage is temporarily unavailable.
    return response(202, { ok: true, durable: false });
  }
}
