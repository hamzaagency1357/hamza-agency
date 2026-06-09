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

async function getDigitalServicesPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("digital-services"),
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
    const value = settings.find((item) => item.setting_key === key)
      ?.setting_value;

    if (value && value.trim()) return value.trim();
  }

  return fallback;
}

const digitalServices = [
  {
    title: "شحن المنصات",
    text: "متابعة طلبات الشحن حسب المنصة والبيانات المطلوبة، مع تأكيد التفاصيل عبر قنوات الوكالة الرسمية.",
    tag: "Top Up",
  },
  {
    title: "سحب الأرباح",
    text: "مساعدة صناع المحتوى في فهم خطوات سحب الأرباح وإرسال طلب متابعة منظم حسب البرنامج.",
    tag: "Withdrawals",
  },
  {
    title: "متابعة الطلبات الرقمية",
    text: "تنظيم طلبات الخدمات الرقمية ومراجعة حالتها من لوحة الإدارة بطريقة واضحة.",
    tag: "Requests",
  },
  {
    title: "دعم واتساب",
    text: "التواصل مع فريق الوكالة لتوضيح الخدمة المطلوبة أو متابعة الطلب عند الحاجة.",
    tag: "WhatsApp",
  },
];

const rules = [
  "يتم تأكيد تفاصيل الخدمة قبل تنفيذ أي طلب.",
  "يتم التواصل عبر واتساب عند الحاجة لتوضيح البيانات.",
  "الخدمات الرقمية تُراجع من فريق الوكالة حسب نوع الطلب.",
  "إرسال الطلب من الموقع يساعد على تنظيم المتابعة داخل لوحة الإدارة.",
];

const workflow = [
  "اختيار الخدمة المطلوبة",
  "تعبئة نموذج طلب الخدمة",
  "إرسال تفاصيل الطلب",
  "مراجعة الطلب من فريق الوكالة",
  "التواصل عبر واتساب للتأكيد والمتابعة",
];

export default async function DigitalServicesPage() {
  const { page, sections, settings } = await getDigitalServicesPageData();

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

  const overview = getSectionContent(
    findCmsSection(sections, "digital-services-overview"),
    {
      title: "الخدمات الرقمية",
      subtitle: "شحن وسحب وخدمات مساعدة",
      content:
        "توفر وكالة حمزة صفحة مخصصة لشرح الخدمات الرقمية مثل شحن المنصات وسحب الأرباح والخدمات المساعدة، مع إمكانية إرسال طلب خدمة من الموقع ومتابعته من فريق الوكالة عبر واتساب.",
    }
  );

  const requestCta = getSectionContent(findCmsSection(sections, "service-request-cta"), {
    title: "إرسال طلب خدمة",
    subtitle: "أرسل تفاصيل طلبك ليتم متابعته من لوحة الإدارة",
    content:
      "يمكن للعميل إرسال طلب خدمة مع البيانات الأساسية، ثم تتم مراجعته وتحديث حالته من لوحة التحكم.",
  });

  const title = page?.title || overview.title;
  const intro = page?.content || overview.content;

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
              {overview.subtitle}
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/service-request"
              className="inline-flex justify-center rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.28)] transition hover:scale-[1.02]"
            >
              تقديم طلب خدمة رقمية
            </Link>

            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                "مرحباً، أريد الاستفسار عن الخدمات الرقمية في وكالة حمزة."
              )}`}
              target="_blank"
              className="inline-flex justify-center rounded-full border border-green-400/25 bg-green-500/10 px-8 py-4 font-black text-green-100 transition hover:bg-green-500/20"
            >
              تواصل واتساب
            </a>
          </div>
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
          <h2 className="text-3xl font-black">{requestCta.title}</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            {requestCta.content}
          </p>

          <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/service-request"
              className="inline-flex justify-center rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black text-white shadow-2xl"
            >
              تقديم طلب خدمة رقمية
            </Link>

            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                "مرحباً، أريد الاستفسار عن الخدمات الرقمية في وكالة حمزة."
              )}`}
              target="_blank"
              className="inline-flex justify-center rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
            >
              تواصل واتساب
            </a>
          </div>
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
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/12 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
