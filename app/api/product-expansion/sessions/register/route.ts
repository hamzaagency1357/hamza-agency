import "server-only";

import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseRestAsUser, verifySupabaseBearer } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function firstRow(value: unknown): Record<string, unknown> | null {
  const row = Array.isArray(value) ? value[0] : null;
  return row && typeof row === "object" && !Array.isArray(row) ? row as Record<string, unknown> : null;
}

function jwtSessionId(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) as Record<string, unknown>;
    return typeof payload.session_id === "string" && /^[0-9a-f-]{36}$/i.test(payload.session_id) ? payload.session_id : null;
  } catch { return null; }
}

function parseUserAgent(value: string) {
  const platform = /android/i.test(value) ? "Android" : /iphone|ipad|ios/i.test(value) ? "iOS" : /windows/i.test(value) ? "Windows" : /macintosh|mac os/i.test(value) ? "macOS" : /linux/i.test(value) ? "Linux" : "Unknown";
  const browser = /edg\//i.test(value) ? "Edge" : /firefox\//i.test(value) ? "Firefox" : /chrome\//i.test(value) ? "Chrome" : /safari\//i.test(value) ? "Safari" : "Unknown";
  return { platform, browser, deviceLabel: `${platform} · ${browser}` };
}

export async function POST(request: NextRequest) {
  const user = await verifySupabaseBearer(request);
  if (!user) return json(401, { ok: false, code: "authentication_required" });
  const membership = firstRow((await supabaseRestAsUser<unknown>(
    `/tenant_memberships?select=tenant_id,role,status&user_id=eq.${user.id}&status=eq.active&limit=1`,
    user,
  )).data);
  const tenantId = typeof membership?.tenant_id === "string" ? membership.tenant_id : "";
  if (!tenantId) return json(403, { ok: false, code: "active_membership_required" });

  const userAgent = (request.headers.get("user-agent") || "Unknown").slice(0, 500);
  const device = parseUserAgent(userAgent);
  const hashKey = process.env.SESSION_HASH_KEY || "";
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ipHash = hashKey && forwarded ? createHmac("sha256", hashKey).update(forwarded).digest("hex") : null;
  const existing = await supabaseRestAsUser<unknown>(
    `/user_sessions?select=id,platform,browser,last_active_at,suspicious,revoked_at&tenant_id=eq.${tenantId}&user_id=eq.${user.id}&revoked_at=is.null&order=last_active_at.desc&limit=20`,
    user,
  );
  const known = Array.isArray(existing.data) ? existing.data.some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return row.platform === device.platform && row.browser === device.browser;
  }) : false;
  const suspicious = Array.isArray(existing.data) && existing.data.length > 0 && !known;
  const registered = await supabaseRestAsUser<unknown>("/rpc/register_platform_session", user, {
    method: "POST",
    body: JSON.stringify({
      p_tenant: tenantId,
      p_auth_session: jwtSessionId(user.accessToken),
      p_device_label: device.deviceLabel,
      p_platform: device.platform,
      p_browser: device.browser,
      p_ip_hash: ipHash,
      p_suspicious: suspicious,
    }),
  });
  if (!registered.ok) return json(registered.status || 503, { ok: false, code: "session_registration_failed" });
  return json(200, { ok: true, sessionId: registered.data, suspicious, ipStored: Boolean(ipHash) });
}
