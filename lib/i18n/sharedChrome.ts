import type { PublicNavigationGroup, PublicNavigationLink } from "@/lib/publicNavigation";
import { SITE_LANGUAGES, type SiteLanguage } from "@/lib/i18n/locale";
import { getStaticCopy, type StaticCopyKey } from "@/lib/i18n/staticCopy";

const navigationCopyByHref: Record<string, StaticCopyKey> = {
  "/": "home",
  "/programs": "programs",
  "/about": "about",
  "/services": "services",
  "/digital-services": "digitalServices",
  "/service-request": "serviceRequest",
  "/service-status": "serviceStatus",
  "/application-status": "applicationStatus",
  "/jobs": "jobs",
  "/reviews": "reviews",
  "/success-stories": "successStories",
  "/partners": "partners",
  "/gallery": "gallery",
  "/knowledge-center": "knowledgeCenter",
  "/faq": "faq",
  "/ai-support": "aiSupport",
  "/contact": "contact",
  "/privacy-policy": "privacyPolicy",
  "/terms-and-conditions": "termsAndConditions",
  "/ai-policy": "aiPolicy",
};

const navigationCopyByKey: Record<string, StaticCopyKey> = {
  primary_join: "applyNow",
  view_programs: "programs",
  contact: "contact",
};

const groupCopyByArabicTitle: Record<string, StaticCopyKey> = {
  "أساسيات الوكالة": "quickNavTitle",
  "تفاصيل البرامج": "programs",
  "الطلبات والمتابعة": "serviceStatus",
  "الثقة والمحتوى": "knowledgeCenter",
  "معلومات قانونية": "footerLegalPages",
};

const knownHomeSharedChromeTextKeys: ReadonlyArray<StaticCopyKey> = [
  "footerSiteLinks",
  "footerLegalPages",
  "footerContact",
  "applyNow",
  "learnMore",
  "discoverMore",
  "readMore",
  "viewAll",
  "availableNow",
  "backHome",
  "whatsapp",
  "openWhatsApp",
];

function normalizeHref(href: string) {
  return href.split("?")[0]?.split("#")[0] || href;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getSharedNavigationLabel(language: SiteLanguage, link: PublicNavigationLink) {
  const copyKey =
    (link.key ? navigationCopyByKey[link.key] : undefined) ||
    navigationCopyByHref[normalizeHref(link.href)];

  return copyKey ? getStaticCopy(language, copyKey) : link.label;
}

export function getSharedNavigationLabelByHref(language: SiteLanguage, href: string, fallback: string) {
  const copyKey = navigationCopyByHref[normalizeHref(href)];
  return copyKey ? getStaticCopy(language, copyKey) : fallback;
}

export function getSharedNavigationGroupTitle(language: SiteLanguage, group: PublicNavigationGroup) {
  const copyKey = groupCopyByArabicTitle[group.title];
  return copyKey ? getStaticCopy(language, copyKey) : group.title;
}

/**
 * Localizes only stable, shared UI labels. Any CMS-managed text that does not
 * match one of these established labels is intentionally returned unchanged.
 */
export function getKnownHomeSharedChromeText(language: SiteLanguage, text: string) {
  const normalizedText = normalizeText(text);

  for (const key of knownHomeSharedChromeTextKeys) {
    const isKnownValue = SITE_LANGUAGES.some(
      ({ code }) => normalizeText(getStaticCopy(code, key)) === normalizedText
    );

    if (isKnownValue) return getStaticCopy(language, key);
  }

  return text;
}
