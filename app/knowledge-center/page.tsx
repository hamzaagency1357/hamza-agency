import Link from "next/link";
import KnowledgeListWithTranslations from "@/components/KnowledgeListWithTranslations";
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

type KnowledgeItem = {
  id: number;
  title: string | null;
  summary: string | null;
  content: string | null;
  category: string | null;
  sort_order: number | null;
  is_published: boolean | null;
};

const fallbackKnowledge: KnowledgeItem[] = [
  {
    id: 1,
    title: "كيف تختار البرنامج المناسب لك؟",
    summary: "إرشاد يساعد صانع المحتوى على فهم البرنامج الأقرب لطبيعة حسابه.",
    content:
      "اختيار البرنامج المناسب يعتمد على نوع المحتوى، نشاط الحساب، القدرة على الالتزام، وطريقة التواصل مع الجمهور. برامج الفيديو القصير تناسب نوعاً من المحتوى، وبرامج البث المباشر تناسب من يستطيع التفاعل بشكل مستمر.",
    category: "الانضمام",
    sort_order: 1,
    is_published: true,
  },
  {
    id: 2,
    title: "ماذا يحدث بعد إرسال طلب الانضمام؟",
    summary: "خطوات أساسية تساعدك على فهم مسار المراجعة والمتابعة.",
    content:
      "بعد إرسال الطلب، تتم مراجعة البيانات من فريق الوكالة. عند الحاجة إلى معلومات إضافية أو توضيح، يتم التواصل معك عبر رقم واتساب الذي أدخلته في النموذج.",
    category: "الطلبات",
    sort_order: 2,
    is_published: true,
  },
  {
    id: 3,
    title: "نصائح لصناع المحتوى الجدد",
    summary: "إرشادات أولية تساعدك على تقديم نفسك بشكل أفضل.",
    content:
      "احرص على إدخال بيانات صحيحة، استخدم رقم واتساب فعال، اشرح خبرتك السابقة بوضوح إن وجدت، وكن صريحاً حول نوع المحتوى الذي تقدمه أو ترغب بتقديمه.",
    category: "صناع المحتوى",
    sort_order: 3,
    is_published: true,
  },
  {
    id: 4,
    title: "الخدمات الرقمية داخل وكالة حمزة",
    summary: "توضيح الفرق بين خدمات الوكالة وطلبات الخدمات الرقمية.",
    content:
      "الخدمات الرقمية مثل الشحن والسحب والمتابعة لها صفحة مخصصة لشرح طريقة الطلب، ويتم تأكيد التفاصيل عبر قنوات الوكالة الرسمية عند الحاجة.",
    category: "الخدمات الرقمية",
    sort_order: 4,
    is_published: true,
  },
];

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

function groupKnowledge(items: KnowledgeItem[]) {
  return items.reduce<Record<string, KnowledgeItem[]>>((groups, item) => {
    const category = item.category || "مقالات عامة";
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
    return groups;
  }, {});
}

async function getKnowledgeCenterData() {
  const [pageData, settingsResult, knowledgeResult] = await Promise.all([
    getCmsPageWithSections("knowledge-center"),
    supabase
      ? supabase
          .from("settings")
          .select("setting_key, setting_value")
          .eq("is_public", true)
      : Promise.resolve({ data: [], error: null }),
    supabase
      ? supabase
          .from("knowledge_base")
          .select("id, title, summary, content, category, sort_order, is_published")
          .eq("is_published", true)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: fallbackKnowledge, error: null }),
  ]);

  return {
    page: pageData.page,
    sections: pageData.sections,
    settings: !settingsResult.error && settingsResult.data ? settingsResult.data : [],
    knowledge:
      !knowledgeResult.error && knowledgeResult.data && knowledgeResult.data.length > 0
        ? (knowledgeResult.data as KnowledgeItem[])
        : fallbackKnowledge,
  };
}

export default async function KnowledgeCenterPage() {
  const { page, sections, settings, knowledge } = await getKnowledgeCenterData();

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

  const knowledgeIntro = getSectionContent(findCmsSection(sections, "knowledge-intro"), {
    title: "مركز المعرفة",
    subtitle: "إرشادات ومعلومات لصناع المحتوى",
    content:
      "مركز المعرفة في وكالة حمزة يساعد صناع المحتوى على فهم طريقة الانضمام، اختيار البرنامج المناسب، معرفة خطوات المتابعة، والتعرف على الخدمات المتاحة داخل الوكالة.",
  });

  const creatorGuidance = getSectionContent(findCmsSection(sections, "creator-guidance"), {
    title: "إرشادات لصناع المحتوى",
    subtitle: "محتوى يساعد المتقدم على فهم الطريق الصحيح",
    content:
      "يشمل هذا القسم نصائح حول تجهيز البيانات، فهم شروط البرامج، وتحسين طريقة التواصل مع فريق الوكالة.",
  });

  const title = page?.title || knowledgeIntro.title;
  const intro = page?.content || knowledgeIntro.content;
  const groupedKnowledge = groupKnowledge(knowledge);

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <KnowledgeBackground />

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
              {knowledgeIntro.subtitle}
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
            <div className="text-3xl font-black text-purple-200">{knowledge.length}</div>
            <div className="mt-2 text-sm text-white/60">مقال وإرشاد</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
            <div className="text-3xl font-black text-yellow-200">
              {Object.keys(groupedKnowledge).length}
            </div>
            <div className="mt-2 text-sm text-white/60">تصنيف</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
            <div className="text-3xl font-black text-green-200">واتساب</div>
            <div className="mt-2 text-sm text-white/60">متابعة عند الحاجة</div>
          </div>
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">{creatorGuidance.title}</h2>
          <p className="mt-3 text-lg font-bold text-yellow-100/80">
            {creatorGuidance.subtitle}
          </p>
          <p className="mt-5 max-w-4xl leading-9 text-white/75">
            {creatorGuidance.content}
          </p>
        </div>

        <KnowledgeListWithTranslations knowledge={knowledge} />

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">هل تحتاج مساعدة مباشرة؟</h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك التواصل مع فريق وكالة حمزة عبر واتساب عند الحاجة إلى توضيح إضافي.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
            <Link href="/contact" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black">
              صفحة التواصل
            </Link>
            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent("مرحباً، أريد الاستفسار من مركز المعرفة في وكالة حمزة.")}`}
              target="_blank"
              className="rounded-full bg-green-500 px-7 py-4 font-black text-white"
            >
              واتساب
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function KnowledgeBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.34)_0%,rgba(7,0,9,0.98)_68%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/16 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
