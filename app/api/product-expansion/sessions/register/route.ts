import "server-only";

import { createHmac } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { authorizeTenantRequest } from "@/lib/server/tenantAuthorization";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function parseUserAgent(value: string) {
  const platform = /android/i.test(value) ? "Android" : /iphone|ipad|ios/i.test(value) ? "iOS" : /windows/i.test(value) ? "Windows" : /macintosh|mac os/i.test(value) ? "macOS" : /linux/i.test(value) ? "Linux" : "Unknown";
  const browser = /edg\//i.test(value) ? "Edge" : /firefox\//i.test(value) ? "Firefox" : /chrome\//i.test(value) ? "Chrome" : /safari\//i.test(value) ? "Safari" : "Unknown";
  return { platform, browser, deviceLabel: `${platform} · ${browser}` };
}

export async function POST(request: NextRequest) {
  const access = await authorizeTenantRequest(request);
  if (!access.ok) return json(access.status, { ok: false, code: access.code });
  if (!access.user.sessionId) return json(403, { ok: false, code: "auth_session_unavailable" });

  const userAgent = (request.headers.get("user-agent") || "Unknown").slice(0, 500);
  const device = parseUserAgent(userAgent);
  const hashKey = process.env.SESSION_HASH_KEY || "";
  const forwarded = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ipHash = hashKey && forwarded ? createHmac("sha256", hashKey).update(forwarded).digest("hex") : null;
  const existing = await supabaseRestAsUser<unknown>(
    `/user_sessions?select=id,platform,browser,last_active_at,suspicious,revoked_at&tenant_id=eq.${access.tenantId}&user_id=eq.${access.user.id}&revoked_at=is.null&order=last_active_at.desc&limit=20`,
    access.user,
  );
  const known = Array.isArray(existing.data) ? existing.data.some((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const row = item as Record<string, unknown>;
    return row.platform === device.platform && row.browser === device.browser;
  }) : false;
  const suspicious = Array.isArray(existing.data) && existing.data.length > 0 && !known;
  const registered = await supabaseRestAsUser<unknown>("/rpc/register_platform_session", access.user, {
    method: "POST",
    body: JSON.stringify({
      p_tenant: access.tenantId,
      p_auth_session: access.user.sessionId,
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
