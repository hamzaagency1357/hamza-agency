import {
  DigitalBackLink,
  DigitalCtaActions,
  DigitalHeroActions,
  DigitalStaticContent,
} from "@/components/DigitalServicesStaticUi";
import {
  CmsPublishedText,
  CmsPublishedTranslationsProvider,
  type CmsPublishedTranslationSource,
} from "@/components/CmsPublishedTranslations";
import PublicAgencyName from "@/components/PublicAgencyName";
import { supabase } from "@/lib/supabase";
import {
  findCmsSection,
  getCmsPageWithSections,
  getCmsText,
  type CmsSection,
} from "@/lib/pageSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Setting = { setting_key: string | null; setting_value: string | null; is_public: boolean | null };
type TranslationFieldValues = { title?: string | null; summary?: string | null; content?: string | null };

function getSectionContent(section: CmsSection | null, fallback: { title: string; subtitle: string; content: string }) {
  return { title: getCmsText(section?.title, fallback.title), subtitle: getCmsText(section?.subtitle, fallback.subtitle), content: getCmsText(section?.content, fallback.content) };
}

function getRequiredFields(values: TranslationFieldValues): CmsPublishedTranslationSource["requiredFields"] {
  const fields: Array<"title" | "summary" | "content"> = [];
  if (values.title?.trim()) fields.push("title");
  if (values.summary?.trim()) fields.push("summary");
  if (values.content?.trim()) fields.push("content");
  return fields;
}

function createCmsTranslationSource({ sourceKey, sourceType, sourceId, values, fallback }: {
  sourceKey: string;
  sourceType: CmsPublishedTranslationSource["sourceType"];
  sourceId: number | null | undefined;
  values: TranslationFieldValues;
  fallback: CmsPublishedTranslationSource["fallback"];
}): CmsPublishedTranslationSource {
  return { sourceKey, sourceType, sourceId: sourceId ?? "", requiredFields: getRequiredFields(values), fallback };
}

async function getDigitalServicesPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("digital-services"),
    supabase ? supabase.from("settings").select("setting_key, setting_value, is_public").eq("is_public", true) : Promise.resolve({ data: [], error: null }),
  ]);
  return { page: pageData.page, sections: pageData.sections, settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [] };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }
  return fallback;
}

export default async function DigitalServicesPage() {
  const { page, sections, settings } = await getDigitalServicesPageData();
  const agencyName = getSetting(settings, ["agency_name_ar", "agency_name", "site_name"], "وكالة حمزة");
  const whatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const overviewSection = findCmsSection(sections, "digital-services-overview");
  const requestCtaSection = findCmsSection(sections, "service-request-cta");
  const overview = getSectionContent(overviewSection, { title: "الخدمات الرقمية", subtitle: "طلبات منظمة ومتابعة واضحة", content: "توفر وكالة حمزة صفحة مخصصة لتنظيم طلبات الخدمات الرقمية مثل شحن المنصات، سحب الأرباح، ومتابعة الخدمات المساعدة. الهدف هو استقبال الطلب بشكل واضح، مراجعته من فريق الوكالة، ثم تأكيد التفاصيل عبر واتساب عند الحاجة قبل أي تنفيذ." });
  const requestCta = getSectionContent(requestCtaSection, { title: "إرسال طلب خدمة", subtitle: "أرسل تفاصيل طلبك للمتابعة", content: "يمكنك إرسال طلب خدمة بالبيانات الأساسية فقط. بعد ذلك تتم مراجعة الطلب وتحديث حالته، وقد يتم التواصل معك عبر واتساب لتأكيد التفاصيل أو استكمال المعلومات." });
  const title = page?.title || overview.title;
  const hasPageContent = Boolean(page?.content?.trim());
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({ sourceKey: "digital-services-page", sourceType: "pages", sourceId: page?.id, values: { title: page?.title, summary: page?.seo_description, content: page?.content }, fallback: { title, content: page?.content?.trim() || "" } }),
    createCmsTranslationSource({ sourceKey: "digital-services-overview", sourceType: "sections", sourceId: overviewSection?.id, values: { title: overviewSection?.title, summary: overviewSection?.subtitle, content: overviewSection?.content }, fallback: { title: overview.title, summary: overview.subtitle, content: overview.content } }),
    createCmsTranslationSource({ sourceKey: "service-request-cta", sourceType: "sections", sourceId: requestCtaSection?.id, values: { title: requestCtaSection?.title, summary: requestCtaSection?.subtitle, content: requestCtaSection?.content }, fallback: { title: requestCta.title, summary: requestCta.subtitle, content: requestCta.content } }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <DigitalServicesBackground />
        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <DigitalBackLink />
          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100"><PublicAgencyName value={agencyName} /></div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl"><CmsPublishedText sourceKey="digital-services-page" field="title" fallback={title} /><span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent"><CmsPublishedText sourceKey="digital-services-overview" field="summary" fallback={overview.subtitle} /></span></h1>
            <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">{hasPageContent ? <CmsPublishedText sourceKey="digital-services-page" field="content" fallback={page?.content || ""} /> : <CmsPublishedText sourceKey="digital-services-overview" field="content" fallback={overview.content} />}</p>
            <DigitalHeroActions cleanWhatsapp={cleanWhatsapp} />
          </div>
          <DigitalStaticContent />
          <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
            <h2 className="text-3xl font-black"><CmsPublishedText sourceKey="service-request-cta" field="title" fallback={requestCta.title} /></h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70"><CmsPublishedText sourceKey="service-request-cta" field="summary" fallback={requestCta.subtitle} /></p>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70"><CmsPublishedText sourceKey="service-request-cta" field="content" fallback={requestCta.content} /></p>
            <DigitalCtaActions cleanWhatsapp={cleanWhatsapp} />
          </div>
        </section>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}

function DigitalServicesBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.24)_0%,rgba(124,58,237,0.18)_35%,rgba(7,0,9,0.98)_72%)]" /><div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" /><div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/12 blur-3xl md:block" /><div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" /></div>;
}
