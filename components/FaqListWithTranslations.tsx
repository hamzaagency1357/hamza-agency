"use client";

import { useEffect, useMemo, useState } from "react";
import { getFaqCategoryLabel } from "@/lib/i18n/faqCategories";
import {
  hasCompletePublishedTranslation,
  readPublishedTranslations,
  type PublishedTranslationMap,
} from "@/lib/i18n/publishedTranslations";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const FAQ_TRANSLATION_FIELDS = ["title", "summary", "content"] as const;

type TranslationField = (typeof FAQ_TRANSLATION_FIELDS)[number];

type FaqItem = {
  id: number;
  question: string | null;
  answer: string | null;
  category: string | null;
};

type DisplayFaq = {
  id: number;
  question: string;
  answer: string;
  category: string;
  direction: "rtl" | "ltr";
};

function groupFaqs(faqs: DisplayFaq[]) {
  return faqs.reduce<Record<string, DisplayFaq[]>>((groups, faq) => {
    if (!groups[faq.category]) groups[faq.category] = [];
    groups[faq.category].push(faq);
    return groups;
  }, {});
}

export default function FaqListWithTranslations({ faqs }: { faqs: FaqItem[] }) {
  const language = useSiteLanguage();
  const [translations, setTranslations] = useState<PublishedTranslationMap<TranslationField>>({});

  useEffect(() => {
    let isActive = true;

    async function loadTranslations() {
      const nextTranslations = await readPublishedTranslations({
        sourceType: "faqs",
        language,
        sourceIds: faqs.map((faq) => faq.id),
        fields: FAQ_TRANSLATION_FIELDS,
      });

      if (isActive) setTranslations(nextTranslations);
    }

    void loadTranslations();

    return () => {
      isActive = false;
    };
  }, [faqs, language]);

  const groupedFaqs = useMemo(() => {
    const displayFaqs: DisplayFaq[] = faqs.map((faq) => {
      const translation = translations[String(faq.id)];
      const hasPublishedTranslation = hasCompletePublishedTranslation(
        translation,
        FAQ_TRANSLATION_FIELDS
      );

      return {
        id: faq.id,
        question: hasPublishedTranslation ? translation?.title || "" : faq.question || "سؤال شائع",
        answer: hasPublishedTranslation ? translation?.content || "" : faq.answer || "الإجابة غير متوفرة حالياً.",
        category: hasPublishedTranslation ? translation?.summary || "" : faq.category || "أسئلة عامة",
        direction: hasPublishedTranslation && language !== "ar" ? "ltr" : "rtl",
      };
    });

    return groupFaqs(displayFaqs);
  }, [faqs, language, translations]);

  return (
    <div className="mt-10 space-y-8">
      {Object.entries(groupedFaqs).map(([category, items]) => (
        <div key={category} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <div
            className="mb-6 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100"
            dir={items[0]?.direction || (language === "ar" ? "rtl" : "ltr")}
          >
            {getFaqCategoryLabel(category, language)}
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
