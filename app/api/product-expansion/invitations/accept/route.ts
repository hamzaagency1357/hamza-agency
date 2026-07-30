import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveTenantForRequest } from "@/lib/server/tenantRuntime";
import { supabaseRestAsUser, verifySupabaseBearer } from "@/lib/server/supabaseUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AcceptResult = {
  accepted: boolean;
  membership_id: string | null;
  tenant_id: string | null;
  role: string | null;
  program_id: number | null;
  status: string | null;
};

function response(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}

function subjectHash(parts: string[]) {
  return createHash("sha256").update(parts.join("|"), "utf8").digest("hex");
}

function safeClientNetworkHash(request: Request, userId: string, tenantId: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return subjectHash([userId, tenantId, forwarded]);
}

function internalFailure(correlationId: string, detail: unknown) {
  console.error(JSON.stringify({
    level: "warn",
    event: "tenant_invitation_accept_rejected",
    correlation_id: correlationId,
    detail,
  }));
}

export async function POST(request: Request) {
  const correlationId = randomUUID();
  const user = await verifySupabaseBearer(request);
  if (!user) return response(401, { ok: false, code: "unauthenticated" });

  const tenant = await resolveTenantForRequest(request, user);
  if (!tenant.ok || !tenant.tenantId) {
    return response(400, { ok: false, code: "invitation_accept_failed", correlation_id: correlationId });
  }

  let token = "";
  try {
    const input = await request.json() as unknown;
    if (input && typeof input === "object" && !Array.isArray(input)) {
      const value = (input as Record<string, unknown>).token;
      token = typeof value === "string" ? value.trim() : "";
    }
  } catch {
    return response(400, { ok: false, code: "invitation_accept_failed", correlation_id: correlationId });
  }

  if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    return response(400, { ok: false, code: "invitation_accept_failed", correlation_id: correlationId });
  }

  const tokenHash = createHash("sha256").update(token, "utf8").digest("hex");
  token = "";

  const limit = await supabaseRestAsUser<boolean>("/rpc/consume_invitation_rate_limit", user, {
    method: "POST",
    body: JSON.stringify({
      p_tenant_id: tenant.tenantId,
      p_action: "accept",
      p_subject_hash: subjectHash([safeClientNetworkHash(request, user.id, tenant.tenantId), tokenHash]),
      p_limit: 12,
      p_window_seconds: 900,
    }),
  });

  if (!limit.ok || limit.data !== true) {
    return response(429, { ok: false, code: "invitation_accept_failed", correlation_id: correlationId });
  }

  const result = await supabaseRestAsUser<AcceptResult[]>("/rpc/accept_tenant_invitation", user, {
    method: "POST",
    body: JSON.stringify({ p_expected_tenant_id: tenant.tenantId, p_token_hash: tokenHash }),
  });
  const accepted = result.data?.[0];
  if (!result.ok || !accepted?.accepted || !accepted.membership_id) {
    internalFailure(correlationId, {
      database_status: result.status,
      accepted: accepted?.accepted === true,
      result_status: accepted?.status ?? null,
      tenant_id: tenant.tenantId,
      user_id: user.id,
    });
    return response(400, { ok: false, code: "invitation_accept_failed", correlation_id: correlationId });
  }

  return response(200, {
    ok: true,
    membership: {
      id: accepted.membership_id,
      tenant_id: accepted.tenant_id,
      role: accepted.role,
      program_id: accepted.program_id,
      status: accepted.status,
    },
  });
}
