import {
  AiPolicyEscalationReasons,
  AiPolicyOverviewStaticUi,
  AiPolicySupportStaticUi,
} from "@/components/AiPolicyStaticUi";
import PublicBackHomeLink from "@/components/PublicBackHomeLink";
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

async function getAiPolicyPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("ai-policy"),
    supabase ? supabase.from("settings").select("setting_key, setting_value").eq("is_public", true) : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    page: pageData.page,
    sections: pageData.sections,
    settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [],
  };
}

export default async function AiPolicyPage() {
  const { page, sections, settings } = await getAiPolicyPageData();
  const agencyName = getSetting(settings, ["agency_name_ar", "agency_name", "site_name"], "وكالة حمزة");
  const whatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const overviewSection = findCmsSection(sections, "ai-policy-overview");
  const escalationSection = findCmsSection(sections, "ai-escalation");

  const overview = getSectionContent(overviewSection, {
    title: "سياسة الذكاء الاصطناعي",
    subtitle: "دعم ذكي بإشراف إداري",
    content: "توضح هذه الصفحة دور الذكاء الاصطناعي في تقديم الإرشاد والمساعدة، مع التأكيد أن قرارات القبول والمتابعة تبقى بيد فريق الوكالة.",
  });
  const escalation = getSectionContent(escalationSection, {
    title: "التحويل إلى فريق الوكالة",
    subtitle: "عند الحاجة يتم توجيه المستخدم للتواصل مع الفريق",
    content: "إذا احتاج المستخدم مساعدة بشرية أو توضيحاً خاصاً، يتم توجيهه إلى قناة التواصل المناسبة مع فريق وكالة حمزة.",
  });

  const title = page?.title || overview.title;
  const hasPageContent = Boolean(page?.content?.trim());
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({
      sourceKey: "ai-policy-page",
      sourceType: "pages",
      sourceId: page?.id,
      values: { title: page?.title, summary: page?.seo_description, content: page?.content },
      fallback: { title, content: page?.content?.trim() || "" },
    }),
    createCmsTranslationSource({
      sourceKey: "ai-policy-overview",
      sourceType: "sections",
      sourceId: overviewSection?.id,
      values: { title: overviewSection?.title, summary: overviewSection?.subtitle, content: overviewSection?.content },
      fallback: { title: overview.title, summary: overview.subtitle, content: overview.content },
    }),
    createCmsTranslationSource({
      sourceKey: "ai-policy-escalation",
      sourceType: "sections",
      sourceId: escalationSection?.id,
      values: { title: escalationSection?.title, summary: escalationSection?.subtitle, content: escalationSection?.content },
      fallback: { title: escalation.title, summary: escalation.subtitle, content: escalation.content },
    }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <AiPolicyBackground />
        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <PublicBackHomeLink />
          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100"><PublicAgencyName value={agencyName} /></div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              <CmsPublishedText sourceKey="ai-policy-page" field="title" fallback={title} />
              <span className="block bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
                <CmsPublishedText sourceKey="ai-policy-overview" field="summary" fallback={overview.subtitle} />
              </span>
            </h1>
            <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
              {hasPageContent ? <CmsPublishedText sourceKey="ai-policy-page" field="content" fallback={page?.content || ""} /> : <CmsPublishedText sourceKey="ai-policy-overview" field="content" fallback={overview.content} />}
            </p>
          </div>

          <AiPolicyOverviewStaticUi />

          <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
            <h2 className="text-3xl font-black"><CmsPublishedText sourceKey="ai-policy-escalation" field="title" fallback={escalation.title} /></h2>
            <p className="mt-3 text-lg font-bold text-purple-100/80"><CmsPublishedText sourceKey="ai-policy-escalation" field="summary" fallback={escalation.subtitle} /></p>
            <p className="mt-5 leading-9 text-white/75"><CmsPublishedText sourceKey="ai-policy-escalation" field="content" fallback={escalation.content} /></p>
            <AiPolicyEscalationReasons />
          </div>

          <AiPolicySupportStaticUi cleanWhatsapp={cleanWhatsapp} />
        </section>
      </PublicLanguageMain>
    </CmsPublishedTranslationsProvider>
  );
}

function AiPolicyBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.18)_0%,rgba(124,58,237,0.24)_40%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
