export const SITE_LANGUAGE_STORAGE_KEY = "hamza-agency-language";
export const SITE_LANGUAGE_CHANGE_EVENT = "hamza-language-change";

export type SiteLanguage = "ar" | "en" | "tr";
export type TextDirection = "rtl" | "ltr";

export const SITE_LANGUAGES: ReadonlyArray<{
  code: SiteLanguage;
  label: string;
  shortLabel: string;
  direction: TextDirection;
}> = [
  { code: "ar", label: "العربية", shortLabel: "AR", direction: "rtl" },
  { code: "en", label: "English", shortLabel: "EN", direction: "ltr" },
  { code: "tr", label: "Türkçe", shortLabel: "TR", direction: "ltr" },
];

export function isSiteLanguage(value: unknown): value is SiteLanguage {
  return value === "ar" || value === "en" || value === "tr";
}

export function normalizeSiteLanguage(value: unknown, fallback: SiteLanguage = "ar"): SiteLanguage {
  return isSiteLanguage(value) ? value : fallback;
}

export function getLanguageDirection(language: SiteLanguage): TextDirection {
  return language === "ar" ? "rtl" : "ltr";
}

export function getStoredSiteLanguage(): SiteLanguage {
  if (typeof window === "undefined") return "ar";

  const savedLanguage = window.localStorage.getItem(SITE_LANGUAGE_STORAGE_KEY);
  if (isSiteLanguage(savedLanguage)) return savedLanguage;

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("tr")) return "tr";
  if (browserLanguage.startsWith("en")) return "en";

  return "ar";
}

export function applySiteLanguage(language: SiteLanguage) {
  if (typeof document === "undefined") return;

  const direction = getLanguageDirection(language);
  document.documentElement.lang = language;
  document.documentElement.dir = direction;
  document.body.dir = direction;
  document.body.dataset.siteLanguage = language;
}

export function setStoredSiteLanguage(language: SiteLanguage) {
  if (typeof window === "undefined") return;

  applySiteLanguage(language);
  window.localStorage.setItem(SITE_LANGUAGE_STORAGE_KEY, language);
  window.dispatchEvent(new CustomEvent(SITE_LANGUAGE_CHANGE_EVENT, { detail: { language } }));
}
