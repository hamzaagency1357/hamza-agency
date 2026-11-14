import type { MetadataRoute } from "next";
import { getIndexableBlogAlternates } from "@/lib/blog/indexing";
import { getServerBlogFeed } from "@/lib/blog/serverPosts";
import {
  getLanguageAlternates,
  getLocalizedAbsoluteUrl,
} from "@/lib/i18n/publicLocales";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getServerBlogFeed("ar");

  return posts.flatMap((post) => {
    const path = `/blog/${post.slug}`;
    const { availableLanguages, languages } = getIndexableBlogAlternates(post, getLanguageAlternates(path));
    const date = post.updatedAt || post.publishedAt || post.scheduledAt;
    const lastModified = date ? new Date(date) : undefined;
    return availableLanguages.map((language) => {
      return {
        url: getLocalizedAbsoluteUrl(path, language),
        lastModified: lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.72,
        alternates: { languages },
      };
    });
  });
}
