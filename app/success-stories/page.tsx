import Link from "next/link";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SuccessStory = {
  id: number;
  title: string | null;
  person_name: string | null;
  country: string | null;
  platform: string | null;
  result_summary: string | null;
  story: string | null;
  image_url: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  status: string | null;
  is_visible: boolean | null;
  created_at: string | null;
};

const professionalDefaultStories: SuccessStory[] = [
  {
    id: 1,
    title: "مسار انطلاق صانع محتوى جديد",
    person_name: "مسار صناع المحتوى",
    country: "عدة دول",
    platform: "TikTok",
    result_summary:
      "تحويل خطوة التقديم من تواصل عشوائي إلى مسار واضح يبدأ بالمعلومات الصحيحة وينتهي بمتابعة منظمة.",
    story:
      "تساعد وكالة حمزة صناع المحتوى الجدد على فهم البرامج المتاحة، شروط الانضمام، وطريقة المتابعة قبل إرسال الطلب. هذا المسار يمنح المتقدم صورة أوضح عن الخطوات المطلوبة ويقلل الأخطاء التي قد تؤخر القبول أو التواصل.",
    image_url: null,
    is_featured: true,
    sort_order: 1,
    status: "published",
    is_visible: true,
    created_at: null,
  },
  {
    id: 2,
    title: "مسار تنظيم طلبات البث المباشر",
    person_name: "إدارة برامج البث",
    country: "عدة دول",
    platform: "BIGO LIVE",
    result_summary:
      "جمع بيانات المتقدمين بطريقة مرتبة تساعد فريق الوكالة على مراجعة الطلبات ومتابعتها باحتراف.",
    story:
      "بدلاً من استقبال معلومات ناقصة عبر المحادثات فقط، تعتمد الوكالة نموذجاً منظماً يجمع الاسم، الدولة، رقم واتساب، المنصة، والخبرة السابقة. هذا يساعد الإدارة على مراجعة الطلبات بسرعة أكبر والتواصل مع الحالات المناسبة بوضوح.",
    image_url: null,
    is_featured: true,
    sort_order: 2,
    status: "published",
    is_visible: true,
    created_at: null,
  },
  {
    id: 3,
    title: "مسار اختيار البرنامج الأنسب",
    person_name: "توجيه المتقدمين",
    country: "عدة دول",
    platform: "Yaahlan",
    result_summary:
      "مساعدة المتقدم على فهم الفرق بين البرامج قبل اختيار المسار الأقرب لهدفه وتجربته.",
    story:
      "تختلف برامج البث من حيث طبيعة العمل، شروط القبول، ونظام المتابعة. لذلك تهتم وكالة حمزة بتوضيح الفروقات الأساسية للمتقدمين حتى يكون اختيار البرنامج مبنياً على فهم واضح وليس على تجربة عشوائية.",
    image_url: null,
    is_featured: false,
    sort_order: 3,
    status: "published",
    is_visible: true,
    created_at: null,
  },
  {
    id: 4,
    title: "مسار متابعة الخدمات الرقمية",
    person_name: "فريق الخدمات الرقمية",
    country: "تركيا وخارجها",
    platform: "Digital Services",
    result_summary:
      "تنظيم طلبات الخدمات الرقمية مثل الشحن والسحب عبر نموذج واضح وتأكيد مباشر عبر واتساب.",
    story:
      "تتعامل الوكالة مع طلبات الخدمات الرقمية بطريقة منظمة تبدأ بجمع معلومات الطلب الأساسية، ثم مراجعتها قبل التواصل مع العميل عبر واتساب. هذا الأسلوب يقلل الالتباس ويحافظ على وضوح الطلب قبل التنفيذ.",
    image_url: null,
    is_featured: false,
    sort_order: 4,
    status: "published",
    is_visible: true,
    created_at: null,
  },
];

async function getSuccessStories() {
  if (!supabase) {
    return professionalDefaultStories;
  }

  const { data, error } = await supabase
    .from("success_stories")
    .select(
      "id, title, person_name, country, platform, result_summary, story, image_url, is_featured, sort_order, status, is_visible, created_at"
    )
    .eq("is_visible", true)
    .eq("status", "published")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return professionalDefaultStories;
  }

  return data as SuccessStory[];
}

export default async function SuccessStoriesPage() {
  const stories = await getSuccessStories();
  const featuredStories = stories.filter((story) => story.is_featured);
  const regularStories = stories.filter((story) => !story.is_featured);
  const isUsingDefaultStories = stories.every((story) => story.created_at === null);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-[#070009] text-white"
    >
      <SuccessStoriesBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <Link href="/" className="mb-8 inline-block text-purple-200">
          ← العودة إلى الرئيسية
        </Link>

        <header className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 text-center shadow-[0_0_55px_rgba(168,85,247,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
            HAMZA AGENCY Success Paths
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            قصص ومسارات وكالة حمزة
            <span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent">
              طريقة عمل واضحة ونتائج منظمة
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-white/72 md:text-xl">
            نعرض هنا نماذج من مسارات العمل التي تعتمدها وكالة حمزة لدعم صناع
            المحتوى والعملاء، من التقديم الأول إلى المتابعة والتنظيم واختيار
            البرنامج المناسب.
          </p>

          {isUsingDefaultStories && (
            <div className="mx-auto mt-6 max-w-4xl rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-50/80">
              ملاحظة شفافة: المحتوى الظاهر حالياً يشرح مسارات عمل عامة داخل الوكالة. عند اعتماد قصص منشورة من لوحة الإدارة سيتم عرضها هنا بدلاً من هذه النماذج.
            </div>
          )}
        </header>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <StatCard title={isUsingDefaultStories ? "مسارات معروضة" : "قصص منشورة"} value={`${stories.length}+`} />
          <StatCard title="برامج وخدمات" value="5+" />
          <StatCard title="متابعة مباشرة" value="واتساب" />
        </div>

        {featuredStories.length > 0 && (
          <section className="mt-14">
            <div className="mb-6">
              <div className="mb-3 inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-4 py-2 text-sm font-black text-yellow-100">
                مسارات مميزة
              </div>

              <h2 className="text-4xl font-black">نماذج بارزة</h2>

              <p className="mt-3 max-w-3xl leading-8 text-white/60">
                مسارات مختارة توضّح كيف تساعد وكالة حمزة في جعل التقديم
                والمتابعة أكثر وضوحاً واحترافية.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {featuredStories.map((story) => (
                <StoryCard key={story.id} story={story} featured />
              ))}
            </div>
          </section>
        )}

        {regularStories.length > 0 && (
          <section className="mt-14">
            <div className="mb-6">
              <div className="mb-3 inline-flex rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm font-black text-purple-100">
                مسارات إضافية
              </div>

              <h2 className="text-4xl font-black">تجارب ومسارات أخرى</h2>

              <p className="mt-3 max-w-3xl leading-8 text-white/60">
                نماذج إضافية من طريقة تنظيم الوكالة للتواصل، الطلبات، البرامج،
                والخدمات الرقمية.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regularStories.map((story) => (
                <StoryCard key={story.id} story={story} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black text-green-100">
            هل تريد أن تبدأ مسارك مع وكالة حمزة؟
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">
            يمكنك تصفح البرامج المتاحة أو التواصل مع فريق الوكالة عبر واتساب
            للحصول على توجيه مناسب قبل التقديم.
          </p>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/programs"
              className="rounded-full bg-purple-600 px-8 py-4 font-black text-white shadow-2xl"
            >
              تصفح البرامج
            </Link>

            <a
              href="https://wa.me/905011730377"
              target="_blank"
              className="rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl"
            >
              التواصل عبر واتساب
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}

function StoryCard({
  story,
  featured = false,
}: {
  story: SuccessStory;
  featured?: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-[2rem] border backdrop-blur ${
        featured
          ? "border-yellow-400/25 bg-yellow-500/10 shadow-[0_0_45px_rgba(212,175,55,0.10)]"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="relative min-h-48 border-b border-white/10 bg-black/25">
        {story.image_url ? (
          <img
            src={story.image_url}
            alt={story.title || "قصة نجاح"}
            className="h-48 w-full object-cover opacity-90"
          />
        ) : (
          <div className="flex h-48 items-center justify-center bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),rgba(7,0,9,0.95))]">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-yellow-400/25 bg-yellow-500/10 text-3xl font-black text-yellow-100">
              ★
            </div>
          </div>
        )}

        {featured && (
          <div className="absolute right-4 top-4 rounded-full border border-yellow-300/25 bg-yellow-500/20 px-4 py-2 text-xs font-black text-yellow-100 backdrop-blur">
            مسار مميز
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge>{story.platform || "HAMZA AGENCY"}</Badge>
          <Badge>{story.country || "غير محدد"}</Badge>
        </div>

        <h3 className="text-2xl font-black leading-9">
          {story.title || "مسار عمل"}
        </h3>

        <p className="mt-3 text-sm font-bold text-white/50">
          {story.person_name || "وكالة حمزة"}
        </p>

        {story.result_summary && (
          <div className="mt-5 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-green-100">
            <div className="mb-2 text-sm font-black">النتيجة المنظمة</div>
            <p className="leading-7 text-white/70">{story.result_summary}</p>
          </div>
        )}

        <p className="mt-5 leading-8 text-white/72">
          {story.story ||
            "مسار عمل احترافي يوضح أثر التنظيم والمتابعة في تجربة أفضل."}
        </p>
      </div>
    </article>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 text-center backdrop-blur">
      <div className="text-4xl font-black text-yellow-100">{value}</div>
      <div className="mt-3 text-sm font-bold text-white/55">{title}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
      {children}
    </span>
  );
}

function SuccessStoriesBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.16)_0%,rgba(124,58,237,0.22)_34%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/14 blur-3xl" />
      <div className="absolute -right-24 top-44 hidden h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl md:block" />
      <div className="absolute bottom-0 left-1/2 h-72 w-[70rem] -translate-x-1/2 rounded-full bg-purple-700/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.055] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" />
    </div>
  );
}
