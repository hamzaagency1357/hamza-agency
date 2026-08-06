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
    title: "عراب سوريا | إدارة الهوية والSEO للمحتوى",
    description:
      "عراب سوريا يقدم إدارة الهوية الرقمية، SEO، والإشراف على المحتوى والبرامج عبر موقع احترافي ومحتوى واضح وموجه.",
    schemaType: "WebPage",
  },
  "/about": {
    title: "من نحن | عراب سوريا",
    description:
      "تعرف على عراب سوريا وطريقة العمل في إدارة الهوية الرقمية، SEO، والبرامج مع المتابعة الاحترافية.",
    schemaType: "AboutPage",
  },
  "/ai-policy": {
    title: "سياسة الدعم الذكي | عراب سوريا",
    description:
      "تعرف على دور الدعم الذكي وحدوده وقواعد الخصوصية والإشراف البشري داخل موقع عراب سوريا.",
    schemaType: "WebPage",
  },
  "/ai-support": {
    title: "الدعم الذكي | عراب سوريا",
    description:
      "اطرح أسئلتك واحصل على إرشاد منظم، مع تحويل الحالات الخاصة إلى فريق عراب سوريا عبر القنوات الرسمية.",
    schemaType: "WebPage",
  },
  "/apply": {
    title: "طلب الانضمام | عراب سوريا",
    description:
      "اختر البرنامج المناسب وابدأ طلب الانضمام إلى عراب سوريا عبر نموذج واضح وآمن.",
    schemaType: "WebPage",
  },
  "/application-status": {
    title: "تتبع طلب الانضمام | عراب سوريا",
    description:
      "تابع آخر حالة مسجلة لطلب الانضمام باستخدام رقم واتساب والبرنامج المحدد.",
    schemaType: "WebPage",
  },
  "/contact": {
    title: "تواصل معنا | عراب سوريا",
    description:
      "تواصل مع فريق عراب سوريا عبر واتساب والبريد الرسمي للاستفسار عن برامج الهوية الرقمية والـ SEO والخدمات.",
    schemaType: "ContactPage",
  },
  "/digital-services": {
    title: "الخدمات الرقمية | عراب سوريا",
    description:
      "طلبات خدمات رقمية منظمة مع تأكيد التفاصيل والمتابعة عبر قناة واتساب الرسمية قبل التنفيذ.",
    schemaType: "CollectionPage",
  },
  "/faq": {
    title: "الأسئلة الشائعة | عراب سوريا",
    description:
      "إجابات واضحة حول الانضمام والبرامج والمتابعة والتواصل والخدمات الرقمية.",
    schemaType: "WebPage",
  },
  "/gallery": {
    title: "المعرض | عراب سوريا",
    description:
      "استعرض الهوية البصرية والبرامج والخدمات وتجربة صناع المحتوى داخل عراب سوريا.",
    schemaType: "ImageGallery",
  },
  "/jobs": {
    title: "الوظائف | عراب سوريا",
    description:
      "استعرض فرص العمل المرنة والتشغيلية والإدارية المتاحة ضمن عراب سوريا.",
    schemaType: "CollectionPage",
  },
  "/knowledge-center": {
    title: "مركز المعرفة | عراب سوريا",
    description:
      "إرشادات حول طلبات الانضمام واختيار البرامج والتواصل والخدمات الرقمية.",
    schemaType: "CollectionPage",
  },
  "/partners": {
    title: "البرامج والمنصات | عراب سوريا",
    description:
      "استعرض مسارات TikTok وBIGO LIVE وYaahlan وXena وCatchii واختر البرنامج الأنسب لك.",
    schemaType: "CollectionPage",
  },
  "/privacy-policy": {
    title: "سياسة الخصوصية | عراب سوريا",
    description:
      "تعرف على طريقة جمع بيانات المتقدمين والعملاء واستخدامها وحمايتها والاحتفاظ بها.",
    schemaType: "WebPage",
  },
  "/programs": {
    title: "برامج عراب سوريا لصناع المحتوى",
    description:
      "استعرض برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii واختر المسار المناسب لشغلك أو علامتك.",
    schemaType: "CollectionPage",
  },
  "/reviews": {
    title: "التقييمات | عراب سوريا",
    description:
      "استعرض تجارب العملاء وصناع المحتوى المنشورة ضمن نظام عراب سوريا.",
    schemaType: "CollectionPage",
  },
  "/service-request": {
    title: "طلب خدمة رقمية | عراب سوريا",
    description:
      "أرسل طلب خدمة رقمية منظماً واحصل على كود مخصص لمتابعة الطلب.",
    schemaType: "WebPage",
  },
  "/service-status": {
    title: "تتبع طلب الخدمة | عراب سوريا",
    description:
      "تابع آخر حالة لطلب الخدمة الرقمية باستخدام كود الطلب.",
    schemaType: "WebPage",
  },
  "/services": {
    title: "خدمات عراب سوريا",
    description:
      "متابعة طلبات الانضمام ودعم البرامج والإرشاد العملي وتنظيم التواصل لصناع المحتوى.",
    schemaType: "CollectionPage",
  },
  "/success-stories": {
    title: "قصص النجاح | عراب سوريا",
    description:
      "استعرض مسارات عمل واضحة وأمثلة عملية من إدارة الهوية الرقمية والبرامج والخدمات.",
    schemaType: "CollectionPage",
  },
  "/terms-and-conditions": {
    title: "الشروط والأحكام | عراب سوريا",
    description:
      "الشروط العامة لاستخدام الموقع وإرسال الطلبات والتواصل والاستفادة من الخدمات.",
    schemaType: "WebPage",
  },
};

const arabicProgramSeo: Record<string, RuntimeRouteMetadata> = {
  tiktok: {
    title: "برنامج TikTok | عراب سوريا",
    description:
      "تعرف على برنامج TikTok لصناع المحتوى وخطوات الانضمام والدعم المتاح لتطوير الحضور والأداء.",
  },
  "bigo-live": {
    title: "برنامج BIGO LIVE | عراب سوريا",
    description:
      "تعرف على برنامج BIGO LIVE للبث المباشر وخطوات الانضمام والمتابعة ودعم التفاعل مع الجمهور.",
  },
  yaahlan: {
    title: "برنامج Yaahlan | عراب سوريا",
    description:
      "تعرف على برنامج Yaahlan لبناء الحضور الاجتماعي والتفاعل مع الجمهور ضمن متابعة منظمة.",
  },
  xena: {
    title: "برنامج Xena | عراب سوريا",
    description:
      "تعرف على برنامج Xena لصناع المحتوى وخطوات الانضمام والمتابعة الإدارية ودعم تطوير الحساب.",
  },
  catchii: {
    title: "برنامج Catchii | عراب سوريا",
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
    title: "عراب سوريا",
    description:
      "علامة احترافية لإدارة الهوية الرقمية، SEO، وبرامج المحتوى والخدمات الرقمية.",
  },
  en: {
    title: "Arab Syria",
    description:
      "A professional identity and SEO partner for content creators, programs, and digital services.",
  },
  tr: {
    title: "Arab Syria",
    description:
      "İçerik üreticileri, programlar ve dijital hizmetler için profesyonel kimlik ve SEO desteği sağlayan ortak.",
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
