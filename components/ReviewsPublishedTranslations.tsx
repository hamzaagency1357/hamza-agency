"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export type ReviewTranslationRecord = {
  id: number;
  reviewer_name: string | null;
  country: string | null;
  platform: string | null;
  content: string | null;
};

type ReviewTranslationField = "title" | "summary" | "content" | "country";
const fields: ReviewTranslationField[] = ["title", "summary", "content", "country"];

function sourceValue(review: ReviewTranslationRecord, field: ReviewTranslationField) {
  if (field === "title") return review.reviewer_name || "";
  if (field === "summary") return review.platform || "";
  if (field === "country") return review.country || "";
  return review.content || "";
}

function activeFields(review: ReviewTranslationRecord) {
  return fields.filter((field) => Boolean(sourceValue(review, field).trim()));
}

function localizeReview<T extends ReviewTranslationRecord>(
  review: T,
  translations: Partial<Record<ReviewTranslationField, string>> | undefined,
  language: "ar" | "en" | "tr"
): T {
  const required = activeFields(review);
  if (language === "ar" || !required.length || !hasCompletePublishedTranslation(translations, required)) return review;
  return {
    ...review,
    reviewer_name: translations?.title || review.reviewer_name,
    platform: translations?.summary || review.platform,
    country: translations?.country || review.country,
    content: translations?.content || review.content,
  };
}

export function usePublishedReviews<T extends ReviewTranslationRecord>(reviews: T[]) {
  const language = useSiteLanguage();
  const [translationMap, setTranslationMap] = useState<PublishedTranslationMap<ReviewTranslationField>>({});

  useEffect(() => {
    let active = true;
    setTranslationMap({});
    if (language === "ar" || reviews.length === 0) return () => { active = false; };

    async function loadTranslations() {
      const translations = await readPublishedTranslations<ReviewTranslationField>({
        sourceType: "reviews",
        language,
        sourceIds: reviews.map((review) => review.id),
        fields,
      });
      if (active) setTranslationMap(translations);
    }
    void loadTranslations();
    return () => { active = false; };
  }, [reviews, language]);

  return useMemo(
    () => reviews.map((review) => localizeReview(review, translationMap[String(review.id)], language)),
    [reviews, language, translationMap]
  );
}
