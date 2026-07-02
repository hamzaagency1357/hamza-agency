import Link from "next/link";
import FaqListWithTranslations from "@/components/FaqListWithTranslations";
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

type FaqItem = {
  id: number;
  question: string | null;
  answer: string | null;
  category: string | null;
  sort_order: number | null;
  is_published: boolean | null;
};

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
};

type TranslationFieldValues = {
  title?: string | null;
  summary?: string | null;
  content?: string | null;
};

const fallbackFaqs: FaqItem[] = [
  { id: 1, question: "ما هي وكالة حمزة؟", answer: "وكالة حمزة منصة وكالة لإدارة ودعم صناع المحتوى على برامج البث المباشر والتواصل الاجتماعي.", category: "عام", sort_order: 1, is_published: true },
  { id: 2, question: "كيف أرسل طلب انضمام؟", answer: "يمكنك فتح صفحة البرامج، اختيار البرنامج المناسب، ثم تعبئة نموذج الانضمام بالبيانات المطلوبة.", category: "الانضمام", sort_order: 2, is_published: true },
  { id: 3, question: "كيف يتم التواصل بعد إرسال الطلب؟", answer: "يقوم فريق الوكالة بمراجعة الطلب، وقد يتم التواصل معك عبر رقم واتساب الذي أدخلته في النموذج.", category: "المتابعة", sort_order: 3, is_published: true },
  { id: 4, question: "هل توجد خدمات رقمية؟", answer: "نعم، توجد صفحة خاصة للخدمات الرقمية وطلبات الخدمة، ويتم تأكيد التفاصيل عبر قنوات الوكالة الرسمية.", category: "الخدمات", sort_order: 4, is_published: true },
];

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
  return { sourceKey, sourceType, sourceId: sourceId ?? "", requiredFields: getRequiredFields(values), fallback };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }
  return fallback;
}

function buildFaqStructuredData(faqs: FaqItem[]) {
  const mainEntity = faqs.filter((faq) => faq.question && faq.answer).map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  }));
  return JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity }).replace(/</g, "\\u003c");
}

async function getFaqPageData() {
  const [pageData, settingsResult, faqsResult] = await Promise.all([
    getCmsPageWithSections("faq"),
    supabase ? supabase.from("settings").select("setting_key, setting_value").eq("is_public", true) : Promise.resolve({ data: [], error: null }),
    supabase ? supabase.from("faqs").select("id, question, answer, category, sort_order, is_published").eq("is_published", true).order("sort_order", { ascending: true }) : Promise.resolve({ data: fallbackFaqs, error: null }),
  ]);
  return {
    page: pageData.page,
    sections: pageData.sections,
    settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [],
    faqs: !faqsResult.error && faqsResult.data && faqsResult.data.length > 0 ? (faqsResult.data as FaqItem[]) : fallbackFaqs,
  };
}

export default async function FaqPage() {
  const { page, sections, settings, faqs } = await getFaqPageData();
  const agencyName = getSetting(settings, ["agency_name_ar", "agency_name", "site_name"], "وكالة حمزة");
  const whatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const faqIntroSection = findCmsSection(sections, "faq-intro");
  const faqListSection = findCmsSection(sections, "faq-list");
  const faqIntro = getSectionContent(faqIntroSection, { title: "الأسئلة الشائعة", subtitle: "إجابات واضحة على أكثر الأسئلة تكراراً", content: "إجابات منظمة حول طريقة الانضمام، البرامج المتاحة، متابعة الطلبات، والخدمات الرقمية." });
  const faqList = getSectionContent(faqListSection, { title: "أهم الأسئلة", subtitle: "معلومات مختصرة تساعدك قبل التواصل", content: "استعرض الأسئلة حسب التصنيف، ثم تواصل مع فريق الوكالة عند الحاجة إلى توضيح إضافي." });
  const title = page?.title || faqIntro.title;
  const hasPageContent = Boolean(page?.content?.trim());
  const faqStructuredData = buildFaqStructuredData(faqs);
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({ sourceKey: "faq-page", sourceType: "pages", sourceId: page?.id, values: { title: page?.title, summary: page?.seo_description, content: page?.content }, fallback: { title, content: page?.content?.trim() || "" } }),
    createCmsTranslationSource({ sourceKey: "faq-intro", sourceType: "sections", sourceId: faqIntroSection?.id, values: { title: faqIntroSection?.title, summary: faqIntroSection?.subtitle, content: faqIntroSection?.content }, fallback: { title: faqIntro.title, summary: faqIntro.subtitle, content: faqIntro.content } }),
    createCmsTranslationSource({ sourceKey: "faq-list", sourceType: "sections", sourceId: faqListSection?.id, values: { title: faqListSection?.title, summary: faqListSection?.subtitle, content: faqListSection?.content }, fallback: { title: faqList.title, summary: faqList.subtitle, content: faqList.content } }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqStructuredData }} />
        <FaqBackground />
        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <Link href="/" className="mb-8 inline-block text-purple-200">← العودة إلى الرئيسية</Link>
          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{agencyName}</div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              <CmsPublishedText sourceKey="faq-page" field="title" fallback={title} />
              <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent"><CmsPublishedText sourceKey="faq-intro" field="summary" fallback={faqIntro.subtitle} /></span>
            </h1>
            <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
              {hasPageContent ? <CmsPublishedText sourceKey="faq-page" field="content" fallback={page?.content || ""} /> : <CmsPublishedText sourceKey="faq-intro" field="content" fallback={faqIntro.content} />}
            </p>
          </div>
          <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
            <h2 className="text-3xl font-black text-yellow-100"><CmsPublishedText sourceKey="faq-list" field="title" fallback={faqList.title} /></h2>
            <p className="mt-4 max-w-4xl leading-9 text-white/75"><CmsPublishedText sourceKey="faq-list" field="content" fallback={faqList.content} /></p>
          </div>
          <FaqListWithTranslations faqs={faqs} />
          <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
            <h2 className="text-3xl font-black">تواصل معنا مباشرة</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">يمكنك التواصل مع فريق وكالة حمزة عبر واتساب عند الحاجة إلى مساعدة إضافية.</p>
            <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/contact" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black">صفحة التواصل</Link>
              <a href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("مرحباً، لدي سؤال بخصوص وكالة حمزة.")}`} target="_blank" className="rounded-full bg-green-500 px-7 py-4 font-black text-white">واتساب</a>
            </div>
          </div>
        </section>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}

function FaqBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.34)_0%,rgba(7,0,9,0.98)_68%)]" /><div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/16 blur-3xl" /><div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" /><div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" /></div>;
}
