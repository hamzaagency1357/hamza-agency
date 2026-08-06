import type { MetadataRoute } from "next";
import { getServerBlogFeed } from "@/lib/blog/serverPosts";
import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getLanguageAlternates,
  getLocalizedAbsoluteUrl,
} from "@/lib/i18n/publicLocales";

const languages: readonly SiteLanguage[] = ["ar", "en", "tr"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getServerBlogFeed("ar");

  return posts.flatMap((post) =>
    languages.map((language) => {
      const path = `/blog/${post.slug}`;
      return {
        url: getLocalizedAbsoluteUrl(path, language),
        lastModified: new Date(
          post.updatedAt || post.publishedAt || post.scheduledAt || Date.now()
        ),
        changeFrequency: "weekly" as const,
        priority: 0.72,
        alternates: { languages: getLanguageAlternates(path) },
      };
    })
  );
}
