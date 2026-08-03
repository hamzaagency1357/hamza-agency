import type { SiteLanguage } from "@/lib/i18n/locale";

export type CookieConsentCopy = {
  title: string;
  body: string;
  necessary: string;
  necessaryDescription: string;
  analytics: string;
  analyticsDescription: string;
  preferences: string;
  preferencesDescription: string;
  marketing: string;
  marketingDescription: string;
  acceptAll: string;
  necessaryOnly: string;
  settings: string;
  pageDescription: string;
  managePreferences: string;
  saveSelected: string;
  savedConfirmation: string;
  backToWebsite: string;
  policy: string;
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
    body: "نستخدم الملفات الضرورية لتشغيل الموقع. يمكنك التحكم بالتحليلات والتفضيلات والتسويق.",
    necessary: "ضرورية",
    necessaryDescription: "تدعم الأمان والوظائف الأساسية وحفظ قرار الخصوصية، وتعمل دائمًا ولا يمكن تعطيلها.",
    analytics: "تحليلات",
    analyticsDescription: "تساعدنا على فهم أداء الموقع واستخدامه بصورة مجمعة لتحسين التجربة.",
    preferences: "تفضيلات",
    preferencesDescription: "تحفظ الخيارات التي تحددها، مثل إعدادات العرض وتجربة الاستخدام.",
    marketing: "تسويق",
    marketingDescription: "تسمح بقياس الحملات وتقديم رسائل تسويقية عند موافقتك الصريحة فقط.",
    acceptAll: "قبول الكل",
    necessaryOnly: "الضرورية فقط",
    settings: "إعدادات ملفات الارتباط",
    pageDescription: "تعمل ملفات الارتباط الضرورية دائمًا لتشغيل الموقع بأمان. يمكنك هنا اختيار السماح بالتحليلات والتفضيلات والتسويق أو إيقافها.",
    managePreferences: "إدارة التفضيلات",
    saveSelected: "حفظ الاختيارات",
    savedConfirmation: "تم حفظ اختيارات ملفات الارتباط.",
    backToWebsite: "العودة إلى الموقع",
    policy: "سياسة ملفات الارتباط",
  },
  en: {
    title: "Privacy and cookies",
    body: "Necessary storage keeps the website working. You can control analytics, preferences, and marketing.",
    necessary: "Necessary",
    necessaryDescription: "Supports security, core functions, and your privacy decision. It is always active and cannot be disabled.",
    analytics: "Analytics",
    analyticsDescription: "Helps us understand aggregated website performance and usage so we can improve the experience.",
    preferences: "Preferences",
    preferencesDescription: "Remembers options you choose, including display settings and experience preferences.",
    marketing: "Marketing",
    marketingDescription: "Allows campaign measurement and marketing messages only when you give explicit consent.",
    acceptAll: "Accept all",
    necessaryOnly: "Necessary only",
    settings: "Cookie settings",
    pageDescription: "Necessary cookies always operate to keep the website secure and functional. You can choose whether to allow analytics, preferences, and marketing.",
    managePreferences: "Manage preferences",
    saveSelected: "Save selected",
    savedConfirmation: "Your cookie choices have been saved.",
    backToWebsite: "Back to website",
    policy: "Cookie policy",
  },
  tr: {
    title: "Gizlilik ve çerezler",
    body: "Gerekli depolama web sitesini çalıştırır. Analiz, tercihler ve pazarlamayı kontrol edebilirsiniz.",
    necessary: "Gerekli",
    necessaryDescription: "Güvenliği, temel işlevleri ve gizlilik kararınızı destekler. Her zaman etkindir ve kapatılamaz.",
    analytics: "Analiz",
    analyticsDescription: "Deneyimi geliştirmek için toplu web sitesi performansını ve kullanımını anlamamıza yardımcı olur.",
    preferences: "Tercihler",
    preferencesDescription: "Görünüm ayarları ve kullanım tercihleri dahil olmak üzere seçtiğiniz seçenekleri hatırlar.",
    marketing: "Pazarlama",
    marketingDescription: "Yalnızca açık onay verdiğinizde kampanya ölçümüne ve pazarlama mesajlarına izin verir.",
    acceptAll: "Tümünü kabul et",
    necessaryOnly: "Yalnızca gerekli",
    settings: "Çerez ayarları",
    pageDescription: "Gerekli çerezler web sitesini güvenli ve çalışır durumda tutmak için her zaman etkindir. Analiz, tercihler ve pazarlamaya izin verip vermeyeceğinizi seçebilirsiniz.",
    managePreferences: "Tercihleri yönet",
    saveSelected: "Seçimleri kaydet",
    savedConfirmation: "Çerez seçimleriniz kaydedildi.",
    backToWebsite: "Siteye dön",
    policy: "Çerez politikası",
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

export function getCookieConsentCopy(
  language: SiteLanguage
): CookieConsentCopy {
  return cookieConsentCopy[language] || cookieConsentCopy.ar;
}

export function getPwaRuntimeCopy(
  language: SiteLanguage
): PwaRuntimeCopy {
  return pwaRuntimeCopy[language] || pwaRuntimeCopy.ar;
}
