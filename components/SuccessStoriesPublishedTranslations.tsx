"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { localizeDynamicPublicCopy } from "@/lib/i18n/localizeDynamicPublicCopy";

export type SuccessStoryTranslationRecord = {
  id: number;
  title: string | null;
  person_name: string | null;
  country: string | null;
  platform: string | null;
  result_summary: string | null;
  story: string | null;
};

type SuccessStoryTranslationField =
  | "title"
  | "person_name"
  | "country"
  | "platform"
  | "summary"
  | "content";

const fields: SuccessStoryTranslationField[] = [
  "title",
  "person_name",
  "country",
  "platform",
  "summary",
  "content",
];

function sourceValue(story: SuccessStoryTranslationRecord, field: SuccessStoryTranslationField) {
  if (field === "title") return story.title || "";
  if (field === "person_name") return story.person_name || "";
  if (field === "country") return story.country || "";
  if (field === "platform") return story.platform || "";
  if (field === "summary") return story.result_summary || "";
  return story.story || "";
}

function activeFields(story: SuccessStoryTranslationRecord) {
  return fields.filter((field) => Boolean(sourceValue(story, field).trim()));
}

function localizeStory<T extends SuccessStoryTranslationRecord>(
  story: T,
  translations: Partial<Record<SuccessStoryTranslationField, string>> | undefined,
  language: "ar" | "en" | "tr"
): T {
  const required = activeFields(story);
  if (language === "ar" || !required.length) {
    return story;
  }

  const hasTranslation = hasCompletePublishedTranslation(
    translations,
    required
  );
  const value = (field: SuccessStoryTranslationField) =>
    localizeDynamicPublicCopy(
      hasTranslation
        ? translations?.[field]
        : sourceValue(story, field),
      language
    );

  return {
    ...story,
    title: value("title"),
    person_name: value("person_name"),
    country: value("country"),
    platform: value("platform"),
    result_summary: value("summary"),
    story: value("content"),
  };
}

export function usePublishedSuccessStories<T extends SuccessStoryTranslationRecord>(stories: T[]) {
  const language = useSiteLanguage();
  const [translationMap, setTranslationMap] = useState<PublishedTranslationMap<SuccessStoryTranslationField>>({});

  useEffect(() => {
    let active = true;
    setTranslationMap({});
    if (language === "ar" || stories.length === 0) {
      return () => {
        active = false;
      };
    }

    async function loadTranslations() {
      const translations = await readPublishedTranslations<SuccessStoryTranslationField>({
        sourceType: "success_stories",
        language,
        sourceIds: stories.map((story) => story.id),
        fields,
      });
      if (active) setTranslationMap(translations);
    }

    void loadTranslations();
    return () => {
      active = false;
    };
  }, [stories, language]);

  return useMemo(
    () => stories.map((story) => localizeStory(story, translationMap[String(story.id)], language)),
    [stories, language, translationMap]
  );
}
