import type { SiteLanguage } from "@/lib/i18n/locale";

export type StaticCopyKey =
  | "home"
  | "programs"
  | "about"
  | "services"
  | "digitalServices"
  | "serviceRequest"
  | "serviceStatus"
  | "applicationStatus"
  | "jobs"
  | "reviews"
  | "successStories"
  | "partners"
  | "gallery"
  | "knowledgeCenter"
  | "faq"
  | "aiSupport"
  | "privacyPolicy"
  | "termsAndConditions"
  | "aiPolicy"
  | "contact"
  | "applyNow"
  | "learnMore"
  | "discoverMore"
  | "readMore"
  | "viewAll"
  | "availableNow"
  | "backHome"
  | "whatsapp"
  | "openWhatsApp"
  | "languageScope"
  | "languageInterface"
  | "languageSwitcherLabel"
  | "quickNavTitle"
  | "quickNavDescription"
  | "quickNavOpen"
  | "quickNavClose"
  | "footerSiteLinks"
  | "footerLegalPages"
  | "footerContact"
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
    about: "من نحن",
    services: "الخدمات",
    digitalServices: "الخدمات الرقمية",
    serviceRequest: "طلب خدمة",
    serviceStatus: "تتبع طلب خدمة",
    applicationStatus: "تتبع طلب الانضمام",
    jobs: "الوظائف",
    reviews: "التقييمات",
    successStories: "قصص النجاح",
    partners: "الشركاء والبرامج",
    gallery: "المعرض",
    knowledgeCenter: "مركز المعرفة",
    faq: "الأسئلة الشائعة",
    aiSupport: "الدعم الذكي",
    privacyPolicy: "سياسة الخصوصية",
    termsAndConditions: "الشروط والأحكام",
    aiPolicy: "سياسة الذكاء الاصطناعي",
    contact: "اتصل بنا",
    applyNow: "انضم الآن",
    learnMore: "التفاصيل",
    discoverMore: "اكتشف المزيد",
    readMore: "اقرأ المزيد",
    viewAll: "عرض الكل",
    availableNow: "متاح الآن",
    backHome: "العودة إلى الرئيسية",
    whatsapp: "واتساب",
    openWhatsApp: "فتح واتساب",
    languageScope: "تتبدل الصفحات التي تم ربطها بالترجمة. أي نص غير مترجم يبقى بالعربية حتى تكتمل ترجمته.",
    languageInterface: "واجهة اللغة",
    languageSwitcherLabel: "تبديل لغة الواجهة",
    quickNavTitle: "قائمة الموقع",
    quickNavDescription: "تنقل سريع بين صفحات الموقع العامة، بدون روابط لوحة الإدارة.",
    quickNavOpen: "فتح القائمة",
    quickNavClose: "إغلاق القائمة",
    footerSiteLinks: "روابط الموقع",
    footerLegalPages: "الصفحات القانونية",
    footerContact: "التواصل",
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
    about: "About us",
    services: "Services",
    digitalServices: "Digital services",
    serviceRequest: "Request a service",
    serviceStatus: "Track service request",
    applicationStatus: "Track application",
    jobs: "Careers",
    reviews: "Reviews",
    successStories: "Success stories",
    partners: "Partners and programs",
    gallery: "Gallery",
    knowledgeCenter: "Knowledge center",
    faq: "Frequently asked questions",
    aiSupport: "AI support",
    privacyPolicy: "Privacy policy",
    termsAndConditions: "Terms and conditions",
    aiPolicy: "AI policy",
    contact: "Contact",
    applyNow: "Join now",
    learnMore: "Details",
    discoverMore: "Discover more",
    readMore: "Read more",
    viewAll: "View all",
    availableNow: "Available now",
    backHome: "Back to home",
    whatsapp: "WhatsApp",
    openWhatsApp: "Open WhatsApp",
    languageScope: "Translated pages switch to the selected language. Any untranslated text remains in Arabic until its translation is ready.",
    languageInterface: "Language UI",
    languageSwitcherLabel: "Switch interface language",
    quickNavTitle: "Site menu",
    quickNavDescription: "Quick navigation between public website pages, without admin links.",
    quickNavOpen: "Open menu",
    quickNavClose: "Close menu",
    footerSiteLinks: "Site links",
    footerLegalPages: "Legal pages",
    footerContact: "Contact",
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
    about: "Hakkımızda",
    services: "Hizmetler",
    digitalServices: "Dijital hizmetler",
    serviceRequest: "Hizmet talebi",
    serviceStatus: "Hizmet talibini takip et",
    applicationStatus: "Başvuruyu takip et",
    jobs: "Kariyer",
    reviews: "Yorumlar",
    successStories: "Başarı hikâyeleri",
    partners: "İş ortakları ve programlar",
    gallery: "Galeri",
    knowledgeCenter: "Bilgi merkezi",
    faq: "Sık sorulan sorular",
    aiSupport: "Yapay zekâ desteği",
    privacyPolicy: "Gizlilik politikası",
    termsAndConditions: "Şartlar ve koşullar",
    aiPolicy: "Yapay zekâ politikası",
    contact: "İletişim",
    applyNow: "Şimdi katıl",
    learnMore: "Detaylar",
    discoverMore: "Daha fazlasını keşfedin",
    readMore: "Devamını oku",
    viewAll: "Tümünü görüntüle",
    availableNow: "Şimdi açık",
    backHome: "Ana sayfaya dön",
    whatsapp: "WhatsApp",
    openWhatsApp: "WhatsApp'ı aç",
    languageScope: "Çevrisi bağlanan sayfalar seçilen dile geçer. Çevrilmemiş metinler çeviri hazır olana kadar Arapça kalır.",
    languageInterface: "Dil arayüzü",
    languageSwitcherLabel: "Arayüz dilini değiştir",
    quickNavTitle: "Site menüsü",
    quickNavDescription: "Yönetim bağlantıları olmadan genel site sayfaları arasında hızlı gezinme.",
    quickNavOpen: "Menüyü aç",
    quickNavClose: "Menüyü kapat",
    footerSiteLinks: "Site bağlantıları",
    footerLegalPages: "Yasal sayfalar",
    footerContact: "İletişim",
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
