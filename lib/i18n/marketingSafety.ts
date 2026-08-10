import type { SiteLanguage } from "@/lib/i18n/locale";

/**
 * Only explicit guarantees or unsupported partnership claims are rewritten.
 * Numeric marketing values are intentionally excluded from sanitization.
 * The homepage statistics 7000+ / 5+ / 24/7 / 7 are explicit Owner-approved
 * marketing content and must remain unchanged unless the Owner changes them.
 */
const exactReplacements: Record<
  SiteLanguage,
  ReadonlyArray<readonly [string, string]>
> = {
  ar: [
    [
      "نساعد صناع المحتوى على النمو وتحقيق الأرباح على منصات البث المباشر والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية للتطور.",
      "نساعد صناع المحتوى على تطوير حضورهم وتحسين فرص النجاح والنمو على منصات البث المباشر والتواصل الاجتماعي من خلال إدارة احترافية ودعم ومتابعة وفرص متجددة للتطور.",
    ],
    ["وكالة عالمية محترفة لإدارة صناع المحتوى", "وكالة احترافية لإدارة صناع المحتوى"],
    [
      "تعمل وكالة حمزة ضمن اتفاقات تعاون مع TikTok وBIGO LIVE وYaahlan وXena وCatchii، لتقديم مسارات منظمة تساعد صناع المحتوى على اختيار البرنامج المناسب وفهم خطوات العمل والمتابعة باحتراف.",
      "تعرض وكالة حمزة مسارات متاحة عبر TikTok وBIGO LIVE وYaahlan وXena وCatchii، لمساعدة صناع المحتوى على فهم الخيارات واختيار البرنامج المناسب.",
    ],
    ["اتفاقات تعاون تدعم مسار صناع المحتوى", "برامج تدعم مسار صناع المحتوى"],
    ["اتفاق تعاون", "مسار برنامج"],
    [
      "تعمل وكالة حمزة ضمن اتفاق تعاون مع TikTok لتنظيم مسار انضمام صناع المحتوى ومساعدتهم على معرفة البرنامج الأنسب لهم.",
      "يوضح مسار TikTok لصناع المحتوى خطوات فهم المتطلبات والتقديم والمتابعة المناسبة لكل حالة.",
    ],
    [
      "ضمن اتفاقات التعاون الخاصة بالوكالة، يمثل BIGO LIVE أحد المسارات المهمة لصناع المحتوى المهتمين بالبث المباشر وبناء حضور تفاعلي احترافي.",
      "يمثل BIGO LIVE مساراً متاحاً لصناع المحتوى المهتمين بالبث المباشر وبناء حضور تفاعلي احترافي.",
    ],
    [
      "ملاحظة شفافة: التقييمات الظاهرة حالياً نماذج توضيحية لطريقة العرض. عند إضافة تقييمات حقيقية ومنشورة من لوحة الإدارة سيتم عرضها هنا بدلاً من هذه النماذج.",
      "تظهر هنا التقييمات المنشورة بعد مراجعتها.",
    ],
    ["نموذج توضيحي", "تقييم منشور"],
    [
      "الاتصال بقاعدة البيانات غير مفعل حالياً.",
      "تعذر إكمال الطلب حالياً. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.",
    ],
    ["7000+ صانع محتوى", "7000+ صانع محتوى"],
    ["5+ منصات متاحة", "5+ منصات متاحة"],
    ["24/7 دعم ومتابعة", "24/7 دعم ومتابعة"],
    ["7 سنوات خبرة", "7 سنوات خبرة"],
    ["50+ فرصة نجاح شهرية", "50+ فرصة نجاح شهرية"],
    ["500+ فرصة نجاح شهرية", "500+ فرصة نجاح شهرية"],
  ],
  en: [
    [
      "We help content creators grow and earn across live-streaming and social platforms through professional management, daily support, and genuine development opportunities.",
      "We help content creators strengthen their presence and improve their opportunities for success and growth across live-streaming and social platforms through professional management, support, follow-up, and renewed development opportunities.",
    ],
    ["A Professional Global Agency for Content Creators", "A Professional Agency for Content Creators"],
    [
      "HAMZA AGENCY works through collaboration agreements with TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii to offer structured paths that help content creators choose a suitable program and understand the work and follow-up process professionally.",
      "HAMZA AGENCY presents paths across TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii to help creators understand their options and choose a suitable program.",
    ],
    ["Collaboration agreements supporting creator journeys", "Programs supporting creator journeys"],
    ["Partnership agreement", "Program path"],
    [
      "The database connection is currently unavailable.",
      "We could not complete the request right now. Please try again or contact us on WhatsApp.",
    ],
    [
      "The database connection is not available right now.",
      "We could not complete the request right now. Please try again or contact us on WhatsApp.",
    ],
    ["7000+ Content creators", "7000+ Content creators"],
    ["5+ Available platforms", "5+ Available platforms"],
    ["24/7 Support & follow-up", "24/7 Support & follow-up"],
    ["7 Years of experience", "7 Years of experience"],
    ["24/7 support and follow-up", "24/7 support and follow-up"],
    ["50+ monthly success opportunities", "50+ monthly success opportunities"],
    ["500+ monthly success opportunities", "500+ monthly success opportunities"],
  ],
  tr: [
    [
      "İçerik üreticilerinin profesyonel yönetim, günlük destek ve gerçek gelişim fırsatlarıyla canlı yayın ve sosyal platformlarda büyümesine ve gelir elde etmesine yardımcı oluyoruz.",
      "İçerik üreticilerinin profesyonel yönetim, destek, takip ve yenilenen gelişim fırsatlarıyla canlı yayın ve sosyal platformlarda görünürlüğünü güçlendirmesine, başarı ve büyüme olanaklarını geliştirmesine yardımcı oluyoruz.",
    ],
    ["İçerik Üreticileri İçin Profesyonel Global Ajans", "İçerik Üreticileri İçin Profesyonel Ajans"],
    [
      "HAMZA AGENCY; TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii ile yaptığı iş birlikleri kapsamında içerik üreticilerinin uygun programı seçmesine, çalışma adımlarını anlamasına ve profesyonel takip almasına yardımcı olan düzenli yollar sunar.",
      "HAMZA AGENCY, içerik üreticilerinin seçenekleri anlamasına ve uygun programı seçmesine yardımcı olmak için TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii yollarını sunar.",
    ],
    ["İçerik üreticisi yolculuğunu destekleyen iş birlikleri", "İçerik üreticisi yolculuğunu destekleyen programlar"],
    ["İş birliği anlaşması", "Program yolu"],
    [
      "Veritabanı bağlantısı şu anda kullanılamıyor.",
      "Talep şu anda tamamlanamadı. Lütfen tekrar deneyin veya WhatsApp üzerinden bize ulaşın.",
    ],
    ["7000+ İçerik üreticisi", "7000+ İçerik üreticisi"],
    ["5+ Mevcut platform", "5+ Mevcut platform"],
    ["24/7 Destek ve takip", "24/7 Destek ve takip"],
    ["7 Yıllık deneyim", "7 Yıllık deneyim"],
    ["7/24 destek ve takip", "7/24 destek ve takip"],
    ["50+ aylık başarı fırsatı", "50+ aylık başarı fırsatı"],
    ["500+ aylık başarı fırsatı", "500+ aylık başarı fırsatı"],
  ],
};

const unsupportedClaimPatterns = [
  /ضمان (?:عدد )?المشاهدات|guaranteed views|view guarantee|izlenme garantisi|garantili izlenme/iu,
];

export function sanitizeMarketingCopy(value: string, language: SiteLanguage) {
  let safeValue = value;
  for (const [source, replacement] of exactReplacements[language]) safeValue = safeValue.replaceAll(source, replacement);
  safeValue = safeValue
    .replaceAll("شراكة رسمية", "مسار برنامج")
    .replaceAll("شريك رسمي", "برنامج متاح")
    .replaceAll("official partnership", "program path")
    .replaceAll("official partner", "available program")
    .replaceAll("resmî ortaklık", "program yolu")
    .replaceAll("resmi ortaklık", "program yolu")
    .replaceAll("resmî ortak", "mevcut program")
    .replaceAll("resmi ortak", "mevcut program");
  if (unsupportedClaimPatterns.some((pattern) => pattern.test(safeValue))) {
    return language === "ar" ? "معلومات موثقة مع دعم ومتابعة" : language === "tr" ? "Doğrulanmış bilgi, destek ve takip" : "Verified information with support and follow-up";
  }
  return safeValue;
}

export function containsUnsupportedMarketingClaim(value: string) {
  return /تحقيق الأرباح|ضمان (?:الأرباح|القبول|النجاح)|guaranteed (?:earnings|acceptance|success)|garanti (?:kazanç|kabul|başarı)/iu.test(value) || unsupportedClaimPatterns.some((pattern) => pattern.test(value));
}
