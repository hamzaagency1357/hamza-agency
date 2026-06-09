import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  findCmsSection,
  getCmsPageWithSections,
  getCmsText,
  type CmsSection,
} from "@/lib/pageSections";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
  is_public: boolean | null;
};

async function getAboutPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("about"),
    supabase
      ? supabase
          .from("settings")
          .select("setting_key, setting_value, is_public")
          .eq("is_public", true)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    page: pageData.page,
    sections: pageData.sections,
    settings:
      !settingsResult.error && settingsResult.data ? settingsResult.data : [],
  };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)?.setting_value;
    if (value && value.trim()) return value.trim();
  }

  return fallback;
}

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

export default async function AboutPage() {
  const { page, sections, settings } = await getAboutPageData();

  const agencyName = getSetting(
    settings,
    ["agency_name_ar", "agency_name", "site_name"],
    "وكالة حمزة"
  );

  const whatsapp = getSetting(
    settings,
    ["primary_whatsapp", "whatsapp", "support_whatsapp"],
    "+905011730377"
  );

  const cleanWhatsapp = whatsapp.replace(/[^\d]/g, "");

  const agencyIntro = getSectionContent(findCmsSection(sections, "agency-intro"), {
    title: "من هي وكالة حمزة؟",
    subtitle: "وكالة لإدارة ودعم صناع المحتوى",
    content:
      "وكالة حمزة هي منصة وكالة احترافية لإدارة وتوظيف ودعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي، مع متابعة واضحة وبيئة عمل منظمة.",
  });

  const workMethod = getSectionContent(findCmsSection(sections, "work-method"), {
    title: "طريقة عملنا",
    subtitle: "خطوات واضحة من التقديم إلى المتابعة",
    content:
      "يعتمد العمل على استقبال الطلبات، مراجعة البيانات، توجيه المتقدمين للبرنامج المناسب، ثم المتابعة عبر فريق الوكالة.",
  });

  const title = page?.title || "من نحن";
  const intro = page?.content || agencyIntro.content;

  const values = [
    {
      title: "إدارة احترافية",
      text: "نساعد صناع المحتوى على فهم طريقة العمل داخل البرامج، تنظيم خطواتهم، ومتابعة تقدمهم بوضوح.",
    },
    {
      title: "دعم ومتابعة",
      text: "نوفر متابعة للطلبات والمشاكل الفنية والتواصل مع المتقدمين عبر واتساب عند الحاجة.",
    },
    {
      title: "برامج متعددة",
      text: "ندعم عدة برامج مثل TikTok وBIGO LIVE وYaahlan وXena وCatchii، مع قابلية توسعة البرامج من منظومة الإدارة.",
    },
    {
      title: "نظام قابل للتوسع",
      text: "المشروع مبني ليكون منصة وكالة كاملة، مع إدارة منظمة للمحتوى والطلبات والبرامج.",
    },
  ];

  const milestones = [
    "استقبال طلبات الانضمام من الموقع",
    "مراجعة الطلبات من لوحة التحكم",
    "إدارة البرامج من قاعدة البيانات",
    "تنظيم المحتوى والصفحات من نظام إدارة مركزي",
  ];

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <AboutBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
          <div className="mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
            {agencyName}
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            {title}
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              {agencyIntro.subtitle}
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>

          <div className="mt-8 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-6">
            <h2 className="text-2xl font-black text-yellow-100">
              إدارة الوكالة
            </h2>

            <p className="mt-4 text-xl leading-9 text-white/80">
              وكالة حمزة بإدارة الوكيل
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {values.map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <h3 className="text-2xl font-black">{item.title}</h3>
              <p className="mt-4 leading-8 text-white/65">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
            <h2 className="text-3xl font-black">{workMethod.title}</h2>
            <p className="mt-3 text-lg font-bold text-purple-100/85">
              {workMethod.subtitle}
            </p>
            <p className="mt-5 leading-9 text-white/72">{workMethod.content}</p>
          </div>

          <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
            <h2 className="text-3xl font-black">رسالتنا</h2>
            <p className="mt-5 leading-9 text-white/72">
              تقديم تجربة واضحة وسهلة للمتقدمين، وتمكين الإدارة من متابعة الطلبات والبرامج والمحتوى من مكان واحد بدون تعقيد.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-white/10 bg-black/35 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">نظام وكالة منظم</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {milestones.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white/75"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">هل تريد الانضمام للوكالة؟</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك تصفح البرامج المتاحة وإرسال طلب الانضمام، أو التواصل معنا مباشرة عبر واتساب.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/programs"
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black"
            >
              عرض البرامج
            </Link>
            <a
              href={`https://wa.me/${cleanWhatsapp}`}
              target="_blank"
              className="rounded-full bg-green-500 px-7 py-4 font-black text-white"
            >
              تواصل واتساب
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function AboutBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.36)_0%,rgba(7,0,9,0.98)_68%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/18 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
