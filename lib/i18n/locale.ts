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

export function normalizeSiteLanguage(
  value: unknown,
  fallback: SiteLanguage = "ar"
): SiteLanguage {
  return isSiteLanguage(value) ? value : fallback;
}

export function getLanguageDirection(
  language: SiteLanguage
): TextDirection {
  return language === "ar" ? "rtl" : "ltr";
}

export function getPreferredSiteLanguage({
  storedLanguage,
  acceptLanguage,
}: {
  storedLanguage?: string | null;
  acceptLanguage?: string | null;
}): SiteLanguage {
  if (isSiteLanguage(storedLanguage)) return storedLanguage;

  const candidates = (acceptLanguage || "")
    .split(",")
    .map((item) => {
      const [tag, ...parameters] = item.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q=")
      );
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;
      return {
        tag: tag.toLowerCase(),
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .sort((left, right) => right.quality - left.quality);

  for (const candidate of candidates) {
    if (candidate.tag.startsWith("tr")) return "tr";
    if (candidate.tag.startsWith("en")) return "en";
    if (candidate.tag.startsWith("ar")) return "ar";
  }

  return "ar";
}

export function getStoredSiteLanguage(): SiteLanguage {
  if (typeof window === "undefined") return "ar";

  const savedLanguage = window.localStorage.getItem(
    SITE_LANGUAGE_STORAGE_KEY
  );
  if (isSiteLanguage(savedLanguage)) return savedLanguage;

  return getPreferredSiteLanguage({
    acceptLanguage:
      window.navigator.languages?.join(",") || window.navigator.language,
  });
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
  document.cookie = `${SITE_LANGUAGE_STORAGE_KEY}=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.dispatchEvent(
    new CustomEvent(SITE_LANGUAGE_CHANGE_EVENT, {
      detail: { language },
    })
  );
}

export function rememberLanguagePreference(language: SiteLanguage) {
  setStoredSiteLanguage(language);
}
