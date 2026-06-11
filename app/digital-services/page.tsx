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
    text: "استقبال طلبات الشحن وتنظيم بيانات المنصة والحساب، ثم تأكيد التفاصيل عبر القنوات الرسمية قبل أي متابعة.",
    tag: "Top Up",
  },
  {
    title: "سحب الأرباح",
    text: "مساعدة صناع المحتوى في ترتيب طلبات السحب وفهم الخطوات المطلوبة حسب نظام كل برنامج، بدون طلب كلمات مرور أو بيانات حساسة.",
    tag: "Withdrawals",
  },
  {
    title: "متابعة الطلبات الرقمية",
    text: "تسجيل الطلبات داخل لوحة الإدارة لمراجعة الحالة وتحديثها بشكل منظم، مع تقليل ضياع الرسائل أو تكرار الطلبات.",
    tag: "Requests",
  },
  {
    title: "دعم واتساب رسمي",
    text: "التواصل مع فريق الوكالة لتأكيد الطلب أو توضيح البيانات الناقصة عبر رقم الواتساب الرسمي المعتمد في الموقع.",
    tag: "WhatsApp",
  },
];

const rules = [
  "لا تطلب وكالة حمزة كلمة مرور حسابك أو رمز التحقق أو أي بيانات دخول حساسة.",
  "لا يتم تنفيذ أي خدمة قبل تأكيد التفاصيل النهائية مع العميل عبر القنوات الرسمية.",
  "الخدمات الرقمية تُراجع حسب نوع الطلب والمنصة وسياسات البرنامج، ولا يتم ضمان نتائج تخالف سياسات المنصات.",
  "إرسال الطلب من الموقع يساعد على تنظيم المتابعة داخل لوحة الإدارة وتقليل الأخطاء أو تكرار المعلومات.",
  "أي تفاصيل مالية أو تنفيذية يتم تأكيدها بوضوح قبل المتابعة، وليس بمجرد إرسال النموذج.",
  "في حال وجود نقص في البيانات، قد يتواصل فريق الوكالة عبر واتساب لاستكمال المعلومات اللازمة فقط.",
];

const workflow = [
  "اختيار الخدمة المطلوبة",
  "تعبئة نموذج طلب الخدمة",
  "مراجعة البيانات الأساسية",
  "تأكيد التفاصيل عبر واتساب عند الحاجة",
  "تحديث حالة الطلب من لوحة الإدارة",
];

const trustNotes = [
  "استخدم رقم الواتساب الظاهر في الموقع فقط عند التواصل مع الوكالة.",
  "احتفظ برمز طلب الخدمة بعد الإرسال لاستخدامه في المتابعة لاحقاً.",
  "تأكد من كتابة معرف الحساب والمنصة بشكل صحيح لتجنب تأخير المعالجة.",
  "لا ترسل صور بطاقات أو معلومات شخصية غير مطلوبة داخل نموذج الطلب.",
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
      subtitle: "طلبات منظمة ومتابعة واضحة",
      content:
        "توفر وكالة حمزة صفحة مخصصة لتنظيم طلبات الخدمات الرقمية مثل شحن المنصات، سحب الأرباح، ومتابعة الخدمات المساعدة. الهدف هو استقبال الطلب بشكل واضح، مراجعته من فريق الوكالة، ثم تأكيد التفاصيل عبر واتساب عند الحاجة قبل أي تنفيذ.",
    }
  );

  const requestCta = getSectionContent(findCmsSection(sections, "service-request-cta"), {
    title: "إرسال طلب خدمة",
    subtitle: "أرسل تفاصيل طلبك ليتم متابعته من لوحة الإدارة",
    content:
      "يمكنك إرسال طلب خدمة بالبيانات الأساسية فقط. بعد ذلك تتم مراجعة الطلب وتحديث حالته من لوحة التحكم، وقد يتم التواصل معك عبر واتساب لتأكيد التفاصيل أو استكمال المعلومات.",
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

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-white/65">
            ملاحظة مهمة: هذه الصفحة لتنظيم الطلبات ومتابعتها فقط. أي تنفيذ أو تفاصيل نهائية يتم تأكيدها بوضوح مع فريق الوكالة عبر القنوات الرسمية.
          </div>

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

        <div className="mt-10 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-cyan-100">
            إرشادات ثقة وأمان
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {trustNotes.map((note) => (
              <div
                key={note}
                className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75"
              >
                {note}
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
