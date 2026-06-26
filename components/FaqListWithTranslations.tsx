"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type SiteLanguage = "ar" | "en" | "tr";
type TranslationField = "title" | "summary" | "content";

type FaqItem = {
  id: number;
  question: string | null;
  answer: string | null;
  category: string | null;
};

type TranslationRow = {
  source_id: string;
  field_name: TranslationField;
  translated_value: string | null;
};

type TranslationMap = Record<string, Partial<Record<TranslationField, string>>>;

type DisplayFaq = {
  id: number;
  question: string;
  answer: string;
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

function groupFaqs(faqs: DisplayFaq[]) {
  return faqs.reduce<Record<string, DisplayFaq[]>>((groups, faq) => {
    if (!groups[faq.category]) groups[faq.category] = [];
    groups[faq.category].push(faq);
    return groups;
  }, {});
}

export default function FaqListWithTranslations({ faqs }: { faqs: FaqItem[] }) {
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
      if (!supabase || language === "ar" || faqs.length === 0) {
        if (isMounted) setTranslations({});
        return;
      }

      const faqIds = faqs.map((faq) => String(faq.id));
      const { data, error } = await supabase
        .from("content_translations")
        .select("source_id, field_name, translated_value")
        .eq("source_type", "faqs")
        .eq("language", language)
        .eq("is_published", true)
        .in("status", ["published", "reviewed"])
        .in("source_id", faqIds);

      if (!isMounted) return;
      setTranslations(error || !data ? {} : buildTranslationMap(data as TranslationRow[]));
    }

    loadTranslations();

    return () => {
      isMounted = false;
    };
  }, [language, faqs]);

  const groupedFaqs = useMemo(() => {
    const displayFaqs: DisplayFaq[] = faqs.map((faq) => {
      const translation = translations[String(faq.id)] || {};
      const hasPublishedTranslation = Boolean(
        translation.title?.trim() && translation.summary?.trim() && translation.content?.trim()
      );

      return {
        id: faq.id,
        question: hasPublishedTranslation ? translation.title || "" : faq.question || "سؤال شائع",
        answer: hasPublishedTranslation ? translation.content || "" : faq.answer || "الإجابة غير متوفرة حالياً.",
        category: hasPublishedTranslation ? translation.summary || "" : faq.category || "أسئلة عامة",
        direction: hasPublishedTranslation && language !== "ar" ? "ltr" : "rtl",
      };
    });

    return groupFaqs(displayFaqs);
  }, [faqs, language, translations]);

  return (
    <div className="mt-10 space-y-8">
      {Object.entries(groupedFaqs).map(([category, items]) => (
        <div key={category} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <div className="mb-6 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100" dir={items[0]?.direction || "rtl"}>
            {category}
          </div>

          <div className="grid gap-4">
            {items.map((faq) => (
              <div key={faq.id} className="rounded-2xl border border-white/10 bg-black/25 p-5" dir={faq.direction}>
                <h2 className="text-2xl font-black">{faq.question}</h2>
                <p className="mt-4 whitespace-pre-wrap leading-9 text-white/70">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
