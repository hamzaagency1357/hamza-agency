import type { SiteLanguage } from "@/lib/i18n/locale";

const FAQ_CATEGORY_LABELS: Record<string, Record<Exclude<SiteLanguage, "ar">, string>> = {
  "عام": { en: "General", tr: "Genel" },
  "أسئلة عامة": { en: "General questions", tr: "Genel sorular" },
  "الانضمام": { en: "Joining", tr: "Katılım" },
  "المتابعة": { en: "Follow-up", tr: "Takip" },
  "الخدمات": { en: "Services", tr: "Hizmetler" },
};

export function getFaqCategoryLabel(category: string, language: SiteLanguage): string {
  if (language === "ar") return category;
  return FAQ_CATEGORY_LABELS[category]?.[language] || category;
}
