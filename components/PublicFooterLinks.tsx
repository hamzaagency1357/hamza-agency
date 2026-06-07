"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mainLinks = [
  { label: "البرامج", href: "/programs" },
  { label: "من نحن", href: "/about" },
  { label: "الخدمات", href: "/services" },
  { label: "الخدمات الرقمية", href: "/digital-services" },
  { label: "طلب خدمة", href: "/service-request" },
  { label: "الوظائف", href: "/jobs" },
  { label: "التقييمات", href: "/reviews" },
  { label: "قصص النجاح", href: "/success-stories" },
  { label: "شركاؤنا وبرامجنا", href: "/partners" },
  { label: "المعرض", href: "/gallery" },
  { label: "مركز المعرفة", href: "/knowledge-center" },
  { label: "FAQ", href: "/faq" },
  { label: "اتصل بنا", href: "/contact" },
];

const legalLinks = [
  { label: "سياسة الخصوصية", href: "/privacy-policy" },
  { label: "الشروط والأحكام", href: "/terms-and-conditions" },
  { label: "AI Policy", href: "/ai-policy" },
];

export default function PublicFooterLinks() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <footer
      dir="rtl"
      className="border-t border-purple-400/15 bg-[#050008] px-5 py-10 text-white"
    >
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-[0_0_70px_rgba(124,58,237,0.12)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-200">
                HAMZA AGENCY
              </p>
              <h2 className="mt-3 text-2xl font-black">وكالة حمزة</h2>
              <p className="mt-3 text-sm leading-7 text-white/55">
                روابط سريعة للوصول إلى الصفحات الأساسية والخدمات والبرامج.
              </p>
            </div>

            <a
              href="https://wa.me/905011730377"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-green-500 px-6 py-3 text-sm font-black text-white shadow-[0_0_28px_rgba(34,197,94,0.22)]"
            >
              تواصل واتساب
            </a>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-bold text-white/75 transition hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5 text-xs text-white/45">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-yellow-100"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
