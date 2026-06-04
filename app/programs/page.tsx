import Link from "next/link";

const programs = [
  {
    slug: "tiktok",
    name: "TikTok",
    description: "انضم إلى وكالة حمزة لبرنامج تيك توك واحصل على الدعم والتطوير."
  },
  {
    slug: "bigo-live",
    name: "BIGO LIVE",
    description: "برنامج البث المباشر BIGO LIVE مع دعم كامل من الوكالة."
  },
  {
    slug: "yaahlan",
    name: "Yaahlan",
    description: "انضم إلى برنامج Yaahlan وابدأ رحلتك مع وكالة حمزة."
  },
  {
    slug: "xena",
    name: "Xena",
    description: "برنامج Xena لصناع المحتوى والبث المباشر."
  },
  {
    slug: "catchii",
    name: "Catchii",
    description: "برنامج Catchii مع فرص نمو ودعم احترافي."
  }
];

export default function ProgramsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-6xl mx-auto">

        <h1 className="text-4xl md:text-6xl font-bold text-center mb-4">
          البرامج المتاحة حالياً
        </h1>

        <p className="text-center text-gray-400 mb-12">
          اختر البرنامج المناسب لك لمعرفة التفاصيل الكاملة والتقديم.
        </p>

        <div className="grid gap-8">
          {programs.map((program) => (
            <Link
              key={program.slug}
              href={`/programs/${program.slug}`}
              className="block rounded-3xl border border-purple-500/20 bg-purple-950/20 p-8 hover:border-purple-500 hover:scale-[1.02] transition"
            >
              <h2 className="text-3xl font-bold mb-4">
                {program.name}
              </h2>

              <p className="text-gray-300">
                {program.description}
              </p>

              <div className="mt-6 text-purple-400 font-semibold">
                عرض التفاصيل →
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
