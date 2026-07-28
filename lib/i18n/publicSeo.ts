import type { SiteLanguage } from "@/lib/i18n/locale";
import {
  getProgramSlugFromPath,
  stripLocalePrefix,
} from "@/lib/i18n/publicLocales";
import {
  getSiteRuntimeMetadata,
  type RuntimeRouteMetadata,
} from "@/lib/i18n/siteRuntimeTranslations";

export type PublicSeoCopy = RuntimeRouteMetadata & {
  schemaType:
    | "AboutPage"
    | "CollectionPage"
    | "ContactPage"
    | "FAQPage"
    | "ImageGallery"
    | "WebPage";
};

const arabicRouteSeo: Record<string, PublicSeoCopy> = {
  "/": {
    title: "وكالة حمزة | إدارة وتطوير صناع المحتوى",
    description:
      "وكالة حمزة لإدارة وتطوير صناع المحتوى عبر برامج البث المباشر ومنصات التواصل، مع دعم ومتابعة وفرص نمو متجددة.",
    schemaType: "WebPage",
  },
  "/about": {
    title: "من نحن | وكالة حمزة",
    description:
      "تعرف على وكالة حمزة وطريقة عملها في تنظيم البرامج ودعم صناع المحتوى ومتابعة الطلبات باحتراف.",
    schemaType: "AboutPage",
  },
  "/ai-policy": {
    title: "سياسة الدعم الذكي | وكالة حمزة",
    description:
      "تعرف على دور الدعم الذكي وحدوده وقواعد الخصوصية والإشراف البشري داخل موقع وكالة حمزة.",
    schemaType: "WebPage",
  },
  "/ai-support": {
    title: "الدعم الذكي | وكالة حمزة",
    description:
      "اطرح أسئلتك واحصل على إرشاد منظم، مع تحويل الحالات الخاصة إلى فريق وكالة حمزة عبر القنوات الرسمية.",
    schemaType: "WebPage",
  },
  "/apply": {
    title: "طلب الانضمام | وكالة حمزة",
    description:
      "اختر البرنامج المناسب وابدأ طلب الانضمام إلى وكالة حمزة عبر نموذج واضح وآمن.",
    schemaType: "WebPage",
  },
  "/application-status": {
    title: "تتبع طلب الانضمام | وكالة حمزة",
    description:
      "تابع آخر حالة مسجلة لطلب الانضمام باستخدام رقم واتساب والبرنامج المحدد.",
    schemaType: "WebPage",
  },
  "/contact": {
    title: "تواصل معنا | وكالة حمزة",
    description:
      "تواصل مع فريق وكالة حمزة عبر قنوات واتساب والبريد الرسمية للاستفسار عن البرامج والخدمات.",
    schemaType: "ContactPage",
  },
  "/digital-services": {
    title: "الخدمات الرقمية | وكالة حمزة",
    description:
      "طلبات خدمات رقمية منظمة مع تأكيد التفاصيل والمتابعة عبر قناة واتساب الرسمية قبل التنفيذ.",
    schemaType: "CollectionPage",
  },
  "/faq": {
    title: "الأسئلة الشائعة | وكالة حمزة",
    description:
      "إجابات واضحة حول الانضمام والبرامج والمتابعة والتواصل والخدمات الرقمية.",
    schemaType: "WebPage",
  },
  "/gallery": {
    title: "المعرض | وكالة حمزة",
    description:
      "استعرض الهوية البصرية والبرامج والخدمات وتجربة صناع المحتوى داخل وكالة حمزة.",
    schemaType: "ImageGallery",
  },
  "/jobs": {
    title: "الوظائف | وكالة حمزة",
    description:
      "استعرض فرص العمل المرنة والتشغيلية والإدارية المتاحة ضمن وكالة حمزة.",
    schemaType: "CollectionPage",
  },
  "/knowledge-center": {
    title: "مركز المعرفة | وكالة حمزة",
    description:
      "إرشادات حول طلبات الانضمام واختيار البرامج والتواصل والخدمات الرقمية.",
    schemaType: "CollectionPage",
  },
  "/partners": {
    title: "البرامج والمنصات | وكالة حمزة",
    description:
      "استعرض مسارات TikTok وBIGO LIVE وYaahlan وXena وCatchii واختر البرنامج الأنسب لك.",
    schemaType: "CollectionPage",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية | وكالة حمزة",
    description:
      "تعرف على طريقة جمع بيانات المتقدمين والعملاء واستخدامها وحمايتها والاحتفاظ بها.",
    schemaType: "WebPage",
  },
  "/programs": {
    title: "برامج وكالة حمزة لصناع المحتوى",
    description:
      "استعرض برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii واختر المسار المناسب لك.",
    schemaType: "CollectionPage",
  },
  "/reviews": {
    title: "التقييمات | وكالة حمزة",
    description:
      "استعرض تجارب العملاء وصناع المحتوى المنشورة ضمن نظام وكالة حمزة.",
    schemaType: "CollectionPage",
  },
  "/service-request": {
    title: "طلب خدمة رقمية | وكالة حمزة",
    description:
      "أرسل طلب خدمة رقمية منظماً واحصل على كود مخصص لمتابعة الطلب.",
    schemaType: "WebPage",
  },
  "/service-status": {
    title: "تتبع طلب الخدمة | وكالة حمزة",
    description:
      "تابع آخر حالة لطلب الخدمة الرقمية باستخدام كود الطلب.",
    schemaType: "WebPage",
  },
  "/services": {
    title: "خدمات وكالة حمزة",
    description:
      "متابعة طلبات الانضمام ودعم البرامج والإرشاد العملي وتنظيم التواصل لصناع المحتوى.",
    schemaType: "CollectionPage",
  },
  "/success-stories": {
    title: "مسارات النجاح | وكالة حمزة",
    description:
      "استعرض مسارات منظمة لصناع المحتوى والخدمات الرقمية من الطلب حتى المتابعة.",
    schemaType: "CollectionPage",
  },
  "/terms-and-conditions": {
    title: "الشروط والأحكام | وكالة حمزة",
    description:
      "الشروط العامة لاستخدام الموقع وإرسال الطلبات والتواصل والاستفادة من الخدمات.",
    schemaType: "WebPage",
  },
};

const arabicProgramSeo: Record<string, RuntimeRouteMetadata> = {
  tiktok: {
    title: "برنامج TikTok | وكالة حمزة",
    description:
      "تعرف على برنامج TikTok لصناع المحتوى وخطوات الانضمام والدعم المتاح لتطوير الحضور والأداء.",
  },
  "bigo-live": {
    title: "برنامج BIGO LIVE | وكالة حمزة",
    description:
      "تعرف على برنامج BIGO LIVE للبث المباشر وخطوات الانضمام والمتابعة ودعم التفاعل مع الجمهور.",
  },
  yaahlan: {
    title: "برنامج Yaahlan | وكالة حمزة",
    description:
      "تعرف على برنامج Yaahlan لبناء الحضور الاجتماعي والتفاعل مع الجمهور ضمن متابعة منظمة.",
  },
  xena: {
    title: "برنامج Xena | وكالة حمزة",
    description:
      "تعرف على برنامج Xena لصناع المحتوى وخطوات الانضمام والمتابعة الإدارية ودعم تطوير الحساب.",
  },
  catchii: {
    title: "برنامج Catchii | وكالة حمزة",
    description:
      "تعرف على برنامج Catchii للتواصل والترفيه وبناء حضور اجتماعي ضمن بيئة وكالة منظمة.",
  },
};

const schemaTypeByPath: Record<string, PublicSeoCopy["schemaType"]> =
  Object.fromEntries(
    Object.entries(arabicRouteSeo).map(([path, copy]) => [
      path,
      copy.schemaType,
    ])
  );

const genericSeo: Record<SiteLanguage, RuntimeRouteMetadata> = {
  ar: {
    title: "وكالة حمزة",
    description:
      "وكالة احترافية لتنظيم ودعم صناع المحتوى والبرامج والخدمات الرقمية.",
  },
  en: {
    title: "HAMZA AGENCY",
    description:
      "A professional agency for organizing and supporting content creators, programs, and digital services.",
  },
  tr: {
    title: "HAMZA AGENCY",
    description:
      "İçerik üreticilerini, programları ve dijital hizmetleri organize eden ve destekleyen profesyonel ajans.",
  },
};

export function getPublicSeoCopy(
  pathname: string,
  language: SiteLanguage
): PublicSeoCopy {
  const publicPath = stripLocalePrefix(pathname);
  const programSlug = getProgramSlugFromPath(publicPath);

  let copy: RuntimeRouteMetadata | null = null;

  if (language === "ar") {
    copy = programSlug
      ? arabicProgramSeo[programSlug] || null
      : arabicRouteSeo[publicPath] || null;
  } else {
    copy = getSiteRuntimeMetadata(publicPath, language);
  }

  return {
    ...(copy || genericSeo[language]),
    schemaType: programSlug
      ? "WebPage"
      : schemaTypeByPath[publicPath] || "WebPage",
  };
}
