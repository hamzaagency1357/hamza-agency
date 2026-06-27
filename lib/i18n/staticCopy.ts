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
  | "languageScope"
  | "programsEyebrow"
  | "programsHeroTitle"
  | "programsHeroAccent"
  | "programsHeroDescription"
  | "programsHighlightDirectApply"
  | "programsHighlightReview"
  | "programsHighlightWhatsApp"
  | "programsHighlightBestFit"
  | "programsHelpTitle"
  | "programsHelpDescription"
  | "programsWhatsAppCta"
  | "programsDetailsHelper"
  | "programsStatusLimited"
  | "programsStatusPaused"
  | "programsStatusUnavailable"
  | "programsStatusClosed"
  | "programsVisualShortVideos"
  | "programsVisualLiveStream"
  | "programsVisualCommunityLive"
  | "programsVisualCreators"
  | "programsVisualSocial"
  | "programsVisualAgency"
  | "programsFallbackSummary"
  | "programsLogoAlt";

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
    programsEyebrow: "برامج وكالة حمزة",
    programsHeroTitle: "اختر البرنامج المناسب",
    programsHeroAccent: "وابدأ طلب الانضمام",
    programsHeroDescription: "استعرض البرامج المتاحة حالياً لدى وكالة حمزة، وتعرّف على طبيعة كل برنامج قبل إرسال طلب الانضمام للفريق المناسب.",
    programsHighlightDirectApply: "تقديم مباشر من الموقع",
    programsHighlightReview: "مراجعة الطلب من فريق الوكالة",
    programsHighlightWhatsApp: "متابعة عبر واتساب عند الحاجة",
    programsHighlightBestFit: "اختيار البرنامج الأنسب لك",
    programsHelpTitle: "لا تعرف أي برنامج مناسب لك؟",
    programsHelpDescription: "يمكنك اختيار البرنامج الأقرب لك وإرسال الطلب، وسيقوم فريق الوكالة بمراجعة المعلومات والتواصل معك عبر واتساب عند الحاجة.",
    programsWhatsAppCta: "تواصل واتساب",
    programsDetailsHelper: "اضغط لعرض الشروط والتفاصيل",
    programsStatusLimited: "قبول محدود",
    programsStatusPaused: "متوقف مؤقتاً",
    programsStatusUnavailable: "غير متاح",
    programsStatusClosed: "مغلق",
    programsVisualShortVideos: "فيديوهات قصيرة",
    programsVisualLiveStream: "بث مباشر",
    programsVisualCommunityLive: "مجتمع وبث",
    programsVisualCreators: "برنامج صناع المحتوى",
    programsVisualSocial: "محتوى اجتماعي",
    programsVisualAgency: "برنامج وكالة",
    programsFallbackSummary: "برنامج متاح حالياً ضمن وكالة حمزة لصناع المحتوى.",
    programsLogoAlt: "شعار",
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
    programsEyebrow: "HAMZA AGENCY Programs",
    programsHeroTitle: "Choose the right program",
    programsHeroAccent: "and start your application",
    programsHeroDescription: "Explore the programs currently available at HAMZA AGENCY and understand each program before applying to the right team.",
    programsHighlightDirectApply: "Apply directly on the website",
    programsHighlightReview: "Application review by our agency team",
    programsHighlightWhatsApp: "WhatsApp follow-up when needed",
    programsHighlightBestFit: "Find the best program for you",
    programsHelpTitle: "Not sure which program suits you?",
    programsHelpDescription: "Choose the closest program and send your application. Our agency team will review your details and contact you through WhatsApp when needed.",
    programsWhatsAppCta: "Contact us on WhatsApp",
    programsDetailsHelper: "View requirements and details",
    programsStatusLimited: "Limited spots",
    programsStatusPaused: "Temporarily paused",
    programsStatusUnavailable: "Unavailable",
    programsStatusClosed: "Closed",
    programsVisualShortVideos: "Short videos",
    programsVisualLiveStream: "Live streaming",
    programsVisualCommunityLive: "Community and live",
    programsVisualCreators: "Creator program",
    programsVisualSocial: "Social content",
    programsVisualAgency: "Agency program",
    programsFallbackSummary: "A program currently available at HAMZA AGENCY for content creators.",
    programsLogoAlt: "logo",
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
    programsEyebrow: "HAMZA AGENCY Programları",
    programsHeroTitle: "Size uygun programı seçin",
    programsHeroAccent: "ve başvurunuzu başlatın",
    programsHeroDescription: "HAMZA AGENCY'de şu anda açık olan programları inceleyin ve doğru ekibe başvurmadan önce her programı tanıyın.",
    programsHighlightDirectApply: "Web sitesinden doğrudan başvuru",
    programsHighlightReview: "Başvurunun ajans ekibi tarafından incelenmesi",
    programsHighlightWhatsApp: "Gerektiğinde WhatsApp üzerinden takip",
    programsHighlightBestFit: "Size en uygun programı seçin",
    programsHelpTitle: "Hangi programın size uygun olduğundan emin değil misiniz?",
    programsHelpDescription: "Size en yakın programı seçip başvurunuzu gönderin. Ajans ekibimiz bilgilerinizi inceleyip gerektiğinde WhatsApp üzerinden sizinle iletişime geçer.",
    programsWhatsAppCta: "WhatsApp ile iletişime geçin",
    programsDetailsHelper: "Koşulları ve detayları görüntüleyin",
    programsStatusLimited: "Kontenjan sınırlı",
    programsStatusPaused: "Geçici olarak duraklatıldı",
    programsStatusUnavailable: "Uygun değil",
    programsStatusClosed: "Kapalı",
    programsVisualShortVideos: "Kısa videolar",
    programsVisualLiveStream: "Canlı yayın",
    programsVisualCommunityLive: "Topluluk ve canlı yayın",
    programsVisualCreators: "İçerik üreticisi programı",
    programsVisualSocial: "Sosyal içerik",
    programsVisualAgency: "Ajans programı",
    programsFallbackSummary: "İçerik üreticileri için HAMZA AGENCY kapsamında şu anda açık olan bir program.",
    programsLogoAlt: "logo",
  },
};

export function getStaticCopy(language: SiteLanguage, key: StaticCopyKey): string {
  return staticCopy[language][key] || staticCopy.ar[key];
}
