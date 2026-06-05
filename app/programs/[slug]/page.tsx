"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Program = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: string | null;
  requirements: string | null;
  benefits: string | null;
  faq: string | null;
  updates: string | null;
};

export default function ProgramDetailsPage() {
  const params = useParams();
  const slug = String(params.slug || "");

  const [program, setProgram] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    country: "",
    whatsapp: "",
    previousExperience: "",
    notes: "",
  });

  useEffect(() => {
    async function loadProgram() {
      if (!supabase || !slug) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("programs")
        .select(
          "id, name, slug, description, short_description, status, requirements, benefits, faq, updates"
        )
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Program load error:", error);
      }

      setProgram(data || null);
      setIsLoading(false);
    }

    loadProgram();
  }, [slug]);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!program) return;

    if (!form.fullName || !form.country || !form.whatsapp) {
      setMessage("يرجى تعبئة الحقول الأساسية.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("الاتصال بقاعدة البيانات غير مفعل حالياً.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("agency_applications").insert({
      full_name: form.fullName.trim(),
      country: form.country.trim(),
      whatsapp: form.whatsapp.trim(),
      platform: program.name,
      previous_experience: form.previousExperience.trim(),
      notes: form.notes.trim(),
      status: "new",
    });

    setIsSubmitting(false);

    if (error) {
      console.error("Supabase insert error:", error);
      setMessage("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
      return;
    }

    setMessage("تم استلام طلبك بنجاح. سيتم التواصل معك عبر واتساب بعد المراجعة.");

    setForm({
      fullName: "",
      country: "",
      whatsapp: "",
      previousExperience: "",
      notes: "",
    });

    setTimeout(() => {
      setMessage("");
      setShowForm(false);
    }, 3000);
  };

  if (isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] text-white flex items-center justify-center">
        جاري تحميل البرنامج...
      </main>
    );
  }

  if (!program) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] px-5 py-20 text-white">
        <h1 className="text-4xl font-black">البرنامج غير موجود</h1>
        <Link href="/programs" className="mt-8 inline-block text-purple-300">
          العودة إلى البرامج
        </Link>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />

      <section className="mx-auto max-w-6xl px-5 py-14">
        <Link href="/programs" className="mb-8 inline-block text-purple-200">
          ← العودة إلى البرامج
        </Link>

        <div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 shadow-[0_0_60px_rgba(168,85,247,0.18)]">
          <span className="rounded-full border border-green-400/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200">
            {program.status || "active"}
          </span>

          <h1 className="mt-6 text-5xl font-black">{program.name}</h1>

          <p className="mt-6 text-xl leading-10 text-white/75">
            {program.description || program.short_description || "تفاصيل البرنامج ستتم إضافتها من لوحة التحكم."}
          </p>

          <button
            onClick={() => setShowForm(true)}
            className="mt-8 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black"
          >
            انضم الآن
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <InfoCard title="شروط القبول" content={program.requirements || "سيتم إضافة الشروط من لوحة التحكم."} />
          <InfoCard title="ماذا تقدم وكالة حمزة؟" content={program.benefits || "سيتم إضافة المميزات من لوحة التحكم."} />
        </div>

        <InfoCard title="آخر التحديثات" content={program.updates || "لا توجد تحديثات حالياً."} />
        <InfoCard title="الأسئلة الشائعة" content={program.faq || "سيتم إضافة الأسئلة الشائعة لاحقاً."} />
      </section>

      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6">
            <div className="mb-6 flex items-center justify-between">
              <button onClick={() => setShowForm(false)} className="rounded-full border border-white/15 px-5 py-2 text-white/70">
                إغلاق
              </button>
              <h2 className="text-3xl font-black">طلب الانضمام إلى {program.name}</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <input value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} placeholder="الاسم الثلاثي" className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none" />
              <input value={form.country} onChange={(e) => updateField("country", e.target.value)} placeholder="الدولة" className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none" />
              <input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder="رقم واتساب" className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none" />

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <h3 className="mb-3 text-2xl font-black">خبرات سابقة</h3>
                <p className="mb-4 text-lg text-purple-200">
                  هل عملت على برامج أو وكالات أخرى سابقاً؟
                </p>
                <textarea value={form.previousExperience} onChange={(e) => updateField("previousExperience", e.target.value)} placeholder="اكتب خبراتك السابقة إن وجدت" className="min-h-40 w-full resize-none bg-transparent text-xl outline-none" />
              </div>

              <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="ملاحظات إضافية" className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none" />

              {message && (
                <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">
                  {message}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60">
                {isSubmitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function InfoCard({ title, content }: { title: string; content: string }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <h2 className="text-3xl font-black">{title}</h2>
      <p className="mt-4 whitespace-pre-wrap leading-9 text-white/70">{content}</p>
    </div>
  );
}
