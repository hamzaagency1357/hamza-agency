export type TenantHostnameContext = {
  requestUrl: string;
  forwardedHost?: string | null;
  hostHeader?: string | null;
  vercelDeploymentUrl?: string | null;
  canonicalHostname: string;
  isVercel: boolean;
  isProduction: boolean;
};

export function cleanTenantHostname(value: string) {
  const first = value.split(",")[0]?.trim().toLowerCase() ?? "";
  const withoutScheme = first.replace(/^https?:\/\//, "");
  const host = withoutScheme.split("/")[0] ?? "";
  const hostname = host.startsWith("[") && host.includes("]")
    ? host.slice(1, host.indexOf("]"))
    : host.split(":")[0];
  return /^[a-z0-9.-]+$/.test(hostname) ? hostname.replace(/^\.+|\.+$/g, "") : "";
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function resolveTrustedTenantHostname(context: TenantHostnameContext) {
  const requestHost = cleanTenantHostname(new URL(context.requestUrl).hostname);
  const forwardedHost = cleanTenantHostname(context.forwardedHost ?? "");
  const hostHeader = cleanTenantHostname(context.hostHeader ?? "");
  const hostname = forwardedHost || hostHeader || requestHost;
  const canonical = cleanTenantHostname(context.canonicalHostname);

  if (!hostname) return "";
  if (isLocalHostname(hostname)) return context.isProduction ? "" : canonical;

  if (hostname.endsWith(".vercel.app")) {
    const deploymentHost = cleanTenantHostname(context.vercelDeploymentUrl ?? "");
    return context.isVercel && deploymentHost === hostname ? canonical : "";
  }

  return hostname;
}
