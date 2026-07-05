"use client";

import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type JobsCopy = {
  backHome: string;
  contact: string;
  badge: string;
  title: string;
  subtitle: string;
  intro: string;
  infoCards: Array<{ title: string; text: string }>;
  availableBadge: string;
  availableTitle: string;
  availableText: string;
  loading: string;
  availableCount: (count: number) => string;
  noJobs: string;
  fallbackDepartment: string;
  fallbackLocation: string;
  fallbackType: string;
  fallbackJobTitle: string;
  fallbackJobDescription: string;
  fallbackRequirements: string;
  requirements: string;
  apply: string;
  applicationBadge: string;
  close: string;
  fallbackAgency: string;
  labels: {
    fullName: string;
    country: string;
    whatsapp: string;
    email: string;
    experience: string;
    notes: string;
  };
  placeholders: {
    fullName: string;
    country: string;
    whatsapp: string;
    email: string;
    experience: string;
    notes: string;
  };
  validation: {
    chooseJob: string;
    fullName: string;
    whatsapp: string;
    databaseUnavailable: string;
    submitError: string;
    submitSuccess: string;
  };
  submitting: string;
  submit: string;
};

const copy: Record<"ar" | "en" | "tr", JobsCopy> = {
  ar: {
    backHome: "العودة للرئيسية",
    contact: "تواصل معنا",
    badge: "فرص عمل HAMZA AGENCY",
    title: "وظائف وكالة حمزة",
    subtitle: "انضم لفريق العمل",
    intro: "هذه الصفحة مخصصة للفرص الإدارية والتشغيلية داخل وكالة حمزة. يمكنك التقديم بدون سيرة ذاتية، وسيتم التواصل معك عبر واتساب إذا كان طلبك مناسباً.",
    infoCards: [
      { title: "بدون CV إلزامي", text: "يكفي إرسال معلوماتك وخبرتك وملاحظاتك بشكل واضح." },
      { title: "متابعة عبر واتساب", text: "فريق الوكالة يتواصل مع المتقدمين المناسبين عبر واتساب." },
      { title: "فرص مرنة", text: "بعض المهام يمكن أن تكون عن بعد أو حسب الحاجة التشغيلية." },
    ],
    availableBadge: "الوظائف المتاحة",
    availableTitle: "اختر الوظيفة المناسبة",
    availableText: "اقرأ تفاصيل كل فرصة ثم اضغط تقديم إذا كانت مناسبة لك. الطلبات تحفظ داخل نظام وكالة حمزة للمراجعة الإدارية.",
    loading: "جاري التحميل...",
    availableCount: (count) => `${count} فرصة متاحة`,
    noJobs: "لا توجد وظائف متاحة حالياً.",
    fallbackDepartment: "إدارة الوكالة",
    fallbackLocation: "عن بعد",
    fallbackType: "مرن",
    fallbackJobTitle: "وظيفة متاحة",
    fallbackJobDescription: "فرصة عمل ضمن وكالة حمزة.",
    fallbackRequirements: "الالتزام، حسن التواصل، والمتابعة الجيدة.",
    requirements: "المتطلبات",
    apply: "تقديم على الوظيفة",
    applicationBadge: "طلب توظيف",
    close: "إغلاق",
    fallbackAgency: "وكالة حمزة",
    labels: { fullName: "الاسم الكامل", country: "الدولة", whatsapp: "رقم واتساب", email: "البريد الإلكتروني - اختياري", experience: "خبراتك السابقة", notes: "ملاحظات إضافية" },
    placeholders: { fullName: "اكتب اسمك الكامل", country: "مثال: تركيا", whatsapp: "+905011730377", email: "example@email.com", experience: "اكتب خبراتك السابقة في الوكالات، المنصات، الدعم، الإدارة، أو أي شيء مفيد.", notes: "اكتب أي ملاحظات أو أوقات مناسبة للتواصل." },
    validation: { chooseJob: "يرجى اختيار وظيفة أولاً.", fullName: "يرجى كتابة الاسم الكامل.", whatsapp: "يرجى كتابة رقم الواتساب.", databaseUnavailable: "الاتصال بقاعدة البيانات غير مفعل حالياً.", submitError: "حدث خطأ أثناء إرسال طلب الوظيفة. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.", submitSuccess: "تم استلام طلبك بنجاح. سيقوم فريق وكالة حمزة بمراجعته والتواصل معك عبر واتساب عند الحاجة." },
    submitting: "جارٍ إرسال الطلب...",
    submit: "إرسال طلب الوظيفة",
  },
  en: {
    backHome: "Back to home",
    contact: "Contact us",
    badge: "HAMZA AGENCY Careers",
    title: "HAMZA AGENCY careers",
    subtitle: "Join the team",
    intro: "This page is for administrative and operational opportunities at HAMZA AGENCY. You can apply without a CV, and we will contact you on WhatsApp if your application is a suitable match.",
    infoCards: [
      { title: "No CV required", text: "Send your details, experience, and notes clearly." },
      { title: "WhatsApp follow-up", text: "The agency team contacts suitable applicants through WhatsApp." },
      { title: "Flexible opportunities", text: "Some roles can be remote or based on operational needs." },
    ],
    availableBadge: "Open roles",
    availableTitle: "Choose a suitable role",
    availableText: "Read each opportunity's details, then select Apply when it suits you. Applications are saved in the HAMZA AGENCY system for administrative review.",
    loading: "Loading...",
    availableCount: (count) => `${count} open role${count === 1 ? "" : "s"}`,
    noJobs: "There are no open roles right now.",
    fallbackDepartment: "Agency management",
    fallbackLocation: "Remote",
    fallbackType: "Flexible",
    fallbackJobTitle: "Open role",
    fallbackJobDescription: "A work opportunity at HAMZA AGENCY.",
    fallbackRequirements: "Commitment, strong communication, and reliable follow-up.",
    requirements: "Requirements",
    apply: "Apply for this role",
    applicationBadge: "Job application",
    close: "Close",
    fallbackAgency: "HAMZA AGENCY",
    labels: { fullName: "Full name", country: "Country", whatsapp: "WhatsApp number", email: "Email — optional", experience: "Previous experience", notes: "Additional notes" },
    placeholders: { fullName: "Enter your full name", country: "Example: Türkiye", whatsapp: "+905011730377", email: "example@email.com", experience: "Describe your previous experience in agencies, platforms, support, administration, or anything useful.", notes: "Add any notes or suitable times to contact you." },
    validation: { chooseJob: "Please choose a role first.", fullName: "Please enter your full name.", whatsapp: "Please enter your WhatsApp number.", databaseUnavailable: "The database connection is not currently configured.", submitError: "There was an error sending your application. Please try again or contact us on WhatsApp.", submitSuccess: "Your application was received successfully. The HAMZA AGENCY team will review it and contact you on WhatsApp when needed." },
    submitting: "Sending application...",
    submit: "Send job application",
  },
  tr: {
    backHome: "Ana sayfaya dön",
    contact: "Bizimle iletişime geç",
    badge: "HAMZA AGENCY Kariyer",
    title: "HAMZA AGENCY kariyer fırsatları",
    subtitle: "Ekibe katılın",
    intro: "Bu sayfa HAMZA AGENCY içindeki idari ve operasyonel fırsatlar içindir. Özgeçmiş olmadan başvurabilirsiniz; başvurunuz uygun olursa sizinle WhatsApp üzerinden iletişime geçilir.",
    infoCards: [
      { title: "CV zorunlu değil", text: "Bilgilerinizi, deneyiminizi ve notlarınızı açık şekilde göndermeniz yeterlidir." },
      { title: "WhatsApp üzerinden takip", text: "Ajans ekibi uygun başvuru sahipleriyle WhatsApp üzerinden iletişime geçer." },
      { title: "Esnek fırsatlar", text: "Bazı görevler uzaktan veya operasyonel ihtiyaca göre olabilir." },
    ],
    availableBadge: "Açık pozisyonlar",
    availableTitle: "Size uygun pozisyonu seçin",
    availableText: "Her fırsatın ayrıntılarını okuyun; size uygunsa Başvur seçeneğini kullanın. Başvurular idari inceleme için HAMZA AGENCY sisteminde saklanır.",
    loading: "Yükleniyor...",
    availableCount: (count) => `${count} açık pozisyon`,
    noJobs: "Şu anda açık pozisyon bulunmuyor.",
    fallbackDepartment: "Ajans yönetimi",
    fallbackLocation: "Uzaktan",
    fallbackType: "Esnek",
    fallbackJobTitle: "Açık pozisyon",
    fallbackJobDescription: "HAMZA AGENCY içinde bir iş fırsatı.",
    fallbackRequirements: "Bağlılık, güçlü iletişim ve düzenli takip.",
    requirements: "Gereksinimler",
    apply: "Bu pozisyona başvur",
    applicationBadge: "İş başvurusu",
    close: "Kapat",
    fallbackAgency: "HAMZA AGENCY",
    labels: { fullName: "Ad soyad", country: "Ülke", whatsapp: "WhatsApp numarası", email: "E-posta — isteğe bağlı", experience: "Önceki deneyim", notes: "Ek notlar" },
    placeholders: { fullName: "Adınızı ve soyadınızı yazın", country: "Örnek: Türkiye", whatsapp: "+905011730377", email: "example@email.com", experience: "Ajanslar, platformlar, destek, yönetim veya faydalı başka alanlardaki önceki deneyiminizi yazın.", notes: "Notlarınızı veya iletişim için uygun zamanlarınızı yazın." },
    validation: { chooseJob: "Lütfen önce bir pozisyon seçin.", fullName: "Lütfen adınızı ve soyadınızı yazın.", whatsapp: "Lütfen WhatsApp numaranızı yazın.", databaseUnavailable: "Veritabanı bağlantısı şu anda yapılandırılmamış.", submitError: "İş başvurusu gönderilirken bir hata oluştu. Lütfen yeniden deneyin veya WhatsApp üzerinden bizimle iletişime geçin.", submitSuccess: "Başvurunuz başarıyla alındı. HAMZA AGENCY ekibi başvurunuzu inceleyecek ve gerektiğinde WhatsApp üzerinden sizinle iletişime geçecektir." },
    submitting: "Başvuru gönderiliyor...",
    submit: "İş başvurusunu gönder",
  },
};

export function useJobsStaticUi() {
  const language = useSiteLanguage();
  return { language, direction: getLanguageDirection(language), t: copy[language] };
}
