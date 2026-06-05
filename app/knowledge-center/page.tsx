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
    summary:
      "شرح مبسط يساعد صانع المحتوى على اختيار البرنامج الأقرب لطبيعة حسابه وخبرته.",
    content:
      "اختيار البرنامج المناسب يعتمد على نوع المحتوى، نشاط الحساب، القدرة على الالتزام، وطريقة التواصل مع الجمهور. إذا كنت مهتماً بالفيديوهات القصيرة فقد يكون TikTok مناسباً، وإذا كنت مهتماً بالبث المباشر فقد تكون برامج اللايف مثل BIGO LIVE أو Yaahlan أقرب لك.",
    category: "الانضمام",
    sort_order: 1,
    is_published: true,
  },
  {
    id: 2,
    title: "ماذا يحدث بعد إرسال طلب الانضمام؟",
    summary:
      "تعرف على الخطوات الأساسية بعد تعبئة نموذج الانضمام في الموقع.",
    content:
      "بعد إرسال الطلب، يتم حفظه داخل لوحة تحكم الوكالة، ثم يراجعه فريق الإدارة. قد يتم تحديث حالة الطلب أو التواصل معك عبر واتساب عند الحاجة لمعلومات إضافية أو لتأكيد الخطوات التالية.",
    category: "الطلبات",
    sort_order: 2,
    is_published: true,
  },
  {
    id: 3,
    title: "نصائح لصناع المحتوى الجدد",
    summary:
      "إرشادات أولية تساعد المبتدئين على تقديم أنفسهم بشكل أفضل للوكالة.",
    content:
      "احرص على تقديم معلومات صحيحة، استخدم رقم واتساب فعال، اشرح خبرتك السابقة بوضوح إن وجدت، وكن صريحاً حول نوع المحتوى الذي تقدمه أو ترغب بتقديمه.",
    category: "صناع المحتوى",
    sort_order: 3,
    is_published: true,
  },
  {
    id: 4,
    title: "الخدمات الرقمية داخل وكالة حمزة",
    summary:
      "توضيح الفرق بين خدمات الوكالة والخدمات الرقمية مثل الشحن والسحب.",
    content:
      "الخدمات الرقمية مثل شحن المنصات وسحب الأرباح منفصلة عن خدمات إدارة صناع المحتوى. حالياً لا يوجد نظام محفظة أو دفع إلكتروني مباشر داخل الموقع، ويتم تأكيد التفاصيل عبر واتساب.",
    category: "الخدمات الرقمية",
    sort_order: 4,
    is_published: true,
  },
];

async function getKnowledgeCenterData() {
  if (!supabase) {
    return {
      page: null,
      settings: [],
      knowledge: fallbackKnowledge,
    };
  }

  const [pageResult, settingsResult, knowledgeResult] = await Promise.all([
    supabase
      .from("pages")
      .select("title, slug, content, is_published")
      .eq("slug", "knowledge-center")
      .eq("is_published", true)
      .limit(1),

    supabase
      .from("settings")
      .select("setting_key, setting_value, is_public")
      .eq("is_public", true),

    supabase
      .from("knowledge_base")
      .select("id, title, summary, content, category, sort_order, is_published")
      .eq("is_published", true)
      .order("sort_order", { ascending: true }),
  ]);

  return {
    page:
      !pageResult.error && pageResult.data && pageResult.data.length > 0
        ? pageResult.data[0]
        : null,

    settings:
      !settingsResult.error && settingsResult.data ? settingsResult.data : [],

    knowledge:
      !knowledgeResult.error &&
      knowledgeResult.data &&
      knowledgeResult.data.length > 0
        ? knowledgeResult.data
        : fallbackKnowledge,
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

function groupKnowledge(items: KnowledgeItem[]) {
  return items.reduce<Record<string, KnowledgeItem[]>>((groups, item) => {
    const category = item.category || "مقالات عامة";

    if (!groups[category]) {
      groups[category] = [];
    }

    groups[category].push(item);
    return groups;
  }, {});
}

export default async function KnowledgeCenterPage() {
  const { page, settings, knowledge } = await getKnowledgeCenterData();

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

  const title = page?.title || "مركز المعرفة";

  const intro =
    page?.content ||
    "مركز المعرفة في وكالة حمزة يساعد صناع المحتوى على فهم طريقة الانضمام، اختيار البرنامج المناسب، معرفة خطوات المتابعة، والتعرف على الخدمات المتاحة داخل الوكالة.";

  const groupedKnowledge = groupKnowledge(knowledge);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
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
              دليل صناع المحتوى
            </span>
          </h1>

          <p className="mt-8 max-w-5xl text-xl leading-10 text-white/75">
            {intro}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
            <div className="text-3xl font-black text-purple-200">
              {knowledge.length}
            </div>
            <div className="mt-2 text-sm text-white/60">مقال وإرشاد</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
            <div className="text-3xl font-black text-yellow-200">
              {Object.keys(groupedKnowledge).length}
            </div>
            <div className="mt-2 text-sm text-white/60">تصنيف</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
            <div className="text-3xl font-black text-green-200">24/7</div>
            <div className="mt-2 text-sm text-white/60">محتوى مساعد</div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
            <div className="text-3xl font-black text-cyan-200">AI</div>
            <div className="mt-2 text-sm text-white/60">جاهز لاحقاً للدعم الذكي</div>
          </div>
        </div>

        <div className="mt-10 space-y-8">
          {Object.entries(groupedKnowledge).map(([category, items]) => (
            <div
              key={category}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"
            >
              <div className="mb-6 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100">
                {category}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/25 p-5"
                  >
                    <h2 className="text-2xl font-black">
                      {item.title || "مقال من مركز المعرفة"}
                    </h2>

                    {item.summary && (
                      <p className="mt-4 leading-8 text-purple-100/80">
                        {item.summary}
                      </p>
                    )}

                    <p className="mt-4 whitespace-pre-wrap leading-9 text-white/68">
                      {item.content || "سيتم إضافة محتوى هذا المقال من لوحة التحكم."}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur">
          <h2 className="text-3xl font-black text-yellow-100">
            ملاحظة إدارية
          </h2>

          <p className="mt-5 leading-9 text-white/75">
            هذه الصفحة جاهزة لتصبح جزءاً من Knowledge Base داخل لوحة التحكم.
            لاحقاً سنضيف إدارة المقالات والتحديثات والأسئلة غير المجاب عنها من
            لوحة الإدارة وربطها بنظام الدعم الذكي.
          </p>
        </div>

        <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black">هل تحتاج مساعدة مباشرة؟</h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            إذا لم تجد الإجابة المناسبة، يمكنك التواصل مع فريق وكالة حمزة عبر
            واتساب.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/faq"
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black"
            >
              الأسئلة الشائعة
            </Link>

            <a
              href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                "مرحباً، أريد المساعدة من وكالة حمزة."
              )}`}
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

      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />
    </div>
  );
}
