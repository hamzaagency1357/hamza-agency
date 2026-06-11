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
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: "hamza-agency.com",
  };
}
