import type { SiteLanguage } from "@/lib/i18n/locale";

export type HomeStaticCopy = {
  stats: readonly (readonly [value: string, label: string])[];
  statusLimited: string;
  statusPaused: string;
  statusAvailable: string;
  whyTitle: string;
  whyItems: readonly string[];
  close: string;
  fullNamePlaceholder: string;
  countryPlaceholder: string;
  whatsappPlaceholder: string;
  previousExperienceTitle: string;
  previousExperiencePrompt: string;
  previousExperiencePlaceholder: string;
  notesPlaceholder: string;
  requiredFieldsMessage: string;
  databaseUnavailableMessage: string;
  duplicateApplicationMessage: string;
  submitErrorMessage: string;
  submitSuccessMessage: string;
  submitting: string;
  submitApplication: string;
};

const homeStaticCopy: Record<SiteLanguage, HomeStaticCopy> = {
  ar: {
    stats: [
      ["5", "برامج متاحة"],
      ["3", "لغات متاحة"],
      ["✓", "دعم ومتابعة"],
      ["↗", "فرص شهرية متجددة"],
    ],
    statusLimited: "قبول محدود",
    statusPaused: "متوقف مؤقتاً",
    statusAvailable: "متاح الآن",
    whyTitle: "لماذا وكالة حمزة؟",
    whyItems: ["إدارة احترافية لصناع المحتوى", "دعم فني ومتابعة", "تطوير الحسابات وتحسين الأداء", "فرص انضمام لبرامج متعددة", "تدريب وإرشاد مستمر", "حل المشاكل التقنية بسرعة"],
    close: "إغلاق",
    fullNamePlaceholder: "الاسم الثلاثي",
    countryPlaceholder: "الدولة",
    whatsappPlaceholder: "رقم واتساب",
    previousExperienceTitle: "خبرات سابقة",
    previousExperiencePrompt: "هل عملت على برامج أو وكالات أخرى سابقاً؟",
    previousExperiencePlaceholder: "اكتب خبراتك السابقة إن وجدت",
    notesPlaceholder: "ملاحظات إضافية",
    requiredFieldsMessage: "يرجى تعبئة الحقول الأساسية.",
    databaseUnavailableMessage: "تعذر إرسال الطلب حالياً. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.",
    duplicateApplicationMessage: "تم إرسال طلب سابق بنفس رقم الواتساب والمنصة.",
    submitErrorMessage: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.",
    submitSuccessMessage: "تم استلام طلبك بنجاح. سيقوم فريق الوكالة بمراجعة الطلب وقد يتم التواصل معك عبر واتساب.",
    submitting: "جارٍ الإرسال...",
    submitApplication: "إرسال الطلب",
  },
  en: {
    stats: [
      ["5", "Available programs"],
      ["3", "Available languages"],
      ["✓", "Support and follow-up"],
      ["↗", "Renewed monthly opportunities"],
    ],
    statusLimited: "Limited spots",
    statusPaused: "Temporarily paused",
    statusAvailable: "Available now",
    whyTitle: "Why HAMZA AGENCY?",
    whyItems: ["Professional management for content creators", "Technical support and follow-up", "Account growth and performance improvement", "Opportunities across multiple programs", "Ongoing training and guidance", "Fast support for technical issues"],
    close: "Close",
    fullNamePlaceholder: "Full name",
    countryPlaceholder: "Country",
    whatsappPlaceholder: "WhatsApp number",
    previousExperienceTitle: "Previous experience",
    previousExperiencePrompt: "Have you previously worked with other programs or agencies?",
    previousExperiencePlaceholder: "Describe any relevant experience",
    notesPlaceholder: "Additional notes",
    requiredFieldsMessage: "Please complete the required fields.",
    databaseUnavailableMessage: "We could not send your application right now. Please try again or contact us on WhatsApp.",
    duplicateApplicationMessage: "An application has already been submitted with this WhatsApp number and program.",
    submitErrorMessage: "There was an error submitting your application. Please try again.",
    submitSuccessMessage: "Your application has been received. Our agency team will review it and may contact you through WhatsApp.",
    submitting: "Submitting...",
    submitApplication: "Submit application",
  },
  tr: {
    stats: [
      ["5", "Mevcut program"],
      ["3", "Mevcut dil"],
      ["✓", "Destek ve takip"],
      ["↗", "Yenilenen aylık fırsatlar"],
    ],
    statusLimited: "Kontenjan sınırlı",
    statusPaused: "Geçici olarak duraklatıldı",
    statusAvailable: "Şimdi açık",
    whyTitle: "Neden HAMZA AGENCY?",
    whyItems: ["İçerik üreticileri için profesyonel yönetim", "Teknik destek ve takip", "Hesap büyümesi ve performans geliştirme", "Birden fazla programda katılım fırsatı", "Sürekli eğitim ve rehberlik", "Teknik sorunlarda hızlı destek"],
    close: "Kapat",
    fullNamePlaceholder: "Ad soyad",
    countryPlaceholder: "Ülke",
    whatsappPlaceholder: "WhatsApp numarası",
    previousExperienceTitle: "Önceki deneyim",
    previousExperiencePrompt: "Daha önce başka programlar veya ajanslarla çalıştınız mı?",
    previousExperiencePlaceholder: "Varsa ilgili deneyiminizi yazın",
    notesPlaceholder: "Ek notlar",
    requiredFieldsMessage: "Lütfen zorunlu alanları doldurun.",
    databaseUnavailableMessage: "Başvurunuz şu anda gönderilemedi. Lütfen tekrar deneyin veya WhatsApp üzerinden bize ulaşın.",
    duplicateApplicationMessage: "Bu WhatsApp numarası ve programla daha önce bir başvuru gönderildi.",
    submitErrorMessage: "Başvurunuz gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
    submitSuccessMessage: "Başvurunuz alındı. Ajans ekibimiz başvurunuzu inceleyecek ve gerekirse WhatsApp üzerinden sizinle iletişime geçecektir.",
    submitting: "Gönderiliyor...",
    submitApplication: "Başvuruyu gönder",
  },
};

export function getHomeStaticCopy(language: SiteLanguage): HomeStaticCopy {
  return homeStaticCopy[language] || homeStaticCopy.ar;
}
