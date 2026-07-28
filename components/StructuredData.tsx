"use client";

import { usePathname } from "next/navigation";
import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getLocalizedAbsoluteUrl,
  getProgramSlugFromPath,
  isSupportedPublicPath,
  localizePublicPath,
  PROGRAM_SLUGS,
  SITE_URL,
  stripLocalePrefix,
} from "@/lib/i18n/publicLocales";
import { getPublicSeoCopy } from "@/lib/i18n/publicSeo";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const logoUrl = `${SITE_URL}/Logo%20hamza%20agency.jpg`;
const organizationId = `${SITE_URL}/#organization`;

const languageName: Record<SiteLanguage, string> = {
  ar: "العربية",
  en: "English",
  tr: "Türkçe",
};

const homeLabel: Record<SiteLanguage, string> = {
  ar: "الرئيسية",
  en: "Home",
  tr: "Ana Sayfa",
};

const programsLabel: Record<SiteLanguage, string> = {
  ar: "البرامج",
  en: "Programs",
  tr: "Programlar",
};

const serviceType: Record<SiteLanguage, string> = {
  ar: "برنامج إدارة وتطوير صناع المحتوى",
  en: "Content creator management and development program",
  tr: "İçerik üreticisi yönetim ve gelişim programı",
};

function buildOrganizationJsonLd(
  language: SiteLanguage,
  description: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: "HAMZA AGENCY",
    alternateName:
      language === "ar" ? ["وكالة حمزة", "Hamza Agency"] : ["Hamza Agency"],
    url: SITE_URL,
    logo: logoUrl,
    image: logoUrl,
    description,
    areaServed: [
      "TR",
      "SA",
      "AE",
      "KW",
      "QA",
      "BH",
      "OM",
      "IQ",
      "SY",
      "JO",
      "LB",
      "EG",
    ],
    availableLanguage: ["ar", "en", "tr"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        availableLanguage: ["Arabic", "English", "Turkish"],
      },
    ],
    knowsAbout: [
      "Live streaming creator management",
      "TikTok creator programs",
      "BIGO LIVE creator programs",
      "Digital services",
      "Content creator development",
    ],
  };
}

function buildWebsiteJsonLd(
  language: SiteLanguage,
  description: string
) {
  const url = getLocalizedAbsoluteUrl("/", language);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}#website`,
    name: "HAMZA AGENCY",
    alternateName: language === "ar" ? "وكالة حمزة" : "Hamza Agency",
    url,
    description,
    inLanguage: language,
    publisher: {
      "@id": organizationId,
    },
  };
}

function buildWebPageJsonLd(
  publicPath: string,
  language: SiteLanguage,
  copy: ReturnType<typeof getPublicSeoCopy>
) {
  const url = getLocalizedAbsoluteUrl(publicPath, language);

  return {
    "@context": "https://schema.org",
    "@type": copy.schemaType || "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: copy.title,
    description: copy.description,
    inLanguage: language,
    isPartOf: {
      "@id": `${getLocalizedAbsoluteUrl("/", language)}#website`,
    },
    publisher: {
      "@id": organizationId,
    },
  };
}

function buildBreadcrumbJsonLd(
  publicPath: string,
  language: SiteLanguage,
  copy: ReturnType<typeof getPublicSeoCopy>
) {
  const items: Array<Record<string, string | number>> = [
    {
      "@type": "ListItem",
      position: 1,
      name: homeLabel[language],
      item: getLocalizedAbsoluteUrl("/", language),
    },
  ];

  if (getProgramSlugFromPath(publicPath)) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: programsLabel[language],
      item: getLocalizedAbsoluteUrl("/programs", language),
    });
    items.push({
      "@type": "ListItem",
      position: 3,
      name: copy.title,
      item: getLocalizedAbsoluteUrl(publicPath, language),
    });
  } else if (publicPath !== "/") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: copy.title,
      item: getLocalizedAbsoluteUrl(publicPath, language),
    });
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function buildProgramsItemListJsonLd(language: SiteLanguage) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: programsLabel[language],
    itemListElement: PROGRAM_SLUGS.map((slug, index) => {
      const path = `/programs/${slug}`;
      return {
        "@type": "ListItem",
        position: index + 1,
        url: getLocalizedAbsoluteUrl(path, language),
        name: getPublicSeoCopy(path, language).title,
      };
    }),
  };
}

function buildProgramServiceJsonLd(
  publicPath: string,
  language: SiteLanguage,
  copy: ReturnType<typeof getPublicSeoCopy>
) {
  const url = getLocalizedAbsoluteUrl(publicPath, language);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: copy.title,
    description: copy.description,
    url,
    provider: {
      "@id": organizationId,
    },
    serviceType: serviceType[language],
    areaServed: [
      "TR",
      "SA",
      "AE",
      "KW",
      "QA",
      "BH",
      "OM",
      "IQ",
      "SY",
      "JO",
      "LB",
      "EG",
    ],
  };
}

function buildServiceRequestJsonLd(language: SiteLanguage) {
  const copy = getPublicSeoCopy("/service-request", language);
  const url = getLocalizedAbsoluteUrl("/service-request", language);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name: copy.title,
    description: copy.description,
    url,
    provider: {
      "@id": organizationId,
    },
    serviceType:
      language === "tr"
        ? "Dijital hizmet talebi"
        : language === "en"
          ? "Digital services request"
          : "طلب خدمات رقمية",
  };
}

export default function StructuredData() {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();
  const publicPath = stripLocalePrefix(pathname);
  const copy = getPublicSeoCopy(publicPath, language);
  const jsonLdItems: unknown[] = [
    buildOrganizationJsonLd(language, copy.description),
    buildWebsiteJsonLd(
      language,
      getPublicSeoCopy("/", language).description
    ),
    buildWebPageJsonLd(publicPath, language, copy),
    buildBreadcrumbJsonLd(publicPath, language, copy),
  ];

  if (publicPath === "/programs") {
    jsonLdItems.push(buildProgramsItemListJsonLd(language));
  }

  if (getProgramSlugFromPath(publicPath)) {
    jsonLdItems.push(buildProgramServiceJsonLd(publicPath, language, copy));
  }

  if (publicPath === "/service-request") {
    jsonLdItems.push(buildServiceRequestJsonLd(language));
  }

  if (!isSupportedPublicPath(publicPath)) return null;

  return (
    <>
      {jsonLdItems.map((item, index) => (
        <script
          key={`${localizePublicPath(publicPath, language)}-jsonld-${index}`}
          type="application/ld+json"
          data-site-language={language}
          data-language-name={languageName[language]}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
