import type { MetadataRoute } from "next";

const siteUrl = "https://hamza-agency.com";

const publicRoutes = [
  { path: "", priority: 1, changeFrequency: "daily" as const },
  { path: "/programs", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/programs/tiktok", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/programs/bigo-live", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/programs/yaahlan", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/programs/xena", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/programs/catchii", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/about", priority: 0.85, changeFrequency: "monthly" as const },
  { path: "/apply", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/application-status", priority: 0.65, changeFrequency: "weekly" as const },
  { path: "/services", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/digital-services", priority: 0.85, changeFrequency: "weekly" as const },
  { path: "/ai-support", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/service-request", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/jobs", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/reviews", priority: 0.75, changeFrequency: "weekly" as const },
  { path: "/success-stories", priority: 0.75, changeFrequency: "weekly" as const },
  { path: "/partners", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/gallery", priority: 0.7, changeFrequency: "weekly" as const },
  { path: "/knowledge-center", priority: 0.75, changeFrequency: "weekly" as const },
  { path: "/faq", priority: 0.75, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.85, changeFrequency: "monthly" as const },
  { path: "/privacy-policy", priority: 0.45, changeFrequency: "yearly" as const },
  { path: "/terms-and-conditions", priority: 0.45, changeFrequency: "yearly" as const },
  { path: "/ai-policy", priority: 0.45, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
