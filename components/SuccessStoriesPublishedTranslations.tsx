"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

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
  if (language === "ar" || !required.length || !hasCompletePublishedTranslation(translations, required)) {
    return story;
  }

  return {
    ...story,
    title: translations?.title || story.title,
    person_name: translations?.person_name || story.person_name,
    country: translations?.country || story.country,
    platform: translations?.platform || story.platform,
    result_summary: translations?.summary || story.result_summary,
    story: translations?.content || story.story,
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
