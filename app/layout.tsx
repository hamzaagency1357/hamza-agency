import type { Viewport } from "next";
import PublicQuickNav from "@/components/PublicQuickNav";
import AdminQuickNav from "@/components/AdminQuickNav";
import PublicAiSupport from "@/components/PublicAiSupport";
import PublicMobileDock from "@/components/PublicMobileDock";
import PublicDesktopEnhancer from "@/components/PublicDesktopEnhancer";
import PublicHeaderDesktopClickGuard from "@/components/PublicHeaderDesktopClickGuard";
import PublicGlobalHeader from "@/components/PublicGlobalHeader";
import PublicSupportAvailability from "@/components/PublicSupportAvailability";
import VisualBackgroundPresets from "@/components/VisualBackgroundPresets";
import AuthRecoveryRedirect from "@/components/AuthRecoveryRedirect";
import StructuredData from "@/components/StructuredData";
import SiteLanguageDocumentSync from "@/components/SiteLanguageDocumentSync";
import PublicSiteRuntimeTranslator from "@/components/PublicSiteRuntimeTranslator";
import PwaRuntime from "@/components/PwaRuntime";
import { SiteLanguageProvider } from "@/lib/i18n/useSiteLanguage";
import {
  generatePublicMetadataForRequest,
  getRequestSiteContext,
} from "@/lib/i18n/serverPublicMetadata";
import "./globals.css";
import "./final-fixes.css";
import "./public-modal-fixes.css";
import "./owner-final-qa.css";

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
          <StructuredData />
          <AuthRecoveryRedirect />
          <SiteLanguageDocumentSync />
          <PublicSiteRuntimeTranslator />
          <PwaRuntime />
          <PublicDesktopEnhancer />
          <VisualBackgroundPresets />
          <PublicGlobalHeader />
          {children}
          <PublicSupportAvailability />
          <PublicHeaderDesktopClickGuard />
          <PublicMobileDock />
          <PublicAiSupport />
          <PublicQuickNav />
          <AdminQuickNav />
        </SiteLanguageProvider>
      </body>
    </html>
  );
}
