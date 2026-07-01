"use client";

import { useEffect, useMemo, useState } from "react";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const KNOWLEDGE_TRANSLATION_FIELDS = ["title", "summary", "content"] as const;

type TranslationField = (typeof KNOWLEDGE_TRANSLATION_FIELDS)[number];

type KnowledgeItem = {
  id: number;
  title: string | null;
  summary: string | null;
  content: string | null;
  category: string | null;
};

type DisplayKnowledge = {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  direction: "rtl" | "ltr";
};

function groupKnowledge(items: DisplayKnowledge[]) {
  return items.reduce<Record<string, DisplayKnowledge[]>>((groups, item) => {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category].push(item);
    return groups;
  }, {});
}

export default function KnowledgeListWithTranslations({ knowledge }: { knowledge: KnowledgeItem[] }) {
  const language = useSiteLanguage();
  const [translations, setTranslations] = useState<PublishedTranslationMap<TranslationField>>({});

  useEffect(() => {
    let isActive = true;

    async function loadTranslations() {
      const nextTranslations = await readPublishedTranslations({
        sourceType: "knowledge_base",
        language,
        sourceIds: knowledge.map((item) => item.id),
        fields: KNOWLEDGE_TRANSLATION_FIELDS,
      });

      if (isActive) {
        setTranslations(nextTranslations);
      }
    }

    void loadTranslations();

    return () => {
      isActive = false;
    };
  }, [knowledge, language]);

  const groupedKnowledge = useMemo(() => {
    const displayKnowledge: DisplayKnowledge[] = knowledge.map((item) => {
      const translation = translations[String(item.id)];
      const hasPublishedTranslation = hasCompletePublishedTranslation(
        translation,
        KNOWLEDGE_TRANSLATION_FIELDS
      );

      return {
        id: item.id,
        title: hasPublishedTranslation ? translation?.title || "" : item.title || "مقال من مركز المعرفة",
        summary: hasPublishedTranslation ? translation?.summary || "" : item.summary || "",
        content: hasPublishedTranslation ? translation?.content || "" : item.content || "المحتوى غير متوفر حالياً.",
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
