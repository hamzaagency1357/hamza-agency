import type { PublicNavigationGroup, PublicNavigationLink } from "@/lib/publicNavigation";
import type { SiteLanguage } from "@/lib/i18n/locale";
import { getStaticCopy, type StaticCopyKey } from "@/lib/i18n/staticCopy";

const navigationCopyByHref: Record<string, StaticCopyKey> = {
  "/": "home",
  "/apply": "applyNow",
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

function normalizeHref(href: string) {
  return href.split("?")[0]?.split("#")[0] || href;
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
