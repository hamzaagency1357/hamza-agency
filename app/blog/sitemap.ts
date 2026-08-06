import type { MetadataRoute } from "next";
import { getBlogFeed } from "@/lib/blog/posts.mjs";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getBlogFeed("ar");
  return posts.map((post) => ({
    url: `https://hamza-agency.com/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt || post.scheduledAt || Date.now()),
    changeFrequency: "weekly",
    priority: 0.7,
  }));
}
