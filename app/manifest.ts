import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HAMZA AGENCY | وكالة حمزة",
    short_name: "HAMZA AGENCY",
    description:
      "وكالة احترافية لإدارة وتوظيف ودعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#180826",
    theme_color: "#7C3AED",
    categories: ["business", "productivity", "social"],
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/Logo%20hamza%20agency.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/Logo%20hamza%20agency.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
  };
}
