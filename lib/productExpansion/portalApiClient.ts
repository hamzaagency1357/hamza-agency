import type { PortalRole } from "@/lib/productExpansion/domain";

type PortalClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { access_token: string } | null } }>;
  };
};

const sessionKey = "hamza_portal_platform_session";

async function token(client: PortalClient) {
  return (await client.auth.getSession()).data.session?.access_token || "";
}

export async function ensurePortalPlatformSession(client: PortalClient): Promise<string | null> {
  if (typeof window !== "undefined") {
    const existing = window.sessionStorage.getItem(sessionKey);
    if (existing) return existing;
  }
  const accessToken = await token(client);
  if (!accessToken) return null;
  const response = await fetch("/api/product-expansion/sessions/register", {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
  if (!response?.ok) return null;
  const body = await response.json().catch(() => null) as { sessionId?: unknown } | null;
  const id = typeof body?.sessionId === "string" ? body.sessionId : null;
  if (id && typeof window !== "undefined") window.sessionStorage.setItem(sessionKey, id);
  return id;
}

export async function portalApi<T>(
  client: PortalClient,
  role: PortalRole,
  section: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; code: string | null }> {
  const accessToken = await token(client);
  if (!accessToken) return { ok: false, status: 401, data: null, code: "authentication_required" };
  const platformSessionId = await ensurePortalPlatformSession(client);
  const response = await fetch(`/api/product-expansion/portal?role=${encodeURIComponent(role)}&section=${encodeURIComponent(section)}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(platformSessionId ? { "x-platform-session-id": platformSessionId } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  }).catch(() => null);
  if (!response) return { ok: false, status: 503, data: null, code: "authorization_unavailable" };
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  return {
    ok: response.ok && body?.ok === true,
    status: response.status,
    data: response.ok ? body as T : null,
    code: typeof body?.code === "string" ? body.code : null,
  };
}

export function clearPortalPlatformSession() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(sessionKey);
}
