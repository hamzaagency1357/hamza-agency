import type { Metadata, Viewport } from "next";
import PublicQuickNav from "@/components/PublicQuickNav";
import PublicDesktopEnhancer from "@/components/PublicDesktopEnhancer";
import PublicIntroAndTransitions from "@/components/PublicIntroAndTransitions";
import PublicPlatformExperience from "@/components/PublicPlatformExperience";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://hamza-agency.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hamza Agency | وكالة حمزة",
    template: "%s | Hamza Agency",
  },
  description:
    "وكالة حمزة — وكالة رقمية فاخرة لإدارة وتوظيف صناع المحتوى على منصات البث المباشر.",
  applicationName: "Hamza Agency",
  generator: "Next.js",
  creator: "HAMZA AGENCY",
  publisher: "HAMZA AGENCY",
  manifest: "/manifest.webmanifest",
  keywords: [
    "وكالة حمزة",
    "Hamza Agency",
    "وكالة صناع المحتوى",
    "TikTok Agency",
    "BIGO LIVE Agency",
    "منصات البث المباشر",
  ],
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Hamza Agency | وكالة حمزة",
    description:
      "وكالة رقمية فاخرة لإدارة وتوظيف صناع المحتوى على منصات البث المباشر.",
    url: siteUrl,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
    images: [
      {
        url: "/Logo%20hamza%20agency.jpg",
        width: 1200,
        height: 630,
        alt: "Hamza Agency Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hamza Agency | وكالة حمزة",
    description:
      "وكالة رقمية فاخرة لإدارة وتوظيف صناع المحتوى على منصات البث المباشر.",
    images: ["/Logo%20hamza%20agency.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HAMZA AGENCY",
    alternateName: "وكالة حمزة",
    url: siteUrl,
    description:
      "وكالة احترافية لإدارة وتوظيف ودعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي.",
  };

  return (
    <html lang="ar" dir="rtl">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <PublicDesktopEnhancer />
        <PublicIntroAndTransitions />
        {children}
        <PublicPlatformExperience />
        <PublicQuickNav />
      </body>
    </html>
  );
}
