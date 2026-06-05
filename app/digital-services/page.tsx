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

async function getDigitalServicesPageData() {
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
      .eq("slug", "digital-services")
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

const digitalServices = [
  {
    title: "شحن المنصات",
    text: "خدمة شرح ومساعدة لطلبات شحن بعض المنصات حسب التوفر، مع التواصل والمتابعة عبر واتساب.",
    tag: "Top Up",
  },
  {
    title: "سحب الأرباح",
    text: "مساعدة صناع المحتوى في فهم خطوات سحب الأرباح والتواصل مع الوكالة لمتابعة التفاصيل حسب البرنامج.",
    tag: "Withdrawals",
  },
  {
    title: "متابعة الطلبات الرقمية",
    text: "تنظيم طلبات الخدمات الرقمية ومتابعتها بشكل واضح من خلال فريق الوكالة.",
    tag: "Requests",
  },
  {
    title: "دعم واتساب مباشر",
    text: "التواصل مع فريق الوكالة عبر واتساب لشرح الخدمة المطلوبة قبل تنفيذ أي خطوة.",
    tag: "WhatsApp",
  },
];

const rules = [
  "لا يوجد حالياً نظام محفظة داخل الموقع",
  "لا يوجد دفع إلكتروني مباشر داخل الموقع حالياً",
  "كل خدمة تتم بعد التواصل والتأكيد عبر واتساب",
  "الخدمات الرقمية منفصلة عن خدمات إدارة صناع المحتوى",
];

const workflow = [
  "اختيار الخدمة المطلوبة",
  "التواصل عبر واتساب",
  "إرسال تفاصيل الطلب",
  "مراجعة الطلب من فريق الوكالة",
  "تأكيد الخطوات قبل التنفيذ",
];

export default async function DigitalServicesPage() {
  const { page, settings } = await getDigitalServicesPageData();

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

  const title = page?.title || "الخدمات الرقمية";

  const intro =
    page?.content ||
    "توفر وكالة حمزة صفحة مخصصة لشرح الخدمات الرقمية مثل شحن المنصات وسحب الأرباح والخدمات المساعدة، مع اعتماد التواصل عبر واتساب لمراجعة الطلبات وتأكيد التفاصيل قبل أي إجراء.";

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <DigitalServicesBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
          <div className="mb-6 inline-flex rounded-full border border-yellow-400/30 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
            {agencyName}
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            {title}
            <span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent">
              شحن وسحب وخدمات مساعدة
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {digitalServices.map((service) => (
            <div
              key={service.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <div className="mb-5 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-100">
                {service.tag}
              </div>

              <h2 className="text-3xl font-black">{service.title}</h2>

              <p className="mt-4 leading-8 text-white/68">{service.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            تنبيه مهم قبل الطلب
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {rules.map((rule) => (
              <div
                key={rule}
                className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75"
              >
                {rule}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">طريقة طلب الخدمة</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-5">
            {workflow.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-white/10 bg-black/25 p-5"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-purple-600 font-black">
                  {index + 1}
                </div>

                <p className="leading-7 text-white/75">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">لطلب خدمة رقمية</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            اضغط على زر واتساب وأرسل اسم الخدمة المطلوبة مع تفاصيل مختصرة، وسيتم
            الرد عليك من فريق الوكالة.
          </p>

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              "مرحباً، أريد الاستفسار عن الخدمات الرقمية في وكالة حمزة."
            )}`}
            target="_blank"
            className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
          >
            تواصل واتساب
          </a>
        </div>
      </section>
    </main>
  );
}

function DigitalServicesBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.24)_0%,rgba(124,58,237,0.18)_35%,rgba(7,0,9,0.98)_72%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/12 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
