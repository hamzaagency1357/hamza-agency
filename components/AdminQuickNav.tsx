"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentAdminProfile } from "@/lib/adminAccess";

const adminLinks = [
  { label: "الرئيسية", href: "/admin" },
  { label: "طلبات الانضمام", href: "/admin/applications" },
  { label: "طلبات الخدمات", href: "/admin/service-requests" },
  { label: "البرامج", href: "/admin/programs" },
  { label: "الصفحات", href: "/admin/pages" },
  { label: "الأقسام", href: "/admin/sections" },
  { label: "الأسئلة الشائعة", href: "/admin/faqs" },
  { label: "الوسائط", href: "/admin/media" },
  { label: "الإعلانات", href: "/admin/announcements" },
  { label: "الإعدادات", href: "/admin/settings" },
  { label: "إعدادات الصفحة الرئيسية", href: "/admin/settings/homepage" },
  { label: "الترجمات", href: "/admin/translations" },
  { label: "White Label", href: "/admin/white-label" },
  { label: "منشئ الصفحات", href: "/admin/page-builder" },
  { label: "التجربة البصرية", href: "/admin/visual-experience" },
  { label: "الوظائف", href: "/admin/jobs" },
  { label: "التقييمات", href: "/admin/reviews" },
  { label: "قصص النجاح", href: "/admin/success-stories" },
  { label: "الشركاء", href: "/admin/partners" },
  { label: "المعرض", href: "/admin/gallery" },
  { label: "سجل النشاطات", href: "/admin/activity-logs" },
  { label: "سلة المحذوفات", href: "/admin/trash" },
  { label: "النسخ الاحتياطي", href: "/admin/backups" },
  { label: "سجل الإصدارات", href: "/admin/version-history" },
  { label: "مركز التصدير", href: "/admin/export-center" },
  { label: "وضع التدقيق", href: "/admin/audit-mode" },
  { label: "قاعدة المعرفة", href: "/admin/knowledge-base" },
  { label: "الدعم الذكي", href: "/admin/ai-support" },
  { label: "إعدادات الدعم الذكي", href: "/admin/ai-settings" },
  { label: "الصلاحيات", href: "/admin/permissions" },
  { label: "الإشعارات", href: "/admin/notifications" },
  { label: "التحليلات", href: "/admin/analytics" },
  { label: "فحص الإطلاق", href: "/admin/launch-checklist" },
];

const publicPreviewLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "البرامج", href: "/programs" },
  { label: "TikTok", href: "/programs/tiktok" },
  { label: "BIGO LIVE", href: "/programs/bigo-live" },
  { label: "Yaahlan", href: "/programs/yaahlan" },
  { label: "Xena", href: "/programs/xena" },
  { label: "Catchii", href: "/programs/catchii" },
  { label: "من نحن", href: "/about" },
  { label: "الخدمات", href: "/services" },
  { label: "الخدمات الرقمية", href: "/digital-services" },
  { label: "طلب خدمة", href: "/service-request" },
  { label: "تتبع طلب خدمة", href: "/service-status" },
  { label: "تتبع طلب الانضمام", href: "/application-status" },
  { label: "الوظائف", href: "/jobs" },
  { label: "التقييمات", href: "/reviews" },
  { label: "قصص النجاح", href: "/success-stories" },
  { label: "الشركاء", href: "/partners" },
  { label: "المعرض", href: "/gallery" },
  { label: "مركز المعرفة", href: "/knowledge-center" },
  { label: "الأسئلة الشائعة", href: "/faq" },
  { label: "الدعم الذكي", href: "/ai-support" },
  { label: "اتصل بنا", href: "/contact" },
  { label: "سياسة الخصوصية", href: "/privacy-policy" },
  { label: "الشروط والأحكام", href: "/terms-and-conditions" },
  { label: "سياسة الذكاء الاصطناعي", href: "/ai-policy" },
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

      if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
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

  if (!pathname.startsWith("/admin") || pathname === "/admin/login" || isCheckingAccess || !canShowNav) return null;

  return (
    <div dir="rtl" className="fixed bottom-20 left-3 z-[80] print:hidden md:bottom-4 md:left-4">
      {isOpen && (
        <div className="mb-3 max-h-[70vh] w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-purple-400/25 bg-[#09000f]/95 p-3 shadow-[0_0_70px_rgba(124,58,237,0.35)] backdrop-blur-xl">
          <div className="mb-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
              HAMZA AGENCY
            </div>
            <div className="mt-1 text-sm font-black text-white">
              تنقل الإدارة والموقع
            </div>
            <p className="mt-2 text-xs leading-6 text-white/55">
              يظهر هذا التنقل داخل لوحة الإدارة فقط، مع روابط معاينة لصفحات الموقع العامة.
            </p>
          </div>

          <div className="mb-2 rounded-2xl border border-purple-400/15 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-100">
            لوحة التحكم
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

          <div className="mb-2 mt-4 rounded-2xl border border-yellow-400/15 bg-yellow-500/10 px-3 py-2 text-xs font-black text-yellow-100">
            معاينة صفحات الموقع
          </div>
          <nav className="grid gap-2">
            {publicPreviewLinks.map((link) => {
              const active =
                link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  onClick={() => setIsOpen(false)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                    active
                      ? "border-yellow-300/35 bg-yellow-400/15 text-yellow-100"
                      : "border-white/10 bg-white/[0.04] text-white/75 hover:border-yellow-300/45 hover:bg-yellow-500/10 hover:text-white"
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
        aria-label={isOpen ? "إغلاق تنقل الإدارة والموقع" : "فتح تنقل الإدارة والموقع"}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-300/35 bg-purple-600 text-lg font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition hover:bg-purple-500 md:h-auto md:w-auto md:px-5 md:py-3 md:text-sm"
      >
        <span className="md:hidden">{isOpen ? "×" : "☰"}</span>
        <span className="hidden md:inline">{isOpen ? "إغلاق الربط" : "الإدارة والموقع"}</span>
      </button>
    </div>
  );
}
