import type { SiteLanguage } from "@/lib/i18n/locale";

const exactReplacements: Record<SiteLanguage, ReadonlyArray<readonly [string, string]>> = {
  ar: [
    [
      "نساعد صناع المحتوى على النمو وتحقيق الأرباح على منصات البث المباشر والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية للتطور.",
      "نساعد صناع المحتوى على تطوير حضورهم وتحسين فرص النجاح والنمو على منصات البث المباشر والتواصل الاجتماعي من خلال إدارة احترافية ودعم ومتابعة وفرص متجددة للتطور.",
    ],
    ["24/7 دعم ومتابعة", "دعم ومتابعة"],
    ["50+ فرصة نجاح شهرية", "فرص شهرية متجددة"],
    ["500+ فرصة نجاح شهرية", "فرص شهرية متجددة"],
    ["فرصة نجاح شهرية", "فرص شهرية متجددة"],
    [
      "وكالة عالمية محترفة لإدارة صناع المحتوى",
      "وكالة احترافية لإدارة صناع المحتوى",
    ],
    [
      "تعمل وكالة حمزة ضمن اتفاقات تعاون مع TikTok وBIGO LIVE وYaahlan وXena وCatchii، لتقديم مسارات منظمة تساعد صناع المحتوى على اختيار البرنامج المناسب وفهم خطوات العمل والمتابعة باحتراف.",
      "تعرض وكالة حمزة مسارات متاحة عبر TikTok وBIGO LIVE وYaahlan وXena وCatchii، لمساعدة صناع المحتوى على فهم الخيارات واختيار البرنامج المناسب.",
    ],
    [
      "اتفاقات تعاون تدعم مسار صناع المحتوى",
      "برامج تدعم مسار صناع المحتوى",
    ],
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
    [
      "نماذج مختارة توضّح طريقة عرض التقييمات قبل نشر آراء حقيقية من لوحة الإدارة.",
      "تظهر هنا آراء منشورة من صناع المحتوى والعملاء بعد المراجعة.",
    ],
    ["نموذج توضيحي", "تقييم منشور"],
    [
      "مثال توضيحي لتجربة تواصل واضحة ومتابعة طلب بدون تعقيد، ويستبدل لاحقاً بتقييمات حقيقية من لوحة الإدارة.",
      "تقييم لتجربة تواصل واضحة ومتابعة طلب بدون تعقيد.",
    ],
    [
      "ملاحظة شفافة: المحتوى الظاهر حالياً يشرح مسارات عمل عامة داخل الوكالة. عند اعتماد قصص منشورة من لوحة الإدارة سيتم عرضها هنا بدلاً من هذه النماذج.",
      "تظهر القصص المنشورة والمعتمدة هنا عند توفرها.",
    ],
    [
      "الاتصال بقاعدة البيانات غير مفعل حالياً.",
      "تعذر إكمال الطلب حالياً. يرجى المحاولة مرة أخرى أو التواصل معنا عبر واتساب.",
    ],
  ],
  en: [
    [
      "We help content creators grow and earn across live-streaming and social platforms through professional management, daily support, and genuine development opportunities.",
      "We help content creators strengthen their presence and improve their opportunities for success and growth across live-streaming and social platforms through professional management, support, follow-up, and renewed development opportunities.",
    ],
    ["24/7 support and follow-up", "Support and follow-up"],
    ["50+ monthly success opportunities", "Renewed monthly opportunities"],
    ["500+ monthly success opportunities", "Renewed monthly opportunities"],
    ["Monthly Success Opportunities", "Renewed Monthly Opportunities"],
    [
      "A Professional Global Agency for Content Creators",
      "A Professional Agency for Content Creators",
    ],
    [
      "HAMZA AGENCY works through collaboration agreements with TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii to offer structured paths that help content creators choose a suitable program and understand the work and follow-up process professionally.",
      "HAMZA AGENCY presents paths across TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii to help creators understand their options and choose a suitable program.",
    ],
    [
      "Collaboration agreements supporting creator journeys",
      "Programs supporting creator journeys",
    ],
    ["Partnership agreement", "Program path"],
    [
      "Transparency note: The reviews currently shown are display samples. Once real reviews are approved and published through the dashboard, they will replace these samples.",
      "Published reviews appear here after review.",
    ],
    [
      "Selected samples demonstrate how reviews will appear before real feedback is published through the dashboard.",
      "Published creator and client feedback appears here after review.",
    ],
    ["Illustrative Sample", "Published review"],
    [
      "An illustrative example of clear communication and uncomplicated request follow-up, to be replaced later by real reviews from the dashboard.",
      "Feedback about clear communication and uncomplicated request follow-up.",
    ],
    [
      "Transparency note: The current content explains general agency workflows. Once approved stories are published through the dashboard, they will replace these examples.",
      "Approved published stories appear here as they become available.",
    ],
    [
      "The database connection is currently unavailable.",
      "We could not complete the request right now. Please try again or contact us on WhatsApp.",
    ],
    [
      "The database connection is not available right now.",
      "We could not complete the request right now. Please try again or contact us on WhatsApp.",
    ],
  ],
  tr: [
    [
      "İçerik üreticilerinin profesyonel yönetim, günlük destek ve gerçek gelişim fırsatlarıyla canlı yayın ve sosyal platformlarda büyümesine ve gelir elde etmesine yardımcı oluyoruz.",
      "İçerik üreticilerinin profesyonel yönetim, destek, takip ve yenilenen gelişim fırsatlarıyla canlı yayın ve sosyal platformlarda görünürlüğünü güçlendirmesine, başarı ve büyüme olanaklarını geliştirmesine yardımcı oluyoruz.",
    ],
    ["7/24 destek ve takip", "Destek ve takip"],
    ["50+ aylık başarı fırsatı", "Yenilenen aylık fırsatlar"],
    ["500+ aylık başarı fırsatı", "Yenilenen aylık fırsatlar"],
    ["Aylık Başarı Fırsatı", "Yenilenen Aylık Fırsatlar"],
    [
      "İçerik Üreticileri İçin Profesyonel Global Ajans",
      "İçerik Üreticileri İçin Profesyonel Ajans",
    ],
    [
      "HAMZA AGENCY; TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii ile yaptığı iş birlikleri kapsamında içerik üreticilerinin uygun programı seçmesine, çalışma adımlarını anlamasına ve profesyonel takip almasına yardımcı olan düzenli yollar sunar.",
      "HAMZA AGENCY, içerik üreticilerinin seçenekleri anlamasına ve uygun programı seçmesine yardımcı olmak için TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii yollarını sunar.",
    ],
    [
      "İçerik üreticisi yolculuğunu destekleyen iş birlikleri",
      "İçerik üreticisi yolculuğunu destekleyen programlar",
    ],
    ["İş birliği anlaşması", "Program yolu"],
    [
      "Şeffaflık notu: Şu anda gösterilen değerlendirmeler örnek sunumlardır. Gerçek değerlendirmeler yönetim panelinden onaylanıp yayınlandığında bu örneklerin yerini alacaktır.",
      "Yayınlanmış değerlendirmeler incelendikten sonra burada görünür.",
    ],
    [
      "Seçilen örnekler, gerçek görüşler yönetim panelinden yayınlanmadan önce değerlendirmelerin nasıl gösterileceğini açıklar.",
      "Yayınlanan içerik üreticisi ve müşteri görüşleri incelendikten sonra burada görünür.",
    ],
    ["Açıklayıcı Örnek", "Yayınlanmış değerlendirme"],
    [
      "Net iletişim ve karmaşık olmayan talep takibine dair açıklayıcı örnek; daha sonra yönetim panelindeki gerçek değerlendirmelerle değiştirilecektir.",
      "Net iletişim ve kolay talep takibi hakkında değerlendirme.",
    ],
    [
      "Şeffaflık notu: Mevcut içerik ajans içindeki genel iş akışlarını açıklar. Yönetim panelinden onaylı hikâyeler yayınlandığında bu örneklerin yerini alacaktır.",
      "Onaylanmış hikâyeler kullanıma sunuldukça burada yayınlanır.",
    ],
    [
      "Veritabanı bağlantısı şu anda kullanılamıyor.",
      "Talep şu anda tamamlanamadı. Lütfen tekrar deneyin veya WhatsApp üzerinden bize ulaşın.",
    ],
  ],
};

const unsupportedClaimPatterns = [
  /\b(?:50|500)\+\s*(?:فرصة|opportunit|fırsat)/iu,
  /\b24\s*\/\s*7\b/iu,
  /ضمان (?:عدد )?المشاهدات|guaranteed views|view guarantee|izlenme garantisi|garantili izlenme/iu,
];

export function sanitizeMarketingCopy(
  value: string,
  language: SiteLanguage
) {
  let safeValue = value;

  for (const [source, replacement] of exactReplacements[language]) {
    safeValue = safeValue.replaceAll(source, replacement);
  }

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
    return language === "ar"
      ? "فرص شهرية متجددة مع دعم ومتابعة"
      : language === "tr"
        ? "Destek ve takip ile yenilenen aylık fırsatlar"
        : "Renewed monthly opportunities with support and follow-up";
  }

  return safeValue;
}

export function containsUnsupportedMarketingClaim(value: string) {
  return (
    /تحقيق الأرباح|ضمان (?:الأرباح|القبول|النجاح)|guaranteed (?:earnings|acceptance|success)|garanti (?:kazanç|kabul|başarı)/iu.test(
      value
    ) ||
    unsupportedClaimPatterns.some((pattern) => pattern.test(value))
  );
}
