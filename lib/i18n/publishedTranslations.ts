"use client";

import type { SiteLanguage } from "@/lib/i18n/locale";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const PUBLISHED_TRANSLATION_STATUS = "published" as const;
export type TranslationLanguage = Exclude<SiteLanguage, "ar">;
export type PublishedTranslationSource =
  | "programs"
  | "pages"
  | "sections"
  | "faqs"
  | "knowledge_base"
  | "partners"
  | "jobs"
  | "reviews"
  | "success_stories"
  | "gallery_items"
  | "announcements";
export type PublishedTranslationRow = {
  source_id: string;
  field_name: string | null;
  translated_value: string | null;
};
export type PublishedTranslationMap<FieldName extends string> = Record<
  string,
  Partial<Record<FieldName, string>>
>;
type ReadPublishedTranslationsOptions<FieldName extends string> = {
  sourceType: PublishedTranslationSource;
  language: SiteLanguage;
  sourceIds: ReadonlyArray<string | number>;
  fields: ReadonlyArray<FieldName>;
};

export function isTranslationLanguage(language: SiteLanguage): language is TranslationLanguage {
  return language === "en" || language === "tr";
}

export function buildPublishedTranslationMap<FieldName extends string>(
  rows: ReadonlyArray<PublishedTranslationRow>,
  fields: ReadonlyArray<FieldName>
): PublishedTranslationMap<FieldName> {
  const allowedFields = new Set<string>(fields);

  return rows.reduce<PublishedTranslationMap<FieldName>>((result, row) => {
    const value = row.translated_value?.trim();
    if (!row.source_id || !row.field_name || !value || !allowedFields.has(row.field_name)) {
      return result;
    }

    const fieldName = row.field_name as FieldName;
    const sourceTranslations = result[row.source_id] || {};
    sourceTranslations[fieldName] = value;
    result[row.source_id] = sourceTranslations;
    return result;
  }, {});
}

export function hasCompletePublishedTranslation<FieldName extends string>(
  translations: Partial<Record<FieldName, string>> | undefined,
  requiredFields: ReadonlyArray<FieldName>
) {
  return requiredFields.every((field) => Boolean(translations?.[field]?.trim()));
}

function mergePublishedTranslationMaps<FieldName extends string>(
  sourceIds: ReadonlyArray<string>,
  revisionTranslations: PublishedTranslationMap<FieldName>,
  legacyTranslations: PublishedTranslationMap<FieldName>
): PublishedTranslationMap<FieldName> {
  return sourceIds.reduce<PublishedTranslationMap<FieldName>>((result, sourceId) => {
    const legacy = legacyTranslations[sourceId];
    const revision = revisionTranslations[sourceId];
    if (!legacy && !revision) return result;

    // Revision values are the current public source. Legacy values only fill
    // fields that have not yet been backfilled to a published Revision.
    result[sourceId] = { ...(legacy || {}), ...(revision || {}) };
    return result;
  }, {});
}

export async function readPublishedTranslations<FieldName extends string>({
  sourceType,
  language,
  sourceIds,
  fields,
}: ReadPublishedTranslationsOptions<FieldName>): Promise<PublishedTranslationMap<FieldName>> {
  const uniqueSourceIds = [
    ...new Set(sourceIds.map((sourceId) => String(sourceId)).filter(Boolean)),
  ];

  if (
    !isSupabaseConfigured ||
    !supabase ||
    !isTranslationLanguage(language) ||
    uniqueSourceIds.length === 0 ||
    fields.length === 0
  ) {
    return {};
  }

  const [revisionResult, legacyResult] = await Promise.all([
    supabase.rpc("read_published_translation_revision_fields", {
      p_source_type: sourceType,
      p_source_ids: uniqueSourceIds,
      p_language: language,
    }),
    supabase
      .from("content_translations")
      .select("source_id, field_name, translated_value")
      .eq("source_type", sourceType)
      .eq("language", language)
      .eq("is_published", true)
      .eq("status", PUBLISHED_TRANSLATION_STATUS)
      .in("source_id", uniqueSourceIds)
      .in("field_name", [...fields]),
  ]);

  const revisionTranslations = revisionResult.error || !revisionResult.data
    ? {}
    : buildPublishedTranslationMap(
      revisionResult.data as PublishedTranslationRow[],
      fields
    );
  const legacyTranslations = legacyResult.error || !legacyResult.data
    ? {}
    : buildPublishedTranslationMap(
      legacyResult.data as PublishedTranslationRow[],
      fields
    );

  return mergePublishedTranslationMaps(
    uniqueSourceIds,
    revisionTranslations,
    legacyTranslations
  );
}
