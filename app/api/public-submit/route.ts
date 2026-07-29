import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { callSignedGateway } from "@/lib/server/pr100SignedGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_000;
const allowedTypes = new Set([
  "application",
  "service_request",
  "job_application",
  "contact",
  "ai_support",
  "password_reset",
]);
const actionByType: Record<string, string> = {
  application: "application_submit",
  service_request: "service_request_submit",
  job_application: "job_application_submit",
  contact: "contact_submit",
  ai_support: "ai_support_submit",
  password_reset: "password_reset_guard",
};

type GatewayResult = { allowed?: boolean; code?: string; id?: string | number; tracking_code?: string };

function failure(status = 400) {
  return NextResponse.json(
    { ok: false, code: "try_again_later" },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

function identity(payload: Record<string, unknown>, ipHash: string) {
  const phone = clean(payload.whatsapp ?? payload.phone ?? payload.visitor_whatsapp);
  const email = clean(payload.email ?? payload.visitor_email);
  return [phone, email, ipHash].filter(Boolean).join("|") || ipHash;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) return failure(413);

  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return failure(413);

  let input: unknown;
  try { input = JSON.parse(raw); } catch { return failure(); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return failure();

  const body = input as Record<string, unknown>;
  const type = typeof body.type === "string" ? body.type : "";
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
    ? body.payload as Record<string, unknown>
    : null;
  const startedAt = typeof body.startedAt === "string" ? body.startedAt : "";
  const honeypot = typeof body.honeypot === "string" ? body.honeypot : "";
  if (!allowedTypes.has(type) || !payload || !startedAt) return failure();

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const ipHash = createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex");
  const pIdentity = identity(payload, ipHash);
  const action = actionByType[type];
  if (!action) return failure();

  let result: GatewayResult;
  try {
    result = await callSignedGateway<GatewayResult>(action, {
      payload,
      identity: pIdentity,
      startedAt,
      honeypot,
    });
  } catch { return failure(503); }

  if (!result?.allowed) return failure(result?.code === "rate_limited" ? 429 : 400);

  if (type === "password_reset") {
    const email = clean(payload.email);
    if (!email || email.length > 254) return failure();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return failure(503);
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/+$/, "");
    await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/admin/reset-password` });
    return NextResponse.json({ ok: true, code: "ok" }, { headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
    { ok: true, code: "ok", id: result.id, trackingCode: result.tracking_code },
    { headers: { "Cache-Control": "no-store" } },
  );
}
