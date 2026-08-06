import "server-only";

import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getLanguageDirection,
  isSiteLanguage,
  type SiteLanguage,
} from "@/lib/i18n/locale";
import {
  getLanguageAlternates,
  getLocalizedAbsoluteUrl,
  isIndexablePublicPath,
  isSupportedPublicPath,
  normalizePublicPathname,
  stripLocalePrefix,
} from "@/lib/i18n/publicLocales";
import { getPublicSeoCopy } from "@/lib/i18n/publicSeo";

const ogLocale: Record<SiteLanguage, string> = {
  ar: "ar_AR",
  en: "en_US",
  tr: "tr_TR",
};

const siteKeywords: Record<SiteLanguage, string[]> = {
  ar: [
    "وكالة حمزة",
    "إدارة صناع المحتوى",
    "برامج البث المباشر",
    "TikTok",
    "BIGO LIVE",
    "الخدمات الرقمية",
  ],
  en: [
    "HAMZA AGENCY",
    "content creator management",
    "live streaming programs",
    "TikTok",
    "BIGO LIVE",
    "digital services",
  ],
  tr: [
    "HAMZA AGENCY",
    "içerik üreticisi yönetimi",
    "canlı yayın programları",
    "TikTok",
    "BIGO LIVE",
    "dijital hizmetler",
  ],
};

export type RequestSiteContext = {
  language: SiteLanguage;
  direction: "rtl" | "ltr";
  publicPath: string;
  requestPath: string;
};

export async function getRequestSiteContext(): Promise<RequestSiteContext> {
  const requestHeaders = await headers();
  const languageHeader = requestHeaders.get("x-site-locale");
  const language = isSiteLanguage(languageHeader) ? languageHeader : "ar";
  const requestPath = normalizePublicPathname(
    requestHeaders.get("x-site-path") || "/"
  );
  const publicPath = stripLocalePrefix(requestPath);

  return {
    language,
    direction: getLanguageDirection(language),
    publicPath,
    requestPath,
  };
}

export function buildPublicMetadata(
  publicPath: string,
  language: SiteLanguage
): Metadata {
  const normalizedPath = stripLocalePrefix(publicPath);
  const copy = getPublicSeoCopy(normalizedPath, language);
  const canonical = getLocalizedAbsoluteUrl(normalizedPath, language);
  const languages = getLanguageAlternates(normalizedPath);
  const indexable = isIndexablePublicPath(normalizedPath);
  const ogImage = normalizedPath.startsWith("/programs/")
    ? `${normalizedPath}/opengraph-image`
    : "/opengraph-image";
  const alternateLocale = (Object.keys(ogLocale) as SiteLanguage[])
    .filter((item) => item !== language)
    .map((item) => ogLocale[item]);

  return {
    metadataBase: new URL("https://hamza-agency.com"),
    title: copy.title,
    description: copy.description,
    applicationName: "عراب سوريا",
    generator: "Next.js",
    creator: "عراب سوريا",
    publisher: "عراب سوريا",
    authors: [
      {
        name: "عراب سوريا",
        url: "https://hamza-agency.com",
      },
    ],
    category: "Content Creator Management",
    manifest: "/manifest.webmanifest",
    keywords: siteKeywords[language],
    alternates: {
      canonical,
      languages,
    },
    icons: {
      icon: "/Logo%20hamza%20agency.jpg",
      shortcut: "/Logo%20hamza%20agency.jpg",
      apple: "/Logo%20hamza%20agency.jpg",
    },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: canonical,
      siteName: "عراب سوريا",
      locale: ogLocale[language],
      alternateLocale,
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt:
            language === "tr"
              ? "HAMZA AGENCY marka görseli"
              : language === "en"
                ? "Arab Syria brand image"
                : "صورة هوية عراب سوريا",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.title,
      description: copy.description,
      images: [ogImage],
    },
    robots: {
      index: indexable,
      follow: indexable,
      googleBot: {
        index: indexable,
        follow: indexable,
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
}

export async function generatePublicMetadataForRequest(): Promise<Metadata> {
  const context = await getRequestSiteContext();

  if (!isSupportedPublicPath(context.publicPath)) {
    const metadata = buildPublicMetadata("/", "ar");
    return {
      ...metadata,
      title: "HAMZA AGENCY",
      robots: { index: false, follow: false },
    };
  }

  return buildPublicMetadata(context.publicPath, context.language);
}
