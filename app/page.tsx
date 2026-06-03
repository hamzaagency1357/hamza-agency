"use client";

import { useEffect, useState } from "react";

const platforms = ["TikTok", "BIGO LIVE", "Yaahlan", "Xena", "Catchii"];

const benefits = [
  "إدارة احترافية لصناع المحتوى",
  "متابعة يومية وتوجيه مستمر",
  "دعم في مشاكل المنصات والبث",
  "فرص نمو وأرباح أفضل",
];

export default function HomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050008] text-white">
      {showSplash && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[#050008]">
          <div className="absolute h-72 w-72 rounded-full bg-purple-600/30 blur-3xl" />
          <div className="absolute h-52 w-52 rounded-full bg-yellow-400/20 blur-3xl" />
          <img
            src="/Logo%20hamza%20agency.jpg"
            alt="Hamza Agency"
            className="relative h-48 w-48 animate-pulse rounded-[2rem] object-cover shadow-[0_0_90px_rgba(168,85,247,0.65)]"
          />
        </div>
      )}

      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#7c2cff66,transparent_35%),radial-gradient(circle_at_bottom,#d4af3740,transparent_30%)]" />
        <div className="absolute inset-0 bg-black/45" />

        <nav className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img
              src="/Logo%20hamza%20agency.jpg"
              alt="Hamza Agency"
              className="h-12 w-12 rounded-xl object-cover shadow-[0_0_25px_rgba(168,85,247,0.45)]"
            />
            <div>
              <div className="text-sm font-bold text-white">HAMZA AGENCY</div>
              <div className="text-xs text-yellow-200/80">وكالة حمزة</div>
            </div>
          </div>
        </nav>

        <div className="relative z-10 max-w-5xl pt-24">
          <img
            src="/Logo%20hamza%20agency.jpg"
            alt="Hamza Agency Logo"
            className="mx-auto mb-8 h-44 w-44 rounded-[2rem] object-cover shadow-[0_0_80px_rgba(168,85,247,0.45)]"
          />

          <div className="mb-6 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm text-purple-100 backdrop-blur">
            وكالة رقمية فاخرة لصناع المحتوى
          </div>

          <h1 className="text-5xl font-black leading-tight md:text-7xl">
            وكالة حمزة لإدارة وتطوير
            <span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(168,85,247,0.35)]">
              صناع المحتوى
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/85 md:text-2xl">
            نساعد المبدعين على النمو وتحقيق الأرباح على منصات البث المباشر
            والتواصل الاجتماعي من خلال إدارة احترافية، دعم يومي، وفرص حقيقية
            للتطور.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => setShowJoinForm(true)}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 text-lg font-bold shadow-[0_0_40px_rgba(168,85,247,0.55)] transition hover:scale-105"
            >
              انضم الآن
            </button>

            <a
              href="https://wa.me/905011730377"
              className="rounded-full border border-yellow-300/30 px-8 py-4 text-lg font-bold text-yellow-100 hover:bg-yellow-300/10"
            >
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["+500", "صانع محتوى"],
            ["+5", "منصات متاحة"],
            ["24/7", "دعم ومتابعة"],
            ["+50", "فرصة نجاح شهرية"],
          ].map(([number, label]) => (
            <div
              key={label}
              className="rounded-3xl border border-white/10 bg-white/[0.05] p-7 text-center backdrop-blur transition hover:scale-105 hover:border-purple-400/40"
            >
              <div className="bg-gradient-to-r from-purple-300 to-yellow-300 bg-clip-text text-4xl font-black text-transparent">
                {number}
              </div>
              <div className="mt-3 text-white/75">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-4xl font-black">
            البرامج المتوفرة حالياً
          </h2>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {platforms.map((platform) => (
              <div
                key={platform}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_0_30px_rgba(124,44,255,0.12)] backdrop-blur transition hover:-translate-y-2 hover:border-yellow-300/30 hover:shadow-[0_0_45px_rgba(212,175,55,0.2)]"
              >
                <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-yellow-400" />
                <h3 className="text-xl font-bold">{platform}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-[36px] border border-white/10 bg-gradient-to-br from-white/[0.07] to-purple-500/[0.08] p-8 md:p-12">
          <h2 className="text-4xl font-black">لماذا وكالة حمزة؟</h2>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-2xl border border-white/10 bg-black/30 p-6 text-lg text-white/85 transition hover:bg-purple-500/10"
              >
                ✦ {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <a
        href="https://wa.me/905011730377"
        className="fixed bottom-6 left-6 z-50 rounded-full bg-green-500 px-5 py-3 font-bold text-white shadow-lg transition hover:scale-105"
      >
        واتساب
      </a>

      {showJoinForm && (
        <div className="fixed inset-0 z-[998] flex items-center justify-center bg-black/75 px-4 backdrop-blur">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#100018] p-6 shadow-[0_0_80px_rgba(168,85,247,0.35)]">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black">طلب الانضمام للوكالة</h2>
              <button
                onClick={() => setShowJoinForm(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-white/70"
              >
                إغلاق
              </button>
            </div>

            <div className="grid gap-4">
              <input className="rounded-2xl border border-white/10 bg-black/30 p-4 outline-none" placeholder="الاسم الثلاثي" />
              <input className="rounded-2xl border border-white/10 bg-black/30 p-4 outline-none" placeholder="الدولة" />
              <input className="rounded-2xl border border-white/10 bg-black/30 p-4 outline-none" placeholder="رقم واتساب" />

              <select className="rounded-2xl border border-white/10 bg-black/30 p-4 outline-none">
                <option>اختر المنصة</option>
                {platforms.map((platform) => (
                  <option key={platform}>{platform}</option>
                ))}
              </select>

              <div>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-4 outline-none"
                  placeholder="خبرات سابقة"
                />
                <p className="mt-2 text-sm text-white/50">
                  هل عملت على برامج أخرى سابقاً؟
                </p>
              </div>

              <textarea
                className="min-h-28 rounded-2xl border border-white/10 bg-black/30 p-4 outline-none"
                placeholder="ملاحظات إضافية"
              />

              <button className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 text-lg font-bold">
                إرسال الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-white/10 px-6 py-10 text-center text-white/60">
        Hamza Agency © 2026 — وكالة حمزة
      </footer>
    </main>
  );
}
