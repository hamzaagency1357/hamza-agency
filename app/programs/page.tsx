import Link from "next/link";

const programs = [
  {
    slug: "tiktok",
    name: "TikTok",
    status: "متاح",
    description:
      "برنامج مناسب لصناع المحتوى على تيك توك والبث المباشر، مع دعم وكالة حمزة في التطوير والمتابعة.",
    features: ["دعم مستمر", "تطوير الحساب", "متابعة الأداء"],
  },
  {
    slug: "bigo-live",
    name: "BIGO LIVE",
    status: "متاح",
    description:
      "برنامج بث مباشر لصناع المحتوى مع فرص نمو ودعم إداري وفني من وكالة حمزة.",
    features: ["إدارة احترافية", "دعم فني", "إرشاد للمبدعين"],
  },
  {
    slug: "yaahlan",
    name: "Yaahlan",
    status: "متاح",
    description:
      "برنامج تواصل وبث مباشر لصناع المحتوى مع إمكانية الانضمام عبر وكالة حمزة.",
    features: ["فرص نمو", "متابعة يومية", "حل المشاكل"],
  },
  {
    slug: "xena",
    name: "Xena",
    status: "متاح",
    description:
      "برنامج مخصص للمبدعين وصناع المحتوى، مع دعم الوكالة في التنظيم والتطوير.",
    features: ["تنظيم العمل", "دعم إداري", "تطوير المحتوى"],
  },
  {
    slug: "catchii",
    name: "Catchii",
    status: "متاح",
    description:
      "برنامج حديث لصناع المحتوى مع فرص توسع وانضمام عبر وكالة حمزة.",
    features: ["فرص جديدة", "متابعة مستمرة", "دعم احترافي"],
  },
];

export default function ProgramsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white">
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-14 text-center">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm text-purple-100">
            برامج وكالة حمزة
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            اختر البرنامج المناسب
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
              واطّلع على التفاصيل
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70">
            هذه الصفحة تعرض البرامج المتاحة حالياً داخل وكالة حمزة. عند الضغط
            على أي برنامج ستظهر تفاصيله، شروطه، نظامه، وما تقدمه الوكالة له.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Link
              key={program.slug}
              href={`/programs/${program.slug}`}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_35px_rgba(168,85,247,0.08)] transition hover:-translate-y-2 hover:border-purple-400/60 hover:bg-purple-500/10"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-yellow-400 text-xl font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.35)]">
                  {program.name.charAt(0)}
                </div>

                <span className="rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200">
                  {program.status}
                </span>
              </div>

              <h2 className="text-3xl font-black">{program.name}</h2>

              <p className="mt-4 min-h-24 leading-8 text-white/70">
                {program.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {program.features.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-white/70"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              <div className="mt-8 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 text-center font-bold shadow-[0_0_30px_rgba(168,85,247,0.35)] transition group-hover:scale-[1.02]">
                عرض التفاصيل
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
