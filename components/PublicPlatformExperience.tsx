"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const platformCards = [
  {
    title: "إدارة البرامج",
    description: "برامج الوكالة، شروط القبول، التحديثات، ومحتوى كل برنامج من مكان واحد.",
    href: "/programs",
    accent: "from-purple-500/28 to-fuchsia-500/12",
  },
  {
    title: "طلبات الانضمام",
    description: "استقبال المتقدمين وتنظيم الحالات والملاحظات الداخلية داخل لوحة الإدارة.",
    href: "/programs",
    accent: "from-blue-500/24 to-cyan-500/12",
  },
  {
    title: "الخدمات الرقمية",
    description: "طلبات الخدمات والشحن والسحب والمتابعة عبر نموذج واضح وواتساب.",
    href: "/service-request",
    accent: "from-green-500/24 to-emerald-500/12",
  },
  {
    title: "المحتوى والثقة",
    description: "تقييمات، قصص نجاح، شركاء، معرض، ومركز معرفة لدعم ثقة الزائر.",
    href: "/reviews",
    accent: "from-yellow-500/22 to-orange-500/10",
  },
  {
    title: "فرص العمل",
    description: "وظائف وأسئلة تقديم مخصصة لإدارة فرص الوكالة وفريق العمل.",
    href: "/jobs",
    accent: "from-pink-500/22 to-purple-500/12",
  },
  {
    title: "دعم وتشغيل",
    description: "مسارات واضحة للتواصل، المتابعة، وفحص الإطلاق قبل تشغيل الدومين الرسمي.",
    href: "/contact",
    accent: "from-cyan-500/22 to-indigo-500/12",
  },
];

export default function PublicPlatformExperience() {
  const pathname = usePathname();

  if (pathname !== "/") return null;

  return (
    <section
      dir="rtl"
      className="relative overflow-hidden px-5 py-16 text-white md:py-20"
      aria-label="منصة وكالة حمزة"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.32),transparent_34%),linear-gradient(180deg,rgba(24,8,42,0.55),rgba(5,0,8,0.1))]" />
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.38em] text-yellow-200">
              AGENCY MANAGEMENT PLATFORM
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
              ليست صفحة تعريفية فقط، بل منصة تشغيل للوكالة
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-9 text-white/68">
              وكالة حمزة تجمع الواجهة العامة، طلبات الانضمام، الخدمات الرقمية، المحتوى،
              والتشغيل الإداري في نظام واحد قابل للتوسع والإدارة.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/programs"
                className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-500 px-7 py-4 text-center font-black shadow-[0_0_38px_rgba(168,85,247,0.28)]"
              >
                عرض البرامج
              </Link>
              <Link
                href="/service-request"
                className="rounded-full border border-yellow-300/25 bg-yellow-400/10 px-7 py-4 text-center font-black text-yellow-100"
              >
                طلب خدمة رقمية
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {platformCards.map((card, index) => (
              <Link
                key={card.title}
                href={card.href}
                className={`group relative min-h-[170px] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br ${card.accent} p-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)] backdrop-blur transition hover:border-yellow-200/35`}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="absolute -left-10 -top-10 h-28 w-28 animate-[hamzaCardFloat_6s_ease-in-out_infinite] rounded-3xl bg-white/10 blur-xl" />
                <div className="absolute bottom-4 left-5 h-3 w-3 animate-[hamzaCardPulse_2.8s_ease-in-out_infinite] rounded-full bg-yellow-200/70" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-white/12 bg-black/18 px-3 py-1 text-xs font-black text-white/68">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-2xl font-black text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/62">{card.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
