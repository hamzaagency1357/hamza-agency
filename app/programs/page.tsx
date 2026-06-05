import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

const fallbackPrograms: Program[] = [
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
  "إمكانية إدارة البرامج من لوحة التحكم",
];

async function getPrograms(): Promise<Program[]> {
  if (!supabase) {
    return fallbackPrograms;
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
    return fallbackPrograms;
  }

  return data && data.length > 0 ? data : fallbackPrograms;
}

export default async function ProgramsPage() {
  const programs = await getPrograms();

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
            جميع البرامج هنا مرتبطة بقاعدة البيانات، ويمكن إدارتها من لوحة التحكم:
            إضافة برنامج، تعديل المحتوى، إظهار أو إخفاء البرنامج، وتحديث حالته.
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

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => {
            const visual = getProgramVisual(program.slug, program.name);

            return (
              <Link
                key={program.id}
                href={`/programs/${program.slug}`}
                className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 p-6 shadow-[0_0_35px_rgba(168,85,247,0.10)] backdrop-blur transition hover:-translate-y-1 hover:border-purple-400/50 hover:bg-purple-500/10"
              >
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${visual.accent}, ${visual.secondary})`,
                  }}
                />

                <div className="mb-6 flex items-center justify-between gap-3">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-black shadow-[0_0_28px_rgba(168,85,247,0.18)]"
                    style={{
                      background: `linear-gradient(135deg, ${visual.accent}, ${visual.secondary})`,
                    }}
                  >
                    {visual.icon}
                  </div>

                  <span className={getStatusClass(program.status)}>
                    {getStatusLabel(program.status)}
                  </span>
                </div>

                <div className="mb-3 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/55">
                  {visual.label}
                </div>

                <h2 className="text-3xl font-black">{program.name}</h2>

                <p className="mt-4 min-h-24 leading-8 text-white/70">
                  {program.short_description ||
                    program.description ||
                    "برنامج متاح حالياً ضمن وكالة حمزة لصناع المحتوى."}
                </p>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="text-sm text-white/45">
                    اضغط لعرض الشروط والتفاصيل
                  </div>

                  <div className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-3 text-sm font-black transition group-hover:scale-105">
                    التفاصيل
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

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

function getProgramVisual(slug: string, name: string) {
  const key = (slug || name || "").toLowerCase();

  if (key.includes("tiktok")) {
    return {
      icon: "♪",
      label: "Short Video",
      accent: "#ff2f8b",
      secondary: "#22d3ee",
    };
  }

  if (key.includes("bigo")) {
    return {
      icon: "LIVE",
      label: "Live Streaming",
      accent: "#38bdf8",
      secondary: "#8b5cf6",
    };
  }

  if (key.includes("yaahlan")) {
    return {
      icon: "Y",
      label: "Community Live",
      accent: "#f59e0b",
      secondary: "#8b5cf6",
    };
  }

  if (key.includes("xena")) {
    return {
      icon: "X",
      label: "Creator Program",
      accent: "#a855f7",
      secondary: "#06b6d4",
    };
  }

  if (key.includes("catchii")) {
    return {
      icon: "C",
      label: "Social Creator",
      accent: "#ec4899",
      secondary: "#facc15",
    };
  }

  return {
    icon: "H",
    label: "Agency Program",
    accent: "#7c3aed",
    secondary: "#d4af37",
  };
}

function getStatusLabel(status: string | null) {
  const value = (status || "active").toLowerCase();

  if (value === "limited") return "قبول محدود";
  if (value === "paused") return "متوقف مؤقتاً";
  if (value === "inactive") return "غير متاح";
  if (value === "closed") return "مغلق";

  return "متاح الآن";
}

function getStatusClass(status: string | null) {
  const value = (status || "active").toLowerCase();

  if (value === "limited") {
    return "rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-200";
  }

  if (value === "paused" || value === "inactive" || value === "closed") {
    return "rounded-full border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200";
  }

  return "rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200";
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
