import Link from "next/link";
import KnowledgeCenterStaticUi from "@/components/KnowledgeCenterStaticUi";
import KnowledgeListWithTranslations from "@/components/KnowledgeListWithTranslations";
import {
  CmsPublishedText,
  CmsPublishedTranslationsProvider,
  type CmsPublishedTranslationSource,
} from "@/components/CmsPublishedTranslations";
import { supabase } from "@/lib/supabase";
import {
  findCmsSection,
  getCmsPageWithSections,
  getCmsText,
  type CmsSection,
} from "@/lib/pageSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Setting = { setting_key: string | null; setting_value: string | null };
type KnowledgeItem = { id: number; title: string | null; summary: string | null; content: string | null; category: string | null; sort_order: number | null; is_published: boolean | null };
type TranslationFieldValues = { title?: string | null; summary?: string | null; content?: string | null };

const fallbackKnowledge: KnowledgeItem[] = [
  { id: 1, title: "كيف تختار البرنامج المناسب لك؟", summary: "إرشاد يساعد صانع المحتوى على فهم البرنامج الأقرب لطبيعة حسابه.", content: "اختيار البرنامج المناسب يعتمد على نوع المحتوى، نشاط الحساب، القدرة على الالتزام، وطريقة التواصل مع الجمهور. برامج الفيديو القصير تناسب نوعاً من المحتوى، وبرامج البث المباشر تناسب من يستطيع التفاعل بشكل مستمر.", category: "الانضمام", sort_order: 1, is_published: true },
  { id: 2, title: "ماذا يحدث بعد إرسال طلب الانضمام؟", summary: "خطوات أساسية تساعدك على فهم مسار المراجعة والمتابعة.", content: "بعد إرسال الطلب، تتم مراجعة البيانات من فريق الوكالة. عند الحاجة إلى معلومات إضافية أو توضيح، يتم التواصل معك عبر رقم واتساب الذي أدخلته في النموذج.", category: "الطلبات", sort_order: 2, is_published: true },
  { id: 3, title: "نصائح لصناع المحتوى الجدد", summary: "إرشادات أولية تساعدك على تقديم نفسك بشكل أفضل.", content: "احرص على إدخال بيانات صحيحة، استخدم رقم واتساب فعال، اشرح خبرتك السابقة بوضوح إن وجدت، وكن صريحاً حول نوع المحتوى الذي تقدمه أو ترغب بتقديمه.", category: "صناع المحتوى", sort_order: 3, is_published: true },
  { id: 4, title: "الخدمات الرقمية داخل وكالة حمزة", summary: "توضيح الفرق بين خدمات الوكالة وطلبات الخدمات الرقمية.", content: "الخدمات الرقمية مثل الشحن والسحب والمتابعة لها صفحة مخصصة لشرح طريقة الطلب، ويتم تأكيد التفاصيل عبر قنوات الوكالة الرسمية عند الحاجة.", category: "الخدمات الرقمية", sort_order: 4, is_published: true },
];

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

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }
  return fallback;
}

function groupKnowledge(items: KnowledgeItem[]) {
  return items.reduce<Record<string, KnowledgeItem[]>>((groups, item) => {
    const category = item.category || "مقالات عامة";
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});
}

async function getKnowledgeCenterData() {
  const [pageData, settingsResult, knowledgeResult] = await Promise.all([
    getCmsPageWithSections("knowledge-center"),
    supabase ? supabase.from("settings").select("setting_key, setting_value").eq("is_public", true) : Promise.resolve({ data: [], error: null }),
    supabase ? supabase.from("knowledge_base").select("id, title, summary, content, category, sort_order, is_published").eq("is_published", true).order("sort_order", { ascending: true }) : Promise.resolve({ data: fallbackKnowledge, error: null }),
  ]);
  return {
    page: pageData.page,
    sections: pageData.sections,
    settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [],
    knowledge: !knowledgeResult.error && knowledgeResult.data && knowledgeResult.data.length > 0 ? (knowledgeResult.data as KnowledgeItem[]) : fallbackKnowledge,
  };
}

export default async function KnowledgeCenterPage() {
  const { page, sections, settings, knowledge } = await getKnowledgeCenterData();
  const agencyName = getSetting(settings, ["agency_name_ar", "agency_name", "site_name"], "وكالة حمزة");
  const whatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const knowledgeIntroSection = findCmsSection(sections, "knowledge-intro");
  const creatorGuidanceSection = findCmsSection(sections, "creator-guidance");
  const knowledgeIntro = getSectionContent(knowledgeIntroSection, { title: "مركز المعرفة", subtitle: "إرشادات ومعلومات لصناع المحتوى", content: "مركز المعرفة في وكالة حمزة يساعد صناع المحتوى على فهم طريقة الانضمام، اختيار البرنامج المناسب، معرفة خطوات المتابعة، والتعرف على الخدمات المتاحة داخل الوكالة." });
  const creatorGuidance = getSectionContent(creatorGuidanceSection, { title: "إرشادات لصناع المحتوى", subtitle: "محتوى يساعد المتقدم على فهم الطريق الصحيح", content: "يشمل هذا القسم نصائح حول تجهيز البيانات، فهم شروط البرامج، وتحسين طريقة التواصل مع فريق الوكالة." });
  const title = page?.title || knowledgeIntro.title;
  const hasPageContent = Boolean(page?.content?.trim());
  const groupedKnowledge = groupKnowledge(knowledge);
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({ sourceKey: "knowledge-center-page", sourceType: "pages", sourceId: page?.id, values: { title: page?.title, summary: page?.seo_description, content: page?.content }, fallback: { title, content: page?.content?.trim() || "" } }),
    createCmsTranslationSource({ sourceKey: "knowledge-intro", sourceType: "sections", sourceId: knowledgeIntroSection?.id, values: { title: knowledgeIntroSection?.title, summary: knowledgeIntroSection?.subtitle, content: knowledgeIntroSection?.content }, fallback: { title: knowledgeIntro.title, summary: knowledgeIntro.subtitle, content: knowledgeIntro.content } }),
    createCmsTranslationSource({ sourceKey: "creator-guidance", sourceType: "sections", sourceId: creatorGuidanceSection?.id, values: { title: creatorGuidanceSection?.title, summary: creatorGuidanceSection?.subtitle, content: creatorGuidanceSection?.content }, fallback: { title: creatorGuidance.title, summary: creatorGuidance.subtitle, content: creatorGuidance.content } }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <KnowledgeBackground />
        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <Link href="/" className="mb-8 inline-block text-purple-200">← العودة إلى الرئيسية</Link>
          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{agencyName}</div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl"><CmsPublishedText sourceKey="knowledge-center-page" field="title" fallback={title} /><span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent"><CmsPublishedText sourceKey="knowledge-intro" field="summary" fallback={knowledgeIntro.subtitle} /></span></h1>
            <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">{hasPageContent ? <CmsPublishedText sourceKey="knowledge-center-page" field="content" fallback={page?.content || ""} /> : <CmsPublishedText sourceKey="knowledge-intro" field="content" fallback={knowledgeIntro.content} />}</p>
          </div>
          <KnowledgeCenterStaticUi articleCount={knowledge.length} categoryCount={Object.keys(groupedKnowledge).length} cleanWhatsapp={cleanWhatsapp} />
          <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur"><h2 className="text-3xl font-black text-yellow-100"><CmsPublishedText sourceKey="creator-guidance" field="title" fallback={creatorGuidance.title} /></h2><p className="mt-3 text-lg font-bold text-yellow-100/80"><CmsPublishedText sourceKey="creator-guidance" field="summary" fallback={creatorGuidance.subtitle} /></p><p className="mt-5 max-w-4xl leading-9 text-white/75"><CmsPublishedText sourceKey="creator-guidance" field="content" fallback={creatorGuidance.content} /></p></div>
          <KnowledgeListWithTranslations knowledge={knowledge} />
        </section>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}

function KnowledgeBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.34)_0%,rgba(7,0,9,0.98)_68%)]" /><div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/16 blur-3xl" /><div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" /><div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" /></div>;
}
