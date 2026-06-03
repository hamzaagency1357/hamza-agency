import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = "https://hamza-agency.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Hamza Agency | وكالة حمزة",
    template: "%s | Hamza Agency",
  },
  description:
    "وكالة حمزة — وكالة رقمية فاخرة لإدارة وتوظيف صناع المحتوى على منصات البث المباشر.",
  applicationName: "Hamza Agency",
  openGraph: {
    title: "Hamza Agency | وكالة حمزة",
    description:
      "وكالة رقمية فاخرة لإدارة وتوظيف صناع المحتوى على منصات البث المباشر.",
    url: siteUrl,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hamza Agency | وكالة حمزة",
    description:
      "وكالة رقمية فاخرة لإدارة وتوظيف صناع المحتوى على منصات البث المباشر.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
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
