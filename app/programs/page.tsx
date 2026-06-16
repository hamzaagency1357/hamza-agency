import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProgramsGridWithTranslations from "@/components/ProgramsGridWithTranslations";

type Program = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  is_active: boolean | null;
};

type ProgramMedia = {
  id: number;
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  page_slug: string | null;
  alt_text: string | null;
  is_active: boolean | null;
};

const defaultPrograms: Program[] = [
  {
    id: 1,
    name: "TikTok",
    slug: "tiktok",
    description:
      "برنامج مخصص لصناع المحتوى الراغبين بالنمو على TikTok من خلال وكالة منظمة ودعم مستمر.",
    short_description:
      "فرصة لصناع الفيديوهات القصيرة لتطوير الحساب والانضمام إلى بيئة وكالة احترافية.",
    status: "active",
    sort_order: 1,
    is_visible: true,
    is_active: true,
  },
  {
    id: 2,
    name: "BIGO LIVE",
    slug: "bigo-live",
    description:
      "برنامج مناسب لصناع المحتوى المهتمين بالبث المباشر وبناء جمهور نشط.",
    short_description:
      "دعم ومتابعة لصناع اللايف على BIGO LIVE مع توجيه لتحسين الأداء.",
    status: "active",
    sort_order: 2,
    is_visible: true,
    is_active: true,
  },
  {
    id: 3,
    name: "Yaahlan",
    slug: "yaahlan",
    description:
      "برنامج تواصل وبث مباشر مناسب لصناع المحتوى الجادين والراغبين بالانضمام إلى وكالة.",
    short_description:
      "فرصة لصناع المحتوى في برامج التواصل والبث مع متابعة من فريق الوكالة.",
    status: "active",
    sort_order: 3,
    is_visible: true,
    is_active: true,
  },
  {
    id: 4,
    name: "Xena",
    slug: "xena",
    description:
      "برنامج Creator مناسب للحسابات القابلة للتطوير ضمن منظومة وكالة حمزة.",
    short_description:
      "برنامج لصناع المحتوى مع دعم إداري وفني ومتابعة لحالة الحساب.",
    status: "active",
    sort_order: 4,
    is_visible: true,
    is_active: true,
  },
  {
    id: 5,
    name: "Catchii",
    slug: "catchii",
    description:
      "برنامج اجتماعي وترفيهي لصناع المحتوى الراغبين ببناء حضور أفضل.",
    short_description:
      "فرصة لصناع المحتوى الاجتماعي والترفيهي ضمن وكالة احترافية.",
    status: "active",
    sort_order: 5,
    is_visible: true,
    is_active: true,
  },
];

const platformHighlights = [
  "تقديم مباشر من الموقع",
  "مراجعة الطلب من فريق الوكالة",
  "متابعة عبر واتساب عند الحاجة",
  "اختيار البرنامج الأنسب لك",
];

async function getPrograms(): Promise<Program[]> {
  if (!supabase) {
    return defaultPrograms;
  }

  const { data, error } = await supabase
    .from("programs")
    .select(
      "id, name, slug, description, short_description, status, sort_order, is_visible, is_active"
    )
    .eq("is_visible", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Programs load error:", error);
    return defaultPrograms;
  }

  return data && data.length > 0 ? data : defaultPrograms;
}

async function getProgramMedia(): Promise<ProgramMedia[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("media")
    .select("id, name, file_url, file_type, category, page_slug, alt_text, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return (data as ProgramMedia[]).filter((item) => Boolean(item.file_url));
}

export default async function ProgramsPage() {
  const [programs, mediaItems] = await Promise.all([getPrograms(), getProgramMedia()]);

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] text-white">
      <ProgramsBackground />

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-16">
        <div className="mb-14 text-center">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100 backdrop-blur">
            برامج وكالة حمزة
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            اختر البرنامج المناسب
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              وابدأ طلب الانضمام
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/72">
            استعرض البرامج المتاحة حالياً لدى وكالة حمزة، وتعرّف على طبيعة كل
            برنامج قبل إرسال طلب الانضمام للفريق المناسب.
          </p>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-4">
          {platformHighlights.map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center text-sm font-bold text-white/75 backdrop-blur"
            >
              {item}
            </div>
          ))}
        </div>

        <ProgramsGridWithTranslations programs={programs} mediaItems={mediaItems} />

        <div className="mt-14 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-2xl font-black text-yellow-100">
            لا تعرف أي برنامج مناسب لك؟
          </h2>

          <p className="mx-auto mt-3 max-w-2xl leading-8 text-white/70">
            يمكنك اختيار البرنامج الأقرب لك وإرسال الطلب، وسيقوم فريق الوكالة
            بمراجعة المعلومات والتواصل معك عبر واتساب عند الحاجة.
          </p>

          <a
            href="https://wa.me/905011730377"
            target="_blank"
            className="mt-6 inline-flex rounded-full bg-green-500 px-7 py-4 font-black text-white shadow-2xl"
          >
            تواصل واتساب
          </a>
        </div>
      </section>
    </main>
  );
}

function ProgramsBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.38)_0%,rgba(7,0,9,0.98)_68%)]" />

      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-purple-600/18 blur-3xl" />
      <div className="hidden md:block absolute -right-24 top-44 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />

      <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.35)_1px,transparent_0)] [background-size:42px_42px]" />

      <div className="hidden md:block absolute left-[12%] top-[34%] h-24 w-24 rounded-3xl border border-purple-400/15 bg-purple-500/5 backdrop-blur" />
      <div className="hidden md:block absolute right-[14%] top-[46%] h-28 w-28 rounded-full border border-yellow-300/15 bg-yellow-500/5 backdrop-blur" />
    </div>
  );
}
