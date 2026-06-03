import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better DX
  reactStrictMode: true,

  // i18n support: Arabic (RTL), English (LTR), Turkish (LTR)
  // Note: Full i18n routing can be enabled in Phase 2 with next-intl
  // For now we configure the supported locales as metadata
  experimental: {
    // Optimize package imports for Supabase
    optimizePackageImports: ["@supabase/supabase-js"],
  },

  // Security + PWA headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        // Cache static assets
        source: "/icons/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Vercel image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
