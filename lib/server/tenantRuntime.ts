import "server-only";

import { cleanTenantHostname, resolveTrustedTenantHostname } from "@/lib/productExpansion/tenantHostname";
import type { VerifiedSupabaseUser } from "@/lib/server/supabaseUser";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

type TenantDomainRow = { tenant_id: string; hostname: string; status: string; is_primary?: boolean };

function configuredCanonicalHostname() {
  try {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    return url ? cleanTenantHostname(new URL(url).hostname) : "hamza-agency.com";
  } catch {
    return "hamza-agency.com";
  }
}

function isExactLocalCloseout(canonicalHostname: string) {
  return process.env.CLOSEOUT_EXECUTION_MODE === "local-isolated"
    && process.env.CLOSEOUT_TARGET_URL === "https://127.0.0.1:3443"
    && process.env.NEXT_PUBLIC_SITE_URL === "https://127.0.0.1:3443"
    && process.env.NEXT_PUBLIC_SUPABASE_URL === "https://127.0.0.1:3443/__closeout_supabase"
    && process.env.SUPABASE_SERVER_URL === "http://127.0.0.1:54321"
    && canonicalHostname === "127.0.0.1";
}

export function trustedRequestHostname(request: Request) {
  const canonicalHostname = configuredCanonicalHostname();
  const exactLocalCloseout = isExactLocalCloseout(canonicalHostname);
  return resolveTrustedTenantHostname({
    requestUrl: request.url,
    forwardedHost: request.headers.get("x-forwarded-host"),
    hostHeader: request.headers.get("host"),
    vercelDeploymentUrl: request.headers.get("x-vercel-deployment-url"),
    canonicalHostname,
    isVercel: process.env.VERCEL === "1",
    isProduction: process.env.NODE_ENV === "production" && !exactLocalCloseout,
  });
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
