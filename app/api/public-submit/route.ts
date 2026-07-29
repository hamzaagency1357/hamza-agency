import "server-only";

import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

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
const rpcByType: Record<string, string> = {
  application: "pr99_submit_application",
  service_request: "pr99_submit_service_request",
  job_application: "pr99_submit_job_application",
  contact: "pr99_submit_contact",
  ai_support: "pr99_submit_ai_support",
};

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
  try {
    input = JSON.parse(raw);
  } catch {
    return failure();
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) return failure();
  const body = input as Record<string, unknown>;
  const type = typeof body.type === "string" ? body.type : "";
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
    ? body.payload as Record<string, unknown>
    : null;
  const startedAt = typeof body.startedAt === "string" ? body.startedAt : "";
  const honeypot = typeof body.honeypot === "string" ? body.honeypot : "";
  if (!allowedTypes.has(type) || !payload || !startedAt) return failure();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return failure(503);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const ipHash = createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const pIdentity = identity(payload, ipHash);

  if (type === "password_reset") {
    const guard = await client.rpc("pr100_guard_password_reset", {
      p_identity: pIdentity,
      p_payload: payload,
      p_started_at: startedAt,
      p_honeypot: honeypot,
    });
    if (guard.error || !guard.data || guard.data.allowed !== true) {
      return failure(guard.error ? 503 : 429);
    }
    const email = clean(payload.email);
    if (!email || email.length > 254) return failure();
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/+$/, "");
    await client.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/admin/reset-password` });
    return NextResponse.json({ ok: true, code: "ok" }, { headers: { "Cache-Control": "no-store" } });
  }

  const rpc = rpcByType[type];
  if (!rpc) return failure();
  const { data, error } = await client.rpc(rpc, {
    p_payload: payload,
    p_identity: pIdentity,
    p_started_at: startedAt,
    p_honeypot: honeypot,
  });
  if (error || !data || data.allowed !== true) return failure(error ? 503 : 429);
  return NextResponse.json(
    { ok: true, code: "ok", id: data.id, trackingCode: data.tracking_code },
    { headers: { "Cache-Control": "no-store" } },
  );
}
