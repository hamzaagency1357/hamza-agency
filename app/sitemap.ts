import type { MetadataRoute } from "next";
import { getServerBlogFeed } from "@/lib/blog/serverPosts";
import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getLanguageAlternates,
  getLocalizedAbsoluteUrl,
  PROGRAM_SLUGS,
  PUBLIC_ROUTE_PATHS,
} from "@/lib/i18n/publicLocales";

const languages: readonly SiteLanguage[] = ["ar", "en", "tr"];
const excludedPaths = new Set(["/apply", "/application-status", "/service-status", "/track"]);

function getRouteConfig(path: string) {
  if (path === "/") return { priority: 1, changeFrequency: "daily" as const };
  if (path === "/programs" || path === "/services" || path === "/blog") return { priority: 0.9, changeFrequency: "weekly" as const };
  if (path === "/about" || path === "/contact" || path.startsWith("/programs/") || path.startsWith("/blog/")) return { priority: 0.85, changeFrequency: "weekly" as const };
  if (path === "/privacy-policy" || path === "/terms-and-conditions" || path === "/ai-policy") return { priority: 0.45, changeFrequency: "yearly" as const };
  return { priority: 0.75, changeFrequency: "weekly" as const };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const posts = await getServerBlogFeed("ar");
  const routes = Array.from(new Set([
    ...PUBLIC_ROUTE_PATHS.filter((path) => !excludedPaths.has(path)),
    ...PROGRAM_SLUGS.map((slug) => `/programs/${slug}`),
    ...posts.map((post) => `/blog/${post.slug}`),
  ]));

  return routes.flatMap((path) => {
    const route = getRouteConfig(path);
    const alternates = getLanguageAlternates(path);
    const post = path.startsWith("/blog/") ? posts.find((item) => `/blog/${item.slug}` === path) : null;
    const lastModified = post ? new Date(post.updatedAt || post.publishedAt || post.scheduledAt || now) : now;
    return languages.map((language) => ({
      url: getLocalizedAbsoluteUrl(path, language),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: { languages: alternates },
    }));
  });
}
