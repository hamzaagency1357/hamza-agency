import type { SiteLanguage } from "@/lib/i18n/locale";

type FeatureCopy = {
  title: string;
  text: string;
};

type AiSupportCopy = {
  backHome: string;
  pageBadge: string;
  pageTitle: string;
  pageAccent: string;
  pageIntro: string;
  features: FeatureCopy[];
  safetyTitle: string;
  safetyRules: string[];
  implementationTitle: string;
  implementationSteps: string[];
  directSupportTitle: string;
  directSupportText: string;
  directSupportCta: string;
  formTitle: string;
  formDescription: string;
  formPlaceholder: string;
  formSubmit: string;
  formSubmitting: string;
  formValidation: string;
  formError: string;
  sourceLabel: string;
  widgetTitle: string;
  widgetIntro: string;
  widgetWelcome: string;
  widgetLoadingKnowledge: string;
  widgetPlaceholder: string;
  widgetSubmit: string;
  widgetSubmitting: string;
  widgetWhatsApp: string;
  widgetOpen: string;
  widgetClose: string;
  widgetOpenAria: string;
  widgetCloseAria: string;
  widgetWhatsAppMessage: string;
  widgetUnknownAnswer: string;
};

const aiSupportCopy: Record<SiteLanguage, AiSupportCopy> = {
  ar: {
    backHome: "العودة إلى الرئيسية",
    pageBadge: "HAMZA AGENCY AI Support",
    pageTitle: "الدعم بالذكاء الاصطناعي",
    pageAccent: "تنظيم أسرع وتحويل أوضح إلى فريق الوكالة",
    pageIntro:
      "هذه الصفحة توضّح مسار الدعم الذكي داخل وكالة حمزة. الهدف هو مساعدة الزائر على فهم البرامج والخدمات وخطوات المتابعة بسرعة، مع تحويل الحالات الخاصة إلى واتساب رسمي عند الحاجة.",
    features: [
      {
        title: "إجابات أولية منظمة",
        text: "توضيح الأسئلة المتكررة حول البرامج، شروط الانضمام، الخدمات الرقمية، وطريقة المتابعة قبل تحويل الحالة إلى فريق الوكالة.",
      },
      {
        title: "تصعيد ذكي إلى واتساب",
        text: "عندما يحتاج الزائر إلى قرار إداري أو تفاصيل خاصة، يتم توجيهه للتواصل مع رقم الواتساب الرسمي بدلاً من إعطاء وعود غير مؤكدة.",
      },
      {
        title: "حفظ الأسئلة غير المجابة",
        text: "تُجمع الأسئلة التي لا توجد لها إجابة جاهزة لمراجعتها وتحسين إرشادات الدعم مستقبلاً.",
      },
      {
        title: "دعم متعدد الأقسام",
        text: "إمكانية استخدام نفس مسار الدعم للبرامج، طلبات الانضمام، الخدمات الرقمية، التتبع، والسياسات العامة للموقع.",
      },
    ],
    safetyTitle: "قواعد الأمان والثقة",
    safetyRules: [
      "الدعم بالذكاء الاصطناعي لا يطلب كلمات مرور أو رموز تحقق أو بيانات دخول.",
      "أي قرار قبول أو تنفيذ خدمة يبقى بيد فريق وكالة حمزة وليس رداً آلياً نهائياً.",
      "الذكاء الاصطناعي يساعد في التنظيم والشرح، أما الحالات الخاصة فتُحوّل إلى واتساب رسمي.",
      "يجب أن تبقى الردود منسجمة مع سياسات المنصات وقوانين الوكالة وعدم تقديم وعود غير مؤكدة.",
    ],
    implementationTitle: "كيف يساعدك الدعم الذكي؟",
    implementationSteps: [
      "اكتب سؤالك بوضوح عن البرامج أو الخدمات.",
      "يحاول الدعم إيجاد إجابة من معلومات الوكالة المنشورة.",
      "تظهر لك الخطوة التالية أو رابط الصفحة المناسبة.",
      "تُحال الحالات الخاصة إلى واتساب الرسمي عند الحاجة.",
      "لا تشارك كلمات مرور أو رموز تحقق في سؤالك.",
    ],
    directSupportTitle: "تحتاج دعماً مباشراً الآن؟",
    directSupportText: "واتساب هو المسار الرسمي للتواصل مع فريق وكالة حمزة وتأكيد التفاصيل.",
    directSupportCta: "تواصل عبر واتساب",
    formTitle: "اسأل الدعم الذكي",
    formDescription: "اكتب سؤالك وسيتم البحث في معلومات الوكالة المنشورة.",
    formPlaceholder: "اكتب سؤالك هنا...",
    formSubmit: "إرسال السؤال",
    formSubmitting: "جاري البحث...",
    formValidation: "اكتب سؤالاً واضحاً قبل الإرسال.",
    formError: "تعذر تشغيل الدعم حالياً.",
    sourceLabel: "المصدر",
    widgetTitle: "الدعم الذكي",
    widgetIntro: "إجابات آمنة من معلومات وكالة حمزة. للأسئلة الخاصة أو الحساسة استخدم واتساب.",
    widgetWelcome: "أهلاً بك في الدعم الذكي لوكالة حمزة. اسألني عن الانضمام، البرامج، طلبات الخدمات، أو طريقة التواصل.",
    widgetLoadingKnowledge: "جاري تجهيز قاعدة المعرفة...",
    widgetPlaceholder: "اكتب سؤالك هنا...",
    widgetSubmit: "إرسال",
    widgetSubmitting: "جاري الرد...",
    widgetWhatsApp: "واتساب",
    widgetOpen: "الدعم الذكي",
    widgetClose: "إغلاق الدعم",
    widgetOpenAria: "فتح الدعم الذكي",
    widgetCloseAria: "إغلاق الدعم الذكي",
    widgetWhatsAppMessage: "مرحباً وكالة حمزة، أحتاج مساعدة من الدعم.",
    widgetUnknownAnswer:
      "لم أجد جواباً مؤكداً من معلومات الوكالة الحالية. تم تسجيل سؤالك للمتابعة، ويمكنك التواصل مباشرة عبر واتساب للحصول على رد أسرع.",
  },
  en: {
    backHome: "Back to home",
    pageBadge: "HAMZA AGENCY AI Support",
    pageTitle: "AI Support",
    pageAccent: "Faster guidance and clearer routing to our agency team",
    pageIntro:
      "This page explains the smart support journey at HAMZA AGENCY. It helps visitors understand programs, services, and next steps quickly, while routing special cases to official WhatsApp support when needed.",
    features: [
      {
        title: "Structured first answers",
        text: "Clear answers to common questions about programs, eligibility, digital services, and follow-up before a case is routed to the agency team.",
      },
      {
        title: "Smart WhatsApp escalation",
        text: "When a visitor needs an administrative decision or private details, they are directed to the official WhatsApp channel instead of receiving unconfirmed promises.",
      },
      {
        title: "Unanswered-question capture",
        text: "Questions without a ready answer are collected for review so future support guidance can be improved.",
      },
      {
        title: "Multi-area support",
        text: "The same support journey can help with programs, applications, digital services, tracking, and the site’s public policies.",
      },
    ],
    safetyTitle: "Safety and trust rules",
    safetyRules: [
      "AI support never asks for passwords, verification codes, or login details.",
      "Any acceptance decision or service execution remains with the HAMZA AGENCY team and is not a final automated decision.",
      "AI helps with organization and explanation; special cases are routed to official WhatsApp support.",
      "Replies must follow platform policies and agency rules and must not make unconfirmed promises.",
    ],
    implementationTitle: "How AI Support helps you",
    implementationSteps: [
      "Write a clear question about a program or service.",
      "AI Support searches the agency’s published information.",
      "You receive a next step or a link to the relevant page.",
      "Special cases are routed to the official WhatsApp channel when needed.",
      "Never share passwords or verification codes in your question.",
    ],
    directSupportTitle: "Need direct support now?",
    directSupportText: "WhatsApp is the official channel to contact the HAMZA AGENCY team and confirm details.",
    directSupportCta: "Contact us on WhatsApp",
    formTitle: "Ask AI Support",
    formDescription: "Write your question and we will search the agency’s published information.",
    formPlaceholder: "Write your question here...",
    formSubmit: "Send question",
    formSubmitting: "Searching...",
    formValidation: "Please write a clear question before sending.",
    formError: "Support is unavailable at the moment.",
    sourceLabel: "Source",
    widgetTitle: "AI Support",
    widgetIntro: "Safe answers from HAMZA AGENCY information. Use WhatsApp for private or sensitive questions.",
    widgetWelcome: "Welcome to HAMZA AGENCY AI Support. Ask about joining, programs, service requests, or how to contact us.",
    widgetLoadingKnowledge: "Preparing the knowledge base...",
    widgetPlaceholder: "Write your question here...",
    widgetSubmit: "Send",
    widgetSubmitting: "Replying...",
    widgetWhatsApp: "WhatsApp",
    widgetOpen: "AI Support",
    widgetClose: "Close support",
    widgetOpenAria: "Open AI Support",
    widgetCloseAria: "Close AI Support",
    widgetWhatsAppMessage: "Hello HAMZA AGENCY, I need help from support.",
    widgetUnknownAnswer:
      "I could not find a confirmed answer in the agency’s current information. Your question has been recorded for follow-up, and you can contact us directly on WhatsApp for a faster reply.",
  },
  tr: {
    backHome: "Ana sayfaya dön",
    pageBadge: "HAMZA AGENCY AI Support",
    pageTitle: "Yapay zekâ desteği",
    pageAccent: "Daha hızlı yönlendirme ve ajans ekibine daha net aktarım",
    pageIntro:
      "Bu sayfa HAMZA AGENCY’deki akıllı destek sürecini açıklar. Ziyaretçilerin programları, hizmetleri ve sonraki adımları hızlıca anlamasına yardımcı olur; özel durumlar gerektiğinde resmî WhatsApp desteğine yönlendirilir.",
    features: [
      {
        title: "Düzenli ilk yanıtlar",
        text: "Programlar, katılım koşulları, dijital hizmetler ve takip süreciyle ilgili sık sorulan sorular için vaka ajans ekibine aktarılmadan önce net açıklamalar sunar.",
      },
      {
        title: "Akıllı WhatsApp yönlendirmesi",
        text: "Ziyaretçi idari karar veya özel detay istediğinde, kesin olmayan vaatler vermek yerine resmî WhatsApp kanalına yönlendirilir.",
      },
      {
        title: "Cevapsız soruları kaydetme",
        text: "Hazır yanıtı olmayan sorular incelenmek ve gelecekteki destek yönlendirmelerini geliştirmek üzere toplanır.",
      },
      {
        title: "Birden fazla alan için destek",
        text: "Aynı destek süreci programlar, başvurular, dijital hizmetler, takip ve sitenin genel politikaları için kullanılabilir.",
      },
    ],
    safetyTitle: "Güvenlik ve güven kuralları",
    safetyRules: [
      "Yapay zekâ desteği asla parola, doğrulama kodu veya giriş bilgisi istemez.",
      "Kabul kararı veya hizmetin uygulanması HAMZA AGENCY ekibinin sorumluluğundadır; bu otomatik ve kesin bir karar değildir.",
      "Yapay zekâ düzenleme ve açıklama için yardımcı olur; özel durumlar resmî WhatsApp desteğine yönlendirilir.",
      "Yanıtlar platform politikaları ve ajans kurallarıyla uyumlu olmalı, kesin olmayan vaatler içermemelidir.",
    ],
    implementationTitle: "Yapay zekâ desteği size nasıl yardımcı olur?",
    implementationSteps: [
      "Program veya hizmet hakkında açık bir soru yazın.",
      "Yapay zekâ desteği ajansın yayınlanmış bilgilerini tarar.",
      "Sonraki adımı veya ilgili sayfanın bağlantısını alırsınız.",
      "Özel durumlar gerektiğinde resmî WhatsApp kanalına yönlendirilir.",
      "Sorunuzda parola veya doğrulama kodu paylaşmayın.",
    ],
    directSupportTitle: "Şimdi doğrudan desteğe mi ihtiyacınız var?",
    directSupportText: "WhatsApp, HAMZA AGENCY ekibiyle iletişime geçmek ve ayrıntıları doğrulamak için resmî kanaldır.",
    directSupportCta: "WhatsApp üzerinden iletişime geçin",
    formTitle: "Yapay zekâ desteğine sorun",
    formDescription: "Sorunuzu yazın; ajansın yayınlanmış bilgilerinde arama yapılacaktır.",
    formPlaceholder: "Sorunuzu buraya yazın...",
    formSubmit: "Soruyu gönder",
    formSubmitting: "Aranıyor...",
    formValidation: "Göndermeden önce lütfen açık bir soru yazın.",
    formError: "Destek şu anda kullanılamıyor.",
    sourceLabel: "Kaynak",
    widgetTitle: "Yapay zekâ desteği",
    widgetIntro: "HAMZA AGENCY bilgilerinden güvenli yanıtlar. Özel veya hassas sorular için WhatsApp kullanın.",
    widgetWelcome: "HAMZA AGENCY yapay zekâ desteğine hoş geldiniz. Katılım, programlar, hizmet talepleri veya iletişim hakkında soru sorabilirsiniz.",
    widgetLoadingKnowledge: "Bilgi tabanı hazırlanıyor...",
    widgetPlaceholder: "Sorunuzu buraya yazın...",
    widgetSubmit: "Gönder",
    widgetSubmitting: "Yanıtlanıyor...",
    widgetWhatsApp: "WhatsApp",
    widgetOpen: "Yapay zekâ desteği",
    widgetClose: "Desteği kapat",
    widgetOpenAria: "Yapay zekâ desteğini aç",
    widgetCloseAria: "Yapay zekâ desteğini kapat",
    widgetWhatsAppMessage: "Merhaba HAMZA AGENCY, destekten yardım istiyorum.",
    widgetUnknownAnswer:
      "Ajansın mevcut bilgilerinde doğrulanmış bir yanıt bulamadım. Sorunuz takip için kaydedildi; daha hızlı yanıt için doğrudan WhatsApp üzerinden iletişime geçebilirsiniz.",
  },
};

const fallbackAnswers: Record<SiteLanguage, Array<{ keywords: string[]; answer: string }>> = {
  ar: [
    {
      keywords: ["انضم", "انضمام", "تقديم", "join", "creator", "agency"],
      answer: "للانضمام إلى وكالة حمزة، اضغط على زر طلب الانضمام أو افتح صفحة البرامج واختر البرنامج المناسب، ثم املأ بياناتك وسيتم التواصل معك عبر واتساب.",
    },
    {
      keywords: ["خدمة", "طلب", "شحن", "سحب", "service", "topup", "withdrawal"],
      answer: "لطلب خدمة رقمية أو متابعة شحن/سحب، افتح صفحة طلب خدمة واكتب رقم واتسابك والمنصة والتفاصيل المطلوبة. بعد الإرسال سيظهر لك كود متابعة الطلب.",
    },
    {
      keywords: ["حالة", "تتبع", "متابعة", "status", "track"],
      answer: "يمكنك تتبع طلب الخدمة من صفحة تتبع طلب خدمة باستخدام كود الطلب، أو تتبع طلب الانضمام من صفحة تتبع طلب الانضمام باستخدام رقم الواتساب.",
    },
    {
      keywords: ["واتساب", "تواصل", "رقم", "whatsapp", "contact"],
      answer: "يمكنك التواصل مباشرة مع فريق وكالة حمزة عبر واتساب على الرقم +905011730377.",
    },
    {
      keywords: ["تيك", "tiktok", "bigo", "بيجو", "yaahlan", "xena", "catchii"],
      answer: "البرامج المتاحة حالياً تشمل TikTok وBIGO LIVE وYaahlan وXena وCatchii. يمكنك مراجعة صفحة البرامج لاختيار البرنامج المناسب.",
    },
  ],
  en: [
    {
      keywords: ["join", "joining", "apply", "application", "creator", "agency"],
      answer: "To join HAMZA AGENCY, use the Join button or open the Programs page, choose the suitable program, and complete your details. The team will contact you on WhatsApp.",
    },
    {
      keywords: ["service", "request", "top up", "topup", "withdrawal", "recharge"],
      answer: "To request a digital service or follow up on a top-up or withdrawal, open the Service Request page and enter your WhatsApp number, platform, and required details. You will receive a tracking code after submission.",
    },
    {
      keywords: ["status", "track", "tracking", "follow up"],
      answer: "You can track a service request from the Service Request Tracking page using its code, or track a join application from the Application Tracking page using your WhatsApp number.",
    },
    {
      keywords: ["whatsapp", "contact", "number", "reach"],
      answer: "You can contact the HAMZA AGENCY team directly on WhatsApp at +905011730377.",
    },
    {
      keywords: ["tiktok", "bigo", "yaahlan", "xena", "catchii"],
      answer: "The currently available programs include TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii. Visit the Programs page to choose the right one.",
    },
  ],
  tr: [
    {
      keywords: ["katıl", "katılım", "başvuru", "başvur", "program", "ajans"],
      answer: "HAMZA AGENCY’e katılmak için Katıl düğmesini kullanın veya Programlar sayfasını açın, uygun programı seçin ve bilgilerinizi doldurun. Ekibimiz sizinle WhatsApp üzerinden iletişime geçecektir.",
    },
    {
      keywords: ["hizmet", "talep", "yükleme", "çekim", "bakiye", "top up"],
      answer: "Dijital hizmet talep etmek veya yükleme ya da çekim takibi yapmak için Hizmet Talebi sayfasını açın; WhatsApp numaranızı, platformu ve gerekli ayrıntıları girin. Gönderdikten sonra takip kodu gösterilir.",
    },
    {
      keywords: ["durum", "takip", "başvuru takibi"],
      answer: "Hizmet talebinizi koduyla Hizmet Talebi Takip sayfasından, katılım başvurunuzu ise WhatsApp numaranızla Başvuru Takip sayfasından takip edebilirsiniz.",
    },
    {
      keywords: ["whatsapp", "iletişim", "numara", "ulaş"],
      answer: "HAMZA AGENCY ekibiyle doğrudan WhatsApp üzerinden +905011730377 numarasından iletişime geçebilirsiniz.",
    },
    {
      keywords: ["tiktok", "bigo", "yaahlan", "xena", "catchii"],
      answer: "Şu anda TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii programları mevcuttur. Uygun programı seçmek için Programlar sayfasını inceleyin.",
    },
  ],
};

export function getAiSupportCopy(language: SiteLanguage) {
  return aiSupportCopy[language];
}

export function getAiSupportFallbackAnswers(language: SiteLanguage) {
  return fallbackAnswers[language];
}
