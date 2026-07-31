import "server-only";

import { resolveTenantForRequest } from "@/lib/server/tenantRuntime";
import {
  supabaseRestAsUser,
  verifySupabaseBearer,
  type VerifiedSupabaseUser,
} from "@/lib/server/supabaseUser";

export type TenantAuthorizationRole =
  | "creator"
  | "client"
  | "employee"
  | "partner"
  | "tenant_admin"
  | "super_admin";

export type ActiveTenantMembership = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantAuthorizationRole;
  status: "active";
  program_id: number | null;
  permissions: Record<string, boolean>;
  mfa_required: boolean;
};

export type AuthorizedTenantRequest = {
  ok: true;
  user: VerifiedSupabaseUser;
  tenantId: string;
  hostname: string;
  membership: ActiveTenantMembership;
  platformSessionId: string | null;
};

export type RejectedTenantRequest = {
  ok: false;
  status: 401 | 403 | 503;
  code:
    | "authentication_required"
    | "tenant_not_found"
    | "active_membership_required"
    | "role_not_allowed"
    | "platform_session_invalid"
    | "authorization_unavailable";
};

export type TenantAuthorizationResult = AuthorizedTenantRequest | RejectedTenantRequest;

type AuthorizationOptions = {
  allowedRoles?: readonly TenantAuthorizationRole[];
  requirePlatformSession?: boolean;
};

type MembershipRow = {
  id?: unknown;
  tenant_id?: unknown;
  user_id?: unknown;
  role?: unknown;
  status?: unknown;
  program_id?: unknown;
  permissions?: unknown;
  mfa_required?: unknown;
};

type SessionRow = {
  id?: unknown;
  tenant_id?: unknown;
  user_id?: unknown;
  revoked_at?: unknown;
};

function firstObject<T extends Record<string, unknown>>(value: unknown): T | null {
  const item = Array.isArray(value) ? value[0] : null;
  return item && typeof item === "object" && !Array.isArray(item) ? item as T : null;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isRole(value: unknown): value is TenantAuthorizationRole {
  return value === "creator"
    || value === "client"
    || value === "employee"
    || value === "partner"
    || value === "tenant_admin"
    || value === "super_admin";
}

function normalizePermissions(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string, boolean> = {};
  for (const [key, permission] of Object.entries(value)) {
    if (typeof permission === "boolean") output[key] = permission;
  }
  return output;
}

function platformSessionIdFromRequest(request: Request): string | null {
  const value = request.headers.get("x-platform-session-id")?.trim() || "";
  return isUuid(value) ? value : null;
}

export async function authorizeTenantRequest(
  request: Request,
  options: AuthorizationOptions = {},
): Promise<TenantAuthorizationResult> {
  const user = await verifySupabaseBearer(request);
  if (!user) return { ok: false, status: 401, code: "authentication_required" };

  const tenant = await resolveTenantForRequest(request, user);
  if (!tenant.ok || !tenant.tenantId) {
    return {
      ok: false,
      status: tenant.status === 503 ? 503 : 403,
      code: tenant.status === 503 ? "authorization_unavailable" : "tenant_not_found",
    };
  }

  const membershipResult = await supabaseRestAsUser<MembershipRow[]>(
    `/tenant_memberships?select=id,tenant_id,user_id,role,status,program_id,permissions,mfa_required`
      + `&tenant_id=eq.${encodeURIComponent(tenant.tenantId)}`
      + `&user_id=eq.${encodeURIComponent(user.id)}`
      + "&status=eq.active&limit=1",
    user,
  );

  if (!membershipResult.ok) {
    return {
      ok: false,
      status: membershipResult.status >= 500 ? 503 : 403,
      code: membershipResult.status >= 500 ? "authorization_unavailable" : "active_membership_required",
    };
  }

  const row = firstObject<MembershipRow>(membershipResult.data);
  if (
    !row
    || !isUuid(row.id)
    || row.tenant_id !== tenant.tenantId
    || row.user_id !== user.id
    || row.status !== "active"
    || !isRole(row.role)
  ) {
    return { ok: false, status: 403, code: "active_membership_required" };
  }

  if (options.allowedRoles && !options.allowedRoles.includes(row.role)) {
    return { ok: false, status: 403, code: "role_not_allowed" };
  }

  const platformSessionId = platformSessionIdFromRequest(request);
  if (options.requirePlatformSession && !platformSessionId) {
    return { ok: false, status: 403, code: "platform_session_invalid" };
  }

  if (platformSessionId) {
    const sessionResult = await supabaseRestAsUser<SessionRow[]>(
      `/user_sessions?select=id,tenant_id,user_id,revoked_at`
        + `&id=eq.${encodeURIComponent(platformSessionId)}`
        + `&tenant_id=eq.${encodeURIComponent(tenant.tenantId)}`
        + `&user_id=eq.${encodeURIComponent(user.id)}`
        + "&revoked_at=is.null&limit=1",
      user,
    );
    const session = firstObject<SessionRow>(sessionResult.data);
    if (
      !sessionResult.ok
      || !session
      || session.id !== platformSessionId
      || session.tenant_id !== tenant.tenantId
      || session.user_id !== user.id
      || session.revoked_at !== null
    ) {
      return { ok: false, status: 403, code: "platform_session_invalid" };
    }
  }

  return {
    ok: true,
    user,
    tenantId: tenant.tenantId,
    hostname: tenant.hostname,
    membership: {
      id: row.id,
      tenant_id: tenant.tenantId,
      user_id: user.id,
      role: row.role,
      status: "active",
      program_id: typeof row.program_id === "number" ? row.program_id : null,
      permissions: normalizePermissions(row.permissions),
      mfa_required: row.mfa_required === true,
    },
    platformSessionId,
  };
}
