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

async function getAiPolicyPageData() {
  const [pageData, settingsResult] = await Promise.all([
    getCmsPageWithSections("ai-policy"),
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

const aiPolicySections = [
  {
    title: "دور الدعم الذكي",
    text: "قد تساعد أنظمة الدعم الذكي الزائر على فهم معلومات الوكالة، البرامج المتاحة، طريقة الانضمام، الأسئلة الشائعة، والخدمات العامة بطريقة أسرع وأكثر تنظيماً.",
  },
  {
    title: "الغرض من المساعدة",
    text: "الغرض من الدعم الذكي هو تقديم إرشاد عام ومعلومات منظمة، وليس استبدال فريق الوكالة أو اتخاذ قرارات نهائية نيابة عنه.",
  },
  {
    title: "حدود الإجابات",
    text: "قد تكون الإجابات محدودة إذا كان السؤال يتعلق بحالة طلب محددة، قرار قبول، مشكلة خاصة بالحساب، أو معلومات تحتاج مراجعة من فريق الوكالة.",
  },
  {
    title: "التحويل إلى واتساب",
    text: "عند الحاجة إلى متابعة بشرية أو توضيح خاص، يتم توجيه المستخدم إلى قناة واتساب الرسمية للتواصل مع فريق وكالة حمزة.",
  },
  {
    title: "قرارات القبول",
    text: "أنظمة الدعم الذكي لا تقرر قبول أو رفض طلبات الانضمام. قرارات الطلبات تتم من قبل فريق الوكالة أو المسؤولين المخولين.",
  },
  {
    title: "مصدر المعلومات",
    text: "تعتمد الإجابات على المعلومات المنشورة في الموقع، الأسئلة الشائعة، مركز المعرفة، بيانات البرامج، والسياسات العامة للوكالة.",
  },
  {
    title: "دقة المعلومات",
    text: "نسعى لتقديم معلومات واضحة ومفيدة، لكن قد تتغير شروط البرامج أو الخدمات أو طرق العمل، لذلك يجب تأكيد الحالات الخاصة من فريق الوكالة.",
  },
  {
    title: "حفظ الأسئلة وتحسين الدعم",
    text: "قد يتم استخدام بعض الأسئلة أو المحادثات لتحسين جودة الدعم وفهم احتياجات الزوار، مع مراعاة سياسة الخصوصية الخاصة بالموقع.",
  },
  {
    title: "الخصوصية والبيانات",
    text: "ينبغي عدم إرسال معلومات حساسة أو غير ضرورية داخل أي محادثة دعم. التعامل مع البيانات يخضع لسياسة الخصوصية المنشورة في الموقع.",
  },
  {
    title: "الإشراف البشري",
    text: "يبقى فريق الوكالة مسؤولاً عن المتابعة والقرارات الإدارية والحالات التي تحتاج مراجعة بشرية أو تواصلاً مباشراً.",
  },
];

const escalationReasons = [
  "السؤال عن حالة طلب محددة",
  "وجود مشكلة تقنية خاصة بحسابك",
  "طلب التواصل مع موظف بشكل مباشر",
  "وجود سؤال يحتاج مراجعة خاصة",
  "الحاجة إلى قرار إداري أو متابعة خاصة",
  "وجود معلومات تحتاج تأكيداً من فريق الوكالة",
];

export default async function AiPolicyPage() {
  const { page, sections, settings } = await getAiPolicyPageData();

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

  const overview = getSectionContent(findCmsSection(sections, "ai-policy-overview"), {
    title: "سياسة الذكاء الاصطناعي",
    subtitle: "دعم ذكي بإشراف إداري",
    content:
      "توضح هذه الصفحة دور الذكاء الاصطناعي في تقديم الإرشاد والمساعدة، مع التأكيد أن قرارات القبول والمتابعة تبقى بيد فريق الوكالة.",
  });

  const escalation = getSectionContent(findCmsSection(sections, "ai-escalation"), {
    title: "التحويل إلى فريق الوكالة",
    subtitle: "عند الحاجة يتم توجيه المستخدم للتواصل مع الفريق",
    content:
      "إذا احتاج المستخدم مساعدة بشرية أو توضيحاً خاصاً، يتم توجيهه إلى قناة التواصل المناسبة مع فريق وكالة حمزة.",
  });

  const title = page?.title || overview.title;
  const intro = page?.content || overview.content;

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
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
              {overview.subtitle}
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">تنبيه مهم</h2>
          <p className="mt-5 leading-9 text-white/75">
            الدعم الذكي أداة مساعدة للإرشاد والمعلومات العامة فقط. لا يعتبر بديلاً عن الإدارة، ولا يصدر قرارات قبول أو رفض، ولا يضمن نتائج أو أرباحاً أو موافقات على البرامج.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {aiPolicySections.map((section) => (
            <div key={section.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
              <h2 className="text-3xl font-black">{section.title}</h2>
              <p className="mt-5 leading-9 text-white/70">{section.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">{escalation.title}</h2>
          <p className="mt-3 text-lg font-bold text-purple-100/80">{escalation.subtitle}</p>
          <p className="mt-5 leading-9 text-white/75">{escalation.content}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {escalationReasons.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/25 p-5 text-white/75">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-cyan-100">
            علاقة الدعم الذكي بمركز المعرفة
          </h2>
          <p className="mt-5 leading-9 text-white/75">
            يساعد مركز المعرفة والأسئلة الشائعة وبيانات البرامج على تقديم معلومات أوضح للزائر، وتبقى الحالات الخاصة مرتبطة بالتواصل مع فريق الوكالة.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">تحتاج تواصلاً بشرياً؟</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك التواصل مع وكالة حمزة عبر واتساب عند الحاجة إلى متابعة من فريق الوكالة.
          </p>
          <a
            href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("مرحباً، أريد التواصل مع فريق وكالة حمزة.")}`}
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.18)_0%,rgba(124,58,237,0.24)_40%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
