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

async function getAiPolicyPageData() {
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
      .eq("slug", "ai-policy")
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

const aiPolicySections = [
  {
    title: "استخدام الذكاء الصناعي",
    text: "قد تستخدم وكالة حمزة لاحقاً نظام دعم ذكي داخل الموقع لمساعدة الزوار والمتقدمين في فهم البرامج، طريقة الانضمام، الأسئلة الشائعة، الخدمات، والسياسات العامة للوكالة.",
  },
  {
    title: "الغرض من المساعد الذكي",
    text: "الغرض من المساعد الذكي هو تقديم إجابات سريعة ومنظمة حول معلومات الوكالة والبرامج والخدمات، وليس استبدال فريق الإدارة أو اتخاذ قرارات نهائية نيابة عن الوكالة.",
  },
  {
    title: "حدود الإجابات",
    text: "قد تكون إجابات الذكاء الصناعي محدودة أو غير مكتملة، خصوصاً إذا كان السؤال يتعلق بحالة طلب محددة، قرار قبول، مشكلة خاصة بالحساب، أو معلومات غير موجودة في قاعدة المعرفة.",
  },
  {
    title: "التحويل إلى واتساب",
    text: "إذا لم يتمكن المساعد الذكي من الإجابة، أو طلب المستخدم التواصل مع موظف، سيتم توجيهه إلى واتساب وكالة حمزة لمتابعة الموضوع مع فريق الوكالة.",
  },
  {
    title: "عدم اتخاذ قرارات قبول",
    text: "الذكاء الصناعي لا يقرر قبول أو رفض طلبات الانضمام. قرارات الطلبات تتم من قبل فريق الوكالة أو المسؤولين المخولين داخل لوحة التحكم.",
  },
  {
    title: "مصدر المعرفة",
    text: "يعتمد المساعد الذكي لاحقاً على قاعدة معرفة داخلية تشمل الأسئلة الشائعة، معلومات البرامج، المقالات، التحديثات، وسياسات الوكالة التي يتم إدارتها من لوحة التحكم.",
  },
  {
    title: "دقة المعلومات",
    text: "نسعى لتوفير معلومات دقيقة ومحدثة، لكن قد تتغير شروط البرامج أو الخدمات أو طرق العمل. لذلك يجب اعتماد المعلومات النهائية من فريق الوكالة عند وجود حالة خاصة أو قرار مهم.",
  },
  {
    title: "حفظ المحادثات",
    text: "قد يتم حفظ بعض المحادثات أو الأسئلة غير المجاب عنها داخل النظام بهدف تحسين جودة الدعم، تطوير قاعدة المعرفة، ومساعدة فريق الوكالة على فهم احتياجات المستخدمين.",
  },
  {
    title: "الخصوصية والبيانات",
    text: "يجب عدم إرسال معلومات حساسة أو غير ضرورية داخل محادثة الذكاء الصناعي. أي بيانات يتم التعامل معها يجب أن تكون ضمن سياسة الخصوصية المعتمدة في الموقع.",
  },
  {
    title: "الإشراف الإداري",
    text: "سيتم توفير إعدادات داخل لوحة التحكم لإدارة المساعد الذكي، تشغيله أو إيقافه، تعديل تعليماته، مراجعة الأسئلة غير المجاب عنها، وتحديث قاعدة المعرفة.",
  },
];

export default async function AiPolicyPage() {
  const { page, settings } = await getAiPolicyPageData();

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

  const title = page?.title || "سياسة الذكاء الصناعي";

  const intro =
    page?.content ||
    "توضح هذه الصفحة طريقة استخدام الذكاء الصناعي داخل موقع وكالة حمزة عند تفعيل نظام الدعم الذكي لاحقاً، وحدود دوره، وكيفية التحويل إلى فريق الوكالة عند الحاجة إلى متابعة بشرية.";

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <AiPolicyBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <div className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 shadow-[0_0_45px_rgba(168,85,247,0.12)] backdrop-blur md:p-10">
          <div className="mb-6 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">
            {agencyName}
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            {title}
            <span className="block bg-gradient-to-r from-cyan-300 via-white to-purple-300 bg-clip-text text-transparent">
              شفافية الدعم الذكي
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            تنبيه مهم
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            نظام الذكاء الصناعي في وكالة حمزة سيكون أداة مساعدة للدعم والإرشاد
            فقط. لا يعتبر بديلاً عن الإدارة، ولا يصدر قرارات قبول أو رفض، ولا
            يضمن نتائج أو أرباح أو موافقات على البرامج.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {aiPolicySections.map((section) => (
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
          <h2 className="text-3xl font-black">متى يتم تحويلك إلى موظف؟</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[
              "عند السؤال عن حالة طلب محددة",
              "عند وجود مشكلة تقنية خاصة بحسابك",
              "عند طلب التواصل مع موظف بشكل مباشر",
              "عند وجود سؤال غير موجود في قاعدة المعرفة",
              "عند الحاجة إلى قرار إداري أو متابعة خاصة",
              "عند وجود معلومات تحتاج تأكيداً من فريق الوكالة",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-cyan-100">
            علاقة الذكاء الصناعي بمركز المعرفة
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            لاحقاً سيتم ربط المساعد الذكي بمركز المعرفة، الأسئلة الشائعة،
            معلومات البرامج، والتحديثات التي تديرها الوكالة من لوحة التحكم.
            هذا يساعد على تقديم إجابات أسرع وأكثر تنظيماً للزوار.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">تحتاج تواصلاً بشرياً؟</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك التواصل مع وكالة حمزة عبر واتساب في أي وقت عند الحاجة إلى
            متابعة من فريق الوكالة.
          </p>

          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
              "مرحباً، أريد التواصل مع فريق وكالة حمزة."
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

function AiPolicyBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(6,182,212,0.22)_0%,rgba(124,58,237,0.22)_35%,rgba(7,0,9,0.98)_72%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
