import type { MetadataRoute } from "next";
import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getLanguageAlternates,
  getLocalizedAbsoluteUrl,
  PROGRAM_SLUGS,
  PUBLIC_ROUTE_PATHS,
} from "@/lib/i18n/publicLocales";

const languages: readonly SiteLanguage[] = ["ar", "en", "tr"];
const excludedPaths = new Set([
  "/apply",
  "/application-status",
  "/service-status",
  "/track",
]);

const blogRoutes = ["/blog", "/blog/seo-identity-arab-syria", "/blog/content-operations-blueprint"];

function getRouteConfig(path: string) {
  if (path === "/") {
    return { priority: 1, changeFrequency: "daily" as const };
  }

  if (path === "/programs" || path === "/services") {
    return { priority: 0.9, changeFrequency: "weekly" as const };
  }

  if (
    path === "/about" ||
    path === "/contact" ||
    path.startsWith("/programs/")
  ) {
    return { priority: 0.85, changeFrequency: "weekly" as const };
  }

  if (
    path === "/privacy-policy" ||
    path === "/terms-and-conditions" ||
    path === "/ai-policy"
  ) {
    return { priority: 0.45, changeFrequency: "yearly" as const };
  }

  return { priority: 0.75, changeFrequency: "weekly" as const };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    ...PUBLIC_ROUTE_PATHS.filter((path) => !excludedPaths.has(path)),
    ...PROGRAM_SLUGS.map((slug) => `/programs/${slug}`),
    ...blogRoutes,
  ];

  return routes.flatMap((path) => {
    const route = getRouteConfig(path);
    const alternates = getLanguageAlternates(path);

    return languages.map((language) => ({
      url: getLocalizedAbsoluteUrl(path, language),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: alternates,
      },
    }));
  });
}
