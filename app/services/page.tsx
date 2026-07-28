import {
  ServicesBadge,
  ServicesHeroActions,
  ServicesNav,
  ServicesStaticContent,
} from "@/components/ServicesStaticUi";
import {
  CmsPublishedText,
  CmsPublishedTranslationsProvider,
  type CmsPublishedTranslationSource,
} from "@/components/CmsPublishedTranslations";
import {
  findCmsSection,
  getCmsPageWithSections,
  getCmsText,
  type CmsSection,
} from "@/lib/pageSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function ServicesPage() {
  const { page, sections } = await getCmsPageWithSections("services");
  const agencyServicesSection = findCmsSection(sections, "agency-services");
  const supportProcessSection = findCmsSection(sections, "support-process");
  const agencyServices = getSectionContent(agencyServicesSection, { title: "خدمات الوكالة", subtitle: "خدمات تنظيمية وتشغيلية لصناع المحتوى", content: "تقدم وكالة حمزة خدمات تنظيمية وتشغيلية لصناع المحتوى، تشمل متابعة الطلبات، دعم البرامج، الإرشاد، وتنظيم التواصل مع الفريق المختص." });
  const supportProcess = getSectionContent(supportProcessSection, { title: "آلية الدعم والمتابعة", subtitle: "متابعة منظمة حسب نوع الطلب والبرنامج", content: "يتم التعامل مع كل طلب حسب حالته، مع مراجعة البيانات وتوجيه صاحب الطلب إلى المسار المناسب داخل الوكالة." });
  const pageTitle = page?.title || agencyServices.title;
  const pageDescription = page?.content || agencyServices.content;
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({ sourceKey: "services-page", sourceType: "pages", sourceId: page?.id, values: { title: page?.title, summary: page?.seo_description, content: page?.content }, fallback: { title: pageTitle, content: page?.content?.trim() || "" } }),
    createCmsTranslationSource({ sourceKey: "agency-services", sourceType: "sections", sourceId: agencyServicesSection?.id, values: { title: agencyServicesSection?.title, summary: agencyServicesSection?.subtitle, content: agencyServicesSection?.content }, fallback: { title: agencyServices.title, summary: agencyServices.subtitle, content: agencyServices.content } }),
    createCmsTranslationSource({ sourceKey: "support-process", sourceType: "sections", sourceId: supportProcessSection?.id, values: { title: supportProcessSection?.title, summary: supportProcessSection?.subtitle, content: supportProcessSection?.content }, fallback: { title: supportProcess.title, summary: supportProcess.subtitle, content: supportProcess.content } }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main className="min-h-screen bg-[#070009] px-5 py-8 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.32),transparent_45%)]" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(40,10,70,0.35),rgba(7,0,9,0.95))]" /><div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] [background-size:44px_44px]" /></div>
        <section className="relative z-10 mx-auto max-w-6xl">
          <ServicesNav />
          <div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur md:p-10">
            <ServicesBadge />
            <h1 className="text-4xl font-black leading-tight md:text-6xl"><CmsPublishedText sourceKey="services-page" field="title" fallback={pageTitle} /></h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70"><CmsPublishedText sourceKey="services-page" field="content" fallback={pageDescription} /></p>
            <ServicesHeroActions />
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6 backdrop-blur"><h2 className="text-2xl font-black"><CmsPublishedText sourceKey="agency-services" field="title" fallback={agencyServices.title} /></h2><p className="mt-3 text-sm font-bold text-purple-100/80"><CmsPublishedText sourceKey="agency-services" field="summary" fallback={agencyServices.subtitle} /></p><p className="mt-4 leading-8 text-white/68"><CmsPublishedText sourceKey="agency-services" field="content" fallback={agencyServices.content} /></p></div>
            <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-6 backdrop-blur"><h2 className="text-2xl font-black text-yellow-100"><CmsPublishedText sourceKey="support-process" field="title" fallback={supportProcess.title} /></h2><p className="mt-3 text-sm font-bold text-yellow-100/80"><CmsPublishedText sourceKey="support-process" field="summary" fallback={supportProcess.subtitle} /></p><p className="mt-4 leading-8 text-white/68"><CmsPublishedText sourceKey="support-process" field="content" fallback={supportProcess.content} /></p></div>
          </div>
          <ServicesStaticContent />
        </section>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}
