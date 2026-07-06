"use client";

import type { SiteLanguage } from "@/lib/i18n/locale";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export const PUBLISHED_TRANSLATION_STATUS = "published" as const;
export type TranslationLanguage = Exclude<SiteLanguage, "ar">;
export type PublishedTranslationSource = "programs" | "pages" | "sections" | "faqs" | "knowledge_base" | "partners" | "jobs" | "reviews" | "success_stories" | "gallery_items" | "announcements";
export type PublishedTranslationRow = { source_id: string; field_name: string | null; translated_value: string | null; };
export type PublishedTranslationMap<FieldName extends string> = Record<string, Partial<Record<FieldName, string>>>;
type ReadPublishedTranslationsOptions<FieldName extends string> = { sourceType: PublishedTranslationSource; language: SiteLanguage; sourceIds: ReadonlyArray<string | number>; fields: ReadonlyArray<FieldName>; };
export function isTranslationLanguage(language: SiteLanguage): language is TranslationLanguage { return language === "en" || language === "tr"; }
export function buildPublishedTranslationMap<FieldName extends string>(rows: ReadonlyArray<PublishedTranslationRow>, fields: ReadonlyArray<FieldName>): PublishedTranslationMap<FieldName> { const allowedFields = new Set<string>(fields); return rows.reduce<PublishedTranslationMap<FieldName>>((result, row) => { const value = row.translated_value?.trim(); if (!row.source_id || !row.field_name || !value || !allowedFields.has(row.field_name)) return result; const fieldName = row.field_name as FieldName; const sourceTranslations = result[row.source_id] || {}; sourceTranslations[fieldName] = value; result[row.source_id] = sourceTranslations; return result; }, {}); }
export function hasCompletePublishedTranslation<FieldName extends string>(translations: Partial<Record<FieldName, string>> | undefined, requiredFields: ReadonlyArray<FieldName>) { return requiredFields.every((field) => Boolean(translations?.[field]?.trim())); }
export async function readPublishedTranslations<FieldName extends string>({ sourceType, language, sourceIds, fields }: ReadPublishedTranslationsOptions<FieldName>): Promise<PublishedTranslationMap<FieldName>> { const uniqueSourceIds = [...new Set(sourceIds.map((sourceId) => String(sourceId)).filter(Boolean))]; if (!isSupabaseConfigured || !supabase || !isTranslationLanguage(language) || uniqueSourceIds.length === 0 || fields.length === 0) return {}; const { data, error } = await supabase.from("content_translations").select("source_id, field_name, translated_value").eq("source_type", sourceType).eq("language", language).eq("is_published", true).eq("status", PUBLISHED_TRANSLATION_STATUS).in("source_id", uniqueSourceIds).in("field_name", [...fields]); if (error || !data) return {}; return buildPublishedTranslationMap(data as PublishedTranslationRow[], fields); }
