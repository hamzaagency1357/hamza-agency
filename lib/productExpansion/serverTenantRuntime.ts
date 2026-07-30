import "server-only";

import { headers } from "next/headers";

export type TenantRuntime = {
  id: string | null;
  slug: string;
  name: string;
  defaultLocale: "ar" | "en" | "tr";
  supportedLocales: Array<"ar" | "en" | "tr">;
  branding: {
    primary_color?: string | null;
    secondary_color?: string | null;
    accent_color?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    social_links?: Record<string, string>;
    legal_overrides?: Record<string, unknown>;
  };
  featureFlags: Record<string, { enabled: boolean; configuration: Record<string, unknown> }>;
  settings: Record<string, unknown>;
};

const fallback: TenantRuntime = {
  id: null,
  slug: "hamza-agency",
  name: "HAMZA AGENCY",
  defaultLocale: "ar",
  supportedLocales: ["ar", "en", "tr"],
  branding: {
    primary_color: "#7C3AED",
    secondary_color: "#180826",
    accent_color: "#D4AF37",
  },
  featureFlags: {},
  settings: {},
};

function safeColor(value: unknown, fallbackColor: string) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallbackColor;
}

function normalizeRuntime(value: unknown): TenantRuntime {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const row = value as Record<string, unknown>;
  const branding = row.branding && typeof row.branding === "object" && !Array.isArray(row.branding)
    ? row.branding as Record<string, unknown>
    : {};
  const supported = Array.isArray(row.supportedLocales)
    ? row.supportedLocales.filter((locale): locale is "ar" | "en" | "tr" => locale === "ar" || locale === "en" || locale === "tr")
    : fallback.supportedLocales;
  return {
    id: typeof row.id === "string" ? row.id : null,
    slug: typeof row.slug === "string" ? row.slug : fallback.slug,
    name: typeof row.name === "string" ? row.name : fallback.name,
    defaultLocale: row.defaultLocale === "en" || row.defaultLocale === "tr" ? row.defaultLocale : "ar",
    supportedLocales: supported.length ? supported : fallback.supportedLocales,
    branding: {
      ...branding,
      primary_color: safeColor(branding.primary_color, fallback.branding.primary_color ?? "#7C3AED"),
      secondary_color: safeColor(branding.secondary_color, fallback.branding.secondary_color ?? "#180826"),
      accent_color: safeColor(branding.accent_color, fallback.branding.accent_color ?? "#D4AF37"),
    },
    featureFlags: row.featureFlags && typeof row.featureFlags === "object" && !Array.isArray(row.featureFlags)
      ? row.featureFlags as TenantRuntime["featureFlags"]
      : {},
    settings: row.settings && typeof row.settings === "object" && !Array.isArray(row.settings)
      ? row.settings as Record<string, unknown>
      : {},
  };
}

export async function getServerTenantRuntime(): Promise<TenantRuntime> {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "hamza-agency.com")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return fallback;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_public_tenant_runtime`, {
      method: "POST",
      cache: "no-store",
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_hostname: host }),
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return fallback;
    return normalizeRuntime(await response.json());
  } catch {
    return fallback;
  }
}
