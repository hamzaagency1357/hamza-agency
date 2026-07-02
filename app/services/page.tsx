import Link from "next/link";
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

const serviceCards = [
  { title: "متابعة طلبات الانضمام", text: "تنظيم طلبات صناع المحتوى ومتابعة حالتها من لوحة إدارة واضحة." },
  { title: "دعم البرامج", text: "توجيه المتقدمين حسب البرنامج المناسب ومتطلبات كل منصة." },
  { title: "تنظيم التواصل", text: "تسهيل التواصل مع فريق الوكالة عبر قنوات واضحة ومتابعة منظمة." },
  { title: "الخدمات الرقمية", text: "استقبال طلبات الخدمات الرقمية وتحويلها إلى مسار متابعة واضح." },
];

const processSteps = ["تحديد نوع الطلب أو الخدمة المطلوبة.", "إرسال البيانات الأساسية من الصفحة المناسبة.", "مراجعة الطلب من فريق وكالة حمزة.", "التواصل مع صاحب الطلب عبر واتساب عند الحاجة."];

function buildServicesStructuredData(pageTitle: string, pageDescription: string) {
  return JSON.stringify({
    "@context": "https://schema.org", "@type": "Service", name: pageTitle, description: pageDescription,
    provider: { "@type": "Organization", name: "HAMZA AGENCY", url: "https://hamza-agency.com" }, areaServed: "Online",
    serviceType: serviceCards.map((service) => service.title),
    hasOfferCatalog: { "@type": "OfferCatalog", name: "خدمات وكالة حمزة", itemListElement: serviceCards.map((service) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: service.title, description: service.text } })) },
  }).replace(/</g, "\\u003c");
}

function buildServicesBreadcrumbData() {
  return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://hamza-agency.com" },
    { "@type": "ListItem", position: 2, name: "الخدمات", item: "https://hamza-agency.com/services" },
  ] }).replace(/</g, "\\u003c");
}

export default async function ServicesPage() {
  const { page, sections } = await getCmsPageWithSections("services");
  const agencyServicesSection = findCmsSection(sections, "agency-services");
  const supportProcessSection = findCmsSection(sections, "support-process");
  const agencyServices = getSectionContent(agencyServicesSection, { title: "خدمات الوكالة", subtitle: "خدمات تنظيمية وتشغيلية لصناع المحتوى", content: "تقدم وكالة حمزة خدمات تنظيمية وتشغيلية لصناع المحتوى، تشمل متابعة الطلبات، دعم البرامج، الإرشاد، وتنظيم التواصل مع الفريق المختص." });
  const supportProcess = getSectionContent(supportProcessSection, { title: "آلية الدعم والمتابعة", subtitle: "متابعة منظمة حسب نوع الطلب والبرنامج", content: "يتم التعامل مع كل طلب حسب حالته، مع مراجعة البيانات وتوجيه صاحب الطلب إلى المسار المناسب داخل الوكالة." });
  const pageTitle = page?.title || agencyServices.title;
  const pageDescription = page?.content || agencyServices.content;
  const servicesStructuredData = buildServicesStructuredData(pageTitle, pageDescription);
  const servicesBreadcrumbData = buildServicesBreadcrumbData();
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({ sourceKey: "services-page", sourceType: "pages", sourceId: page?.id, values: { title: page?.title, summary: page?.seo_description, content: page?.content }, fallback: { title: pageTitle, content: page?.content?.trim() || "" } }),
    createCmsTranslationSource({ sourceKey: "agency-services", sourceType: "sections", sourceId: agencyServicesSection?.id, values: { title: agencyServicesSection?.title, summary: agencyServicesSection?.subtitle, content: agencyServicesSection?.content }, fallback: { title: agencyServices.title, summary: agencyServices.subtitle, content: agencyServices.content } }),
    createCmsTranslationSource({ sourceKey: "support-process", sourceType: "sections", sourceId: supportProcessSection?.id, values: { title: supportProcessSection?.title, summary: supportProcessSection?.subtitle, content: supportProcessSection?.content }, fallback: { title: supportProcess.title, summary: supportProcess.subtitle, content: supportProcess.content } }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main className="min-h-screen bg-[#070009] px-5 py-8 text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: servicesStructuredData }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: servicesBreadcrumbData }} />
        <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.32),transparent_45%)]" /><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(40,10,70,0.35),rgba(7,0,9,0.95))]" /><div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.55)_1px,transparent_0)] [background-size:44px_44px]" /></div>
        <section className="relative z-10 mx-auto max-w-6xl">
          <nav className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:text-white">العودة للرئيسية</Link><Link href="/service-request" className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15">إرسال طلب خدمة</Link></nav>
          <div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur md:p-10">
            <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">HAMZA AGENCY Services</div>
            <h1 className="text-4xl font-black leading-tight md:text-6xl"><CmsPublishedText sourceKey="services-page" field="title" fallback={pageTitle} /></h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70"><CmsPublishedText sourceKey="services-page" field="content" fallback={pageDescription} /></p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row"><Link href="/programs" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.25)]">عرض البرامج</Link><Link href="/service-request" className="rounded-full border border-white/15 bg-white/[0.05] px-8 py-4 font-black text-white/80 backdrop-blur transition hover:border-purple-400/50 hover:text-white">طلب خدمة رقمية</Link></div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6 backdrop-blur"><h2 className="text-2xl font-black"><CmsPublishedText sourceKey="agency-services" field="title" fallback={agencyServices.title} /></h2><p className="mt-3 text-sm font-bold text-purple-100/80"><CmsPublishedText sourceKey="agency-services" field="summary" fallback={agencyServices.subtitle} /></p><p className="mt-4 leading-8 text-white/68"><CmsPublishedText sourceKey="agency-services" field="content" fallback={agencyServices.content} /></p></div>
            <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-6 backdrop-blur"><h2 className="text-2xl font-black text-yellow-100"><CmsPublishedText sourceKey="support-process" field="title" fallback={supportProcess.title} /></h2><p className="mt-3 text-sm font-bold text-yellow-100/80"><CmsPublishedText sourceKey="support-process" field="summary" fallback={supportProcess.subtitle} /></p><p className="mt-4 leading-8 text-white/68"><CmsPublishedText sourceKey="support-process" field="content" fallback={supportProcess.content} /></p></div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{serviceCards.map((item) => <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"><h3 className="text-xl font-black">{item.title}</h3><p className="mt-4 leading-8 text-white/65">{item.text}</p></div>)}</div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]"><div className="rounded-[2rem] border border-white/10 bg-black/30 p-7 backdrop-blur"><h2 className="text-3xl font-black">كيف تتم المتابعة؟</h2><div className="mt-6 grid gap-4">{processSteps.map((step, index) => <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-black text-purple-100">{index + 1}</div><p className="leading-8 text-white/72">{step}</p></div>)}</div></div><div className="rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur"><h2 className="text-3xl font-black text-green-100">هل تحتاج طلب خدمة؟</h2><p className="mx-auto mt-4 max-w-xl leading-8 text-white/70">صفحة طلب الخدمة مخصصة لإرسال التفاصيل المطلوبة بشكل منظم حتى يتمكن فريق الوكالة من مراجعتها ومتابعتها.</p><Link href="/service-request" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-[0_0_30px_rgba(34,197,94,0.2)]">فتح صفحة طلب الخدمة</Link></div></div>
        </section>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}
