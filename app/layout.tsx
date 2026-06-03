import type { Metadata, Viewport } from "next";
import "./globals.css";

// ─── Metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  // App identity
  title: {
    default: "Hamza Agency — Premium Digital Agency",
    template: "%s | Hamza Agency",
  },
  description:
    "Hamza Agency — A luxury, futuristic digital agency delivering premium branding, influencer marketing, and performance-driven solutions.",

  // Application info
  applicationName: "Hamza Agency",
  authors: [{ name: "Hamza Agency", url: "https://hamzaagency.com" }],
  creator: "Hamza Agency",
  publisher: "Hamza Agency",
  generator: "Next.js",

  // Keywords for SEO
  keywords: [
    "Hamza Agency",
    "digital agency",
    "influencer marketing",
    "branding",
    "luxury agency",
    "social media",
    "content creation",
    "وكالة رقمية",
    "dijital ajans",
  ],

  // Canonical & alternates (will be expanded with i18n in Phase 2)
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://hamzaagency.com"
  ),
  alternates: {
    canonical: "/",
    languages: {
      "en-US": "/en",
      "ar-AE": "/ar",
      "tr-TR": "/tr",
    },
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://hamzaagency.com",
    siteName: "Hamza Agency",
    title: "Hamza Agency — Premium Digital Agency",
    description:
      "Luxury, futuristic digital agency delivering premium branding and influencer marketing solutions.",
    images: [
      {
        url: "/og-image.jpg", // Add this image in Phase 2
        width: 1200,
        height: 630,
        alt: "Hamza Agency",
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "Hamza Agency — Premium Digital Agency",
    description:
      "Luxury, futuristic digital agency delivering premium branding and influencer marketing solutions.",
    images: ["/og-image.jpg"],
    creator: "@hamzaagency",
  },

  // PWA manifest
  manifest: "/manifest.json",

  // Favicons & icons
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/icons/icon.svg",
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Verification (add in Phase 2)
  verification: {
    // google: "YOUR_GOOGLE_VERIFICATION_CODE",
  },
};

// ─── Viewport ─────────────────────────────────────────────────────────────

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
    { media: "(prefers-color-scheme: light)", color: "#FAF7F2" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "dark light",
};

// ─── Root Layout ──────────────────────────────────────────────────────────

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    // Default: dark mode, LTR
    // In Phase 2, `lang` and `dir` will be dynamic based on locale
    <html
      lang="en"
      dir="ltr"
      // 'dark' class enables Tailwind dark mode styles
      // ThemeProvider in Phase 2 will manage this dynamically
      className="dark"
      suppressHydrationWarning
    >
      <head>
        {/* PWA iOS meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Hamza Agency" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0A0A0A" />
        <meta name="format-detection" content="telephone=no" />

        {/* Preconnect for Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        // Font + base class
        className="font-body bg-black text-ivory antialiased"
        suppressHydrationWarning
      >
        {/* Theme initialization script — prevents flash of wrong theme */}
        {/* Phase 2 will expand this with full ThemeProvider */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('hamza-theme') || 'dark';
                document.documentElement.classList.toggle('dark', theme !== 'light');
                document.documentElement.classList.toggle('light', theme === 'light');
              } catch(e) {}
            `,
          }}
        />

        {/* App content */}
        {children}
      </body>
    </html>
  );
}
