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

async function getTermsPageData() {
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
      .eq("slug", "terms-and-conditions")
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

const termsSections = [
  {
    title: "قبول الشروط",
    text: "باستخدام موقع وكالة حمزة أو إرسال طلب انضمام أو التواصل مع فريق الوكالة، فإنك توافق على الالتزام بهذه الشروط والأحكام وبأي تحديثات مستقبلية يتم نشرها على هذه الصفحة.",
  },
  {
    title: "طبيعة خدمات الوكالة",
    text: "وكالة حمزة تقدم خدمات إدارة وتوظيف ودعم صناع المحتوى على برامج ومنصات مختلفة. دور الوكالة يشمل المتابعة، التوجيه، مراجعة الطلبات، الدعم الفني، وتنظيم التواصل حسب البرامج المتاحة.",
  },
  {
    title: "طلبات الانضمام",
    text: "إرسال طلب الانضمام عبر الموقع لا يعني القبول التلقائي. كل طلب يخضع للمراجعة من فريق الوكالة حسب البيانات المقدمة، شروط البرنامج، وحالة توفر الفرص في وقت المراجعة.",
  },
  {
    title: "صحة المعلومات",
    text: "يجب على المستخدم تقديم معلومات صحيحة عند تعبئة النماذج، مثل الاسم، الدولة، رقم واتساب، البرنامج المختار، والخبرات السابقة. المعلومات غير الصحيحة قد تؤدي إلى تجاهل الطلب أو رفضه.",
  },
  {
    title: "التواصل عبر واتساب",
    text: "قد يتم التواصل مع المستخدم عبر رقم واتساب الذي يقدمه في الموقع لمتابعة الطلب أو طلب معلومات إضافية أو تقديم الدعم. عدم الرد أو تقديم معلومات غير واضحة قد يؤثر على متابعة الطلب.",
  },
  {
    title: "البرامج المتاحة",
    text: "قد تتغير البرامج المتاحة أو شروطها أو حالة التسجيل فيها في أي وقت. يمكن أن تكون بعض البرامج متاحة، محدودة، متوقفة مؤقتاً، أو مغلقة حسب ظروف البرنامج والوكالة.",
  },
  {
    title: "الخدمات الرقمية",
    text: "الخدمات الرقمية مثل شحن المنصات أو سحب الأرباح أو الخدمات المساعدة يتم شرحها في صفحة منفصلة. حالياً لا يوجد نظام محفظة أو دفع إلكتروني مباشر داخل الموقع، ويتم تأكيد التفاصيل عبر واتساب.",
  },
  {
    title: "عدم ضمان النتائج",
    text: "لا تضمن وكالة حمزة قبول كل طلب أو تحقيق أرباح محددة أو نتائج ثابتة، لأن النتائج تعتمد على البرنامج، نشاط صانع المحتوى، الالتزام، شروط المنصة، وعوامل أخرى خارج سيطرة الوكالة.",
  },
  {
    title: "استخدام الموقع",
    text: "يُمنع استخدام الموقع لإرسال بيانات مزيفة، إساءة استخدام النماذج، محاولة الوصول غير المصرح إلى لوحة التحكم، أو أي نشاط يضر بالموقع أو الوكالة أو المستخدمين الآخرين.",
  },
  {
    title: "تحديث الشروط",
    text: "يحق لوكالة حمزة تعديل هذه الشروط والأحكام في أي وقت بما يتناسب مع تطور الخدمات والبرامج. استمرار استخدام الموقع بعد التحديث يعني الموافقة على النسخة الجديدة.",
  },
];

export default async function TermsAndConditionsPage() {
  const { page, settings } = await getTermsPageData();

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

  const title = page?.title || "الشروط والأحكام";

  const intro =
    page?.content ||
    "توضح هذه الصفحة الشروط العامة لاستخدام موقع وكالة حمزة، إرسال طلبات الانضمام، التواصل مع فريق الوكالة، والاستفادة من الخدمات المتاحة. يرجى قراءة هذه الشروط بعناية قبل استخدام الموقع أو إرسال أي طلب.";

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
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
              قواعد استخدام الموقع
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            تنبيه تشغيلي
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            هذه الشروط صياغة تشغيلية أولية مناسبة لإطلاق الموقع. عند إضافة
            خدمات مالية مباشرة، دفع إلكتروني، محافظ، أو عقود رسمية، يجب مراجعة
            الشروط وتحديثها بما يتناسب مع طبيعة الخدمات الفعلية.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {termsSections.map((section) => (
            <div
              key={section.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <h2 className="text-3xl font-black">{section.title}</h2>

              <p className="mt-5 leading-9 text-white/70">{section.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">مسؤولية المستخدم</h2>

          <p className="mt-5 leading-9 text-white/75">
            يتحمل المستخدم مسؤولية صحة البيانات التي يرسلها، وطريقة استخدامه
            للموقع، والتزامه بقوانين البرامج والمنصات التي يرغب بالانضمام إليها.
            وكالة حمزة تساعد في التنظيم والمتابعة، لكنها لا تتحكم بسياسات
            المنصات الخارجية.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">للاستفسار عن الشروط</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك التواصل مع وكالة حمزة عبر واتساب إذا كان لديك سؤال حول هذه
            الشروط أو طريقة استخدام الموقع.
          </p>

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              "مرحباً، لدي استفسار بخصوص الشروط والأحكام في وكالة حمزة."
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

function TermsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.32)_0%,rgba(7,0,9,0.98)_68%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
