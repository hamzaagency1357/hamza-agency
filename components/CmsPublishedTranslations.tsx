"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
} from "@/lib/i18n/publishedTranslations";
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

type CompleteTranslationMap = Record<
  string,
  Partial<Record<CmsPublishedTranslationField, string>>
>;

type CmsPublishedTranslationsContextValue = {
  sources: Record<string, CmsPublishedTranslationSource>;
  completeTranslations: CompleteTranslationMap;
  language: "ar" | "en" | "tr";
};

const CmsPublishedTranslationsContext = createContext<CmsPublishedTranslationsContextValue | null>(null);

const CMS_TRANSLATION_FIELDS: readonly CmsPublishedTranslationField[] = [
  "title",
  "summary",
  "content",
];

function hasRequiredCmsFields(source: CmsPublishedTranslationSource) {
  return source.requiredFields.length > 0 && Boolean(String(source.sourceId).trim());
}

export function CmsPublishedTranslationsProvider({
  sources,
  children,
}: {
  sources: ReadonlyArray<CmsPublishedTranslationSource>;
  children: React.ReactNode;
}) {
  const language = useSiteLanguage();
  const [completeTranslations, setCompleteTranslations] = useState<CompleteTranslationMap>({});

  const sourceMap = useMemo(
    () =>
      sources.reduce<Record<string, CmsPublishedTranslationSource>>((result, source) => {
        result[source.sourceKey] = source;
        return result;
      }, {}),
    [sources]
  );

  useEffect(() => {
    let isCurrent = true;

    setCompleteTranslations({});

    if (language === "ar") {
      return () => {
        isCurrent = false;
      };
    }

    const eligibleSources = sources.filter(hasRequiredCmsFields);
    const sourceGroups = eligibleSources.reduce<
      Record<CmsPublishedTranslationSourceType, CmsPublishedTranslationSource[]>
    >(
      (result, source) => {
        result[source.sourceType].push(source);
        return result;
      },
      { pages: [], sections: [] }
    );

    async function loadPublishedTranslations() {
      const nextCompleteTranslations: CompleteTranslationMap = {};

      await Promise.all(
        (Object.entries(sourceGroups) as Array<
          [CmsPublishedTranslationSourceType, CmsPublishedTranslationSource[]]
        >).map(async ([sourceType, groupedSources]) => {
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
        })
      );

      if (isCurrent) {
        setCompleteTranslations(nextCompleteTranslations);
      }
    }

    void loadPublishedTranslations();

    return () => {
      isCurrent = false;
    };
  }, [language, sources]);

  const value = useMemo<CmsPublishedTranslationsContextValue>(
    () => ({
      sources: sourceMap,
      completeTranslations,
      language,
    }),
    [completeTranslations, language, sourceMap]
  );

  return (
    <CmsPublishedTranslationsContext.Provider value={value}>
      {children}
    </CmsPublishedTranslationsContext.Provider>
  );
}

export function CmsPublishedText({
  sourceKey,
  field,
  fallback,
  className,
}: {
  sourceKey: string;
  field: CmsPublishedTranslationField;
  fallback?: string;
  className?: string;
}) {
  const context = useContext(CmsPublishedTranslationsContext);
  const source = context?.sources[sourceKey];
  const translatedValue = context?.completeTranslations[sourceKey]?.[field]?.trim();
  const arabicFallback = source?.fallback[field] || fallback || "";
  const usesPublishedTranslation = Boolean(translatedValue);
  const text = translatedValue || arabicFallback;

  return (
    <span
      dir={usesPublishedTranslation ? "ltr" : "rtl"}
      lang={usesPublishedTranslation ? context?.language : "ar"}
      className={className}
    >
      {text}
    </span>
  );
}
