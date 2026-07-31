import "server-only";

export type VerifiedSupabaseUser = {
  id: string;
  email: string | null;
  accessToken: string;
  sessionId: string | null;
};

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function verifiedSessionId(accessToken: string): string | null {
  try {
    const parts = accessToken.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<string, unknown>;
    return isUuid(payload.session_id) ? payload.session_id : null;
  } catch {
    return null;
  }
}

export function supabaseServerUrl(): string | null {
  const value = process.env.SUPABASE_SERVER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  return value ? value.replace(/\/+$/, "") : null;
}

export async function verifySupabaseBearer(request: Request): Promise<VerifiedSupabaseUser | null> {
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const url = supabaseServerUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!accessToken || !url || !key) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      cache: "no-store",
      headers: { apikey: key, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    const value = await response.json() as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const row = value as Record<string, unknown>;
    if (typeof row.id !== "string") return null;
    return {
      id: row.id,
      email: typeof row.email === "string" ? row.email : null,
      accessToken,
      sessionId: verifiedSessionId(accessToken),
    };
  } catch {
    return null;
  }
}

export async function supabaseRestAsUser<T>(path: string, user: VerifiedSupabaseUser, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null }> {
  const url = supabaseServerUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !path.startsWith("/")) return { ok: false, status: 503, data: null };
  try {
    const response = await fetch(`${url}/rest/v1${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${user.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        ...(init?.headers || {}),
      },
      signal: AbortSignal.timeout(5000),
    });
    const text = await response.text();
    let data: T | null = null;
    if (text) {
      try { data = JSON.parse(text) as T; } catch { data = null; }
    }
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 503, data: null };
  }
}
