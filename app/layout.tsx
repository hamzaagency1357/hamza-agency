import type { Metadata, Viewport } from "next";
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
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
