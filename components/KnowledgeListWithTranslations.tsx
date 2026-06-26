"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SiteLanguage = "ar" | "en" | "tr";
type TranslationField = "title" | "summary" | "content";

type KnowledgeItem = {
  id: number;
  title: string | null;
  summary: string | null;
  content: string | null;
  category: string | null;
};

type TranslationRow = {
  source_id: string;
  field_name: TranslationField;
  translated_value: string | null;
};

type TranslationMap = Record<string, Partial<Record<TranslationField, string>>>;

type DisplayKnowledge = {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  direction: "rtl" | "ltr";
};

const LANGUAGE_STORAGE_KEY = "hamza-agency-language";

function normalizeLanguage(value: string | null): SiteLanguage {
  if (value === "en" || value === "tr") return value;
  return "ar";
}

function getStoredLanguage(): SiteLanguage {
  if (typeof window === "undefined") return "ar";
  return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
}

function buildTranslationMap(rows: TranslationRow[]) {
  return rows.reduce((result, row) => {
    if (!row.translated_value?.trim()) return result;
    result[row.source_id] = result[row.source_id] || {};
    result[row.source_id][row.field_name] = row.translated_value.trim();
    return result;
  }, {} as TranslationMap);
}

function groupKnowledge(items: DisplayKnowledge[]) {
  return items.reduce<Record<string, DisplayKnowledge[]>>((groups, item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
    return groups;
  }, {});
}

export default function KnowledgeListWithTranslations({ knowledge }: { knowledge: KnowledgeItem[] }) {
  const [language, setLanguage] = useState<SiteLanguage>("ar");
  const [translations, setTranslations] = useState<TranslationMap>({});

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredLanguage());
    }

    syncLanguage();
    window.addEventListener("hamza-language-change", syncLanguage);
    window.addEventListener("storage", syncLanguage);

    return () => {
      window.removeEventListener("hamza-language-change", syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadTranslations() {
      if (!supabase || language === "ar" || knowledge.length === 0) {
        if (isMounted) setTranslations({});
        return;
      }

      const knowledgeIds = knowledge.map((item) => String(item.id));
      const { data, error } = await supabase
        .from("content_translations")
        .select("source_id, field_name, translated_value")
        .eq("source_type", "knowledge_base")
        .eq("language", language)
        .eq("is_published", true)
        .in("status", ["published", "reviewed"])
        .in("source_id", knowledgeIds);

      if (!isMounted) return;
      setTranslations(error || !data ? {} : buildTranslationMap(data as TranslationRow[]));
    }

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, [knowledge, language]);

  const groupedKnowledge = useMemo(() => {
    const displayKnowledge: DisplayKnowledge[] = knowledge.map((item) => {
      const translation = translations[String(item.id)] || {};
      const hasPublishedTranslation = Boolean(
        translation.title?.trim() && translation.summary?.trim() && translation.content?.trim()
      );

      return {
        id: item.id,
        title: hasPublishedTranslation ? translation.title || "" : item.title || "مقال من مركز المعرفة",
        summary: hasPublishedTranslation ? translation.summary || "" : item.summary || "",
        content: hasPublishedTranslation ? translation.content || "" : item.content || "المحتوى غير متوفر حالياً.",
        category: item.category || "مقالات عامة",
        direction: hasPublishedTranslation && language !== "ar" ? "ltr" : "rtl",
      };
    });

    return groupKnowledge(displayKnowledge);
  }, [knowledge, language, translations]);

  return (
    <div className="mt-10 space-y-8">
      {Object.entries(groupedKnowledge).map(([category, items]) => (
        <div key={category} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <div className="mb-6 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100" dir="rtl">
            {category}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-5" dir={item.direction}>
                <h2 className="text-2xl font-black">{item.title}</h2>
                {item.summary && <p className="mt-4 leading-8 text-purple-100/80">{item.summary}</p>}
                <p className="mt-4 whitespace-pre-wrap leading-9 text-white/68">{item.content}</p>
              </article>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
