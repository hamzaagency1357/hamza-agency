import type { SiteLanguage } from "@/lib/i18n/locale";

export type ServiceType =
  | "platform_topup"
  | "withdrawal"
  | "digital_service"
  | "technical_support"
  | "other";

type StatusInfo = {
  label: string;
  description: string;
  className: string;
};

const statusClassNames = {
  received: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  review: "border-yellow-400/30 bg-yellow-500/10 text-yellow-100",
  accepted: "border-green-400/30 bg-green-500/10 text-green-100",
  rejected: "border-red-400/30 bg-red-500/10 text-red-100",
  contacted: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
  processing: "border-purple-400/30 bg-purple-500/10 text-purple-100",
  completed: "border-green-400/30 bg-green-500/10 text-green-100",
  cancelled: "border-red-400/30 bg-red-500/10 text-red-100",
  followUp: "border-purple-400/30 bg-purple-500/10 text-purple-100",
} as const;

const copy = {
  ar: {
    join: {
      title: "طلب الانضمام للوكالة",
      close: "إغلاق",
      fullName: "الاسم الثلاثي",
      country: "الدولة",
      whatsapp: "رقم واتساب",
      platform: "المنصة",
      previousExperience: "خبرات سابقة",
      previousExperienceDescription: "هل عملت على برامج أو وكالات أخرى سابقاً؟",
      previousExperiencePlaceholder: "اكتب خبراتك السابقة إن وجدت",
      notes: "ملاحظات إضافية",
      submit: "إرسال الطلب",
      submitting: "جارٍ الإرسال...",
      required: "يرجى تعبئة الحقول الأساسية.",
      unavailable: "تعذر إرسال الطلب حالياً. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.",
      duplicate: "تم إرسال طلب سابق بنفس رقم الواتساب والمنصة.",
      error: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.",
      success: "تم استلام طلبك بنجاح. سيقوم فريق الوكالة بمراجعة الطلب وقد يتم التواصل معك عبر واتساب.",
    },
    application: {
      eyebrow: "HAMZA AGENCY Applications",
      title: "تتبع حالة طلب الانضمام",
      description: "أدخل رقم الواتساب والبرنامج الذي استخدمته عند التقديم لمعرفة آخر حالة مسجلة لطلبك لدى وكالة حمزة.",
      whatsappLabel: "رقم واتساب المستخدم في الطلب",
      platformLabel: "البرنامج الذي تم التقديم عليه",
      search: "عرض حالة الطلب",
      searching: "جاري البحث...",
      privacyTitle: "خصوصية التتبع",
      resultTitle: "نتيجة التتبع",
      emptyResult: "أدخل رقم الواتساب واختر البرنامج، ثم اضغط على زر عرض الحالة لمعرفة نتيجة آخر طلب مطابق.",
      currentStatus: "الحالة الحالية",
      platform: "المنصة",
      applicationDate: "تاريخ الطلب",
      searchNumber: "رقم البحث",
      followUpMethod: "طريقة المتابعة",
      officialWhatsApp: "واتساب رسمي",
      contactWhatsApp: "تواصل مع الوكالة عبر واتساب",
      otherPlatform: "منصة أخرى",
      notShown: "غير معروض",
      unavailable: "غير متوفر",
      invalidWhatsapp: "يرجى إدخال رقم واتساب صحيح لا يقل عن 8 أرقام للبحث عن حالة الطلب.",
      selectPlatform: "يرجى اختيار البرنامج الذي تم التقديم عليه.",
      trackingUnavailable: "خدمة التتبع غير متاحة حالياً. يمكنك التواصل معنا عبر واتساب.",
      lookupError: "تعذر عرض حالة الطلب حالياً. يمكنك التواصل مع فريق الوكالة عبر واتساب للمتابعة.",
      notFound: "لم يتم العثور على طلب مطابق لهذا الرقم والبرنامج. تأكد من إدخال نفس رقم الواتساب والبرنامج المستخدم عند التقديم.",
      privacyNotes: [
        "تستخدم الصفحة رقم الواتساب مع اسم البرنامج لتقليل ظهور نتيجة غير مقصودة لشخص آخر.",
        "لا تعرض الصفحة الاسم الكامل أو الملاحظات أو الخبرات السابقة أو أي تفاصيل شخصية كاملة.",
        "للدقة، أدخل نفس رقم الواتساب ونفس البرنامج الذي استخدمته عند إرسال طلب الانضمام.",
        "إذا لم تظهر نتيجة مطابقة، استخدم واتساب الرسمي واذكر البرنامج وتاريخ التقديم التقريبي.",
      ],
    },
    serviceRequest: {
      eyebrow: "HAMZA AGENCY Digital Services",
      title: "طلب خدمة رقمية",
      description: "أرسل طلبك للوكالة، وسيقوم فريق وكالة حمزة بمراجعة التفاصيل ثم التواصل معك عبر واتساب للتأكيد والمتابعة.",
      fullName: "الاسم الكامل",
      fullNamePlaceholder: "اكتب اسمك الكامل",
      country: "الدولة",
      countryPlaceholder: "مثال: تركيا",
      whatsapp: "رقم واتساب",
      serviceType: "نوع الخدمة",
      platform: "المنصة",
      accountIdentifier: "معرّف الحساب / ID",
      accountIdentifierPlaceholder: "اكتب ID الحساب أو اسم المستخدم",
      requestedAmount: "المبلغ أو الكمية المطلوبة",
      requestedAmountPlaceholder: "مثال: 1000 ألماسة / 50$ / حسب الطلب",
      notes: "ملاحظات إضافية",
      notesPlaceholder: "اكتب أي تفاصيل تساعد فريق الوكالة على فهم الطلب بدون كلمات مرور أو رموز تحقق",
      note: "ملاحظة:",
      securityTitle: "تنبيهات أمان قبل الإرسال",
      trackingCode: "كود تتبع الطلب:",
      openTracking: "فتح صفحة تتبع طلب الخدمة",
      submit: "إرسال طلب الخدمة",
      submitting: "جارٍ إرسال الطلب...",
      beforeSend: "مهم قبل الإرسال",
      beforeSendDescription: "هذه الصفحة مخصصة لاستلام الطلب فقط. لا يوجد حالياً دفع إلكتروني مباشر داخل الموقع، وسيتم تأكيد التفاصيل عبر واتساب قبل تنفيذ أي خدمة.",
      nextTitle: "ماذا يحدث بعد الإرسال؟",
      directContact: "تحتاج تواصل مباشر؟",
      fullNameRequired: "يرجى كتابة الاسم الكامل.",
      invalidWhatsapp: "يرجى كتابة رقم واتساب صحيح لا يقل عن 8 أرقام.",
      selectService: "يرجى اختيار نوع الخدمة.",
      unavailable: "تعذر إرسال الطلب حالياً. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.",
      error: "حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.",
      success: "تم استلام طلبك بنجاح. احتفظ بكود الطلب لاستخدامه في صفحة التتبع، وسيقوم فريق وكالة حمزة بمراجعة الطلب والتواصل معك عبر واتساب.",
      safetyNotes: [
        "لا ترسل كلمة مرور حسابك أو رمز التحقق أو أي بيانات دخول حساسة.",
        "اكتب معرف الحساب أو اسم المستخدم فقط إذا كان ضرورياً لفهم الطلب.",
        "احتفظ بكود الطلب بعد الإرسال لأنه يستخدم في صفحة تتبع طلب الخدمة.",
        "لا يوجد دفع إلكتروني مباشر داخل هذه الصفحة؛ يتم تأكيد التفاصيل عبر واتساب أولاً.",
      ],
      steps: [
        "يتم حفظ طلبك في نظام وكالة حمزة.",
        "تحصل على كود طلب خاص لتتبّع الحالة.",
        "يراجع الفريق تفاصيل الخدمة المطلوبة.",
        "يتم التواصل معك عبر واتساب للتأكيد.",
        "بعد الاتفاق تبدأ متابعة الطلب.",
      ],
    },
    serviceTracking: {
      eyebrow: "HAMZA AGENCY Service Tracking",
      title: "تتبع حالة طلب الخدمة",
      description: "أدخل كود الطلب الذي ظهر لك بعد إرسال طلب الخدمة لمعرفة آخر حالة مسجلة لدى وكالة حمزة.",
      requestCode: "كود طلب الخدمة",
      search: "عرض حالة الطلب",
      searching: "جاري البحث...",
      notesTitle: "ملاحظات التتبع والخصوصية",
      resultTitle: "نتيجة التتبع",
      emptyResult: "أدخل كود الطلب واضغط على زر عرض الحالة لمعرفة نتيجة آخر تحديث مرتبط بهذا الطلب.",
      currentStatus: "الحالة الحالية",
      requestCodeLabel: "كود الطلب",
      serviceType: "نوع الخدمة",
      platform: "المنصة",
      requestDate: "تاريخ الطلب",
      updatedAt: "آخر تحديث",
      followUpMethod: "طريقة المتابعة",
      officialWhatsApp: "واتساب رسمي",
      followUpWhatsApp: "متابعة عبر واتساب",
      unavailable: "غير متوفر",
      unspecified: "غير محدد",
      invalidCode: "يرجى إدخال كود طلب صحيح مثل SR-2026-123456.",
      trackingUnavailable: "خدمة التتبع غير متاحة حالياً. يمكنك التواصل معنا عبر واتساب.",
      lookupError: "تعذر عرض حالة الطلب حالياً. يمكنك التواصل مع فريق الوكالة عبر واتساب للمتابعة.",
      notFound: "لم يتم العثور على طلب بهذا الكود. تأكد من إدخال كود الطلب كما ظهر لك بعد الإرسال.",
      trackingNotes: [
        "استخدم كود الطلب كما ظهر بعد الإرسال بدون مسافات إضافية.",
        "صفحة التتبع تعرض حالة الطلب العامة فقط ولا تعرض تفاصيل حساسة أو بيانات دفع.",
        "احتفظ بكود الطلب لأن الوكالة قد تطلبه منك عند المتابعة عبر واتساب.",
        "أي تفاصيل تنفيذ أو تأكيد نهائي يتم عبر القنوات الرسمية وليس من صفحة التتبع وحدها.",
      ],
    },
  },
  en: {
    join: {
      title: "Join the agency",
      close: "Close",
      fullName: "Full name",
      country: "Country",
      whatsapp: "WhatsApp number",
      platform: "Platform",
      previousExperience: "Previous experience",
      previousExperienceDescription: "Have you worked with other programs or agencies before?",
      previousExperiencePlaceholder: "Add any relevant experience",
      notes: "Additional notes",
      submit: "Submit application",
      submitting: "Sending...",
      required: "Please complete the required fields.",
      unavailable: "We could not send your application right now. Please try again or contact us on WhatsApp.",
      duplicate: "An application with this WhatsApp number and platform was already submitted.",
      error: "We could not send your application. Please try again.",
      success: "Your application was received successfully. Our agency team will review it and may contact you through WhatsApp.",
    },
    application: {
      eyebrow: "HAMZA AGENCY Applications",
      title: "Track your application",
      description: "Enter the WhatsApp number and program you used when applying to see the latest recorded status of your application.",
      whatsappLabel: "WhatsApp number used in the application",
      platformLabel: "Program you applied to",
      search: "View application status",
      searching: "Searching...",
      privacyTitle: "Tracking privacy",
      resultTitle: "Tracking result",
      emptyResult: "Enter your WhatsApp number, select the program, then view the latest matching application status.",
      currentStatus: "Current status",
      platform: "Platform",
      applicationDate: "Application date",
      searchNumber: "Lookup number",
      followUpMethod: "Follow-up method",
      officialWhatsApp: "Official WhatsApp",
      contactWhatsApp: "Contact the agency on WhatsApp",
      otherPlatform: "Other platform",
      notShown: "Not shown",
      unavailable: "Unavailable",
      invalidWhatsapp: "Enter a valid WhatsApp number with at least 8 digits to track your application.",
      selectPlatform: "Select the program you applied to.",
      trackingUnavailable: "Application tracking is unavailable right now. You can contact us on WhatsApp.",
      lookupError: "We could not show your application status right now. Contact the agency team on WhatsApp for follow-up.",
      notFound: "No matching application was found for this number and program. Make sure you use the same WhatsApp number and program used when applying.",
      privacyNotes: [
        "This page uses your WhatsApp number and program name to reduce unintended matches.",
        "It does not display your full name, notes, previous experience, or other full personal details.",
        "For accuracy, use the same WhatsApp number and program selected when you submitted your application.",
        "If no match appears, use the official WhatsApp channel and mention the program and approximate application date.",
      ],
    },
    serviceRequest: {
      eyebrow: "HAMZA AGENCY Digital Services",
      title: "Request a digital service",
      description: "Send your request to the agency. Our team will review the details and contact you on WhatsApp to confirm and follow up.",
      fullName: "Full name",
      fullNamePlaceholder: "Enter your full name",
      country: "Country",
      countryPlaceholder: "Example: Türkiye",
      whatsapp: "WhatsApp number",
      serviceType: "Service type",
      platform: "Platform",
      accountIdentifier: "Account ID / username",
      accountIdentifierPlaceholder: "Enter the account ID or username",
      requestedAmount: "Requested amount or quantity",
      requestedAmountPlaceholder: "Example: 1,000 diamonds / $50 / as needed",
      notes: "Additional notes",
      notesPlaceholder: "Add details that help our team understand the request, without passwords or verification codes",
      note: "Note:",
      securityTitle: "Safety notes before sending",
      trackingCode: "Request tracking code:",
      openTracking: "Open service request tracking",
      submit: "Send service request",
      submitting: "Sending request...",
      beforeSend: "Important before sending",
      beforeSendDescription: "This page only receives your request. There is no direct online payment on the website; details are confirmed through WhatsApp before any service begins.",
      nextTitle: "What happens after you send it?",
      directContact: "Need direct contact?",
      fullNameRequired: "Enter your full name.",
      invalidWhatsapp: "Enter a valid WhatsApp number with at least 8 digits.",
      selectService: "Select a service type.",
      unavailable: "We could not send your request right now. Please try again or contact us on WhatsApp.",
      error: "We could not send your request. Please try again or contact us on WhatsApp.",
      success: "Your request was received successfully. Keep the request code to track it, and our agency team will review your request and contact you on WhatsApp.",
      safetyNotes: [
        "Do not send your account password, verification code, or any sensitive login data.",
        "Only enter an account ID or username when it is necessary to understand your request.",
        "Keep the request code after sending; it is used on the service tracking page.",
        "There is no direct online payment on this page; details are confirmed through WhatsApp first.",
      ],
      steps: [
        "Your request is saved in the HAMZA AGENCY system.",
        "You receive a dedicated request code to track its status.",
        "Our team reviews the requested service details.",
        "We contact you on WhatsApp to confirm the request.",
        "Follow-up begins after the details are agreed.",
      ],
    },
    serviceTracking: {
      eyebrow: "HAMZA AGENCY Service Tracking",
      title: "Track your service request",
      description: "Enter the request code shown after you sent your service request to see the latest recorded status.",
      requestCode: "Service request code",
      search: "View request status",
      searching: "Searching...",
      notesTitle: "Tracking and privacy notes",
      resultTitle: "Tracking result",
      emptyResult: "Enter your request code and view the latest update linked to this request.",
      currentStatus: "Current status",
      requestCodeLabel: "Request code",
      serviceType: "Service type",
      platform: "Platform",
      requestDate: "Request date",
      updatedAt: "Last updated",
      followUpMethod: "Follow-up method",
      officialWhatsApp: "Official WhatsApp",
      followUpWhatsApp: "Follow up on WhatsApp",
      unavailable: "Unavailable",
      unspecified: "Unspecified",
      invalidCode: "Enter a valid request code, such as SR-2026-123456.",
      trackingUnavailable: "Service tracking is unavailable right now. You can contact us on WhatsApp.",
      lookupError: "We could not show your request status right now. Contact the agency team on WhatsApp for follow-up.",
      notFound: "No request was found with this code. Make sure you enter the code exactly as it appeared after sending.",
      trackingNotes: [
        "Use the request code exactly as it appeared after sending, with no extra spaces.",
        "The tracking page shows only the general request status, not sensitive details or payment data.",
        "Keep the request code because the agency may ask for it during WhatsApp follow-up.",
        "Any execution details or final confirmation happen through official channels, not this tracking page alone.",
      ],
    },
  },
  tr: {
    join: {
      title: "Ajansa katılın",
      close: "Kapat",
      fullName: "Ad soyad",
      country: "Ülke",
      whatsapp: "WhatsApp numarası",
      platform: "Platform",
      previousExperience: "Önceki deneyim",
      previousExperienceDescription: "Daha önce başka programlar veya ajanslarla çalıştınız mı?",
      previousExperiencePlaceholder: "İlgili deneyimlerinizi yazın",
      notes: "Ek notlar",
      submit: "Başvuruyu gönder",
      submitting: "Gönderiliyor...",
      required: "Lütfen gerekli alanları doldurun.",
      unavailable: "Başvurunuz şu anda gönderilemedi. Lütfen tekrar deneyin veya WhatsApp üzerinden bize ulaşın.",
      duplicate: "Bu WhatsApp numarası ve platformla daha önce bir başvuru gönderildi.",
      error: "Başvurunuz gönderilemedi. Lütfen tekrar deneyin.",
      success: "Başvurunuz başarıyla alındı. Ajans ekibimiz başvurunuzu inceleyecek ve WhatsApp üzerinden sizinle iletişime geçebilir.",
    },
    application: {
      eyebrow: "HAMZA AGENCY Başvuruları",
      title: "Başvurunuzu takip edin",
      description: "Başvuruda kullandığınız WhatsApp numarasını ve programı girerek başvurunuzun en son kaydedilen durumunu görüntüleyin.",
      whatsappLabel: "Başvuruda kullanılan WhatsApp numarası",
      platformLabel: "Başvurduğunuz program",
      search: "Başvuru durumunu görüntüle",
      searching: "Aranıyor...",
      privacyTitle: "Takip gizliliği",
      resultTitle: "Takip sonucu",
      emptyResult: "WhatsApp numaranızı girin, programı seçin ve en son eşleşen başvuru durumunu görüntüleyin.",
      currentStatus: "Mevcut durum",
      platform: "Platform",
      applicationDate: "Başvuru tarihi",
      searchNumber: "Arama numarası",
      followUpMethod: "Takip yöntemi",
      officialWhatsApp: "Resmî WhatsApp",
      contactWhatsApp: "Ajansla WhatsApp üzerinden iletişime geçin",
      otherPlatform: "Diğer platform",
      notShown: "Gösterilmiyor",
      unavailable: "Mevcut değil",
      invalidWhatsapp: "Başvuruyu takip etmek için en az 8 haneli geçerli bir WhatsApp numarası girin.",
      selectPlatform: "Başvurduğunuz programı seçin.",
      trackingUnavailable: "Başvuru takibi şu anda kullanılamıyor. WhatsApp üzerinden bizimle iletişime geçebilirsiniz.",
      lookupError: "Başvuru durumunuz şu anda gösterilemedi. Takip için ajans ekibiyle WhatsApp üzerinden iletişime geçin.",
      notFound: "Bu numara ve program için eşleşen bir başvuru bulunamadı. Başvuruda kullandığınız aynı WhatsApp numarasını ve programı seçtiğinizden emin olun.",
      privacyNotes: [
        "Bu sayfa, istenmeyen eşleşmeleri azaltmak için WhatsApp numaranızı ve program adını kullanır.",
        "Ad soyadınızı, notlarınızı, önceki deneyimlerinizi veya diğer tam kişisel bilgileri göstermez.",
        "Doğruluk için başvuruda kullandığınız aynı WhatsApp numarasını ve programı kullanın.",
        "Eşleşme görünmezse resmî WhatsApp kanalını kullanın; programı ve yaklaşık başvuru tarihini belirtin.",
      ],
    },
    serviceRequest: {
      eyebrow: "HAMZA AGENCY Dijital Hizmetler",
      title: "Dijital hizmet talebi",
      description: "Talebinizi ajansa gönderin. Ekibimiz ayrıntıları inceleyip onay ve takip için WhatsApp üzerinden sizinle iletişime geçecektir.",
      fullName: "Ad soyad",
      fullNamePlaceholder: "Ad soyadınızı yazın",
      country: "Ülke",
      countryPlaceholder: "Örnek: Türkiye",
      whatsapp: "WhatsApp numarası",
      serviceType: "Hizmet türü",
      platform: "Platform",
      accountIdentifier: "Hesap ID / kullanıcı adı",
      accountIdentifierPlaceholder: "Hesap ID'sini veya kullanıcı adını yazın",
      requestedAmount: "İstenen tutar veya miktar",
      requestedAmountPlaceholder: "Örnek: 1.000 elmas / 50$ / ihtiyaca göre",
      notes: "Ek notlar",
      notesPlaceholder: "Şifre veya doğrulama kodu olmadan ekibimizin talebi anlamasına yardımcı olacak ayrıntıları yazın",
      note: "Not:",
      securityTitle: "Göndermeden önce güvenlik notları",
      trackingCode: "Talep takip kodu:",
      openTracking: "Hizmet talebi takibini aç",
      submit: "Hizmet talebi gönder",
      submitting: "Talep gönderiliyor...",
      beforeSend: "Göndermeden önce önemli",
      beforeSendDescription: "Bu sayfa yalnızca talebinizi alır. Web sitesinde doğrudan çevrimiçi ödeme yoktur; herhangi bir hizmet başlamadan önce ayrıntılar WhatsApp üzerinden onaylanır.",
      nextTitle: "Gönderdikten sonra ne olur?",
      directContact: "Doğrudan iletişime mi ihtiyacınız var?",
      fullNameRequired: "Ad soyadınızı yazın.",
      invalidWhatsapp: "En az 8 haneli geçerli bir WhatsApp numarası girin.",
      selectService: "Bir hizmet türü seçin.",
      unavailable: "Talebiniz şu anda gönderilemedi. Lütfen tekrar deneyin veya WhatsApp üzerinden bize ulaşın.",
      error: "Talebiniz gönderilemedi. Lütfen tekrar deneyin veya WhatsApp üzerinden bizimle iletişime geçin.",
      success: "Talebiniz başarıyla alındı. Takip etmek için talep kodunu saklayın; ajans ekibimiz talebinizi inceleyip WhatsApp üzerinden sizinle iletişime geçecektir.",
      safetyNotes: [
        "Hesap şifrenizi, doğrulama kodunuzu veya hassas giriş bilgilerinizi göndermeyin.",
        "Yalnızca talebinizi anlamak için gerekliyse hesap ID'si veya kullanıcı adı girin.",
        "Gönderdikten sonra talep kodunu saklayın; hizmet takip sayfasında kullanılır.",
        "Bu sayfada doğrudan çevrimiçi ödeme yoktur; ayrıntılar önce WhatsApp üzerinden onaylanır.",
      ],
      steps: [
        "Talebiniz HAMZA AGENCY sistemine kaydedilir.",
        "Durumunu takip etmek için özel bir talep kodu alırsınız.",
        "Ekibimiz istenen hizmet ayrıntılarını inceler.",
        "Talebi onaylamak için WhatsApp üzerinden sizinle iletişime geçeriz.",
        "Ayrıntılar üzerinde anlaşıldıktan sonra takip başlar.",
      ],
    },
    serviceTracking: {
      eyebrow: "HAMZA AGENCY Hizmet Takibi",
      title: "Hizmet talebinizi takip edin",
      description: "Hizmet talebini gönderdikten sonra gösterilen talep kodunu girerek en son kaydedilen durumu görüntüleyin.",
      requestCode: "Hizmet talep kodu",
      search: "Talep durumunu görüntüle",
      searching: "Aranıyor...",
      notesTitle: "Takip ve gizlilik notları",
      resultTitle: "Takip sonucu",
      emptyResult: "Talep kodunuzu girin ve bu taleple bağlantılı en son güncellemeyi görüntüleyin.",
      currentStatus: "Mevcut durum",
      requestCodeLabel: "Talep kodu",
      serviceType: "Hizmet türü",
      platform: "Platform",
      requestDate: "Talep tarihi",
      updatedAt: "Son güncelleme",
      followUpMethod: "Takip yöntemi",
      officialWhatsApp: "Resmî WhatsApp",
      followUpWhatsApp: "WhatsApp üzerinden takip",
      unavailable: "Mevcut değil",
      unspecified: "Belirtilmedi",
      invalidCode: "SR-2026-123456 gibi geçerli bir talep kodu girin.",
      trackingUnavailable: "Hizmet takibi şu anda kullanılamıyor. WhatsApp üzerinden bizimle iletişime geçebilirsiniz.",
      lookupError: "Talep durumunuz şu anda gösterilemedi. Takip için ajans ekibiyle WhatsApp üzerinden iletişime geçin.",
      notFound: "Bu kodla bir talep bulunamadı. Kodu gönderimden sonra göründüğü şekilde tam olarak girdiğinizden emin olun.",
      trackingNotes: [
        "Talep kodunu gönderimden sonra göründüğü şekilde, fazladan boşluk olmadan kullanın.",
        "Takip sayfası yalnızca genel talep durumunu gösterir; hassas ayrıntıları veya ödeme verilerini göstermez.",
        "Ajans, WhatsApp takibi sırasında talep kodunu isteyebileceği için kodu saklayın.",
        "Uygulama ayrıntıları veya nihai onay yalnızca takip sayfasından değil, resmî kanallardan yapılır.",
      ],
    },
  },
} as const;

export function getPublicFormsCopy(language: SiteLanguage) {
  return copy[language] || copy.ar;
}

export function getPlatformLabel(language: SiteLanguage, platform: string) {
  if (platform === "other" || platform === "منصة أخرى") {
    return getPublicFormsCopy(language).application.otherPlatform;
  }

  return platform;
}

export function getServiceTypeLabel(language: SiteLanguage, serviceType: string | null) {
  const labels: Record<SiteLanguage, Record<ServiceType, string>> = {
    ar: {
      platform_topup: "شحن منصة",
      withdrawal: "سحب أرباح",
      digital_service: "خدمة رقمية",
      technical_support: "دعم فني",
      other: "طلب آخر",
    },
    en: {
      platform_topup: "Platform top-up",
      withdrawal: "Earnings withdrawal",
      digital_service: "Digital service",
      technical_support: "Technical support",
      other: "Other request",
    },
    tr: {
      platform_topup: "Platform yükleme",
      withdrawal: "Kazanç çekme",
      digital_service: "Dijital hizmet",
      technical_support: "Teknik destek",
      other: "Diğer talep",
    },
  };

  if (!serviceType) return getPublicFormsCopy(language).serviceTracking.unspecified;
  return labels[language][serviceType as ServiceType] || serviceType;
}

export function getServiceTypeHint(language: SiteLanguage, serviceType: ServiceType) {
  const hints: Record<SiteLanguage, Record<ServiceType, string>> = {
    ar: {
      platform_topup: "مثل شحن ألماس أو رصيد داخل منصة بث مباشر. لا ترسل كلمة مرور أو رمز تحقق.",
      withdrawal: "طلب متابعة سحب أرباح من منصة أو برنامج. سيتم تأكيد التفاصيل عبر واتساب قبل أي متابعة.",
      digital_service: "أي خدمة رقمية مرتبطة بالحسابات أو المنصات بدون مشاركة بيانات دخول حساسة.",
      technical_support: "مشكلة تقنية أو متابعة حساب أو منصة. اشرح المشكلة بدون إرسال كلمات مرور أو أكواد تحقق.",
      other: "اكتب تفاصيل الطلب في الملاحظات مع تجنب أي معلومات حساسة غير مطلوبة.",
    },
    en: {
      platform_topup: "For example, diamonds or balance top-ups on a live-streaming platform. Do not send passwords or verification codes.",
      withdrawal: "A request to follow up an earnings withdrawal from a platform or program. Details are confirmed through WhatsApp before any action.",
      digital_service: "Any digital service related to accounts or platforms without sharing sensitive login credentials.",
      technical_support: "A technical issue or account/platform follow-up. Describe the issue without sending passwords or verification codes.",
      other: "Describe your request in the notes while avoiding unnecessary sensitive information.",
    },
    tr: {
      platform_topup: "Örneğin canlı yayın platformunda elmas veya bakiye yükleme. Şifre ya da doğrulama kodu göndermeyin.",
      withdrawal: "Bir platform veya programdan kazanç çekme takibi talebi. Herhangi bir işlemden önce ayrıntılar WhatsApp üzerinden onaylanır.",
      digital_service: "Hassas giriş bilgilerini paylaşmadan hesaplar veya platformlarla ilgili dijital hizmet.",
      technical_support: "Teknik sorun veya hesap/platform takibi. Şifre veya doğrulama kodu göndermeden sorunu açıklayın.",
      other: "Gereksiz hassas bilgi vermeden talep ayrıntılarını notlara yazın.",
    },
  };

  return hints[language][serviceType];
}

export function getApplicationStatusInfo(language: SiteLanguage, status: string | null): StatusInfo {
  const normalized = (status || "new").toLowerCase().trim();

  const values: Record<SiteLanguage, Record<string, Omit<StatusInfo, "className">>> = {
    ar: {
      received: { label: "تم استلام الطلب", description: "وصل طلبك إلى فريق وكالة حمزة وسيتم مراجعته حسب ترتيب الطلبات." },
      review: { label: "قيد المراجعة", description: "يقوم فريق الوكالة بمراجعة بيانات الطلب وقد يتم التواصل معك عبر واتساب عند الحاجة." },
      accepted: { label: "مقبول", description: "تم قبول الطلب مبدئياً. يرجى متابعة واتساب لأن فريق الوكالة قد يتواصل معك لتأكيد الخطوات التالية." },
      rejected: { label: "غير مقبول حالياً", description: "لم يتم قبول الطلب في هذه المرحلة. يمكنك تطوير حسابك أو التواصل مع الوكالة لمعرفة الخيارات المناسبة لاحقاً." },
      followUp: { label: "قيد المتابعة", description: "طلبك موجود لدى فريق وكالة حمزة ويتم التعامل معه ضمن مسار المتابعة الداخلي." },
    },
    en: {
      received: { label: "Application received", description: "Your application reached the HAMZA AGENCY team and will be reviewed in order." },
      review: { label: "Under review", description: "Our agency team is reviewing your application and may contact you through WhatsApp if needed." },
      accepted: { label: "Accepted", description: "Your application was accepted initially. Please watch WhatsApp because our team may contact you to confirm the next steps." },
      rejected: { label: "Not accepted at this time", description: "Your application was not accepted at this stage. You can improve your account or contact the agency to learn about suitable options later." },
      followUp: { label: "In follow-up", description: "Your application is with the HAMZA AGENCY team and is being handled through the internal follow-up process." },
    },
    tr: {
      received: { label: "Başvuru alındı", description: "Başvurunuz HAMZA AGENCY ekibine ulaştı ve başvuru sırasına göre incelenecek." },
      review: { label: "İnceleniyor", description: "Ajans ekibimiz başvuru bilgilerinizi inceliyor ve gerekirse WhatsApp üzerinden sizinle iletişime geçebilir." },
      accepted: { label: "Kabul edildi", description: "Başvurunuz ön olarak kabul edildi. Sonraki adımları onaylamak için ekibimiz sizinle iletişime geçebileceğinden WhatsApp'ı takip edin." },
      rejected: { label: "Şu anda kabul edilmedi", description: "Başvurunuz bu aşamada kabul edilmedi. Hesabınızı geliştirebilir veya daha sonra uygun seçenekleri öğrenmek için ajansla iletişime geçebilirsiniz." },
      followUp: { label: "Takipte", description: "Başvurunuz HAMZA AGENCY ekibindedir ve iç takip sürecinde işlenmektedir." },
    },
  };

  if (normalized === "new" || normalized === "pending") {
    return { ...values[language].received, className: statusClassNames.received };
  }
  if (normalized === "under_review" || normalized === "reviewing") {
    return { ...values[language].review, className: statusClassNames.review };
  }
  if (normalized === "accepted" || normalized === "approved") {
    return { ...values[language].accepted, className: statusClassNames.accepted };
  }
  if (normalized === "rejected" || normalized === "declined") {
    return { ...values[language].rejected, className: statusClassNames.rejected };
  }

  return { ...values[language].followUp, className: statusClassNames.followUp };
}

export function getServiceStatusInfo(language: SiteLanguage, status: string | null): StatusInfo {
  const normalized = (status || "new").toLowerCase().trim();

  const values: Record<SiteLanguage, Record<string, Omit<StatusInfo, "className">>> = {
    ar: {
      received: { label: "تم استلام الطلب", description: "وصل طلبك إلى فريق وكالة حمزة وسيتم مراجعته حسب ترتيب الطلبات." },
      review: { label: "قيد المراجعة", description: "يقوم فريق الوكالة بمراجعة تفاصيل الخدمة وقد يتم التواصل معك عبر واتساب عند الحاجة." },
      contacted: { label: "تم التواصل", description: "تم التواصل معك أو تجهيز الطلب للمتابعة عبر واتساب حسب بيانات الطلب." },
      processing: { label: "قيد التنفيذ", description: "تمت مراجعة الطلب ويجري العمل على متابعته أو تنفيذ الخطوة المناسبة له." },
      completed: { label: "مكتمل", description: "تمت متابعة الطلب بنجاح. إذا كنت تحتاج أي مساعدة إضافية يمكنك التواصل معنا عبر واتساب." },
      rejected: { label: "غير متاح حالياً", description: "لا يمكن تنفيذ هذا الطلب في الوقت الحالي. يمكنك التواصل مع فريق الوكالة لمعرفة البدائل المناسبة." },
      cancelled: { label: "ملغي", description: "تم إلغاء الطلب أو إيقاف متابعته. يمكنك التواصل معنا عبر واتساب عند الحاجة." },
      followUp: { label: "قيد المتابعة", description: "طلبك موجود لدى فريق وكالة حمزة ويتم التعامل معه ضمن مسار المتابعة الداخلي." },
    },
    en: {
      received: { label: "Request received", description: "Your request reached the HAMZA AGENCY team and will be reviewed in order." },
      review: { label: "Under review", description: "Our agency team is reviewing the service details and may contact you through WhatsApp if needed." },
      contacted: { label: "Contacted", description: "You were contacted or your request was prepared for WhatsApp follow-up based on the request details." },
      processing: { label: "In progress", description: "Your request was reviewed and the appropriate follow-up or execution step is in progress." },
      completed: { label: "Completed", description: "Your request was followed up successfully. Contact us on WhatsApp if you need additional help." },
      rejected: { label: "Unavailable at this time", description: "This request cannot be completed at this time. Contact the agency team to learn about suitable alternatives." },
      cancelled: { label: "Cancelled", description: "The request was cancelled or its follow-up was stopped. Contact us on WhatsApp if needed." },
      followUp: { label: "In follow-up", description: "Your request is with the HAMZA AGENCY team and is being handled through the internal follow-up process." },
    },
    tr: {
      received: { label: "Talep alındı", description: "Talebiniz HAMZA AGENCY ekibine ulaştı ve talep sırasına göre incelenecek." },
      review: { label: "İnceleniyor", description: "Ajans ekibimiz hizmet ayrıntılarını inceliyor ve gerekirse WhatsApp üzerinden sizinle iletişime geçebilir." },
      contacted: { label: "İletişime geçildi", description: "Talep ayrıntılarına göre sizinle iletişime geçildi veya talebiniz WhatsApp takibi için hazırlandı." },
      processing: { label: "İşlemde", description: "Talebiniz incelendi ve uygun takip veya uygulama adımı yürütülüyor." },
      completed: { label: "Tamamlandı", description: "Talebiniz başarıyla takip edildi. Ek yardıma ihtiyacınız olursa WhatsApp üzerinden bizimle iletişime geçin." },
      rejected: { label: "Şu anda uygun değil", description: "Bu talep şu anda gerçekleştirilemez. Uygun alternatifleri öğrenmek için ajans ekibiyle iletişime geçin." },
      cancelled: { label: "İptal edildi", description: "Talep iptal edildi veya takibi durduruldu. Gerektiğinde WhatsApp üzerinden bizimle iletişime geçin." },
      followUp: { label: "Takipte", description: "Talebiniz HAMZA AGENCY ekibindedir ve iç takip sürecinde işlenmektedir." },
    },
  };

  if (normalized === "new" || normalized === "pending") return { ...values[language].received, className: statusClassNames.received };
  if (normalized === "under_review" || normalized === "reviewing") return { ...values[language].review, className: statusClassNames.review };
  if (normalized === "contacted") return { ...values[language].contacted, className: statusClassNames.contacted };
  if (normalized === "processing" || normalized === "in_progress") return { ...values[language].processing, className: statusClassNames.processing };
  if (normalized === "completed" || normalized === "done") return { ...values[language].completed, className: statusClassNames.completed };
  if (normalized === "rejected") return { ...values[language].rejected, className: statusClassNames.rejected };
  if (normalized === "canceled" || normalized === "cancelled") return { ...values[language].cancelled, className: statusClassNames.cancelled };

  return { ...values[language].followUp, className: statusClassNames.followUp };
}

export function formatPublicFormDate(value: string | null, language: SiteLanguage) {
  if (!value) return getPublicFormsCopy(language).application.unavailable;

  const locale = language === "ar" ? "ar" : language === "tr" ? "tr-TR" : "en";

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return getPublicFormsCopy(language).application.unavailable;
  }
}
