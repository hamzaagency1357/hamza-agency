import type { SiteLanguage } from "@/lib/i18n/locale";
import { sanitizeMarketingCopy } from "@/lib/i18n/marketingSafety";
import { translateSiteRuntimeText } from "@/lib/i18n/siteRuntimeTranslations";

export function localizeDynamicPublicCopy(
  value: string | null | undefined,
  language: SiteLanguage
) {
  if (!value?.trim()) return "";

  const direct = sanitizeMarketingCopy(
    translateSiteRuntimeText(value, language),
    language
  );

  if (
    language === "ar" ||
    (!direct.includes("Localized content is being updated.") &&
      !direct.includes("Yerelleştirilmiş içerik güncelleniyor."))
  ) {
    return direct;
  }

  return value
    .split(/(\n+)/)
    .map((segment) => {
      if (!segment.trim()) return segment;
      return sanitizeMarketingCopy(
        translateSiteRuntimeText(segment.trim(), language),
        language
      );
    })
    .join("");
}
