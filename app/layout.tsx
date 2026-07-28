import type { Viewport } from "next";
import PublicQuickNav from "@/components/PublicQuickNav";
import AdminQuickNav from "@/components/AdminQuickNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PublicAiSupport from "@/components/PublicAiSupport";
import PublicDesktopEnhancer from "@/components/PublicDesktopEnhancer";
import PublicHeaderDropdownNav from "@/components/PublicHeaderDropdownNav";
import PublicHeaderDesktopClickGuard from "@/components/PublicHeaderDesktopClickGuard";
import VisualBackgroundPresets from "@/components/VisualBackgroundPresets";
import AuthRecoveryRedirect from "@/components/AuthRecoveryRedirect";
import StructuredData from "@/components/StructuredData";
import SiteLanguageDocumentSync from "@/components/SiteLanguageDocumentSync";
import PublicSiteRuntimeTranslator from "@/components/PublicSiteRuntimeTranslator";
import PublicLocaleLinkSync from "@/components/PublicLocaleLinkSync";
import { SiteLanguageProvider } from "@/lib/i18n/useSiteLanguage";
import {
  generatePublicMetadataForRequest,
  getRequestSiteContext,
} from "@/lib/i18n/serverPublicMetadata";
import "./globals.css";
import "./final-fixes.css";
import "./public-modal-fixes.css";

const mobileFloatingControlsFix = `
@media (max-width: 768px) {
  .hamza-floating-whatsapp,
  .hamza-ai-support,
  .hamza-quick-nav {
    inset-inline-start: auto !important;
    inset-inline-end: auto !important;
  }

  .hamza-floating-whatsapp {
    left: auto !important;
    right: 0.75rem !important;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 7.35rem) !important;
    width: 5.25rem !important;
    height: 2.85rem !important;
    padding-inline: 0.35rem !important;
    font-size: 0.72rem !important;
    white-space: nowrap !important;
  }

  .hamza-ai-support {
    left: auto !important;
    right: 0.75rem !important;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 3.95rem) !important;
    width: 5.75rem !important;
  }

  .hamza-ai-support > button {
    width: 100% !important;
    height: 2.85rem !important;
    padding-inline: 0.35rem !important;
    font-size: 0.72rem !important;
    white-space: nowrap !important;
  }

  .hamza-quick-nav {
    left: auto !important;
    right: 0.75rem !important;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 0.55rem) !important;
    width: 5.25rem !important;
  }

  .hamza-quick-nav > button {
    width: 100% !important;
    min-height: 2.85rem !important;
    height: 2.85rem !important;
    padding-inline: 0.35rem !important;
    font-size: 0.72rem !important;
    white-space: nowrap !important;
  }

  .hamza-ai-support-panel,
  .hamza-quick-nav-panel {
    position: fixed !important;
    inset-inline-start: auto !important;
    inset-inline-end: auto !important;
    left: 0.75rem !important;
    right: 0.75rem !important;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 4.15rem) !important;
    width: auto !important;
    max-height: calc(100svh - env(safe-area-inset-top, 0px) - 5rem) !important;
    margin: 0 !important;
  }
}
`;

export const generateMetadata = generatePublicMetadataForRequest;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7C3AED" },
    { media: "(prefers-color-scheme: dark)", color: "#7C3AED" },
  ],
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteContext = await getRequestSiteContext();

  return (
    <html
      lang={siteContext.language}
      dir={siteContext.direction}
      suppressHydrationWarning
    >
      <body
        dir={siteContext.direction}
        data-site-language={siteContext.language}
        suppressHydrationWarning
      >
        <SiteLanguageProvider initialLanguage={siteContext.language}>
          <style>{mobileFloatingControlsFix}</style>
          <StructuredData />
          <AuthRecoveryRedirect />
          <SiteLanguageDocumentSync />
          <PublicSiteRuntimeTranslator />
          <PublicLocaleLinkSync />
          <PublicDesktopEnhancer />
          <VisualBackgroundPresets />
          {children}
          <PublicHeaderDropdownNav />
          <PublicHeaderDesktopClickGuard />
          <LanguageSwitcher />
          <PublicAiSupport />
          <PublicQuickNav />
          <AdminQuickNav />
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
