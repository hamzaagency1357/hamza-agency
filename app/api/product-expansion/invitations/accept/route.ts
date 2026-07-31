import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { hashInvitationToken, isValidRawInvitationToken } from "@/lib/productExpansion/invitationSecurity";
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

  let token: unknown;
  try {
    const input = await request.json() as unknown;
    token = input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>).token
      : null;
  } catch {
    return response(400, { ok: false, code: "invitation_accept_failed", correlation_id: correlationId });
  }

  if (!isValidRawInvitationToken(token)) {
    return response(400, { ok: false, code: "invitation_accept_failed", correlation_id: correlationId });
  }

  const tokenHash = hashInvitationToken(token.trim());
  token = null;

  const result = await supabaseRestAsUser<AcceptResult[]>("/rpc/accept_tenant_invitation", user, {
    method: "POST",
    body: JSON.stringify({ p_expected_tenant_id: tenant.tenantId, p_token_hash: tokenHash }),
  });
  const accepted = result.data?.[0];
  if (!result.ok || !accepted?.accepted || !accepted.membership_id || accepted.tenant_id !== tenant.tenantId) {
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
