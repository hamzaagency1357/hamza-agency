import type { PortalRole } from "@/lib/productExpansion/domain";

type PortalAccessClient = {
  auth: {
    getSession: () => Promise<{
      data: {
        session: {
          access_token: string;
          user: { email?: string | null };
        } | null;
      };
    }>;
  };
};

export type PortalAccessResult =
  | {
      ok: true;
      role: PortalRole | "tenant_admin" | "super_admin";
      tenantId: string;
      membershipId: string;
      platformSessionId: string | null;
      email: string;
    }
  | {
      ok: false;
      status: number;
      code: string;
    };

const portalRoles = new Set<PortalRole>(["creator", "client", "employee", "partner"]);

export function isPortalRole(value: unknown): value is PortalRole {
  return typeof value === "string" && portalRoles.has(value as PortalRole);
}

export async function fetchPortalAccess(
  client: PortalAccessClient,
  requestedRole?: PortalRole,
): Promise<PortalAccessResult> {
  const { data } = await client.auth.getSession();
  const session = data.session;
  if (!session?.access_token) return { ok: false, status: 401, code: "authentication_required" };

  const query = requestedRole ? `?role=${encodeURIComponent(requestedRole)}` : "";
  let response: Response;
  try {
    response = await fetch(`/api/product-expansion/tenant-access${query}`, {
      method: "GET",
      cache: "no-store",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
  } catch {
    return { ok: false, status: 503, code: "authorization_unavailable" };
  }

  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || body?.ok !== true) {
    return {
      ok: false,
      status: response.status,
      code: typeof body?.code === "string" ? body.code : "authorization_unavailable",
    };
  }

  const membership = body.membership as Record<string, unknown> | undefined;
  const role = membership?.role;
  if (!(isPortalRole(role) || role === "tenant_admin" || role === "super_admin")) {
    return { ok: false, status: 403, code: "role_not_allowed" };
  }
  if (typeof body.tenant_id !== "string" || typeof membership?.id !== "string") {
    return { ok: false, status: 503, code: "authorization_unavailable" };
  }

  return {
    ok: true,
    role,
    tenantId: body.tenant_id,
    membershipId: membership.id,
    platformSessionId: typeof body.platform_session_id === "string" ? body.platform_session_id : null,
    email: session.user.email || "",
  };
}
