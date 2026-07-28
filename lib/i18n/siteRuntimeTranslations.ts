import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getSiteRuntimeMetadata,
  hasSiteRuntimeTranslation,
  translateSiteRuntimeText as translateLegacyRuntimeText,
} from "@/lib/i18n/siteRuntimeTranslationsLegacy";

export type {
  RuntimeRouteMetadata,
  RuntimeTranslationEntry,
} from "@/lib/i18n/siteRuntimeTranslationsLegacy";
export { getSiteRuntimeMetadata, hasSiteRuntimeTranslation };

function isLegacyPlaceholder(value: string) {
  const normalized = value.trim();
  return (
    normalized.startsWith("Localized content") ||
    normalized.startsWith("Yerelleştirilmiş içerik")
  );
}

export function translateSiteRuntimeText(
  value: string,
  language: SiteLanguage
) {
  const translated = translateLegacyRuntimeText(value, language);
  return isLegacyPlaceholder(translated) ? "" : translated;
}
