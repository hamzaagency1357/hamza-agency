import type { SiteLanguage } from "@/lib/i18n/locale";

export type StaticCopyKey =
  | "home"
  | "programs"
  | "services"
  | "contact"
  | "applyNow"
  | "learnMore"
  | "availableNow"
  | "backHome"
  | "whatsapp"
  | "languageScope";

type StaticCopy = Record<StaticCopyKey, string>;

const staticCopy: Record<SiteLanguage, StaticCopy> = {
  ar: {
    home: "الرئيسية",
    programs: "البرامج",
    services: "الخدمات",
    contact: "اتصل بنا",
    applyNow: "انضم الآن",
    learnMore: "التفاصيل",
    availableNow: "متاح الآن",
    backHome: "العودة إلى الرئيسية",
    whatsapp: "واتساب",
    languageScope: "تتبدل الصفحات التي تم ربطها بالترجمة. أي نص غير مترجم يبقى بالعربية حتى تكتمل ترجمته.",
  },
  en: {
    home: "Home",
    programs: "Programs",
    services: "Services",
    contact: "Contact",
    applyNow: "Join now",
    learnMore: "Details",
    availableNow: "Available now",
    backHome: "Back to home",
    whatsapp: "WhatsApp",
    languageScope: "Translated pages switch to the selected language. Any untranslated text remains in Arabic until its translation is ready.",
  },
  tr: {
    home: "Ana sayfa",
    programs: "Programlar",
    services: "Hizmetler",
    contact: "İletişim",
    applyNow: "Şimdi katıl",
    learnMore: "Detaylar",
    availableNow: "Şimdi açık",
    backHome: "Ana sayfaya dön",
    whatsapp: "WhatsApp",
    languageScope: "Çevrisi bağlanan sayfalar seçilen dile geçer. Çevrilmemiş metinler çeviri hazır olana kadar Arapça kalır.",
  },
};

export function getStaticCopy(language: SiteLanguage, key: StaticCopyKey): string {
  return staticCopy[language][key] || staticCopy.ar[key];
}
