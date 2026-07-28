import {
  TermsBackHomeLink,
  TermsContactPanel,
  TermsPolicyCards,
  TermsResponsibilityPanel,
} from "@/components/TermsPolicyStaticUi";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import PublicAgencyName from "@/components/PublicAgencyName";
import { supabase } from "@/lib/supabase";
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

type Setting = { setting_key: string | null; setting_value: string | null };
type TranslationFieldValues = { title?: string | null; summary?: string | null; content?: string | null };

function getSectionContent(section: CmsSection | null, fallback: { title: string; subtitle: string; content: string }) {
  return {
    title: getCmsText(section?.title, fallback.title),
    subtitle: getCmsText(section?.subtitle, fallback.subtitle),
    content: getCmsText(section?.content, fallback.content),
  };
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
  return {
    sourceKey,
    sourceType,
    sourceId: sourceId ?? "",
    requiredFields: getRequiredFields(values),
    fallback,
  };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }
  return fallback;
}

async function getTermsPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("terms-and-conditions"),
    supabase ? supabase.from("settings").select("setting_key, setting_value").eq("is_public", true) : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    page: pageData.page,
    sections: pageData.sections,
    settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [],
  };
}

export default async function TermsAndConditionsPage() {
  const { page, sections, settings } = await getTermsPageData();
  const agencyName = getSetting(settings, ["agency_name_ar", "agency_name", "site_name"], "وكالة حمزة");
  const whatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const overviewSection = findCmsSection(sections, "terms-overview");
  const requestResponsibilitySection = findCmsSection(sections, "request-responsibility");

  const overview = getSectionContent(overviewSection, {
    title: "الشروط والأحكام",
    subtitle: "قواعد استخدام موقع وكالة حمزة",
    content: "توضح هذه الصفحة الشروط العامة لاستخدام الموقع، إرسال الطلبات، التواصل مع الوكالة، والاستفادة من الخدمات المتاحة.",
  });
  const requestResponsibility = getSectionContent(requestResponsibilitySection, {
    title: "مسؤولية تقديم الطلبات",
    subtitle: "يجب إدخال بيانات صحيحة وواضحة",
    content: "يتحمل المستخدم مسؤولية صحة البيانات التي يرسلها، وتقوم الوكالة بمراجعة الطلبات وفق المعلومات المتاحة لديها.",
  });

  const title = page?.title || overview.title;
  const hasPageContent = Boolean(page?.content?.trim());
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({
      sourceKey: "terms-page",
      sourceType: "pages",
      sourceId: page?.id,
      values: { title: page?.title, summary: page?.seo_description, content: page?.content },
      fallback: { title, content: page?.content?.trim() || "" },
    }),
    createCmsTranslationSource({
      sourceKey: "terms-overview",
      sourceType: "sections",
      sourceId: overviewSection?.id,
      values: { title: overviewSection?.title, summary: overviewSection?.subtitle, content: overviewSection?.content },
      fallback: { title: overview.title, summary: overview.subtitle, content: overview.content },
    }),
    createCmsTranslationSource({
      sourceKey: "terms-request-responsibility",
      sourceType: "sections",
      sourceId: requestResponsibilitySection?.id,
      values: { title: requestResponsibilitySection?.title, summary: requestResponsibilitySection?.subtitle, content: requestResponsibilitySection?.content },
      fallback: { title: requestResponsibility.title, summary: requestResponsibility.subtitle, content: requestResponsibility.content },
    }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <TermsBackground />
        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <TermsBackHomeLink />
          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100"><PublicAgencyName value={agencyName} /></div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              <CmsPublishedText sourceKey="terms-page" field="title" fallback={title} />
              <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent"><CmsPublishedText sourceKey="terms-overview" field="summary" fallback={overview.subtitle} /></span>
            </h1>
            <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">{hasPageContent ? <CmsPublishedText sourceKey="terms-page" field="content" fallback={page?.content || ""} /> : <CmsPublishedText sourceKey="terms-overview" field="content" fallback={overview.content} />}</p>
          </div>

          <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
            <h2 className="text-3xl font-black text-yellow-100"><CmsPublishedText sourceKey="terms-request-responsibility" field="title" fallback={requestResponsibility.title} /></h2>
            <p className="mt-3 text-lg font-bold text-yellow-100/80"><CmsPublishedText sourceKey="terms-request-responsibility" field="summary" fallback={requestResponsibility.subtitle} /></p>
            <p className="mt-5 leading-9 text-white/75"><CmsPublishedText sourceKey="terms-request-responsibility" field="content" fallback={requestResponsibility.content} /></p>
          </div>

          <TermsPolicyCards />
          <TermsResponsibilityPanel />
          <TermsContactPanel cleanWhatsapp={cleanWhatsapp} />
        </section>
      </PublicLanguageMain>
    </CmsPublishedTranslationsProvider>
  );
}

function TermsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.32)_0%,rgba(7,0,9,0.98)_68%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
