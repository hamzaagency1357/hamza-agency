"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { buildCmsTranslationMap, type CmsTranslationValues } from "@/lib/i18n/cmsTranslationMap";

export function usePublishedCmsTranslations(sourceIds: readonly string[]) {
  const language = useSiteLanguage();
  const [translations, setTranslations] = useState<Record<string, CmsTranslationValues>>({});
  const [isLoading, setIsLoading] = useState(false);
  const sourceIdsKey = sourceIds.join("|");

  useEffect(() => {
    let active = true;
    const ids = [...new Set(sourceIds.map((value) => value.trim()).filter(Boolean))];

    async function load() {
      if (language === "ar" || !supabase || ids.length === 0) {
        if (active) setTranslations({});
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from("content_translations")
        .select("source_id, field_name, translated_value")
        .eq("source_type", "pages")
        .eq("language", language)
        .eq("is_published", true)
        .in("status", ["published", "reviewed"])
        .in("source_id", ids)
        .in("field_name", ["title", "summary", "content"]);

      if (!active) return;
      setTranslations(error || !data ? {} : buildCmsTranslationMap(data));
      setIsLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [language, sourceIdsKey]);

  return { language, direction: getLanguageDirection(language), translations, isLoading };
}
