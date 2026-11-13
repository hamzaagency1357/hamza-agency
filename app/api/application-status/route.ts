import "server-only";

import { trustedClientFingerprint } from "@/lib/server/pr160TrustedFingerprint";
import { NextResponse, type NextRequest } from "next/server";
import { callOidcGateway } from "@/lib/server/pr100SignedGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const TRACKING_CODE_PATTERN = /^APP-[0-9]{4}-[A-F0-9]{10}$/;

type ApplicationRecord = {
  tracking_code: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
};

type LookupResult = {
  allowed?: boolean;
  code?: string;
  found?: boolean;
  record?: ApplicationRecord | null;
};

function failure(status: number) {
  return NextResponse.json(
    { ok: false, code: status === 429 ? "rate_limited" : "try_again_later" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function normalizeTrackingCode(value: unknown) {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 32)
    : "";
}


export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) return failure(413);

  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return failure(413);

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return failure(400);
    body = parsed as Record<string, unknown>;
  } catch {
    return failure(400);
  }

  const trackingCode = normalizeTrackingCode(body.trackingCode);
  if (!TRACKING_CODE_PATTERN.test(trackingCode)) return failure(400);

  try {
    const result = await callOidcGateway<LookupResult>(request, "application_lookup", {
      trackingCode,
      requestFingerprint: trustedClientFingerprint(request),
    });
    if (!result?.allowed) return failure(result?.code === "rate_limited" ? 429 : 400);

    return NextResponse.json(
      { ok: true, record: result.found ? result.record || null : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return failure(503);
  }
}
