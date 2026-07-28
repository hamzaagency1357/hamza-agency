"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { localizeDynamicPublicCopy } from "@/lib/i18n/localizeDynamicPublicCopy";

export type JobTranslationRecord = {
  id: number | null;
  title: string | null;
  department: string | null;
  location: string | null;
  job_type: string | null;
  short_description: string | null;
  description: string | null;
  requirements: string | null;
};

type JobTranslationField =
  | "title"
  | "department"
  | "location"
  | "job_type"
  | "summary"
  | "content"
  | "requirements";

const fields: JobTranslationField[] = [
  "title",
  "department",
  "location",
  "job_type",
  "summary",
  "content",
  "requirements",
];

function fieldValue(job: JobTranslationRecord, field: JobTranslationField) {
  if (field === "title") return job.title || "";
  if (field === "department") return job.department || "";
  if (field === "location") return job.location || "";
  if (field === "job_type") return job.job_type || "";
  if (field === "summary") return job.short_description || "";
  if (field === "content") return job.description || "";
  return job.requirements || "";
}

function activeFields(job: JobTranslationRecord) {
  return fields.filter((field) => Boolean(fieldValue(job, field).trim()));
}

function localizeJob<T extends JobTranslationRecord>(
  job: T,
  translations: Partial<Record<JobTranslationField, string>> | undefined,
  language: "ar" | "en" | "tr"
): T {
  const required = activeFields(job);
  if (language === "ar" || required.length === 0) {
    return job;
  }

  const hasTranslation =
    job.id !== null &&
    hasCompletePublishedTranslation(translations, required);
  const value = (field: JobTranslationField) =>
    localizeDynamicPublicCopy(
      hasTranslation ? translations?.[field] : fieldValue(job, field),
      language
    );

  return {
    ...job,
    title: value("title"),
    department: value("department"),
    location: value("location"),
    job_type: value("job_type"),
    short_description: value("summary"),
    description: value("content"),
    requirements: value("requirements"),
  };
}

export function usePublishedJobs<T extends JobTranslationRecord>(jobs: T[]) {
  const language = useSiteLanguage();
  const [translationMap, setTranslationMap] = useState<
    PublishedTranslationMap<JobTranslationField>
  >({});

  useEffect(() => {
    let active = true;
    setTranslationMap({});
    const sourceIds = jobs
      .map((job) => job.id)
      .filter((id): id is number => typeof id === "number");

    if (language === "ar" || sourceIds.length === 0) {
      return () => {
        active = false;
      };
    }

    async function loadTranslations() {
      const translations = await readPublishedTranslations<JobTranslationField>({
        sourceType: "jobs",
        language,
        sourceIds,
        fields,
      });
      if (active) setTranslationMap(translations);
    }

    void loadTranslations();
    return () => {
      active = false;
    };
  }, [jobs, language]);

  return useMemo(
    () =>
      jobs.map((job) =>
        localizeJob(job, job.id === null ? undefined : translationMap[String(job.id)], language)
      ),
    [jobs, language, translationMap]
  );
}
