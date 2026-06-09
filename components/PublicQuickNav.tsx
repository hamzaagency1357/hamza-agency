"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const publicLinks = [
  { label: "الرئيسية", href: "/" },
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

export default function PublicQuickNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsOpen(false);
    setIsVisible(false);

    if (pathname.startsWith("/admin") || pathname === "/maintenance") return;

    const delay = pathname === "/" ? 3600 : 600;
    const timer = window.setTimeout(() => setIsVisible(true), delay);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  if (pathname.startsWith("/admin") || pathname === "/maintenance" || !isVisible) return null;

  return (
    <div dir="rtl" className="fixed bottom-4 right-4 z-[35] print:hidden">
      {isOpen && (
        <div className="mb-3 max-h-[70vh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-purple-400/25 bg-[#09000f]/95 p-3 shadow-[0_0_70px_rgba(124,58,237,0.35)] backdrop-blur-xl">
          <div className="mb-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
              HAMZA AGENCY
            </div>
            <div className="mt-1 text-sm font-black text-white">
              صفحات الموقع
            </div>
          </div>

          <nav className="grid gap-2">
            {publicLinks.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    active
                      ? "border-yellow-300/35 bg-yellow-400/15 text-yellow-100"
                      : "border-white/10 bg-white/[0.04] text-white/75 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-white"
                  }`}
                >
                  <span className="block">{link.label}</span>
                  <span className="mt-1 block text-[11px] font-normal text-white/38" dir="ltr">
                    {link.href}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-full border border-yellow-300/35 bg-[#12051f]/95 px-5 py-3 text-sm font-black text-yellow-100 shadow-[0_0_35px_rgba(234,179,8,0.18)] transition hover:bg-purple-900/90"
      >
        {isOpen ? "إغلاق الصفحات" : "صفحات الموقع"}
      </button>
    </div>
  );
}
