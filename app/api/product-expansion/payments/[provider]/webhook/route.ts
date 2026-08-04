import "server-only";

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { verifySignedWebhook } from "@/lib/productExpansion/providerAdapters";
import { callPr101OidcGateway } from "@/lib/server/pr101OidcGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 64_000;
const forbiddenPaymentData = /"(?:card_number|cardNumber|pan|cvv|cvc|track_data|magstripe)"\s*:/i;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const configuredProvider = process.env.PAYMENT_PROVIDER_KEY || "";
  const mode = process.env.PAYMENT_PROVIDER_MODE || "disabled";
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "";
  if (!configuredProvider || provider !== configuredProvider || !["sandbox", "live"].includes(mode) || !secret) {
    return json(503, { ok: false, code: "payment_provider_disabled" });
  }
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, code: "payload_too_large" });
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES || forbiddenPaymentData.test(raw)) return json(400, { ok: false, code: "unsafe_payload_rejected" });
  const signature = request.headers.get("x-ha-signature") || request.headers.get("x-webhook-signature") || "";
  if (!verifySignedWebhook(raw, signature, secret)) return json(401, { ok: false, code: "invalid_signature" });
  const eventId = (request.headers.get("x-event-id") || request.headers.get("idempotency-key") || "").trim().slice(0, 200);
  if (!eventId) return json(400, { ok: false, code: "event_id_required" });
  const payloadDigest = createHash("sha256").update(raw, "utf8").digest("hex");
  const hostname = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "hamza-agency.com").split(",")[0].trim().toLowerCase();
  try {
    const result = await callPr101OidcGateway<{ allowed?: boolean; duplicate?: boolean; id?: string }>(request, "payment_webhook_record", { hostname, providerKey: provider.slice(0, 80), eventId, payloadDigest, mode });
    return result.allowed === true
      ? json(202, { ok: true, accepted: true, duplicate: result.duplicate === true, eventId })
      : json(400, { ok: false, code: "webhook_record_rejected" });
  } catch {
    return json(503, { ok: false, code: "payment_gateway_unavailable" });
  }
}
