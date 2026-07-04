import type { SiteLanguage } from "@/lib/i18n/locale";

const KNOWLEDGE_CATEGORY_LABELS: Record<string, Record<Exclude<SiteLanguage, "ar">, string>> = {
  "الانضمام": { en: "Joining", tr: "Katılım" },
  "الطلبات": { en: "Applications", tr: "Başvurular" },
  "صناع المحتوى": { en: "Content creators", tr: "İçerik üreticileri" },
  "الخدمات الرقمية": { en: "Digital services", tr: "Dijital hizmetler" },
  "مقالات عامة": { en: "General articles", tr: "Genel makaleler" },
};

export function getKnowledgeCategoryLabel(category: string, language: SiteLanguage): string {
  if (language === "ar") return category;
  return KNOWLEDGE_CATEGORY_LABELS[category]?.[language] || category;
}
