import type { SiteLanguage } from "@/lib/i18n/locale";

export type CookieConsentCopy = {
  title: string;
  body: string;
  necessary: string;
  analytics: string;
  preferences: string;
  marketing: string;
  acceptSelected: string;
  acceptAll: string;
  necessaryOnly: string;
  settings: string;
  policy: string;
  close: string;
};

export type PwaRuntimeCopy = {
  installAvailable: string;
  installButton: string;
  updateAvailable: string;
  updateButton: string;
};

const cookieConsentCopy: Record<SiteLanguage, CookieConsentCopy> = {
  ar: {
    title: "إعدادات الخصوصية وملفات الارتباط",
    body: "نستخدم الملفات الضرورية لتشغيل المنصة. لن تعمل التحليلات أو التفضيلات أو التسويق قبل موافقتك.",
    necessary: "ضرورية",
    analytics: "تحليلات",
    preferences: "تفضيلات",
    marketing: "تسويق",
    acceptSelected: "قبول المحدد",
    acceptAll: "قبول الكل",
    necessaryOnly: "الضرورية فقط",
    settings: "إعدادات ملفات الارتباط",
    policy: "سياسة ملفات الارتباط",
    close: "إغلاق إعدادات ملفات الارتباط",
  },
  en: {
    title: "Privacy and cookie settings",
    body: "Necessary storage keeps the platform working. Analytics, preferences, and marketing remain disabled until you consent.",
    necessary: "Necessary",
    analytics: "Analytics",
    preferences: "Preferences",
    marketing: "Marketing",
    acceptSelected: "Accept selected",
    acceptAll: "Accept all",
    necessaryOnly: "Necessary only",
    settings: "Cookie settings",
    policy: "Cookie policy",
    close: "Close cookie settings",
  },
  tr: {
    title: "Gizlilik ve çerez ayarları",
    body: "Gerekli depolama platformun çalışmasını sağlar. Analiz, tercihler ve pazarlama siz onay vermeden etkinleştirilmez.",
    necessary: "Gerekli",
    analytics: "Analiz",
    preferences: "Tercihler",
    marketing: "Pazarlama",
    acceptSelected: "Seçilenleri kabul et",
    acceptAll: "Tümünü kabul et",
    necessaryOnly: "Yalnızca gerekli",
    settings: "Çerez ayarları",
    policy: "Çerez politikası",
    close: "Çerez ayarlarını kapat",
  },
};

const pwaRuntimeCopy: Record<SiteLanguage, PwaRuntimeCopy> = {
  ar: {
    installAvailable: "يمكن تثبيت HAMZA AGENCY كتطبيق على جهازك للوصول إليها بسهولة.",
    installButton: "تثبيت التطبيق",
    updateAvailable: "يتوفر تحديث جديد وآمن للمنصة.",
    updateButton: "تحديث الآن",
  },
  en: {
    installAvailable: "Install HAMZA AGENCY on your device for easier access.",
    installButton: "Install app",
    updateAvailable: "A new secure platform update is available.",
    updateButton: "Update now",
  },
  tr: {
    installAvailable: "Daha kolay erişim için HAMZA AGENCY uygulamasını cihazınıza yükleyebilirsiniz.",
    installButton: "Uygulamayı yükle",
    updateAvailable: "Platform için yeni ve güvenli bir güncelleme hazır.",
    updateButton: "Şimdi güncelle",
  },
};

export function getCookieConsentCopy(language: SiteLanguage): CookieConsentCopy {
  return cookieConsentCopy[language] || cookieConsentCopy.ar;
}

export function getPwaRuntimeCopy(language: SiteLanguage): PwaRuntimeCopy {
  return pwaRuntimeCopy[language] || pwaRuntimeCopy.ar;
}
