import type { SiteLanguage } from "@/lib/i18n/locale";

export type HomeStaticCopy = {
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
    statusLimited: "قبول محدود",
    statusPaused: "متوقف مؤقتاً",
    statusAvailable: "متاح الآن",
    whyTitle: "لماذا وكالة حمزة؟",
    whyItems: ["إدارة احترافية لصناع المحتوى", "دعم فني ومتابعة يومية", "تطوير الحسابات وتحسين الأداء", "فرص انضمام لبرامج متعددة", "تدريب وإرشاد مستمر", "حل المشاكل التقنية بسرعة"],
    close: "إغلاق",
    fullNamePlaceholder: "الاسم الثلاثي",
    countryPlaceholder: "الدولة",
    whatsappPlaceholder: "رقم واتساب",
    previousExperienceTitle: "خبرات سابقة",
    previousExperiencePrompt: "هل عملت على برامج أو وكالات أخرى سابقاً؟",
    previousExperiencePlaceholder: "اكتب خبراتك السابقة إن وجدت",
    notesPlaceholder: "ملاحظات إضافية",
    requiredFieldsMessage: "يرجى تعبئة الحقول الأساسية.",
    databaseUnavailableMessage: "الاتصال بقاعدة البيانات غير مفعل حالياً.",
    duplicateApplicationMessage: "تم إرسال طلب سابق بنفس رقم الواتساب والمنصة.",
    submitErrorMessage: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.",
    submitSuccessMessage: "تم استلام طلبك بنجاح. سيقوم فريق الوكالة بمراجعة الطلب وقد يتم التواصل معك عبر واتساب.",
    submitting: "جارٍ الإرسال...",
    submitApplication: "إرسال الطلب",
  },
  en: {
    statusLimited: "Limited spots",
    statusPaused: "Temporarily paused",
    statusAvailable: "Available now",
    whyTitle: "Why HAMZA AGENCY?",
    whyItems: ["Professional management for content creators", "Technical support and daily follow-up", "Account growth and performance improvement", "Opportunities across multiple programs", "Ongoing training and guidance", "Fast support for technical issues"],
    close: "Close",
    fullNamePlaceholder: "Full name",
    countryPlaceholder: "Country",
    whatsappPlaceholder: "WhatsApp number",
    previousExperienceTitle: "Previous experience",
    previousExperiencePrompt: "Have you previously worked with other programs or agencies?",
    previousExperiencePlaceholder: "Describe any relevant experience",
    notesPlaceholder: "Additional notes",
    requiredFieldsMessage: "Please complete the required fields.",
    databaseUnavailableMessage: "The database connection is not available right now.",
    duplicateApplicationMessage: "An application has already been submitted with this WhatsApp number and program.",
    submitErrorMessage: "There was an error submitting your application. Please try again.",
    submitSuccessMessage: "Your application has been received. Our agency team will review it and may contact you through WhatsApp.",
    submitting: "Submitting...",
    submitApplication: "Submit application",
  },
  tr: {
    statusLimited: "Kontenjan sınırlı",
    statusPaused: "Geçici olarak duraklatıldı",
    statusAvailable: "Şimdi açık",
    whyTitle: "Neden HAMZA AGENCY?",
    whyItems: ["İçerik üreticileri için profesyonel yönetim", "Teknik destek ve günlük takip", "Hesap büyümesi ve performans geliştirme", "Birden fazla programda katılım fırsatı", "Sürekli eğitim ve rehberlik", "Teknik sorunlarda hızlı destek"],
    close: "Kapat",
    fullNamePlaceholder: "Ad soyad",
    countryPlaceholder: "Ülke",
    whatsappPlaceholder: "WhatsApp numarası",
    previousExperienceTitle: "Önceki deneyim",
    previousExperiencePrompt: "Daha önce başka programlar veya ajanslarla çalıştınız mı?",
    previousExperiencePlaceholder: "Varsa ilgili deneyiminizi yazın",
    notesPlaceholder: "Ek notlar",
    requiredFieldsMessage: "Lütfen zorunlu alanları doldurun.",
    databaseUnavailableMessage: "Veritabanı bağlantısı şu anda kullanılamıyor.",
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
