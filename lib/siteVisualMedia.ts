export type SiteVisualScope =
  | "home"
  | "programs"
  | "services"
  | "success-stories"
  | "blog"
  | "agent"
  | "contact"
  | "install-app"
  | "tracking"
  | "service-request"
  | "application-status"
  | "service-status";

export type SiteVisualMediaKind =
  | "cinematic_video"
  | "background_image"
  | "texture";

export type PublicSiteVisualMedia = {
  name: string;
  pageSlug: SiteVisualScope;
  fileType: SiteVisualMediaKind;
  usageContext: string;
  desktopUrl: string | null;
  desktopFallbackUrl: string | null;
  mobileUrl: string | null;
  mobileFallbackUrl: string | null;
  posterUrl: string | null;
  altText: string;
  opacity: number;
  dimming: number;
  overlayStrength: number;
  blurPx: number;
  focalPosition: string;
  autoplay: boolean;
  loop: boolean;
};

export type PlaybackEnvironment = {
  reducedMotion: boolean;
  saveData: boolean;
  weakDevice: boolean;
};

export const SITE_VISUAL_SCOPES: ReadonlyArray<{
  value: SiteVisualScope;
  label: string;
  route: string;
}> = [
  { value: "home", label: "الرئيسية", route: "/" },
  { value: "programs", label: "البرامج", route: "/programs" },
  { value: "services", label: "الخدمات", route: "/services" },
  { value: "success-stories", label: "قصص النجاح", route: "/success-stories" },
  { value: "blog", label: "المدونة", route: "/blog" },
  { value: "agent", label: "الوكيل", route: "/agent" },
  { value: "contact", label: "تواصل معنا", route: "/contact" },
  { value: "install-app", label: "تثبيت التطبيق", route: "/install-app" },
  { value: "tracking", label: "التتبع", route: "/track" },
  { value: "service-request", label: "طلب خدمة", route: "/service-request" },
  { value: "application-status", label: "حالة طلب الانضمام", route: "/application-status" },
  { value: "service-status", label: "حالة طلب الخدمة", route: "/service-status" },
] as const;

const ROUTE_TO_SCOPE = new Map<string, SiteVisualScope>(
  SITE_VISUAL_SCOPES.map((item) => [item.route, item.value])
);

const PUBLIC_ROUTE_ALIASES = new Map<string, SiteVisualScope>([
  ["/about", "agent"],
  ["/ai-policy", "blog"],
  ["/ai-support", "services"],
  ["/apply", "programs"],
  ["/cookie-policy", "contact"],
  ["/cookie-settings", "contact"],
  ["/digital-services", "services"],
  ["/faq", "services"],
  ["/gallery", "success-stories"],
  ["/jobs", "services"],
  ["/knowledge-center", "blog"],
  ["/marketplace", "services"],
  ["/partners", "success-stories"],
  ["/platform-status", "tracking"],
  ["/privacy-policy", "contact"],
  ["/reviews", "success-stories"],
  ["/terms-and-conditions", "contact"],
]);

const SUPPORTED_SCOPES = new Set<SiteVisualScope>(
  SITE_VISUAL_SCOPES.map((item) => item.value)
);

function canonicalPath(input: string) {
  const withoutOrigin = input.replace(/^https?:\/\/[^/]+/i, "");
  const pathOnly = (withoutOrigin.split(/[?#]/, 1)[0] || "/").trim() || "/";
  const withLeadingSlash = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  const withoutLocale = withLeadingSlash.replace(/^\/(?:en|tr)(?=\/|$)/, "") || "/";
  if (withoutLocale === "/") return "/";
  return withoutLocale.replace(/\/+$/, "") || "/";
}

export function resolveSiteVisualScope(input: string | null | undefined): SiteVisualScope | null {
  if (!input) return null;
  const value = input.trim();

  if (SUPPORTED_SCOPES.has(value as SiteVisualScope)) {
    return value as SiteVisualScope;
  }

  const path = canonicalPath(value);
  const exact = ROUTE_TO_SCOPE.get(path) ?? PUBLIC_ROUTE_ALIASES.get(path);
  if (exact) return exact;

  if (path.startsWith("/programs/")) return "programs";
  if (path.startsWith("/blog/")) return "blog";
  if (path.startsWith("/agent/")) return "agent";

  return null;
}

export function shouldPlayCinematic(
  autoplay: boolean,
  environment: PlaybackEnvironment
) {
  return (
    autoplay &&
    !environment.reducedMotion &&
    !environment.saveData &&
    !environment.weakDevice
  );
}

export function clampVisualNumber(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number
) {
  const numeric =
    typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maximum, Math.max(minimum, numeric));
}

export function selectDeviceVisualSources(
  media: PublicSiteVisualMedia,
  mobile: boolean
) {
  if (mobile) {
    return {
      primary: media.mobileUrl || media.desktopUrl,
      fallback:
        media.mobileFallbackUrl ||
        media.desktopFallbackUrl ||
        media.desktopUrl,
    };
  }

  return {
    primary: media.desktopUrl,
    fallback: media.desktopFallbackUrl,
  };
}

export function siteVisualScopeLabel(scope: SiteVisualScope) {
  return SITE_VISUAL_SCOPES.find((item) => item.value === scope)?.label ?? scope;
}
