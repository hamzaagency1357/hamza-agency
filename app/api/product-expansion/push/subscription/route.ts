import "server-only";

import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseRestAsUser, verifySupabaseBearer } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 12_000;

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function firstRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : null;
  return row && typeof row === "object" && !Array.isArray(row) ? row as Record<string, unknown> : null;
}

function encryptionKey(): Buffer | null {
  const configured = process.env.PUSH_SUBSCRIPTION_ENCRYPTION_KEY || "";
  if (!configured) return null;
  try {
    const decoded = Buffer.from(configured, "base64");
    return decoded.length === 32 ? decoded : null;
  } catch { return null; }
}

function encrypt(value: string, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export async function POST(request: NextRequest) {
  const user = await verifySupabaseBearer(request);
  if (!user) return json(401, { ok: false, code: "authentication_required" });
  const raw = await request.text();
  if (!raw || Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) return json(400, { ok: false, code: "invalid_request" });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return json(400, { ok: false, code: "invalid_request" }); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return json(400, { ok: false, code: "invalid_request" });
  const input = parsed as Record<string, unknown>;
  const action = input.action === "unsubscribe" ? "unsubscribe" : "subscribe";
  const subscription = input.subscription && typeof input.subscription === "object" && !Array.isArray(input.subscription) ? input.subscription as Record<string, unknown> : null;
  const endpoint = typeof subscription?.endpoint === "string" && subscription.endpoint.startsWith("https://") ? subscription.endpoint.slice(0, 4000) : "";
  const keys = subscription?.keys && typeof subscription.keys === "object" && !Array.isArray(subscription.keys) ? subscription.keys as Record<string, unknown> : {};
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh.slice(0, 1000) : "";
  const auth = typeof keys.auth === "string" ? keys.auth.slice(0, 1000) : "";
  if (!endpoint || (action === "subscribe" && (!p256dh || !auth))) return json(400, { ok: false, code: "invalid_subscription" });

  const membership = firstRow((await supabaseRestAsUser<unknown>(
    `/tenant_memberships?select=tenant_id,status&user_id=eq.${user.id}&status=eq.active&limit=1`,
    user,
  )).data);
  const tenantId = typeof membership?.tenant_id === "string" ? membership.tenant_id : "";
  if (!tenantId) return json(403, { ok: false, code: "active_membership_required" });
  const endpointHash = createHash("sha256").update(endpoint, "utf8").digest("hex");

  if (action === "unsubscribe") {
    const result = await supabaseRestAsUser<unknown>(
      `/push_subscriptions?tenant_id=eq.${tenantId}&user_id=eq.${user.id}&endpoint_hash=eq.${endpointHash}`,
      user,
      { method: "PATCH", body: JSON.stringify({ active: false, last_used_at: new Date().toISOString() }) },
    );
    return result.ok ? json(200, { ok: true, active: false }) : json(result.status, { ok: false, code: "unsubscribe_failed" });
  }

  const key = encryptionKey();
  if (!key) return json(503, { ok: false, code: "push_subscription_storage_disabled" });
  const result = await supabaseRestAsUser<unknown>(
    "/push_subscriptions?on_conflict=tenant_id,user_id,endpoint_hash",
    user,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        tenant_id: tenantId,
        user_id: user.id,
        endpoint_hash: endpointHash,
        endpoint_ciphertext: encrypt(endpoint, key),
        key_ciphertext: encrypt(p256dh, key),
        auth_ciphertext: encrypt(auth, key),
        active: true,
        last_used_at: new Date().toISOString(),
      }),
    },
  );
  return result.ok ? json(201, { ok: true, active: true, endpointHash }) : json(result.status, { ok: false, code: "subscription_store_failed" });
}
