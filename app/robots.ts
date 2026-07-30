import type { MetadataRoute } from "next";

const siteUrl = "https://hamza-agency.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: "hamza-agency.com",
  };
}
