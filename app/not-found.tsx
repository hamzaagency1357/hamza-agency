import { supabase } from "@/lib/supabase";
import {
  findCmsSection,
  getCmsPageWithSections,
  getCmsText,
  type CmsSection,
} from "@/lib/pageSections";
import {
  NotFoundActions,
  NotFoundQuickLinks,
  NotFoundShell,
} from "@/components/NotFoundStaticUi";

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
};

function getSectionContent(
  section: CmsSection | null,
  fallback: { title: string; subtitle: string; content: string }
) {
  return {
    title: getCmsText(section?.title, fallback.title),
    subtitle: getCmsText(section?.subtitle, fallback.subtitle),
    content: getCmsText(section?.content, fallback.content),
  };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }

  return fallback;
}

async function getNotFoundPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("not-found"),
    supabase
      ? supabase
          .from("settings")
          .select("setting_key, setting_value")
          .eq("is_public", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    page: pageData.page,
    sections: pageData.sections,
    settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [],
  };
}

export default async function NotFoundPage() {
  const { page, sections, settings } = await getNotFoundPageData();

  const agencyName = getSetting(
    settings,
    ["agency_name_ar", "agency_name", "site_name"],
    "HAMZA AGENCY"
  );

  const whatsapp = getSetting(
    settings,
    ["primary_whatsapp", "whatsapp", "support_whatsapp"],
    "+905011730377"
  );

  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");

  const mainContent = getSectionContent(findCmsSection(sections, "not-found-main"), {
    title: "الصفحة غير موجودة",
    subtitle: "404",
    content:
      "الرابط الذي تحاول فتحه غير موجود أو تم تغييره. يمكنك العودة إلى الصفحة الرئيسية أو تصفح البرامج والخدمات المتاحة في وكالة حمزة.",
  });

  const quickLinks = getSectionContent(findCmsSection(sections, "not-found-links"), {
    title: "روابط مفيدة",
    subtitle: "اختر المسار المناسب للمتابعة",
    content:
      "يمكنك الانتقال إلى الصفحات الأساسية في الموقع لمتابعة تصفح البرامج والخدمات والتواصل مع فريق الوكالة.",
  });

  const title = page?.title || mainContent.title;
  const intro = page?.content || mainContent.content;
  const codeLabel = mainContent.subtitle || "404";

  return (
    <NotFoundShell>
      <NotFoundBackground />

      <section className="relative z-10 mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-6 inline-flex rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
          {agencyName}
        </div>

        <h1 className="bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-8xl font-black text-transparent md:text-9xl">
          {codeLabel}
        </h1>

        <h2 className="mt-6 text-4xl font-black md:text-6xl">{title}</h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-9 text-white/70">
          {intro}
        </p>

        <NotFoundActions cleanWhatsapp={cleanWhatsapp} />

        <div className="mt-12 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6 backdrop-blur">
          <h3 className="text-2xl font-black">{quickLinks.title}</h3>
          <p className="mx-auto mt-3 max-w-2xl leading-8 text-white/65">
            {quickLinks.content}
          </p>
        </div>

        <NotFoundQuickLinks />
      </section>
    </NotFoundShell>
  );
}

function NotFoundBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.36)_0%,rgba(7,0,9,0.98)_68%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/16 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
