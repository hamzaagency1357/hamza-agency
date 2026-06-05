import Link from "next/link";
import { supabase } from "@/lib/supabase";

type PageContent = {
  title: string | null;
  slug: string | null;
  content: string | null;
  is_published: boolean | null;
};

type Setting = {
  setting_key: string | null;
  setting_value: string | null;
  is_public: boolean | null;
};

async function getServicesPageData() {
  if (!supabase) {
    return {
      page: null,
      settings: [],
    };
  }

  const [pageResult, settingsResult] = await Promise.all([
    supabase
      .from("pages")
      .select("title, slug, content, is_published")
      .eq("slug", "services")
      .eq("is_published", true)
      .limit(1),

    supabase
      .from("settings")
      .select("setting_key, setting_value, is_public")
      .eq("is_public", true),
  ]);

  return {
    page:
      !pageResult.error && pageResult.data && pageResult.data.length > 0
        ? pageResult.data[0]
        : null,
    settings:
      !settingsResult.error && settingsResult.data ? settingsResult.data : [],
  };
}

function getSetting(settings: Setting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = settings.find((item) => item.setting_key === key)
      ?.setting_value;

    if (value && value.trim()) return value.trim();
  }

  return fallback;
}

const agencyServices = [
  {
    title: "إدارة صناع المحتوى",
    text: "متابعة صانع المحتوى داخل البرنامج، تنظيم خطواته، وتوجيهه نحو طريقة عمل أوضح وأكثر احترافية.",
    tag: "Management",
  },
  {
    title: "تطوير الحسابات",
    text: "مساعدة الحسابات على تحسين الظهور، جودة المحتوى، وطريقة التفاعل مع الجمهور حسب طبيعة كل منصة.",
    tag: "Growth",
  },
  {
    title: "التدريب والإرشاد",
    text: "تقديم نصائح عملية للمبتدئين وصناع المحتوى حول طريقة البث، الالتزام، وتحسين الأداء.",
    tag: "Training",
  },
  {
    title: "الدعم الفني",
    text: "متابعة المشاكل التقنية المرتبطة بالحسابات أو البرامج ومساعدة المتقدمين على فهم الحلول الممكنة.",
    tag: "Support",
  },
  {
    title: "الاستشارات",
    text: "مساعدة صانع المحتوى على اختيار البرنامج الأنسب له حسب خبرته، نوع محتواه، وطريقة عمله.",
    tag: "Consulting",
  },
  {
    title: "إدارة المواهب",
    text: "تنظيم المواهب وصناع المحتوى داخل برامج الوكالة بطريقة قابلة للمتابعة والتوسع.",
    tag: "Talents",
  },
  {
    title: "حل المشاكل التقنية",
    text: "توجيه المستخدمين عند وجود مشاكل في الحسابات، الطلبات، أو التواصل مع البرنامج.",
    tag: "Technical",
  },
];

const workflow = [
  "اختيار البرنامج أو الخدمة المناسبة",
  "إرسال طلب الانضمام أو التواصل",
  "مراجعة الطلب من فريق الوكالة",
  "التواصل عبر واتساب عند الحاجة",
  "المتابعة والتوجيه بعد القبول",
];

export default async function ServicesPage() {
  const { page, settings } = await getServicesPageData();

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

  const title = page?.title || "خدمات الوكالة";

  const intro =
    page?.content ||
    "تقدم وكالة حمزة مجموعة خدمات متخصصة لدعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي، من إدارة الحسابات ومتابعة الطلبات إلى التدريب والدعم الفني وحل المشاكل التقنية.";

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <ServicesBackground />

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
              لصناع المحتوى
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agencyServices.map((service) => (
            <div
              key={service.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <div className="mb-5 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-xs font-bold text-yellow-100">
                {service.tag}
              </div>

              <h2 className="text-3xl font-black">{service.title}</h2>

              <p className="mt-4 leading-8 text-white/68">{service.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">طريقة العمل</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-white/10 bg-black/25 p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 font-black">
                  {index + 1}
                </div>

                <p className="leading-7 text-white/75">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            ملاحظة مهمة
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            هذه الصفحة مخصصة لشرح خدمات الوكالة. أما خدمات الشحن وسحب الأرباح
            والخدمات الرقمية فسيكون لها صفحة منفصلة ضمن المشروع حسب الخطة
            المعتمدة.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">ابدأ الآن</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            تصفح البرامج المتاحة أو تواصل معنا مباشرة عبر واتساب لمعرفة الخيار
            الأنسب لك.
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

function ServicesBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.34)_0%,rgba(7,0,9,0.98)_68%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/16 blur-3xl" />

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
