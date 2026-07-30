import "server-only";

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { callOidcGateway } from "@/lib/server/pr100SignedGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 1024;
const actions: Record<string, string> = {
  APP: "application_lookup",
  SR: "service_lookup",
  JOB: "job_lookup",
  CNT: "contact_lookup",
};
const patterns: Record<string, RegExp> = {
  APP: /^APP-[0-9]{4}-[A-F0-9]{10}$/,
  SR: /^SR-[0-9]{4}-[A-F0-9]{10}$/,
  JOB: /^JOB-[0-9]{4}-[A-F0-9]{10}$/,
  CNT: /^CNT-[0-9]{4}-[A-F0-9]{10}$/,
};

function fail(status: number, code = "try_again_later") {
  return NextResponse.json({ ok: false, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return fail(413);
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return fail(413);

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return fail(400, "invalid_request"); }
  const input = parsed as { code?: unknown };
  const code = typeof input.code === "string" ? input.code.toUpperCase().replace(/\s+/g, "").slice(0, 40) : "";
  const prefix = code.split("-", 1)[0];
  const action = actions[prefix];
  if (!action || !patterns[prefix]?.test(code)) return fail(400, "invalid_request");

  const fingerprint = createHash("sha256")
    .update(`${request.headers.get("x-forwarded-for") || "unknown"}|${request.headers.get("user-agent") || "unknown"}`, "utf8")
    .digest("hex");
  const body = prefix === "SR"
    ? { requestCode: code, requestFingerprint: fingerprint }
    : { trackingCode: code, requestFingerprint: fingerprint };

  try {
    const result = await callOidcGateway<Record<string, unknown>>(request, action, body);
    if (result.allowed !== true) {
      return result.code === "rate_limited" ? fail(429, "rate_limited") : fail(400, "invalid_request");
    }
    return NextResponse.json(
      { ok: true, found: result.found === true, record: result.record || null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return fail(503);
  }
}
