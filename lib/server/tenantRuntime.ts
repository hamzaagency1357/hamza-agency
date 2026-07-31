import "server-only";

import type { VerifiedSupabaseUser } from "@/lib/server/supabaseUser";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

type TenantDomainRow = { tenant_id: string; hostname: string; status: string; is_primary?: boolean };

export function cleanTenantHostname(value: string) {
  const first = value.split(",")[0]?.trim().toLowerCase() ?? "";
  const withoutScheme = first.replace(/^https?:\/\//, "");
  const host = withoutScheme.split("/")[0] ?? "";
  const hostname = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host.split(":")[0];
  return /^[a-z0-9.-]+$/.test(hostname) ? hostname.replace(/^\.+|\.+$/g, "") : "";
}

function configuredCanonicalHostname() {
  try {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    return url ? cleanTenantHostname(new URL(url).hostname) : "hamza-agency.com";
  } catch {
    return "hamza-agency.com";
  }
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function trustedRequestHostname(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = cleanTenantHostname(request.headers.get("x-forwarded-host") ?? "");
  const hostHeader = cleanTenantHostname(request.headers.get("host") ?? "");
  const requestHost = cleanTenantHostname(requestUrl.hostname);
  const hostname = forwardedHost || hostHeader || requestHost;

  if (!hostname) return "";

  if (isLocalHostname(hostname)) {
    return process.env.NODE_ENV === "production" ? "" : configuredCanonicalHostname();
  }

  if (hostname.endsWith(".vercel.app")) {
    const deploymentHost = cleanTenantHostname(request.headers.get("x-vercel-deployment-url") ?? "");
    const isVerifiedPreview = process.env.VERCEL === "1" && deploymentHost === hostname;
    return isVerifiedPreview ? configuredCanonicalHostname() : "";
  }

  return hostname;
}

export async function resolveTenantForRequest(request: Request, user: VerifiedSupabaseUser) {
  const hostname = trustedRequestHostname(request);
  if (!hostname) return { ok: false, status: 400, tenantId: null, hostname: "" } as const;

  const result = await supabaseRestAsUser<TenantDomainRow[]>(
    `/tenant_domains?select=tenant_id,hostname,status,is_primary&hostname=eq.${encodeURIComponent(hostname)}&status=in.(active,verified)&limit=1`,
    user,
  );
  const tenantId = result.data?.[0]?.tenant_id;
  return {
    ok: Boolean(result.ok && tenantId),
    status: result.ok ? (tenantId ? 200 : 404) : result.status,
    tenantId: tenantId ?? null,
    hostname,
  };
}

export async function resolveTenantPrimaryOrigin(tenantId: string, user: VerifiedSupabaseUser) {
  const result = await supabaseRestAsUser<TenantDomainRow[]>(
    `/tenant_domains?select=tenant_id,hostname,status,is_primary&tenant_id=eq.${encodeURIComponent(tenantId)}&status=in.(active,verified)&is_primary=eq.true&order=verified_at.desc&limit=1`,
    user,
  );
  const hostname = cleanTenantHostname(result.data?.[0]?.hostname ?? "");
  return result.ok && hostname ? `https://${hostname}` : null;
}
