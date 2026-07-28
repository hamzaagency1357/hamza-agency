import "server-only";

import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 32_000;
const allowedTypes = new Set(["application", "service_request", "job_application", "contact", "ai_support"]);
const rpcByType: Record<string, string> = {
  application: "pr99_submit_application",
  service_request: "pr99_submit_service_request",
  job_application: "pr99_submit_job_application",
  contact: "pr99_submit_contact",
  ai_support: "pr99_submit_ai_support",
};

function genericFailure(status = 400) {
  return NextResponse.json({ ok: false, code: "try_again_later" }, { status });
}

function cleanIdentityValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

function getIdentity(payload: Record<string, unknown>, ipHash: string) {
  const phone = cleanIdentityValue(payload.whatsapp ?? payload.phone ?? payload.visitor_whatsapp);
  const email = cleanIdentityValue(payload.email ?? payload.visitor_email);
  return [phone, email, ipHash].filter(Boolean).join("|") || ipHash;
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_BODY_BYTES) return genericFailure(413);

  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return genericFailure(413);

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return genericFailure();
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) return genericFailure();
  const body = input as Record<string, unknown>;
  const type = typeof body.type === "string" ? body.type : "";
  const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
    ? (body.payload as Record<string, unknown>)
    : null;
  const startedAt = typeof body.startedAt === "string" ? body.startedAt : "";
  const honeypot = typeof body.honeypot === "string" ? body.honeypot : "";

  if (!allowedTypes.has(type) || !payload || !startedAt) return genericFailure();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return genericFailure(503);

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const ipHash = createHash("sha256").update(`${forwarded}|${userAgent}`).digest("hex");
  const identity = getIdentity(payload, ipHash);
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data, error } = await supabase.rpc(rpcByType[type], {
    p_payload: payload,
    p_identity: identity,
    p_started_at: startedAt,
    p_honeypot: honeypot,
  });

  if (error || !data || data.allowed !== true) return genericFailure(error ? 503 : 429);
  return NextResponse.json({
    ok: true,
    code: "ok",
    id: data.id,
    trackingCode: data.tracking_code,
  });
}
