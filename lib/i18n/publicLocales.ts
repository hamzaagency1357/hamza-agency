import {
  isSiteLanguage,
  type SiteLanguage,
} from "@/lib/i18n/locale";

export const SITE_URL = "https://hamza-agency.com";

export const PUBLIC_ROUTE_PATHS = [
  "/",
  "/about",
  "/ai-policy",
  "/ai-support",
  "/apply",
  "/application-status",
  "/contact",
  "/digital-services",
  "/faq",
  "/gallery",
  "/jobs",
  "/knowledge-center",
  "/partners",
  "/privacy-policy",
  "/programs",
  "/reviews",
  "/service-request",
  "/service-status",
  "/services",
  "/success-stories",
  "/terms-and-conditions",
] as const;

export const PROGRAM_SLUGS = [
  "tiktok",
  "bigo-live",
  "yaahlan",
  "xena",
  "catchii",
] as const;

export type PublicRoutePath = (typeof PUBLIC_ROUTE_PATHS)[number];

const publicRouteSet = new Set<string>(PUBLIC_ROUTE_PATHS);
const localizedPrefixPattern = /^\/(en|tr)(?=\/|$)/;
const programPathPattern = /^\/programs\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizePublicPathname(pathname: string) {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
}

export function splitLocalizedPathname(pathname: string): {
  language: SiteLanguage;
  publicPath: string;
} {
  const normalized = normalizePublicPathname(pathname);
  const match = normalized.match(localizedPrefixPattern);

  if (!match || !isSiteLanguage(match[1])) {
    return { language: "ar", publicPath: normalized };
  }

  const publicPath = normalized.slice(match[0].length) || "/";
  return {
    language: match[1],
    publicPath: normalizePublicPathname(publicPath),
  };
}

export function stripLocalePrefix(pathname: string) {
  return splitLocalizedPathname(pathname).publicPath;
}

export function getPathLanguage(pathname: string): SiteLanguage {
  return splitLocalizedPathname(pathname).language;
}

export function localizePublicPath(
  pathname: string,
  language: SiteLanguage
) {
  const publicPath = stripLocalePrefix(pathname);

  if (language === "ar") return publicPath;
  return publicPath === "/" ? `/${language}` : `/${language}${publicPath}`;
}

export function localizePublicHref(
  href: string,
  language: SiteLanguage
) {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/api/") ||
    href.startsWith("/admin")
  ) {
    return href;
  }

  const url = new URL(href, SITE_URL);
  return `${localizePublicPath(url.pathname, language)}${url.search}${url.hash}`;
}

export function getLocalizedAbsoluteUrl(
  pathname: string,
  language: SiteLanguage
) {
  return `${SITE_URL}${localizePublicPath(pathname, language)}`;
}

export function getLanguageAlternates(pathname: string) {
  const publicPath = stripLocalePrefix(pathname);

  return {
    ar: getLocalizedAbsoluteUrl(publicPath, "ar"),
    en: getLocalizedAbsoluteUrl(publicPath, "en"),
    tr: getLocalizedAbsoluteUrl(publicPath, "tr"),
    "x-default": getLocalizedAbsoluteUrl(publicPath, "ar"),
  };
}

export function isSupportedPublicPath(pathname: string) {
  const publicPath = stripLocalePrefix(pathname);
  return publicRouteSet.has(publicPath) || programPathPattern.test(publicPath);
}

export function isProgramPublicPath(pathname: string) {
  return programPathPattern.test(stripLocalePrefix(pathname));
}

export function getProgramSlugFromPath(pathname: string) {
  const match = stripLocalePrefix(pathname).match(
    /^\/programs\/([a-z0-9]+(?:-[a-z0-9]+)*)$/
  );
  return match?.[1] || null;
}

export function isIndexablePublicPath(pathname: string) {
  const publicPath = stripLocalePrefix(pathname);
  return (
    isSupportedPublicPath(publicPath) &&
    publicPath !== "/application-status" &&
    publicPath !== "/service-status"
  );
}
