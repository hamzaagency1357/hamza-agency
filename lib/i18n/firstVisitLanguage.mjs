export const FIRST_VISIT_LANGUAGE_SESSION_KEY =
  "hamza-agency-first-visit-language-resolved";

const BOT_USER_AGENT_PATTERN =
  /bot|crawler|spider|crawling|googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|preview/i;

function isSiteLanguage(value) {
  return value === "ar" || value === "en" || value === "tr";
}

export function isSearchCrawler(userAgent) {
  return BOT_USER_AGENT_PATTERN.test(userAgent);
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

  if (isSiteLanguage(savedLanguage)) return savedLanguage;
  return detectDeviceLanguage(navigatorLanguages);
}

export function languageHomepage(language) {
  if (language === "en") return "/en";
  if (language === "tr") return "/tr";
  return "/";
}
