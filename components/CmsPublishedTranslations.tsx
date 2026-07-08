"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
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

const HOME_HERO_BRAND_LINE: Record<"ar" | "en" | "tr", string> = {
  ar: "وكالة حمزة",
  en: "Hamza Agency",
  tr: "Hamza Ajansı",
};

const HOME_HERO_CLEAN_AR_TITLE = "وكالة حمزة لإدارة وتطوير صناع المحتوى";

function hasRequiredCmsFields(source: CmsPublishedTranslationSource) {
  return source.requiredFields.length > 0 && Boolean(String(source.sourceId).trim());
}

function normalizeHomeHeroTitle(sourceKey: string, field: CmsPublishedTranslationField, value: string) {
  if (sourceKey !== "home-page" || field !== "title") {
    return value;
  }

  const normalizedValue = value.replace(/\s+/g, " ").trim();

  if (
    normalizedValue === "وكالة حمزة لإدارة وتطوير" ||
    normalizedValue === "وكالة حمزة لإدارة وتطوير وكالة حمزة"
  ) {
    return HOME_HERO_CLEAN_AR_TITLE;
  }

  return value;
}

function HomeHeroBrandLine({
  language,
  className,
}: {
  language: "ar" | "en" | "tr";
  className?: string;
}) {
  const placeholderRef = useRef<HTMLSpanElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const placeholder = placeholderRef.current;
    const wrapper = placeholder?.parentElement;
    const heading = placeholder?.closest("h1");
    const headingParent = heading?.parentElement;

    if (!placeholder || !wrapper || !heading || !headingParent) return;

    const brandLine = document.createElement("div");
    brandLine.dataset.homeHeroBrandLine = "true";
    brandLine.className = [heading.className, wrapper.className]
      .filter(Boolean)
      .join(" ");
    brandLine.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
    brandLine.setAttribute("lang", language);

    wrapper.setAttribute("aria-hidden", "true");
    wrapper.style.display = "none";
    heading.insertAdjacentElement("afterend", brandLine);
    setPortalTarget(brandLine);

    return () => {
      wrapper.style.display = "";
      wrapper.removeAttribute("aria-hidden");
      brandLine.remove();
    };
  }, [language]);

  return (
    <>
      <span
        ref={placeholderRef}
        data-home-hero-brand-placeholder="true"
        aria-hidden="true"
        className="sr-only"
      />
      {portalTarget
        ? createPortal(
            <span className={className}>{HOME_HERO_BRAND_LINE[language]}</span>,
            portalTarget
          )
        : null}
    </>
  );
}

export function CmsPublishedTranslationsProvider({
  sources,
  children,
}: {
  sources: ReadonlyArray<CmsPublishedTranslationSource>;
  children: ReactNode;
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
  const text = normalizeHomeHeroTitle(sourceKey, field, translatedValue || arabicFallback);

  /* The homepage public H1 already renders home-page.title.
     Render the legacy highlighted brand line visually outside the H1. */
  if (sourceKey === "home-hero" && field === "title") {
    const language = context?.language || "ar";

    return <HomeHeroBrandLine language={language} className={className} />;
  }

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
