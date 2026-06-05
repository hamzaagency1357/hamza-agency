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

async function getPrograms(): Promise<Program[]> {
  if (!supabase) {
    return [];
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
    return [];
  }

  return data || [];
}

export default async function ProgramsPage() {
  const programs = await getPrograms();

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
              وابدأ طلب الانضمام
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70">
            هذه البرامج تُدار من قاعدة البيانات ويمكن تعديلها أو إخفاؤها أو
            إضافة برامج جديدة لاحقاً من لوحة التحكم.
          </p>
        </div>

        {programs.length === 0 ? (
          <div className="rounded-[2rem] border border-yellow-500/30 bg-yellow-500/10 p-8 text-center text-yellow-100">
            لا توجد برامج متاحة حالياً.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <Link
                key={program.id}
                href={`/programs/${program.slug}`}
                className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_0_35px_rgba(168,85,247,0.12)] transition hover:-translate-y-1 hover:border-purple-400/50"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-yellow-400 text-2xl font-black">
                    {program.name?.charAt(0) || "H"}
                  </div>

                  <span className="rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200">
                    {program.status || "متاح"}
                  </span>
                </div>

                <h2 className="text-3xl font-black">{program.name}</h2>

                <p className="mt-4 min-h-24 leading-8 text-white/70">
                  {program.short_description ||
                    program.description ||
                    "برنامج متاح حالياً ضمن وكالة حمزة."}
                </p>

                <div className="mt-6 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 text-center font-bold">
                  عرض التفاصيل
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
