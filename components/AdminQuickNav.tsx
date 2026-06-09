"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentAdminProfile } from "@/lib/adminAccess";

const adminLinks = [
  { label: "الرئيسية", href: "/admin" },
  { label: "طلبات الخدمات", href: "/admin/service-requests" },
  { label: "البرامج", href: "/admin/programs" },
  { label: "الصفحات", href: "/admin/pages" },
  { label: "الوسائط", href: "/admin/media" },
  { label: "الإعلانات", href: "/admin/announcements" },
  { label: "الإعدادات", href: "/admin/settings" },
  { label: "الوظائف", href: "/admin/jobs" },
  { label: "التقييمات", href: "/admin/reviews" },
  { label: "قصص النجاح", href: "/admin/success-stories" },
  { label: "الشركاء", href: "/admin/partners" },
  { label: "المعرض", href: "/admin/gallery" },
  { label: "سجل النشاطات", href: "/admin/activity-logs" },
  { label: "سلة المحذوفات", href: "/admin/trash" },
  { label: "النسخ الاحتياطي", href: "/admin/backups" },
  { label: "سجل الإصدارات", href: "/admin/version-history" },
  { label: "الصلاحيات", href: "/admin/permissions" },
  { label: "الإشعارات", href: "/admin/notifications" },
  { label: "التحليلات", href: "/admin/analytics" },
  { label: "فحص الإطلاق", href: "/admin/launch-checklist" },
];

export default function AdminQuickNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [canShowNav, setCanShowNav] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      setIsOpen(false);

      if (pathname === "/admin/login") {
        if (isMounted) {
          setCanShowNav(false);
          setIsCheckingAccess(false);
        }
        return;
      }

      if (isMounted) {
        setIsCheckingAccess(true);
        setCanShowNav(false);
      }

      const access = await getCurrentAdminProfile();

      if (!isMounted) return;

      setCanShowNav(access.isAuthorized && Boolean(access.profile));
      setIsCheckingAccess(false);
    }

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  if (pathname === "/admin/login" || isCheckingAccess || !canShowNav) return null;

  return (
    <div dir="rtl" className="fixed bottom-20 left-3 z-[80] print:hidden md:bottom-4 md:left-4">
      {isOpen && (
        <div className="mb-3 max-h-[70vh] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-purple-400/25 bg-[#09000f]/95 p-3 shadow-[0_0_70px_rgba(124,58,237,0.35)] backdrop-blur-xl">
          <div className="mb-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
              HAMZA AGENCY
            </div>
            <div className="mt-1 text-sm font-black text-white">
              تنقل سريع للإدارة
            </div>
          </div>

          <nav className="grid gap-2">
            {adminLinks.map((link) => {
              const active =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(link.href);

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
        aria-label={isOpen ? "إغلاق التنقل الإداري" : "فتح التنقل الإداري"}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-300/35 bg-purple-600 text-lg font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition hover:bg-purple-500 md:h-auto md:w-auto md:px-5 md:py-3 md:text-sm"
      >
        <span className="md:hidden">{isOpen ? "×" : "☰"}</span>
        <span className="hidden md:inline">{isOpen ? "إغلاق التنقل" : "تنقل الإدارة"}</span>
      </button>
    </div>
  );
}
