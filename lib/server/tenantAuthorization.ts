import "server-only";

import { trustedRequestHostname } from "@/lib/server/tenantRuntime";
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

export type VerifiedTenantIdentity = {
  ok: true;
  user: VerifiedSupabaseUser;
  tenantId: string;
  hostname: string;
};

export type AuthorizedTenantRequest = VerifiedTenantIdentity & {
  membership: ActiveTenantMembership;
  platformSessionId: string | null;
};

export type TenantAuthorizationCode =
  | "authentication_required"
  | "tenant_not_found"
  | "membership_pending"
  | "membership_suspended"
  | "membership_revoked"
  | "active_membership_required"
  | "account_suspended"
  | "account_disabled"
  | "role_not_allowed"
  | "platform_session_invalid"
  | "authorization_unavailable";

export type RejectedTenantRequest = {
  ok: false;
  status: 401 | 403 | 503;
  code: TenantAuthorizationCode;
};

export type TenantIdentityResult = VerifiedTenantIdentity | RejectedTenantRequest;
export type TenantAuthorizationResult = AuthorizedTenantRequest | RejectedTenantRequest;

type AuthorizationOptions = {
  allowedRoles?: readonly TenantAuthorizationRole[];
  requirePlatformSession?: boolean;
};

type TenantRuntimeRow = { id?: unknown };
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
type ProfileRow = { status?: unknown };
type SessionRow = {
  id?: unknown;
  tenant_id?: unknown;
  user_id?: unknown;
  auth_session_id?: unknown;
  revoked_at?: unknown;
};

function firstObject<T extends Record<string, unknown>>(value: unknown): T | null {
  const item = Array.isArray(value) ? value[0] : value;
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

function membershipCode(status: unknown): TenantAuthorizationCode {
  if (status === "invited") return "membership_pending";
  if (status === "suspended") return "membership_suspended";
  if (status === "revoked") return "membership_revoked";
  return "active_membership_required";
}

async function resolveExactTenantId(hostname: string): Promise<string | null | undefined> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return undefined;
  try {
    const response = await fetch(`${url}/rest/v1/rpc/resolve_public_tenant_runtime`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_hostname: hostname }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return undefined;
    const row = firstObject<TenantRuntimeRow>(await response.json() as unknown);
    return row && isUuid(row.id) ? row.id : null;
  } catch {
    return undefined;
  }
}

export async function verifyTenantRequestIdentity(request: Request): Promise<TenantIdentityResult> {
  const user = await verifySupabaseBearer(request);
  if (!user) return { ok: false, status: 401, code: "authentication_required" };

  const hostname = trustedRequestHostname(request);
  if (!hostname) return { ok: false, status: 403, code: "tenant_not_found" };

  const tenantId = await resolveExactTenantId(hostname);
  if (tenantId === undefined) return { ok: false, status: 503, code: "authorization_unavailable" };
  if (!tenantId) return { ok: false, status: 403, code: "tenant_not_found" };

  return { ok: true, user, tenantId, hostname };
}

export async function authorizeTenantRequest(
  request: Request,
  options: AuthorizationOptions = {},
): Promise<TenantAuthorizationResult> {
  const identity = await verifyTenantRequestIdentity(request);
  if (!identity.ok) return identity;

  const membershipResult = await supabaseRestAsUser<MembershipRow[]>(
    `/tenant_memberships?select=id,tenant_id,user_id,role,status,program_id,permissions,mfa_required`
      + `&tenant_id=eq.${encodeURIComponent(identity.tenantId)}`
      + `&user_id=eq.${encodeURIComponent(identity.user.id)}`
      + "&limit=1",
    identity.user,
  );
  if (!membershipResult.ok) {
    return {
      ok: false,
      status: membershipResult.status >= 500 ? 503 : 403,
      code: membershipResult.status >= 500 ? "authorization_unavailable" : "active_membership_required",
    };
  }

  const row = firstObject<MembershipRow>(membershipResult.data);
  if (!row || !isUuid(row.id) || row.tenant_id !== identity.tenantId || row.user_id !== identity.user.id || !isRole(row.role)) {
    return { ok: false, status: 403, code: membershipCode(row?.status) };
  }
  if (row.status !== "active") return { ok: false, status: 403, code: membershipCode(row.status) };

  const profileResult = await supabaseRestAsUser<ProfileRow[]>(
    `/portal_profiles?select=status&user_id=eq.${encodeURIComponent(identity.user.id)}&limit=1`,
    identity.user,
  );
  if (!profileResult.ok && profileResult.status >= 500) {
    return { ok: false, status: 503, code: "authorization_unavailable" };
  }
  const profile = firstObject<ProfileRow>(profileResult.data);
  if (profile?.status === "suspended") return { ok: false, status: 403, code: "account_suspended" };
  if (profile?.status === "pending_deletion") return { ok: false, status: 403, code: "account_disabled" };

  if (options.allowedRoles && !options.allowedRoles.includes(row.role)) {
    return { ok: false, status: 403, code: "role_not_allowed" };
  }

  const platformSessionId = platformSessionIdFromRequest(request);
  if (options.requirePlatformSession && (!platformSessionId || !identity.user.sessionId)) {
    return { ok: false, status: 403, code: "platform_session_invalid" };
  }

  if (platformSessionId) {
    const sessionResult = await supabaseRestAsUser<SessionRow[]>(
      `/user_sessions?select=id,tenant_id,user_id,auth_session_id,revoked_at`
        + `&id=eq.${encodeURIComponent(platformSessionId)}`
        + `&tenant_id=eq.${encodeURIComponent(identity.tenantId)}`
        + `&user_id=eq.${encodeURIComponent(identity.user.id)}`
        + "&revoked_at=is.null&limit=1",
      identity.user,
    );
    const session = firstObject<SessionRow>(sessionResult.data);
    if (
      !sessionResult.ok
      || !session
      || session.id !== platformSessionId
      || session.tenant_id !== identity.tenantId
      || session.user_id !== identity.user.id
      || session.revoked_at !== null
      || !identity.user.sessionId
      || session.auth_session_id !== identity.user.sessionId
    ) {
      return { ok: false, status: 403, code: "platform_session_invalid" };
    }
  }

  return {
    ...identity,
    membership: {
      id: row.id,
      tenant_id: identity.tenantId,
      user_id: identity.user.id,
      role: row.role,
      status: "active",
      program_id: typeof row.program_id === "number" ? row.program_id : null,
      permissions: normalizePermissions(row.permissions),
      mfa_required: row.mfa_required === true,
    },
    platformSessionId,
  };
}
