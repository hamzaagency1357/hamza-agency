import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HAMZA AGENCY",
    short_name: "HAMZA",
    description: "منصة وكالة حمزة لإدارة صناع المحتوى والعملاء والموظفين والشركاء والخدمات.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#09050f",
    theme_color: "#7C3AED",
    categories: ["business", "productivity", "social"],
    lang: "ar",
    dir: "rtl",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "تتبع الطلب", short_name: "التتبع", url: "/application-status", icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }] },
      { name: "طلب خدمة", short_name: "خدمة", url: "/service-request", icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }] },
      { name: "بوابة المستخدم", short_name: "البوابة", url: "/portal/login", icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }] },
    ],
  };
}
