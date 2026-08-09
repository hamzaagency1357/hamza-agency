import type { SiteLanguage } from "@/lib/i18n/locale";
import { AGENT_PUBLIC_PATH, getProgramSlugFromPath, stripLocalePrefix } from "@/lib/i18n/publicLocales";
import { getSiteRuntimeMetadata, type RuntimeRouteMetadata } from "@/lib/i18n/siteRuntimeTranslations";

export type PublicSeoCopy = RuntimeRouteMetadata & { schemaType: "AboutPage" | "CollectionPage" | "ContactPage" | "FAQPage" | "ImageGallery" | "WebPage" };
const agencyDescription = "HAMZA AGENCY بإدارة الوكيل عراب سوريا، لدعم وتطوير صناع المحتوى وبرامج البث المباشر وفق نهج قائم على الأمان والخصوصية والمتابعة المهنية.";
const arabicRouteSeo: Record<string, PublicSeoCopy> = {
  "/": { title: "HAMZA AGENCY | بإدارة الوكيل عراب سوريا", description: agencyDescription, schemaType: "WebPage" },
  "/about": { title: "من نحن | HAMZA AGENCY بإدارة عراب سوريا", description: "تعرف على HAMZA AGENCY ودور الوكيل عراب سوريا في دعم وتطوير صناع المحتوى وبرامج البث المباشر ضمن نهج يحترم الثقة والخصوصية.", schemaType: "AboutPage" },
  "/apply": { title: "طلب الانضمام | HAMZA AGENCY", description: "اختر البرنامج المناسب وأرسل طلب الانضمام إلى HAMZA AGENCY عبر نموذج واضح وآمن.", schemaType: "WebPage" },
  "/programs": { title: "برامج HAMZA AGENCY لصناع المحتوى", description: "استعرض برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii واختر المسار المناسب.", schemaType: "CollectionPage" },
  "/services": { title: "خدمات HAMZA AGENCY", description: "خدمات احترافية لمتابعة طلبات الانضمام ودعم البرامج والإرشاد العملي وتنظيم التواصل.", schemaType: "CollectionPage" },
  "/digital-services": { title: "الخدمات الرقمية | HAMZA AGENCY", description: "طلبات خدمات رقمية منظمة مع تأكيد التفاصيل والمتابعة عبر القنوات الرسمية.", schemaType: "CollectionPage" },
  "/service-request": { title: "طلب خدمة رقمية | HAMZA AGENCY", description: "أرسل طلب خدمة رقمية منظمًا واحصل على رمز مخصص لمتابعة الطلب.", schemaType: "WebPage" },
  "/service-status": { title: "تتبع طلب الخدمة | HAMZA AGENCY", description: "تابع آخر حالة مسجلة لطلب الخدمة الرقمية باستخدام رمز الطلب.", schemaType: "WebPage" },
  "/application-status": { title: "تتبع طلب الانضمام | HAMZA AGENCY", description: "تابع حالة طلب الانضمام باستخدام البيانات المطلوبة بصورة آمنة.", schemaType: "WebPage" },
  "/jobs": { title: "الوظائف | HAMZA AGENCY", description: "استعرض فرص العمل المرنة والتشغيلية والإدارية المنشورة ضمن HAMZA AGENCY.", schemaType: "CollectionPage" },
  "/reviews": { title: "التقييمات | HAMZA AGENCY", description: "استعرض التقييمات المنشورة والموثقة ضمن HAMZA AGENCY.", schemaType: "CollectionPage" },
  "/success-stories": { title: "قصص النجاح | HAMZA AGENCY", description: "استعرض قصص النجاح المنشورة فعليًا ومسارات التطور المهني داخل الوكالة.", schemaType: "CollectionPage" },
  "/partners": { title: "البرامج والمنصات | HAMZA AGENCY", description: "تعرف على البرامج والمنصات المتاحة واختر المسار الأنسب لك.", schemaType: "CollectionPage" },
  "/gallery": { title: "المعرض | HAMZA AGENCY", description: "استعرض الهوية البصرية والبرامج والخدمات المنشورة داخل HAMZA AGENCY.", schemaType: "ImageGallery" },
  "/knowledge-center": { title: "مركز المعرفة | HAMZA AGENCY", description: "إرشادات واضحة حول الانضمام والبرامج والمتابعة والخدمات الرقمية.", schemaType: "CollectionPage" },
  "/faq": { title: "الأسئلة الشائعة | HAMZA AGENCY", description: "إجابات واضحة حول الوكالة والوكيل عراب سوريا والانضمام والبرامج والمتابعة.", schemaType: "FAQPage" },
  "/contact": { title: "تواصل معنا | HAMZA AGENCY", description: "تواصل مع فريق HAMZA AGENCY عبر واتساب والبريد الرسمي للاستفسار عن البرامج والخدمات.", schemaType: "ContactPage" },
  "/privacy-policy": { title: "سياسة الخصوصية | HAMZA AGENCY", description: "تعرف على طريقة جمع البيانات واستخدامها وحمايتها والاحتفاظ بها.", schemaType: "WebPage" },
  "/terms-and-conditions": { title: "الشروط والأحكام | HAMZA AGENCY", description: "الشروط العامة لاستخدام الموقع وإرسال الطلبات والاستفادة من الخدمات.", schemaType: "WebPage" },
  "/cookie-policy": { title: "سياسة ملفات تعريف الارتباط | HAMZA AGENCY", description: "تعرف على ملفات تعريف الارتباط الضرورية وخيارات الموافقة والتحكم في التفضيلات داخل موقع HAMZA AGENCY.", schemaType: "WebPage" },
  "/cookie-settings": { title: "إعدادات ملفات تعريف الارتباط | HAMZA AGENCY", description: "راجع تفضيلات ملفات تعريف الارتباط وعدّل الموافقات الاختيارية بوضوح.", schemaType: "WebPage" },
  "/ai-policy": { title: "سياسة الدعم الذكي | HAMZA AGENCY", description: "تعرف على دور الدعم الذكي وحدوده وقواعد الخصوصية والإشراف البشري.", schemaType: "WebPage" },
  "/ai-support": { title: "الدعم الذكي | HAMZA AGENCY", description: "احصل على إرشاد منظم مع تحويل الحالات الخاصة إلى الفريق عبر القنوات الرسمية.", schemaType: "WebPage" },
  "/blog": { title: "مدونة HAMZA AGENCY", description: "مقالات وإرشادات مهنية حول صناع المحتوى وبرامج البث المباشر والهوية الرقمية.", schemaType: "CollectionPage" },
};
const agentSeo: Record<SiteLanguage, PublicSeoCopy> = {
  ar: { title: "عراب سوريا | الوكيل والمدير في HAMZA AGENCY", description: agencyDescription, schemaType: "WebPage" },
  en: { title: "Godfather of Syria | Agent and Manager at HAMZA AGENCY", description: "The Godfather of Syria oversees creator support and development, privacy, safety, and live-streaming programs at HAMZA AGENCY through professional follow-up.", schemaType: "WebPage" },
  tr: { title: "Suriye'nin Vaftiz Babası | HAMZA AGENCY Temsilcisi ve Yöneticisi", description: "Suriye'nin Vaftiz Babası, HAMZA AGENCY bünyesinde içerik üreticisi desteğini ve gelişimini, gizliliği, güvenliği ve canlı yayın programlarını profesyonel takiple yönetir.", schemaType: "WebPage" },
};
const programNames: Record<string,string>={tiktok:"TikTok","bigo-live":"BIGO LIVE",yaahlan:"Yaahlan",xena:"Xena",catchii:"Catchii"};
const programSeoDescription:Record<SiteLanguage,(name:string)=>string>={
 ar:(name)=>`تعرف على برنامج ${name} لصناع المحتوى، متطلبات التقديم وآلية المراجعة والمتابعة المهنية عبر HAMZA AGENCY. استيفاء الشروط يتيح مراجعة الطلب ولا يعني القبول التلقائي أو النهائي.`,
 en:(name)=>`Explore the ${name} creator program, application requirements, review process, and professional follow-up through HAMZA AGENCY. Meeting the requirements allows an application review and does not guarantee automatic or final acceptance.`,
 tr:(name)=>`${name} içerik üreticisi programını, başvuru koşullarını, değerlendirme sürecini ve HAMZA AGENCY takibini inceleyin. Koşulları karşılamak başvurunun değerlendirilmesini sağlar; otomatik veya kesin kabul anlamına gelmez.`,
};
function getProgramSeo(slug:string,language:SiteLanguage):PublicSeoCopy|undefined{const name=programNames[slug];if(!name)return undefined;const title=language==="ar"?`برنامج ${name} لصناع المحتوى | HAMZA AGENCY`:language==="en"?`${name} Creator Program | HAMZA AGENCY`:`${name} İçerik Üreticisi Programı | HAMZA AGENCY`;return{title,description:programSeoDescription[language](name),schemaType:"WebPage"}}
const genericSeo: Record<SiteLanguage, RuntimeRouteMetadata> = {
  ar: { title: "HAMZA AGENCY | وكالة حمزة", description: "وكالة احترافية لإدارة ودعم وتطوير صناع المحتوى وبرامج البث المباشر والخدمات الرقمية." },
  en: { title: "HAMZA AGENCY", description: "A professional agency for creator management, live-streaming programs, and digital services." },
  tr: { title: "HAMZA AGENCY", description: "İçerik üreticisi yönetimi, canlı yayın programları ve dijital hizmetler için profesyonel ajans." },
};
export function getPublicSeoCopy(pathname: string, language: SiteLanguage): PublicSeoCopy {
  const publicPath = stripLocalePrefix(pathname);
  if (publicPath === AGENT_PUBLIC_PATH) return agentSeo[language];
  const programSlug = getProgramSlugFromPath(publicPath);
  if(programSlug){const programCopy=getProgramSeo(programSlug,language);if(programCopy)return programCopy;}
  const copy = language === "ar" ? arabicRouteSeo[publicPath] : getSiteRuntimeMetadata(publicPath, language);
  return { ...(copy || genericSeo[language]), schemaType: arabicRouteSeo[publicPath]?.schemaType || "WebPage" };
}
