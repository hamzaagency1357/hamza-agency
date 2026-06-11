import type { Metadata, Viewport } from "next";
import PublicQuickNav from "@/components/PublicQuickNav";
import AdminQuickNav from "@/components/AdminQuickNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PublicAiSupport from "@/components/PublicAiSupport";
import PublicDesktopEnhancer from "@/components/PublicDesktopEnhancer";
import VisualBackgroundPresets from "@/components/VisualBackgroundPresets";
import FinalVisualPolish from "@/components/FinalVisualPolish";
import AuthRecoveryRedirect from "@/components/AuthRecoveryRedirect";
import "./globals.css";
import "./final-fixes.css";

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
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
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
    title: siteName,
    description: siteDescription,
    images: ["/Logo%20hamza%20agency.jpg"],
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
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HAMZA AGENCY",
    alternateName: ["وكالة حمزة", "Hamza Agency"],
    url: siteUrl,
    logo: `${siteUrl}/Logo%20hamza%20agency.jpg`,
    description: siteDescription,
    areaServed: ["TR", "SA", "AE", "KW", "QA", "BH", "OM", "IQ", "SY", "JO", "LB", "EG"],
    availableLanguage: ["Arabic"],
    knowsAbout: [
      "Live streaming creator management",
      "TikTok creator agency",
      "BIGO LIVE creator agency",
      "Digital services",
      "Social media solutions",
    ],
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
        <AuthRecoveryRedirect />
        <PublicDesktopEnhancer />
        <VisualBackgroundPresets />
        <FinalVisualPolish />
        {children}
        <LanguageSwitcher />
        <PublicAiSupport />
        <PublicQuickNav />
        <AdminQuickNav />
      </body>
    </html>
  );
}
