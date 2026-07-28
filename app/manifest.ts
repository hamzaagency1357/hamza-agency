import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HAMZA AGENCY",
    short_name: "HAMZA AGENCY",
    description:
      "Professional content creator management, program guidance, and digital services.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#180826",
    theme_color: "#7C3AED",
    categories: ["business", "productivity", "social"],
    lang: "en",
    dir: "ltr",
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
