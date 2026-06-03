"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

const platforms = ["TikTok", "BIGO LIVE", "Yaahlan", "Xena", "Catchii"];

const benefits = [
  "إدارة احترافية لصناع المحتوى",
  "متابعة يومية وتوجيه مستمر",
  "دعم في مشاكل المنصات والبث",
  "فرص نمو وأرباح أفضل",
];

const stats = [
  { value: 500, suffix: "+", label: "صانع محتوى" },
  { value: 5, suffix: "+", label: "منصات متاحة" },
  { value: 24, suffix: "/7", label: "دعم ومتابعة" },
  { value: 50, suffix: "+", label: "فرصة نجاح شهرية" },
];

type FormData = {
  full_name: string;
  country: string;
  whatsapp: string;
  platform: string;
  previous_experience: string;
  notes: string;
};

function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}

function Counter({
  value,
  suffix,
}: {
  value: number;
  suffix: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const stepTime = 25;
    const steps = duration / stepTime;
    const increment = value / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <>
      {count}
      {suffix}
    </>
  );
}

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    full_name: "",
    country: "",
    whatsapp: "",
    platform: platforms[0],
    previous_experience: "",
    notes: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      country: "",
      whatsapp: "",
      platform: platforms[0],
      previous_experience: "",
      notes: "",
    });
  };

  const submitApplication = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setSuccess(false);

    if (!formData.full_name.trim()) {
      setMessage("يرجى كتابة الاسم الثلاثي.");
      return;
    }

    if (!formData.country.trim()) {
      setMessage("يرجى كتابة الدولة.");
      return;
    }

    if (!formData.whatsapp.trim()) {
      setMessage("يرجى كتابة رقم واتساب.");
      return;
    }

    if (!formData.platform.trim()) {
      setMessage("يرجى اختيار المنصة.");
      return;
    }

    const duplicateKey = `hamza_application_${formData.whatsapp.trim()}_${formData.platform}`;

    if (typeof window !== "undefined" && localStorage.getItem(duplicateKey)) {
      setMessage("تم إرسال طلب سابقاً بنفس رقم الواتساب لهذه المنصة.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage("الاتصال بقاعدة البيانات غير مفعل حالياً.");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("agency_applications").insert({
      full_name: formData.full_name.trim(),
      country: formData.country.trim(),
      whatsapp: formData.whatsapp.trim(),
      platform: formData.platform,
      previous_experience: formData.previous_experience.trim(),
      notes: formData.notes.trim(),
      status: "pending",
    });

    setIsSubmitting(false);

    if (error) {
      setMessage("حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.");
      return;
    }

    localStorage.setItem(duplicateKey, "submitted");
    resetForm();
    setSuccess(true);
    setMessage("تم استلام طلبك بنجاح. سيتم التواصل معك عبر واتساب بعد المراجعة.");
  };

  return (
    <main dir="rtl" className="min-h-screen overflow-hidden bg-[#030006] text-white">
      {showSplash && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#030006]">
          <div className="absolute h-96 w-96 animate-pulse rounded-full bg-purple-700/40 blur-3xl" />
          <div className="absolute h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl" />
          <img
            src="/Logo%20hamza%20agency.jpg"
            alt="Hamza Agency"
            className="relative h-48 w-48 rounded-[2rem] object-cover shadow-[0_0_100px_rgba(168,85,247,0.8)]"
          />
        </div>
      )}

      <section className="relative px-6 pb-20 pt-10 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(126,34,206,0.65),transparent_42%),radial-gradient(circle_at_bottom,rgba(212,175,55,0.25),transparent_35%)]" />
        <div className="absolute left-10 top-24 h-32 w-32 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rounded-full bg-yellow-300/10 blur-3xl" />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-end">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xl font-bold tracking-wide">HAMZA AGENCY</div>
              <div className="text-sm text-yellow-200/80">وكالة حمزة</div>
            </div>
            <img
              src="/Logo%20hamza%20agency.jpg"
              alt="Hamza Agency"
              className="h-16 w-16 rounded-2xl object-cover shadow-[0_0_35px_rgba(168,85,247,0.55)]"
            />
          </div>
        </nav>

        <Reveal>
          <div className="relative z-10 mx-auto mt-16 max-w-4xl">
            <img
              src="/Logo%20hamza%20agency.jpg"
              alt="Hamza Agency Logo"
              className="mx-auto mb-10 h-52 w-52 rounded-[2rem] object-cover shadow-[0_0_90px_rgba(168,85,247,0.6)] md:h-72 md:w-72"
            />

            <div className="mb-8 inline-flex rounded-full border border-purple-400/40 bg-purple-500/10 px-6 py-3 text-white/90 backdrop-blur">
              وكالة رقمية فاخرة لصناع المحتوى
            </div>

            <h1 className="text-5xl font-black leading-tight md:text-7xl">
              وكالة حمزة لإدارة وتطوير
              <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-200 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.45)]">
                صناع المحتوى
              </span>
            </h1>

            <p className="mx-auto mt-8 max-w-3xl text-lg leading-9 text-white/85 md:text-2xl">
              نساعد المبدعين على النمو وتحقيق الأرباح على منصات البث المباشر
              والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية
              للتطور.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => {
                  setMessage("");
                  setSuccess(false);
                  setShowJoinForm(true);
                }}
                className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-10 py-5 text-xl font-bold shadow-[0_0_45px_rgba(168,85,247,0.65)] transition hover:scale-105"
              >
                انضم الآن
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur transition hover:border-purple-400/60 hover:shadow-[0_0_35px_rgba(168,85,247,0.25)]"
              >
                <div className="bg-gradient-to-r from-purple-300 to-yellow-200 bg-clip-text text-5xl font-black text-transparent">
                  <Counter value={item.value} suffix={item.suffix} />
                </div>
                <div className="mt-4 text-white/75">{item.label}</div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <h2 className="text-center text-4xl font-black">البرامج المتوفرة حالياً</h2>
          <div className="mx-auto mt-12 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {platforms.map((platform) => (
              <div
                key={platform}
                className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center transition hover:-translate-y-2 hover:border-purple-400/50 hover:shadow-[0_0_45px_rgba(212,175,55,0.2)]"
              >
                <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-400 to-yellow-300" />
                <h3 className="text-2xl font-bold">{platform}</h3>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl rounded-[3rem] border border-white/10 bg-white/[0.04] p-8 backdrop-blur md:p-14">
            <h2 className="mb-10 text-center text-4xl font-black">لماذا وكالة حمزة؟</h2>
            <div className="grid gap-5">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="rounded-3xl border border-white/10 bg-black/20 p-6 text-xl text-white/85 transition hover:bg-purple-500/10"
                >
                  ✦ {benefit}
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <a
        href="https://wa.me/905011730377"
        className="fixed bottom-6 left-6 z-40 rounded-full bg-green-500 px-6 py-4 text-lg font-bold text-white shadow-[0_0_30px_rgba(34,197,94,0.45)] transition hover:scale-105"
      >
        واتساب
      </a>

      {showJoinForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur">
          <form
            onSubmit={submitApplication}
            className="mx-auto max-w-3xl rounded-[3rem] border border-purple-400/20 bg-[#110016] p-6 shadow-[0_0_80px_rgba(168,85,247,0.35)] md:p-10"
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-black md:text-4xl">طلب الانضمام للوكالة</h2>
              <button
                type="button"
                onClick={() => setShowJoinForm(false)}
                className="rounded-full border border-white/10 px-5 py-3 text-white/70"
              >
                إغلاق
              </button>
            </div>

            <div className="grid gap-5">
              <input value={formData.full_name} onChange={(e) => updateField("full_name", e.target.value)} className="rounded-3xl border border-white/10 bg-black/30 p-5 text-lg outline-none" placeholder="الاسم الثلاثي" />
              <input value={formData.country} onChange={(e) => updateField("country", e.target.value)} className="rounded-3xl border border-white/10 bg-black/30 p-5 text-lg outline-none" placeholder="الدولة" />
              <input value={formData.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} className="rounded-3xl border border-white/10 bg-black/30 p-5 text-lg outline-none" placeholder="رقم واتساب" />

              <select value={formData.platform} onChange={(e) => updateField("platform", e.target.value)} className="rounded-3xl border border-white/10 bg-black/30 p-5 text-lg outline-none">
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>

              <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
                <label className="block text-lg font-bold text-white">خبرات سابقة</label>
                <p className="mt-2 text-base font-medium text-purple-200">
                  هل عملت على برامج أو وكالات أخرى سابقاً؟
                </p>
                <textarea
                  value={formData.previous_experience}
                  onChange={(e) => updateField("previous_experience", e.target.value)}
                  className="mt-4 min-h-28 w-full resize-none bg-transparent text-lg outline-none placeholder:text-white/35"
                  placeholder="اكتب خبراتك هنا..."
                />
              </div>

              <textarea value={formData.notes} onChange={(e) => updateField("notes", e.target.value)} className="min-h-32 rounded-3xl border border-white/10 bg-black/30 p-5 text-lg outline-none" placeholder="ملاحظات إضافية" />

              {message && (
                <div className={`rounded-2xl border p-5 text-center text-lg font-bold ${
                  success
                    ? "border-green-400/30 bg-green-500/10 text-green-200"
                    : "border-yellow-400/30 bg-yellow-500/10 text-yellow-100"
                }`}>
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-xl font-bold shadow-[0_0_40px_rgba(168,85,247,0.55)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "جاري الإرسال..." : "إرسال الطلب"}
              </button>
            </div>
          </form>
        </div>
      )}

      <footer className="border-t border-white/10 px-6 py-10 text-center text-white/60">
        Hamza Agency © 2026 — وكالة حمزة
      </footer>
    </main>
  );
}
