import { supabase } from "@/lib/supabase";
import {
  findCmsSection,
  getCmsPageWithSections,
  getCmsText,
  type CmsSection,
} from "@/lib/pageSections";
import {
  CmsPublishedText,
  CmsPublishedTranslationsProvider,
  type CmsPublishedTranslationSource,
} from "@/components/CmsPublishedTranslations";
import {
  AboutBackLink,
  AboutContentShell,
  AboutCta,
  AboutManagementPanel,
  AboutMilestones,
  AboutMission,
  AboutValues,
} from "@/components/AboutStaticUi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Setting = { setting_key: string | null; setting_value: string | null; is_public: boolean | null };
type TranslationFieldValues = { title?: string | null; summary?: string | null; content?: string | null };

async function getAboutPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("about"),
    supabase ? supabase.from("settings").select("setting_key, setting_value, is_public").eq("is_public", true) : Promise.resolve({ data: [], error: null }),
  ]);
  return { page: pageData.page, sections: pageData.sections, settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [] };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value?.trim()) return value.trim();
  }
  return fallback;
}

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

export default async function AboutPage() {
  const { page, sections, settings } = await getAboutPageData();
  const agencyName = getSetting(settings, ["agency_name_ar", "agency_name", "site_name"], "وكالة حمزة");
  const whatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const agencyIntroSection = findCmsSection(sections, "agency-intro");
  const workMethodSection = findCmsSection(sections, "work-method");
  const agencyIntro = getSectionContent(agencyIntroSection, {
    title: "من هي وكالة حمزة؟",
    subtitle: "وكالة لإدارة ودعم صناع المحتوى",
    content: "وكالة حمزة هي منصة وكالة احترافية لإدارة وتوظيف ودعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي، مع متابعة واضحة وبيئة عمل منظمة.",
  });
  const workMethod = getSectionContent(workMethodSection, {
    title: "طريقة عملنا",
    subtitle: "خطوات واضحة من التقديم إلى المتابعة",
    content: "يعتمد العمل على استقبال الطلبات، مراجعة البيانات، توجيه المتقدمين للبرنامج المناسب، ثم المتابعة عبر فريق الوكالة.",
  });
  const title = getCmsText(page?.title, "من نحن");
  const hasPageContent = Boolean(page?.content?.trim());
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({ sourceKey: "about-page", sourceType: "pages", sourceId: page?.id, values: { title: page?.title, summary: page?.seo_description, content: page?.content }, fallback: { title, content: page?.content?.trim() || "" } }),
    createCmsTranslationSource({ sourceKey: "about-agency-intro", sourceType: "sections", sourceId: agencyIntroSection?.id, values: { title: agencyIntroSection?.title, summary: agencyIntroSection?.subtitle, content: agencyIntroSection?.content }, fallback: { title: agencyIntro.title, summary: agencyIntro.subtitle, content: agencyIntro.content } }),
    createCmsTranslationSource({ sourceKey: "about-work-method", sourceType: "sections", sourceId: workMethodSection?.id, values: { title: workMethodSection?.title, summary: workMethodSection?.subtitle, content: workMethodSection?.content }, fallback: { title: workMethod.title, summary: workMethod.subtitle, content: workMethod.content } }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <AboutBackground />
        <AboutContentShell>
          <AboutBackLink />
          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{agencyName}</div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl"><CmsPublishedText sourceKey="about-page" field="title" fallback={title} /><span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent"><CmsPublishedText sourceKey="about-agency-intro" field="summary" fallback={agencyIntro.subtitle} /></span></h1>
            <h2 className="mt-8 text-2xl font-black text-purple-100"><CmsPublishedText sourceKey="about-agency-intro" field="title" fallback={agencyIntro.title} /></h2>
            <p className="mt-5 max-w-5xl text-xl leading-10 text-white/75">{hasPageContent ? <CmsPublishedText sourceKey="about-page" field="content" fallback={page?.content || ""} /> : <CmsPublishedText sourceKey="about-agency-intro" field="content" fallback={agencyIntro.content} />}</p>
            <AboutManagementPanel agencyName={agencyName} />
          </div>
          <AboutValues />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
              <h2 className="text-3xl font-black"><CmsPublishedText sourceKey="about-work-method" field="title" fallback={workMethod.title} /></h2>
              <p className="mt-3 text-lg font-bold text-purple-100/85"><CmsPublishedText sourceKey="about-work-method" field="summary" fallback={workMethod.subtitle} /></p>
              <p className="mt-5 leading-9 text-white/72"><CmsPublishedText sourceKey="about-work-method" field="content" fallback={workMethod.content} /></p>
            </div>
            <AboutMission />
          </div>
          <AboutMilestones />
          <AboutCta cleanWhatsapp={cleanWhatsapp} />
        </AboutContentShell>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}

function AboutBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.36)_0%,rgba(7,0,9,0.98)_68%)]" /><div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/18 blur-3xl" /><div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" /><div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" /></div>;
}
