export const FIRST_VISIT_LANGUAGE_SESSION_KEY =
  "hamza-agency-first-visit-language-resolved";

const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|preview|headlesschrome|lighthouse/i;

function isSiteLanguage(value) {
  return value === "ar" || value === "en" || value === "tr";
}

export function isSearchCrawler(userAgent = "") {
  return BOT_USER_AGENT_PATTERN.test(String(userAgent));
}

export function parseAcceptLanguageHeader(value = "") {
  return String(value)
    .split(",")
    .map((entry, index) => {
      const [rawTag, ...parameters] = entry.trim().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().toLowerCase().startsWith("q=")
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.split("=", 2)[1])
        : 1;
      return {
        tag: rawTag.trim(),
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        index,
      };
    })
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.quality > 0)
    .sort(
      (left, right) =>
        right.quality - left.quality || left.index - right.index
    )
    .map((entry) => entry.tag);
}

export function detectDeviceLanguage(navigatorLanguages = []) {
  for (const value of navigatorLanguages) {
    const normalized = String(value).toLowerCase();
    if (normalized.startsWith("tr")) return "tr";
    if (normalized.startsWith("en")) return "en";
    if (normalized.startsWith("ar")) return "ar";
  }
  return "ar";
}

export function resolveFirstVisitLanguage({
  pathname,
  savedLanguage,
  navigatorLanguages = [],
  userAgent = "",
  alreadyResolved = false,
}) {
  if (alreadyResolved || isSearchCrawler(userAgent)) return null;

  if (
    pathname === "/en" ||
    pathname.startsWith("/en/") ||
    pathname === "/tr" ||
    pathname.startsWith("/tr/")
  ) {
    return null;
  }

  if (pathname !== "/") return null;

  // A stored choice proves first-visit resolution already happened. It must
  // never override the explicit Arabic root URL; URL locale remains final.
  if (isSiteLanguage(savedLanguage)) return null;

  return detectDeviceLanguage(navigatorLanguages);
}

export function languageHomepage(language) {
  if (language === "en") return "/en";
  if (language === "tr") return "/tr";
  return "/";
}
