import type { Metadata, Viewport } from "next";
import PublicQuickNav from "@/components/PublicQuickNav";
import AdminQuickNav from "@/components/AdminQuickNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PublicAiSupport from "@/components/PublicAiSupport";
import PublicDesktopEnhancer from "@/components/PublicDesktopEnhancer";
import PublicHeaderDropdownNav from "@/components/PublicHeaderDropdownNav";
import PublicHeaderDesktopClickGuard from "@/components/PublicHeaderDesktopClickGuard";
import VisualBackgroundPresets from "@/components/VisualBackgroundPresets";
import FinalVisualPolish from "@/components/FinalVisualPolish";
import AuthRecoveryRedirect from "@/components/AuthRecoveryRedirect";
import StructuredData from "@/components/StructuredData";
import SiteLanguageDocumentSync from "@/components/SiteLanguageDocumentSync";
import "./globals.css";
import "./final-fixes.css";
import "./public-modal-fixes.css";

const siteUrl = "https://hamza-agency.com";
const siteName = "Hamza Agency | وكالة حمزة";
const siteDescription =
  "وكالة حمزة — وكالة رقمية فاخرة لإدارة وتوظيف ودعم صناع المحتوى على TikTok وBIGO LIVE ومنصات البث المباشر والخدمات الرقمية.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: "%s | Hamza Agency",
  },
  description: siteDescription,
  applicationName: "Hamza Agency",
  generator: "Next.js",
  creator: "HAMZA AGENCY",
  publisher: "HAMZA AGENCY",
  authors: [{ name: "HAMZA AGENCY", url: siteUrl }],
  category: "Live Streaming Agency",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/Logo%20hamza%20agency.jpg",
    shortcut: "/Logo%20hamza%20agency.jpg",
    apple: "/Logo%20hamza%20agency.jpg",
  },
  keywords: [
    "وكالة حمزة",
    "Hamza Agency",
    "hamza-agency.com",
    "وكالة بث مباشر",
    "وكالة صناع المحتوى",
    "وكالة توظيف صناع المحتوى",
    "وكالة تيك توك",
    "وكالة بيجو لايف",
    "TikTok Agency",
    "BIGO LIVE Agency",
    "Live Streaming Agency",
    "Content Creators Agency",
    "منصات البث المباشر",
    "الخدمات الرقمية",
  ],
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: siteUrl,
    siteName: "Hamza Agency",
    locale: "ar_TR",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Hamza Agency Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7C3AED" },
    { media: "(prefers-color-scheme: dark)", color: "#7C3AED" },
  ],
  colorScheme: "dark",
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
      <body>
        <StructuredData />
        <AuthRecoveryRedirect />
        <SiteLanguageDocumentSync />
        <PublicDesktopEnhancer />
        <VisualBackgroundPresets />
        <FinalVisualPolish />
        {children}
        <PublicHeaderDropdownNav />
        <PublicHeaderDesktopClickGuard />
        <LanguageSwitcher />
        <PublicAiSupport />
        <PublicQuickNav />
        <AdminQuickNav />
      </body>
    </html>
  );
}
