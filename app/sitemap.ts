import type { MetadataRoute } from "next";
import { getIndexableBlogAlternates } from "@/lib/blog/indexing";
import { getServerBlogFeed } from "@/lib/blog/serverPosts";
import type { SiteLanguage } from "@/lib/i18n/locale";
import { getLanguageAlternates, getLocalizedAbsoluteUrl, isIndexablePublicPath, PROGRAM_SLUGS, PUBLIC_ROUTE_PATHS } from "@/lib/i18n/publicLocales";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const languages: readonly SiteLanguage[] = ["ar", "en", "tr"];
type CmsPageUpdate = { slug: string | null; updated_at: string | null };

function getRouteConfig(path: string) {
  if (path === "/") return { priority: 1, changeFrequency: "daily" as const };
  if (path === "/programs" || path === "/services" || path === "/blog" || path === "/agent/arab-syria") {
    return { priority: 0.9, changeFrequency: "weekly" as const };
  }
  if (path === "/about" || path === "/contact" || path.startsWith("/programs/") || path.startsWith("/blog/")) {
    return { priority: 0.85, changeFrequency: "weekly" as const };
  }
  if (path === "/privacy-policy" || path === "/terms-and-conditions" || path === "/ai-policy") {
    return { priority: 0.45, changeFrequency: "yearly" as const };
  }
  return { priority: 0.75, changeFrequency: "weekly" as const };
}

function cmsSlugToPublicPath(slug: string | null) {
  const normalized = slug?.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!normalized) return null;
  if (normalized === "home" || normalized === "homepage") return "/";
  return `/${normalized}`;
}

function safeDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function getCmsLastModifiedByPath() {
  const updates = new Map<string, Date>();
  if (!isSupabaseConfigured || !supabase) return updates;
  const { data, error } = await supabase.from("pages").select("slug,updated_at").eq("is_published", true);
  if (error || !data) return updates;
  for (const row of data as CmsPageUpdate[]) {
    const path = cmsSlugToPublicPath(row.slug);
    const updatedAt = safeDate(row.updated_at);
    if (path && updatedAt) updates.set(path, updatedAt);
  }
  return updates;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, cmsLastModifiedByPath] = await Promise.all([getServerBlogFeed("ar"), getCmsLastModifiedByPath()]);
  const routes = [
    ...PUBLIC_ROUTE_PATHS.filter((path) => isIndexablePublicPath(path)),
    ...PROGRAM_SLUGS.map((slug) => `/programs/${slug}`),
  ];

  const publicEntries = routes.flatMap((path) =>
    languages.map((language) => ({
      ...getRouteConfig(path),
      url: getLocalizedAbsoluteUrl(path, language),
      lastModified: cmsLastModifiedByPath.get(path),
      alternates: { languages: getLanguageAlternates(path) },
    }))
  );

  const blogEntries = posts.flatMap((post) => {
    const path = `/blog/${post.slug}`;
    if (!isIndexablePublicPath(path)) return [];
    const { availableLanguages, languages: alternates } = getIndexableBlogAlternates(post, getLanguageAlternates(path));
    return availableLanguages.map((language) => ({
      ...getRouteConfig(path),
      url: getLocalizedAbsoluteUrl(path, language),
      lastModified: safeDate(post.updatedAt || post.publishedAt),
      alternates: { languages: alternates },
    }));
  });

  return [...publicEntries, ...blogEntries];
}
