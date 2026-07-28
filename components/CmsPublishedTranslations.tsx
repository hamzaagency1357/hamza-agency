"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
} from "@/lib/i18n/publishedTranslations";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { sanitizeMarketingCopy } from "@/lib/i18n/marketingSafety";
import {
  getApprovedHomeDisplayTranslation,
  getApprovedPublishedTranslation,
} from "@/lib/i18n/approvedPublishedTranslations";
import { translateSiteRuntimeText } from "@/lib/i18n/siteRuntimeTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export type CmsPublishedTranslationField = "title" | "summary" | "content";
export type CmsPublishedTranslationSourceType = "pages" | "sections";

export type CmsPublishedTranslationSource = {
  sourceKey: string;
  sourceType: CmsPublishedTranslationSourceType;
  sourceId: string | number;
  requiredFields: ReadonlyArray<CmsPublishedTranslationField>;
  fallback: Partial<Record<CmsPublishedTranslationField, string>>;
};

type CompleteTranslationMap = Record<string, Partial<Record<CmsPublishedTranslationField, string>>>;

type CmsPublishedTranslationsContextValue = {
  sources: Record<string, CmsPublishedTranslationSource>;
  completeTranslations: CompleteTranslationMap;
  language: "ar" | "en" | "tr";
};

const CmsPublishedTranslationsContext = createContext<CmsPublishedTranslationsContextValue | null>(null);
const CMS_TRANSLATION_FIELDS: readonly CmsPublishedTranslationField[] = ["title", "summary", "content"];
const forbiddenPlaceholders = ["Localized content is being updated.", "Yerelleştirilmiş içerik güncelleniyor."];

function hasRequiredCmsFields(source: CmsPublishedTranslationSource) {
  return source.requiredFields.length > 0 && Boolean(String(source.sourceId).trim());
}

function isDisplayableTranslation(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 && !forbiddenPlaceholders.some((placeholder) => normalized.includes(placeholder));
}

export function CmsPublishedTranslationsProvider({ sources, children }: { sources: ReadonlyArray<CmsPublishedTranslationSource>; children: ReactNode }) {
  const language = useSiteLanguage();
  const [completeTranslations, setCompleteTranslations] = useState<CompleteTranslationMap>({});
  const sourceMap = useMemo(() => sources.reduce<Record<string, CmsPublishedTranslationSource>>((result, source) => {
    result[source.sourceKey] = source;
    return result;
  }, {}), [sources]);

  useEffect(() => {
    let isCurrent = true;
    setCompleteTranslations({});
    if (language === "ar") return () => { isCurrent = false; };

    const eligibleSources = sources.filter(hasRequiredCmsFields);
    const sourceGroups = eligibleSources.reduce<Record<CmsPublishedTranslationSourceType, CmsPublishedTranslationSource[]>>((result, source) => {
      result[source.sourceType].push(source);
      return result;
    }, { pages: [], sections: [] });

    async function loadPublishedTranslations() {
      const nextCompleteTranslations: CompleteTranslationMap = {};
      await Promise.all((Object.entries(sourceGroups) as Array<[CmsPublishedTranslationSourceType, CmsPublishedTranslationSource[]]>).map(async ([sourceType, groupedSources]) => {
        if (groupedSources.length === 0) return;
        const translationMap = await readPublishedTranslations({
          sourceType,
          language,
          sourceIds: groupedSources.map((source) => source.sourceId),
          fields: CMS_TRANSLATION_FIELDS,
        });
        groupedSources.forEach((source) => {
          const translations = translationMap[String(source.sourceId)];
          if (hasCompletePublishedTranslation(translations, source.requiredFields)) {
            nextCompleteTranslations[source.sourceKey] = translations;
          }
        });
      }));
      if (isCurrent) setCompleteTranslations(nextCompleteTranslations);
    }

    void loadPublishedTranslations();
    return () => { isCurrent = false; };
  }, [language, sources]);

  const value = useMemo<CmsPublishedTranslationsContextValue>(() => ({ sources: sourceMap, completeTranslations, language }), [completeTranslations, language, sourceMap]);
  return <CmsPublishedTranslationsContext.Provider value={value}>{children}</CmsPublishedTranslationsContext.Provider>;
}

export function CmsPublishedText({ sourceKey, field, fallback, className }: { sourceKey: string; field: CmsPublishedTranslationField; fallback?: string; className?: string }) {
  const context = useContext(CmsPublishedTranslationsContext);
  const source = context?.sources[sourceKey];
  const language = context?.language || "ar";
  const arabicFallback = source?.fallback[field] || fallback || "";
  const publishedValue = context?.completeTranslations[sourceKey]?.[field]?.trim() || "";
  const approvedDisplayValue = getApprovedHomeDisplayTranslation({ sourceKey, field, language });
  const approvedSourceValue = source ? getApprovedPublishedTranslation({
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    field,
    language,
  }) : "";
  const dictionaryValue = translateSiteRuntimeText(arabicFallback, language);
  const selected = [approvedDisplayValue, publishedValue, approvedSourceValue, dictionaryValue]
    .find((value) => isDisplayableTranslation(value)) || (language === "ar" ? arabicFallback : "");
  const text = sanitizeMarketingCopy(selected, language);

  return <span dir={getLanguageDirection(language)} lang={language} className={className}>{text}</span>;
}
