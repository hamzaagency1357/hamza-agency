import "server-only";

import { NextResponse } from "next/server";
import { authorizeTenantRequest, type TenantAuthorizationRole } from "@/lib/server/tenantAuthorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = new Set<TenantAuthorizationRole>([
  "creator",
  "client",
  "employee",
  "partner",
  "tenant_admin",
  "super_admin",
]);

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedRole = url.searchParams.get("role") as TenantAuthorizationRole | null;
  if (requestedRole && !roles.has(requestedRole)) {
    return json(400, { ok: false, code: "invalid_role" });
  }

  const access = await authorizeTenantRequest(request, {
    allowedRoles: requestedRole ? [requestedRole] : undefined,
  });
  if (!access.ok) return json(access.status, { ok: false, code: access.code });

  return json(200, {
    ok: true,
    tenant_id: access.tenantId,
    hostname: access.hostname,
    membership: {
      id: access.membership.id,
      role: access.membership.role,
      status: access.membership.status,
      program_id: access.membership.program_id,
      permissions: access.membership.permissions,
      mfa_required: access.membership.mfa_required,
    },
    platform_session_id: access.platformSessionId,
  });
}
