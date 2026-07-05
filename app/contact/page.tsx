import {
  ContactBackHomeLink,
  ContactBeforeMessage,
  ContactEmailAndHoursCards,
  ContactNowLink,
  ContactQuickLinks,
  ContactReasons,
  ContactWhatsAppAction,
} from "@/components/ContactStaticUi";
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

async function getContactPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("contact"),
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

export default async function ContactPage() {
  const { page, sections, settings } = await getContactPageData();
  const agencyName = getSetting(settings, ["agency_name_ar", "agency_name", "site_name"], "وكالة حمزة");
  const whatsapp = getSetting(settings, ["primary_whatsapp", "whatsapp", "support_whatsapp"], "+905011730377");
  const email = getSetting(settings, ["contact_email", "support_email", "email"], "");
  const workingHours = getSetting(settings, ["working_hours", "support_hours"], "تتم المتابعة حسب توفر فريق الوكالة وضغط الطلبات");
  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");
  const contactOptionsSection = findCmsSection(sections, "contact-options");
  const whatsappSupportSection = findCmsSection(sections, "whatsapp-support");
  const contactOptions = getSectionContent(contactOptionsSection, { title: "تواصل معنا", subtitle: "فريق وكالة حمزة جاهز لمتابعة الاستفسارات", content: "يمكن التواصل مع الوكالة للاستفسار عن البرامج، طلبات الانضمام، الخدمات الرقمية، أو متابعة حالة الطلب." });
  const whatsappSupport = getSectionContent(whatsappSupportSection, { title: "التواصل عبر واتساب", subtitle: "القناة الأساسية للتواصل السريع مع فريق الوكالة", content: "تتم المتابعة الأساسية عبر واتساب عند الحاجة، خصوصاً في الطلبات التي تحتاج تأكيداً أو توضيحاً إضافياً." });
  const title = page?.title || contactOptions.title;
  const hasPageContent = Boolean(page?.content?.trim());
  const translationSources: CmsPublishedTranslationSource[] = [
    createCmsTranslationSource({ sourceKey: "contact-page", sourceType: "pages", sourceId: page?.id, values: { title: page?.title, summary: page?.seo_description, content: page?.content }, fallback: { title, content: page?.content?.trim() || "" } }),
    createCmsTranslationSource({ sourceKey: "contact-options", sourceType: "sections", sourceId: contactOptionsSection?.id, values: { title: contactOptionsSection?.title, summary: contactOptionsSection?.subtitle, content: contactOptionsSection?.content }, fallback: { title: contactOptions.title, summary: contactOptions.subtitle, content: contactOptions.content } }),
    createCmsTranslationSource({ sourceKey: "whatsapp-support", sourceType: "sections", sourceId: whatsappSupportSection?.id, values: { title: whatsappSupportSection?.title, summary: whatsappSupportSection?.subtitle, content: whatsappSupportSection?.content }, fallback: { title: whatsappSupport.title, summary: whatsappSupport.subtitle, content: whatsappSupport.content } }),
  ];

  return (
    <CmsPublishedTranslationsProvider sources={translationSources}>
      <main className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
        <ContactBackground />
        <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
          <ContactBackHomeLink />
          <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
            <div className="mb-6 inline-flex rounded-full border border-green-400/30 bg-green-500/10 px-5 py-2 text-sm font-bold text-green-100">{agencyName}</div>
            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              <CmsPublishedText sourceKey="contact-page" field="title" fallback={title} />
              <span className="block bg-gradient-to-r from-green-300 via-white to-purple-300 bg-clip-text text-transparent"><CmsPublishedText sourceKey="contact-options" field="summary" fallback={contactOptions.subtitle} /></span>
            </h1>
            <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">{hasPageContent ? <CmsPublishedText sourceKey="contact-page" field="content" fallback={page?.content || ""} /> : <CmsPublishedText sourceKey="contact-options" field="content" fallback={contactOptions.content} />}</p>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
              <h2 className="text-3xl font-black"><CmsPublishedText sourceKey="whatsapp-support" field="title" fallback={whatsappSupport.title} /></h2>
              <p className="mt-4 break-words text-xl font-bold text-green-200">{whatsapp}</p>
              <p className="mt-4 leading-8 text-white/65"><CmsPublishedText sourceKey="whatsapp-support" field="content" fallback={whatsappSupport.content} /></p>
              <ContactNowLink cleanWhatsapp={cleanWhatsapp} />
            </div>
            <ContactEmailAndHoursCards email={email} workingHours={workingHours} />
          </div>
          <ContactReasons />
          <ContactBeforeMessage />
          <ContactQuickLinks />
          <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
            <h2 className="text-3xl font-black"><CmsPublishedText sourceKey="whatsapp-support" field="title" fallback={whatsappSupport.title} /></h2>
            <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70"><CmsPublishedText sourceKey="whatsapp-support" field="summary" fallback={whatsappSupport.subtitle} /></p>
            <ContactWhatsAppAction cleanWhatsapp={cleanWhatsapp} />
          </div>
        </section>
      </main>
    </CmsPublishedTranslationsProvider>
  );
}

function ContactBackground() {
  return <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden"><div className="absolute inset-0 bg-[#070009]" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18)_0%,rgba(124,58,237,0.2)_35%,rgba(7,0,9,0.98)_72%)]" /><div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-green-500/10 blur-3xl" /><div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-purple-600/14 blur-3xl md:block" /><div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" /></div>;
}
