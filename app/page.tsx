"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const programs = ["TikTok", "BIGO LIVE", "Yaahlan", "Xena", "Catchii"];

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    country: "",
    whatsapp: "",
    platform: "TikTok",
    previousExperience: "",
    notes: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!form.fullName || !form.country || !form.whatsapp || !form.platform) {
      setMessage("يرجى تعبئة الحقول الأساسية.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("الاتصال بقاعدة البيانات غير مفعل حالياً.");
      return;
    }

    const duplicateKey = `hamza-agency-${form.whatsapp}-${form.platform}`;
    if (localStorage.getItem(duplicateKey)) {
      setMessage("تم إرسال طلب سابق بنفس رقم الواتساب والمنصة.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("agency_applications").insert({
      full_name: form.fullName.trim(),
      country: form.country.trim(),
      whatsapp: form.whatsapp.trim(),
      platform: form.platform,
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

    localStorage.setItem(duplicateKey, "true");
    setMessage("تم استلام طلبك بنجاح. سيتم التواصل معك عبر واتساب بعد المراجعة.");
    setForm({
      fullName: "",
      country: "",
      whatsapp: "",
      platform: "TikTok",
      previousExperience: "",
      notes: "",
    });

    setTimeout(() => {
      setMessage("");
      setShowJoinForm(false);
    }, 3000);
  };

  if (showSplash) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="absolute h-72 w-72 rounded-full bg-purple-700/30 blur-3xl" />
        <img
          src="/Logo%20hamza%20agency.jpg"
          alt="Hamza Agency"
          className="relative h-36 w-36 rounded-3xl object-cover shadow-[0_0_90px_rgba(168,85,247,0.7)]"
        />
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />
      <div className="fixed left-8 top-20 -z-10 h-72 w-72 rounded-full bg-purple-700/20 blur-3xl" />
      <div className="fixed bottom-16 right-8 -z-10 h-72 w-72 rounded-full bg-yellow-500/10 blur-3xl" />

      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-3">
          <img
            src="/Logo%20hamza%20agency.jpg"
            alt="Hamza Agency"
            className="h-12 w-12 rounded-xl object-cover shadow-[0_0_25px_rgba(168,85,247,0.45)]"
          />
          <div>
            <div className="text-sm font-bold">HAMZA AGENCY</div>
            <div className="text-xs text-yellow-200/80">وكالة حمزة</div>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-10 text-center">
        <img
          src="/Logo%20hamza%20agency.jpg"
          alt="Hamza Agency Logo"
          className="mx-auto mb-8 h-44 w-44 rounded-[2rem] object-cover shadow-[0_0_80px_rgba(168,85,247,0.45)]"
        />

        <div className="mx-auto mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm text-purple-100">
          وكالة رقمية لإدارة صناع المحتوى
        </div>

        <h1 className="text-5xl font-black leading-tight md:text-7xl">
          وكالة حمزة لإدارة وتطوير
          <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">
            صناع المحتوى
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/80 md:text-2xl">
          نساعد صناع المحتوى على النمو وتحقيق الأرباح على منصات البث المباشر
          والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية للتطور.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={() => setShowJoinForm(true)}
            className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-9 py-4 text-lg font-bold shadow-[0_0_40px_rgba(168,85,247,0.45)]"
          >
            انضم الآن
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-5 px-5 pb-20 lg:grid-cols-4">
        {[
          ["+500", "صانع محتوى"],
          ["5", "منصات متاحة"],
          ["24/7", "دعم ومتابعة"],
          ["50+", "فرصة نجاح شهرية"],
        ].map(([number, label]) => (
          <div
            key={label}
            className="rounded-3xl border border-white/10 bg-white/[0.05] p-7 text-center backdrop-blur"
          >
            <div className="bg-gradient-to-r from-purple-300 to-yellow-300 bg-clip-text text-4xl font-black text-transparent">
              {number}
            </div>
            <div className="mt-3 text-white/75">{label}</div>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <h2 className="text-center text-4xl font-black">البرامج المتاحة حالياً</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {programs.map((program) => (
            <button
              key={program}
              onClick={() => setShowJoinForm(true)}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center transition hover:border-purple-400/60 hover:bg-purple-500/10"
            >
              <div className="text-2xl font-black">{program}</div>
              <div className="mt-3 text-sm text-white/60">اضغط لطلب الانضمام</div>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-8 backdrop-blur">
          <h2 className="text-3xl font-black">لماذا وكالة حمزة؟</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              "إدارة احترافية لصناع المحتوى",
              "دعم فني ومتابعة يومية",
              "تطوير الحسابات وتحسين الأداء",
              "فرص انضمام لبرامج متعددة",
              "تدريب وإرشاد مستمر",
              "حل المشاكل التقنية بسرعة",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/25 p-5">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {showJoinForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-4 backdrop-blur">
          <div className="mx-auto my-8 max-w-3xl rounded-[2rem] border border-purple-400/25 bg-[#100014] p-6 shadow-[0_0_80px_rgba(168,85,247,0.25)]">
            <div className="mb-6 flex items-center justify-between">
              <button
                onClick={() => { setMessage(""); setShowJoinForm(false); }}
                className="rounded-full border border-white/15 px-5 py-2 text-white/70"
              >
                إغلاق
              </button>
              <h2 className="text-3xl font-black">طلب الانضمام للوكالة</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                placeholder="الاسم الثلاثي"
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              <input
                value={form.country}
                onChange={(e) => updateField("country", e.target.value)}
                placeholder="الدولة"
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              <input
                value={form.whatsapp}
                onChange={(e) => updateField("whatsapp", e.target.value)}
                placeholder="رقم واتساب"
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              <select
                value={form.platform}
                onChange={(e) => updateField("platform", e.target.value)}
                className="w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              >
                {programs.map((program) => (
                  <option key={program} value={program}>
                    {program}
                  </option>
                ))}
              </select>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <h3 className="mb-3 text-2xl font-black">خبرات سابقة</h3>
                <p className="mb-4 text-lg text-purple-200">
                  هل عملت على برامج أو وكالات أخرى سابقاً؟
                </p>
                <textarea
                  value={form.previousExperience}
                  onChange={(e) => updateField("previousExperience", e.target.value)}
                  placeholder="اكتب خبراتك السابقة إن وجدت"
                  className="min-h-40 w-full resize-none bg-transparent text-xl outline-none"
                />
              </div>

              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="ملاحظات إضافية"
                className="min-h-36 w-full resize-none rounded-3xl border border-white/10 bg-black/30 p-5 text-xl outline-none focus:border-purple-400"
              />

              {message && (
                <div className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-5 text-center text-xl font-bold text-yellow-100">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-2xl font-black disabled:opacity-60"
              >
                {isSubmitting ? "جارٍ الإرسال..." : "إرسال الطلب"}
              </button>
            </form>
          </div>
        </div>
      )}

      <a
        href="https://wa.me/905011730377"
        target="_blank"
        className="fixed bottom-5 left-5 z-30 rounded-full bg-green-500 px-5 py-4 text-sm font-black text-white shadow-2xl"
      >
        واتساب
      </a>

      <footer className="border-t border-white/10 px-5 py-8 text-center text-white/50">
        © 2026 HAMZA AGENCY | وكالة حمزة. All Rights Reserved.
      </footer>
    </main>
  );
            }
