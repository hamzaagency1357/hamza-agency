import type { MetadataRoute } from "next";

const siteUrl = "https://hamza-agency.com";

const privatePaths = [
  "/admin",
  "/admin/",
  "/admin/login",
  "/api/",
  "/service-status",
  "/application-status",
  "/track",
  "/en/service-status",
  "/en/application-status",
  "/en/track",
  "/tr/service-status",
  "/tr/application-status",
  "/tr/track",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privatePaths,
      },
      // Explicitly permit OpenAI's search crawler to discover the same
      // public, indexable pages available to general search engines.
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: privatePaths,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: "hamza-agency.com",
  };
}
