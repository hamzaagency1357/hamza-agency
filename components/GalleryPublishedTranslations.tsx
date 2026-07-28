"use client";

import { useEffect, useMemo, useState } from "react";
import { hasCompletePublishedTranslation, readPublishedTranslations, type PublishedTranslationMap } from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { localizeDynamicPublicCopy } from "@/lib/i18n/localizeDynamicPublicCopy";

export type GalleryTranslationRecord = { id: number; title: string | null; category: string | null; description: string | null; button_label: string | null; };
type GalleryTranslationField = "title" | "summary" | "content" | "button_label";
const fields: GalleryTranslationField[] = ["title", "summary", "content", "button_label"];

function sourceValue(item: GalleryTranslationRecord, field: GalleryTranslationField) { if (field === "title") return item.title || ""; if (field === "summary") return item.category || ""; if (field === "content") return item.description || ""; return item.button_label || ""; }
function activeFields(item: GalleryTranslationRecord) { return fields.filter((field) => Boolean(sourceValue(item, field).trim())); }
function localizeItem<T extends GalleryTranslationRecord>(item: T, translations: Partial<Record<GalleryTranslationField, string>> | undefined, language: "ar" | "en" | "tr"): T { const required = activeFields(item); if (language === "ar" || !required.length) return item; const hasTranslation = hasCompletePublishedTranslation(translations, required); const value = (field: GalleryTranslationField) => localizeDynamicPublicCopy(hasTranslation ? translations?.[field] : sourceValue(item, field), language); return { ...item, title: value("title"), category: value("summary"), description: value("content"), button_label: value("button_label") }; }

export function usePublishedGalleryItems<T extends GalleryTranslationRecord>(items: T[]) {
  const language = useSiteLanguage();
  const [translationMap, setTranslationMap] = useState<PublishedTranslationMap<GalleryTranslationField>>({});
  const translatableItems = useMemo(() => items.filter((item) => item.id < 900000), [items]);
  useEffect(() => { let active = true; setTranslationMap({}); if (language === "ar" || translatableItems.length === 0) return () => { active = false; }; async function loadTranslations() { const translations = await readPublishedTranslations<GalleryTranslationField>({ sourceType: "gallery_items", language, sourceIds: translatableItems.map((item) => item.id), fields }); if (active) setTranslationMap(translations); } void loadTranslations(); return () => { active = false; }; }, [language, translatableItems]);
  return useMemo(() => items.map((item) => item.id >= 900000 ? item : localizeItem(item, translationMap[String(item.id)], language)), [items, language, translationMap]);
}
