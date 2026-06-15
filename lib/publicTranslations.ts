export type SiteLanguage = "ar" | "en" | "tr";
export type TranslationLanguage = Exclude<SiteLanguage, "ar">;
export type TranslationSource = "programs" | "faqs" | "knowledge_base";
export type TranslatableField = "title" | "summary" | "content";

export type TranslationFields = Partial<Record<TranslatableField, string>> & {
  reviewed?: boolean;
};

export type TranslationPack = Record<string, Partial<Record<TranslationLanguage, TranslationFields>>>;

export type TranslatableContent = {
  key: string;
  source: TranslationSource;
  sourceId: string | number;
  title: string;
  summary?: string | null;
  content?: string | null;
};

export type TranslatedContent = TranslatableContent & {
  language: SiteLanguage;
  isFallback: boolean;
};

export const DEFAULT_SITE_LANGUAGE: SiteLanguage = "ar";
export const SUPPORTED_SITE_LANGUAGES: SiteLanguage[] = ["ar", "en", "tr"];
export const TRANSLATION_STORAGE_KEY = "hamza_translation_panel_pack_v1";

export function isSupportedSiteLanguage(value: unknown): value is SiteLanguage {
  return value === "ar" || value === "en" || value === "tr";
}

export function isTranslationLanguage(value: unknown): value is TranslationLanguage {
  return value === "en" || value === "tr";
}

export function normalizeSiteLanguage(value: unknown): SiteLanguage {
  return isSupportedSiteLanguage(value) ? value : DEFAULT_SITE_LANGUAGE;
}

export function makeTranslationKey(source: TranslationSource, id: string | number) {
  return `${source}:${String(id)}`;
}

export function parseTranslationPack(value: string | null | undefined): TranslationPack {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as TranslationPack;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readStoredTranslationPack(): TranslationPack {
  if (typeof window === "undefined") return {};
  return parseTranslationPack(window.localStorage.getItem(TRANSLATION_STORAGE_KEY));
}

export function writeStoredTranslationPack(pack: TranslationPack) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TRANSLATION_STORAGE_KEY, JSON.stringify(pack));
}

export function getStoredSiteLanguage(storageKey = "hamza-agency-language"): SiteLanguage {
  if (typeof window === "undefined") return DEFAULT_SITE_LANGUAGE;
  return normalizeSiteLanguage(window.localStorage.getItem(storageKey));
}

export function getTranslationFields(
  pack: TranslationPack,
  key: string,
  language: SiteLanguage
): TranslationFields {
  if (!isTranslationLanguage(language)) return {};
  return pack[key]?.[language] || {};
}

export function getTranslatedField(
  pack: TranslationPack,
  key: string,
  language: SiteLanguage,
  field: TranslatableField,
  fallback: string | null | undefined
) {
  const fallbackValue = fallback || "";
  if (!isTranslationLanguage(language)) return fallbackValue;

  const translatedValue = pack[key]?.[language]?.[field];
  return typeof translatedValue === "string" && translatedValue.trim()
    ? translatedValue.trim()
    : fallbackValue;
}

export function translateContent(
  item: TranslatableContent,
  pack: TranslationPack,
  language: SiteLanguage
): TranslatedContent {
  const normalizedLanguage = normalizeSiteLanguage(language);

  return {
    ...item,
    language: normalizedLanguage,
    isFallback: normalizedLanguage === "ar" || !isTranslationLanguage(normalizedLanguage),
    title: getTranslatedField(pack, item.key, normalizedLanguage, "title", item.title),
    summary: getTranslatedField(pack, item.key, normalizedLanguage, "summary", item.summary || ""),
    content: getTranslatedField(pack, item.key, normalizedLanguage, "content", item.content || ""),
  };
}

export function translateContentList<T extends TranslatableContent>(
  items: T[],
  pack: TranslationPack,
  language: SiteLanguage
) {
  return items.map((item) => translateContent(item, pack, language));
}

export function getTranslationCompletion(
  item: TranslatableContent,
  pack: TranslationPack,
  language: TranslationLanguage
) {
  const fields: TranslatableField[] = ["title", "summary", "content"];
  const translations = getTranslationFields(pack, item.key, language);
  const completed = fields.filter((field) => {
    const sourceValue = field === "title" ? item.title : item[field] || "";
    if (!String(sourceValue).trim()) return true;
    return Boolean(translations[field]?.trim());
  }).length;

  return Math.round((completed / fields.length) * 100);
}
