import type { SiteLanguage } from "@/lib/i18n/locale";
import { AGENT_PUBLIC_PATH, getProgramSlugFromPath, stripLocalePrefix } from "@/lib/i18n/publicLocales";
import { getSiteRuntimeMetadata, type RuntimeRouteMetadata } from "@/lib/i18n/siteRuntimeTranslations";

export type PublicSeoCopy = RuntimeRouteMetadata & { schemaType: "AboutPage" | "CollectionPage" | "ContactPage" | "FAQPage" | "ImageGallery" | "WebPage" };

const agencyDescription = "HAMZA AGENCY بإدارة الوكيل عراب سوريا، أحد أبرز وأكثر الوكلاء أمانًا واحترافية على مستوى العالم في إدارة ودعم وتطوير صناع المحتوى وبرامج البث المباشر.";
const arabicRouteSeo: Record<string, PublicSeoCopy> = {
  "/": { title: "HAMZA AGENCY | بإدارة الوكيل عراب سوريا", description: agencyDescription, schemaType: "WebPage" },
  "/about": { title: "من نحن | HAMZA AGENCY بإدارة عراب سوريا", description: "تعرف على HAMZA AGENCY ودور الوكيل عراب سوريا في الإشراف على دعم وتطوير صناع المحتوى وبرامج البث المباشر ضمن نهج يحترم الثقة والخصوصية.", schemaType: "AboutPage" },
  "/services": { title: "خدمات HAMZA AGENCY", description: "خدمات احترافية لمتابعة طلبات الانضمام ودعم البرامج والإرشاد العملي وتنظيم التواصل مع صناع المحتوى.", schemaType: "CollectionPage" },
  "/contact": { title: "تواصل معنا | HAMZA AGENCY", description: "تواصل مع فريق HAMZA AGENCY عبر واتساب والبريد الرسمي للاستفسار عن البرامج والخدمات ودعم صناع المحتوى.", schemaType: "ContactPage" },
  "/faq": { title: "الأسئلة الشائعة | HAMZA AGENCY", description: "إجابات واضحة حول HAMZA AGENCY والوكيل عراب سوريا والانضمام والبرامج والمتابعة والخدمات الرقمية.", schemaType: "FAQPage" },
  "/blog": { title: "مدونة HAMZA AGENCY", description: "مقالات وإرشادات مهنية حول صناع المحتوى وبرامج البث المباشر والهوية الرقمية.", schemaType: "CollectionPage" },
  "/programs": { title: "برامج HAMZA AGENCY لصناع المحتوى", description: "استعرض برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii واختر المسار المناسب.", schemaType: "CollectionPage" },
  "/privacy-policy": { title: "سياسة الخصوصية | HAMZA AGENCY", description: "تعرف على طريقة جمع البيانات واستخدامها وحمايتها والاحتفاظ بها داخل HAMZA AGENCY.", schemaType: "WebPage" },
  "/terms-and-conditions": { title: "الشروط والأحكام | HAMZA AGENCY", description: "الشروط العامة لاستخدام الموقع وإرسال الطلبات والاستفادة من خدمات HAMZA AGENCY.", schemaType: "WebPage" },
};

const agentSeo: Record<SiteLanguage, PublicSeoCopy> = {
  ar: { title: "عراب سوريا | الوكيل والمدير في HAMZA AGENCY", description: agencyDescription, schemaType: "WebPage" },
  en: { title: "Arab Syria | Agent and Manager at HAMZA AGENCY", description: "Meet Arab Syria, the agent and manager overseeing creator support, development, privacy, and live-streaming programs at HAMZA AGENCY.", schemaType: "WebPage" },
  tr: { title: "Arab Syria | HAMZA AGENCY Temsilcisi ve Yöneticisi", description: "HAMZA AGENCY bünyesinde içerik üreticisi desteği, gelişimi, gizlilik ve canlı yayın programlarını yöneten Arab Syria'yı tanıyın.", schemaType: "WebPage" },
};

const genericSeo: Record<SiteLanguage, RuntimeRouteMetadata> = {
  ar: { title: "HAMZA AGENCY | وكالة حمزة", description: "وكالة احترافية لإدارة ودعم وتطوير صناع المحتوى وبرامج البث المباشر والخدمات الرقمية." },
  en: { title: "HAMZA AGENCY", description: "A professional agency for creator management, live-streaming programs, and digital services." },
  tr: { title: "HAMZA AGENCY", description: "İçerik üreticisi yönetimi, canlı yayın programları ve dijital hizmetler için profesyonel ajans." },
};

export function getPublicSeoCopy(pathname: string, language: SiteLanguage): PublicSeoCopy {
  const publicPath = stripLocalePrefix(pathname);
  if (publicPath === AGENT_PUBLIC_PATH) return agentSeo[language];
  const programSlug = getProgramSlugFromPath(publicPath);
  const runtimeCopy = language === "ar" ? arabicRouteSeo[publicPath] : getSiteRuntimeMetadata(publicPath, language);
  return { ...(runtimeCopy || genericSeo[language]), schemaType: programSlug ? "WebPage" : arabicRouteSeo[publicPath]?.schemaType || "WebPage" };
}
