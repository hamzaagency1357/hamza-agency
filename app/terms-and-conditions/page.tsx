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

async function getTermsPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("terms-and-conditions"),
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

const termsSections = [
  {
    title: "قبول الشروط",
    text: "باستخدام موقع وكالة حمزة أو إرسال طلب انضمام أو التواصل مع فريق الوكالة، فإنك توافق على الالتزام بهذه الشروط والأحكام وبأي تحديثات يتم نشرها على هذه الصفحة.",
  },
  {
    title: "طبيعة خدمات الوكالة",
    text: "وكالة حمزة تقدم خدمات إدارة وتوظيف ودعم صناع المحتوى على برامج ومنصات مختلفة، وتشمل المتابعة، التوجيه، مراجعة الطلبات، الدعم، وتنظيم التواصل حسب البرامج المتاحة.",
  },
  {
    title: "طلبات الانضمام",
    text: "إرسال طلب الانضمام عبر الموقع لا يعني القبول التلقائي. كل طلب يخضع للمراجعة حسب البيانات المقدمة، شروط البرنامج، وحالة توفر الفرص في وقت المراجعة.",
  },
  {
    title: "صحة المعلومات",
    text: "يجب على المستخدم تقديم معلومات صحيحة عند تعبئة النماذج، مثل الاسم، الدولة، رقم واتساب، البرنامج المختار، والخبرات السابقة. المعلومات غير الصحيحة قد تؤثر على مراجعة الطلب.",
  },
  {
    title: "التواصل عبر واتساب",
    text: "قد يتم التواصل مع المستخدم عبر رقم واتساب الذي يقدمه في الموقع لمتابعة الطلب أو طلب معلومات إضافية أو تقديم الدعم. عدم الرد قد يؤثر على سرعة المتابعة.",
  },
  {
    title: "البرامج المتاحة",
    text: "قد تتغير البرامج المتاحة أو شروطها أو حالة التسجيل فيها في أي وقت، ويمكن أن تكون بعض البرامج متاحة أو محدودة أو متوقفة حسب ظروف البرنامج والوكالة.",
  },
  {
    title: "الخدمات الرقمية",
    text: "الخدمات الرقمية مثل شحن المنصات أو سحب الأرباح أو الخدمات المساعدة يتم شرحها في صفحة منفصلة، ويتم تأكيد التفاصيل عبر قنوات الوكالة الرسمية عند الحاجة.",
  },
  {
    title: "عدم ضمان النتائج",
    text: "لا تضمن وكالة حمزة قبول كل طلب أو تحقيق أرباح محددة أو نتائج ثابتة، لأن النتائج تعتمد على البرنامج، نشاط صانع المحتوى، الالتزام، شروط المنصة، وعوامل أخرى.",
  },
  {
    title: "استخدام الموقع",
    text: "يُمنع استخدام الموقع لإرسال بيانات مزيفة، إساءة استخدام النماذج، محاولة الوصول غير المصرح إلى الأنظمة الإدارية، أو أي نشاط يضر بالموقع أو الوكالة أو المستخدمين الآخرين.",
  },
  {
    title: "تحديث الشروط",
    text: "يحق لوكالة حمزة تعديل هذه الشروط والأحكام بما يتناسب مع تطور الخدمات والبرامج. استمرار استخدام الموقع بعد التحديث يعني الموافقة على النسخة الجديدة.",
  },
];

export default async function TermsAndConditionsPage() {
  const { page, sections, settings } = await getTermsPageData();

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

  const overview = getSectionContent(findCmsSection(sections, "terms-overview"), {
    title: "الشروط والأحكام",
    subtitle: "قواعد استخدام موقع وكالة حمزة",
    content:
      "توضح هذه الصفحة الشروط العامة لاستخدام الموقع، إرسال الطلبات، التواصل مع الوكالة، والاستفادة من الخدمات المتاحة.",
  });

  const requestResponsibility = getSectionContent(
    findCmsSection(sections, "request-responsibility"),
    {
      title: "مسؤولية تقديم الطلبات",
      subtitle: "يجب إدخال بيانات صحيحة وواضحة",
      content:
        "يتحمل المستخدم مسؤولية صحة البيانات التي يرسلها، وتقوم الوكالة بمراجعة الطلبات وفق المعلومات المتاحة لديها.",
    }
  );

  const title = page?.title || overview.title;
  const intro = page?.content || overview.content;

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <TermsBackground />

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
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              {overview.subtitle}
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            {requestResponsibility.title}
          </h2>
          <p className="mt-3 text-lg font-bold text-yellow-100/80">
            {requestResponsibility.subtitle}
          </p>
          <p className="mt-5 leading-9 text-white/75">
            {requestResponsibility.content}
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {termsSections.map((section) => (
            <div key={section.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
              <h2 className="text-3xl font-black">{section.title}</h2>
              <p className="mt-5 leading-9 text-white/70">{section.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">مسؤولية المستخدم</h2>
          <p className="mt-5 leading-9 text-white/75">
            يتحمل المستخدم مسؤولية صحة البيانات التي يرسلها، وطريقة استخدامه للموقع، والتزامه بقوانين البرامج والمنصات التي يرغب بالانضمام إليها. وكالة حمزة تساعد في التنظيم والمتابعة، لكنها لا تتحكم بسياسات المنصات الخارجية.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">للاستفسار عن الشروط</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك التواصل مع وكالة حمزة عبر واتساب إذا كان لديك سؤال حول هذه الشروط أو طريقة استخدام الموقع.
          </p>
          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("مرحباً، لدي استفسار بخصوص الشروط والأحكام في وكالة حمزة.")}`}
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

function TermsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.32)_0%,rgba(7,0,9,0.98)_68%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
