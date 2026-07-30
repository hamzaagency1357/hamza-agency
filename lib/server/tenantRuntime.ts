import "server-only";

import type { VerifiedSupabaseUser } from "@/lib/server/supabaseUser";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

type TenantDomainRow = { tenant_id: string; hostname: string; status: string };

function cleanHostname(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
}

function configuredCanonicalHostname() {
  try {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    return url ? cleanHostname(new URL(url).hostname) : "hamza-agency.com";
  } catch {
    return "hamza-agency.com";
  }
}

export function trustedRequestHostname(request: Request) {
  const requestUrl = new URL(request.url);
  let hostname = cleanHostname(requestUrl.hostname);
  const vercelHost = request.headers.get("x-vercel-deployment-url");
  if (process.env.VERCEL === "1" && vercelHost) hostname = cleanHostname(vercelHost);
  if (hostname.endsWith(".vercel.app") || hostname === "localhost" || hostname === "127.0.0.1") {
    return configuredCanonicalHostname();
  }
  return hostname;
}

export async function resolveTenantForRequest(request: Request, user: VerifiedSupabaseUser) {
  const hostname = trustedRequestHostname(request);
  const result = await supabaseRestAsUser<TenantDomainRow[]>(
    `/tenant_domains?select=tenant_id,hostname,status&hostname=eq.${encodeURIComponent(hostname)}&status=in.(active,verified)&limit=1`,
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
