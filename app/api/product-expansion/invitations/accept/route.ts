import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseRestAsUser, verifySupabaseBearer } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await verifySupabaseBearer(request);
  if (!user) return response(401, { ok: false, code: "unauthenticated" });
  let token = "";
  try {
    const input = await request.json() as unknown;
    if (input && typeof input === "object" && !Array.isArray(input)) {
      const value = (input as Record<string, unknown>).token;
      token = typeof value === "string" ? value.trim() : "";
    }
  } catch {
    return response(400, { ok: false, code: "invalid_json" });
  }
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) return response(400, { ok: false, code: "invalid_token" });
  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  const result = await supabaseRestAsUser<Array<Record<string, unknown>>>("/rpc/accept_tenant_invitation", user, {
    method: "POST",
    body: JSON.stringify({ p_token_hash: tokenHash }),
  });
  if (!result.ok) return response(result.status, { ok: false, code: "invitation_accept_failed", detail: result.data });
  return response(200, { ok: true, membership: result.data?.[0] ?? null });
}
