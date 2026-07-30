import "server-only";

export type VerifiedSupabaseUser = {
  id: string;
  email: string | null;
  accessToken: string;
};

export async function verifySupabaseBearer(request: Request): Promise<VerifiedSupabaseUser | null> {
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
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
    return { id: row.id, email: typeof row.email === "string" ? row.email : null, accessToken };
  } catch {
    return null;
  }
}

export async function supabaseRestAsUser<T>(path: string, user: VerifiedSupabaseUser, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
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
