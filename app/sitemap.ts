import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://hamza-agency.vercel.app";

const publicRoutes = [
  "",
  "/programs",
  "/programs/tiktok",
  "/programs/bigo-live",
  "/programs/yaahlan",
  "/programs/xena",
  "/programs/catchii",
  "/about",
  "/services",
  "/digital-services",
  "/service-request",
  "/jobs",
  "/reviews",
  "/success-stories",
  "/partners",
  "/gallery",
  "/knowledge-center",
  "/faq",
  "/contact",
  "/privacy-policy",
  "/terms-and-conditions",
  "/ai-policy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.8,
  }));
}
