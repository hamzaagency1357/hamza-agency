import "server-only";

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { callOidcGateway } from "@/lib/server/pr100SignedGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;

type ServiceRequestRecord = {
  id: number;
  request_code: string | null;
  service_type: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type LookupResult = { allowed?: boolean; code?: string; found?: boolean; record?: ServiceRequestRecord | null };

function failure(status: number) {
  return NextResponse.json(
    { ok: false, code: status === 429 ? "rate_limited" : "try_again_later" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function normalizeRequestCode(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 32) : "";
}

function fingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent")?.slice(0, 320) || "unknown";
  return createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex");
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
  } catch { return failure(400); }

  const requestCode = normalizeRequestCode(body.requestCode);
  if (requestCode.length < 8) return failure(400);

  try {
    const result = await callOidcGateway<LookupResult>(request, "service_lookup", {
      requestCode,
      requestFingerprint: fingerprint(request),
    });
    if (!result?.allowed) return failure(result?.code === "rate_limited" ? 429 : 400);
    return NextResponse.json(
      { ok: true, record: result.found ? result.record || null : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch { return failure(503); }
}
