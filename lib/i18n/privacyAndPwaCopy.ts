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
  managePreferences: string;
  savePreferences: string;
  policy: string;
  close: string;
};

export type PwaRuntimeCopy = {
  installAvailable: string;
  installButton: string;
  updateAvailable: string;
  updateButton: string;
  pageEyebrow: string;
  pageTitle: string;
  pageDescription: string;
  readyTitle: string;
  readyDescription: string;
  waitingTitle: string;
  waitingDescription: string;
  installedTitle: string;
  installedDescription: string;
  customTabTitle: string;
  customTabDescription: string;
  openChrome: string;
  iosTitle: string;
  iosDescription: string;
  fallbackTitle: string;
  fallbackDescription: string;
  dismissed: string;
  backHome: string;
};

const cookieConsentCopy: Record<SiteLanguage, CookieConsentCopy> = {
  ar: {
    title: "الخصوصية وملفات الارتباط",
    body: "نستخدم الملفات الضرورية لتشغيل الموقع. تبقى التحليلات والتفضيلات والتسويق معطلة حتى تختار السماح بها.",
    necessary: "ضرورية",
    analytics: "تحليلات",
    preferences: "تفضيلات",
    marketing: "تسويق",
    acceptSelected: "قبول المحدد",
    acceptAll: "قبول الكل",
    necessaryOnly: "الضرورية فقط",
    settings: "إعدادات ملفات الارتباط",
    managePreferences: "إدارة التفضيلات",
    savePreferences: "حفظ التفضيلات",
    policy: "سياسة ملفات الارتباط",
    close: "إغلاق إعدادات ملفات الارتباط",
  },
  en: {
    title: "Privacy and cookies",
    body: "Necessary storage keeps the website working. Analytics, preferences, and marketing stay disabled until you allow them.",
    necessary: "Necessary",
    analytics: "Analytics",
    preferences: "Preferences",
    marketing: "Marketing",
    acceptSelected: "Accept selected",
    acceptAll: "Accept all",
    necessaryOnly: "Necessary only",
    settings: "Cookie settings",
    managePreferences: "Manage preferences",
    savePreferences: "Save preferences",
    policy: "Cookie policy",
    close: "Close cookie settings",
  },
  tr: {
    title: "Gizlilik ve çerezler",
    body: "Gerekli depolama web sitesinin çalışmasını sağlar. Analiz, tercihler ve pazarlama siz izin verene kadar kapalı kalır.",
    necessary: "Gerekli",
    analytics: "Analiz",
    preferences: "Tercihler",
    marketing: "Pazarlama",
    acceptSelected: "Seçilenleri kabul et",
    acceptAll: "Tümünü kabul et",
    necessaryOnly: "Yalnızca gerekli",
    settings: "Çerez ayarları",
    managePreferences: "Tercihleri yönet",
    savePreferences: "Tercihleri kaydet",
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
    pageEyebrow: "تطبيق HAMZA AGENCY",
    pageTitle: "ثبّت الموقع كتطبيق",
    pageDescription: "صفحة تثبيت واضحة داخل الموقع، دون نوافذ عائمة أو طلبات تلقائية.",
    readyTitle: "التثبيت جاهز",
    readyDescription: "اضغط الزر أدناه لفتح طلب التثبيت الرسمي في المتصفح.",
    waitingTitle: "التثبيت غير متاح تلقائيًا الآن",
    waitingDescription: "استخدم قائمة Chrome ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».",
    installedTitle: "التطبيق مثبت بالفعل",
    installedDescription: "أنت تستخدم HAMZA AGENCY بوضع التطبيق المستقل.",
    customTabTitle: "افتح الصفحة في Chrome الكامل",
    customTabDescription: "التثبيت لا يعمل من نافذة Chrome المصغرة داخل التطبيقات. افتح الصفحة في Chrome الكامل ثم ارجع إلى زر التثبيت.",
    openChrome: "فتح في Chrome",
    iosTitle: "التثبيت على iPhone أو iPad",
    iosDescription: "افتح قائمة المشاركة في Safari ثم اختر «إضافة إلى الشاشة الرئيسية».",
    fallbackTitle: "طريقة التثبيت اليدوية",
    fallbackDescription: "افتح قائمة المتصفح واختر تثبيت التطبيق أو إضافته إلى الشاشة الرئيسية.",
    dismissed: "لم يكتمل التثبيت. يمكنك المحاولة مجددًا من هذا الزر.",
    backHome: "العودة إلى الرئيسية",
  },
  en: {
    installAvailable: "Install HAMZA AGENCY on your device for easier access.",
    installButton: "Install app",
    updateAvailable: "A new secure platform update is available.",
    updateButton: "Update now",
    pageEyebrow: "HAMZA AGENCY app",
    pageTitle: "Install the website as an app",
    pageDescription: "A clear installation page inside the website, without floating cards or automatic prompts.",
    readyTitle: "Installation is ready",
    readyDescription: "Press the button below to open the browser's official installation prompt.",
    waitingTitle: "Automatic installation is not available yet",
    waitingDescription: "Open the Chrome menu and choose “Install app” or “Add to Home screen”.",
    installedTitle: "The app is already installed",
    installedDescription: "You are using HAMZA AGENCY in standalone app mode.",
    customTabTitle: "Open this page in full Chrome",
    customTabDescription: "Installation is unavailable in the compact Chrome window inside other apps. Open the page in full Chrome, then return to the install button.",
    openChrome: "Open in Chrome",
    iosTitle: "Install on iPhone or iPad",
    iosDescription: "Open Safari's Share menu and choose “Add to Home Screen”.",
    fallbackTitle: "Manual installation",
    fallbackDescription: "Open the browser menu and choose Install app or Add to Home screen.",
    dismissed: "Installation was not completed. You can try again from this button.",
    backHome: "Back to home",
  },
  tr: {
    installAvailable: "Daha kolay erişim için HAMZA AGENCY uygulamasını cihazınıza yükleyebilirsiniz.",
    installButton: "Uygulamayı yükle",
    updateAvailable: "Platform için yeni ve güvenli bir güncelleme hazır.",
    updateButton: "Şimdi güncelle",
    pageEyebrow: "HAMZA AGENCY uygulaması",
    pageTitle: "Web sitesini uygulama olarak yükleyin",
    pageDescription: "Yüzen kartlar veya otomatik istemler olmadan, web sitesi içindeki açık bir yükleme sayfası.",
    readyTitle: "Yükleme hazır",
    readyDescription: "Tarayıcının resmi yükleme istemini açmak için aşağıdaki düğmeye basın.",
    waitingTitle: "Otomatik yükleme henüz kullanılamıyor",
    waitingDescription: "Chrome menüsünü açın ve “Uygulamayı yükle” veya “Ana ekrana ekle” seçeneğini kullanın.",
    installedTitle: "Uygulama zaten yüklü",
    installedDescription: "HAMZA AGENCY'yi bağımsız uygulama modunda kullanıyorsunuz.",
    customTabTitle: "Bu sayfayı tam Chrome'da açın",
    customTabDescription: "Diğer uygulamaların içindeki küçük Chrome penceresinde yükleme kullanılamaz. Sayfayı tam Chrome'da açın ve yükleme düğmesine dönün.",
    openChrome: "Chrome'da aç",
    iosTitle: "iPhone veya iPad'e yükleme",
    iosDescription: "Safari'de Paylaş menüsünü açın ve “Ana Ekrana Ekle” seçeneğini kullanın.",
    fallbackTitle: "Manuel yükleme",
    fallbackDescription: "Tarayıcı menüsünü açın ve Uygulamayı yükle veya Ana ekrana ekle seçeneğini kullanın.",
    dismissed: "Yükleme tamamlanmadı. Bu düğmeden tekrar deneyebilirsiniz.",
    backHome: "Ana sayfaya dön",
  },
};

export function getCookieConsentCopy(language: SiteLanguage): CookieConsentCopy {
  return cookieConsentCopy[language] || cookieConsentCopy.ar;
}

export function getPwaRuntimeCopy(language: SiteLanguage): PwaRuntimeCopy {
  return pwaRuntimeCopy[language] || pwaRuntimeCopy.ar;
}
