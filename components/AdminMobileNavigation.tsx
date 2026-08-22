"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentAdminProfile, type AdminRole } from "@/lib/adminAccess";

type MobileAdminLink = {
  label: string;
  href: string;
  superAdminOnly?: boolean;
};

type MobileAdminGroup = {
  title: string;
  links: MobileAdminLink[];
};

const mobileAdminGroups: MobileAdminGroup[] = [
  {
    title: "العمل اليومي",
    links: [
      { label: "الرئيسية", href: "/admin" },
      { label: "مركز جميع الطلبات", href: "/admin/requests" },
      { label: "طلبات الانضمام", href: "/admin/applications" },
      { label: "طلبات الخدمات", href: "/admin/service-requests" },
      { label: "التقييمات", href: "/admin/reviews" },
      { label: "رسائل التواصل", href: "/admin/contact" },
      { label: "الإشعارات", href: "/admin/notifications" },
      { label: "الوظائف", href: "/admin/jobs" },
    ],
  },
  {
    title: "المحتوى",
    links: [
      { label: "البرامج", href: "/admin/programs" },
      { label: "المدونة", href: "/admin/blog" },
      { label: "الصفحات", href: "/admin/pages" },
      { label: "الأقسام المنشورة", href: "/admin/sections" },
      { label: "منشئ الصفحات المتقدم", href: "/admin/page-builder" },
      { label: "الوسائط والصور", href: "/admin/media" },
      { label: "المعرض", href: "/admin/gallery" },
      { label: "الإعلانات", href: "/admin/announcements" },
      { label: "الأسئلة الشائعة", href: "/admin/faqs" },
      { label: "قصص النجاح", href: "/admin/success-stories" },
      { label: "مركز إدارة الترجمات", href: "/admin/translations" },
      { label: "تغطية الترجمات", href: "/admin/translations/coverage" },
      { label: "مراجعة إصدارات الترجمة", href: "/admin/translations/revisions" },
      { label: "مراجعة تفاصيل البرامج", href: "/admin/translations/program-details" },
      { label: "المساعدة في الترجمة", href: "/admin/translations/automation" },
    ],
  },
  {
    title: "الإدارة",
    links: [
      { label: "الشركاء", href: "/admin/partners" },
      { label: "إدارة التشغيل", href: "/admin/product-operations" },
      { label: "التحليلات التشغيلية", href: "/admin/analytics" },
      { label: "حوكمة الوكالة ومساحات العمل", href: "/admin/product-expansion", superAdminOnly: true },
      { label: "الدعوات والعضويات", href: "/admin/product-expansion/invitations", superAdminOnly: true },
      { label: "الصلاحيات", href: "/admin/permissions", superAdminOnly: true },
    ],
  },
  {
    title: "الإعدادات",
    links: [
      { label: "إعدادات الموقع", href: "/admin/settings" },
      { label: "إعدادات الصفحة الرئيسية", href: "/admin/settings/homepage" },
      { label: "قاعدة المعرفة", href: "/admin/knowledge-base" },
      { label: "الدعم الذكي", href: "/admin/ai-support" },
      { label: "إعدادات الدعم الذكي", href: "/admin/ai-settings" },
      { label: "مساعد الإدارة", href: "/admin/ai-copilot" },
    ],
  },
  {
    title: "متقدم",
    links: [
      { label: "تحليلات المنتج المتقدمة", href: "/admin/product-analytics" },
      { label: "صحة النظام", href: "/admin/system-health", superAdminOnly: true },
      { label: "سجل النشاطات", href: "/admin/activity-logs", superAdminOnly: true },
      { label: "النسخ والاستعادة", href: "/admin/backups", superAdminOnly: true },
      { label: "سجل الإصدارات", href: "/admin/version-history" },
      { label: "مركز التصدير", href: "/admin/export-center" },
      { label: "سلة المحذوفات", href: "/admin/trash", superAdminOnly: true },
      { label: "التجربة البصرية", href: "/admin/visual-experience", superAdminOnly: true },
      { label: "تجهيز نسخة وكالة مستقلة", href: "/admin/white-label", superAdminOnly: true },
      { label: "التدقيق المتقدم", href: "/admin/audit-mode", superAdminOnly: true },
      { label: "فحص الجاهزية", href: "/admin/launch-checklist", superAdminOnly: true },
    ],
  },
];

const authPaths = new Set(["/admin/login", "/admin/forgot-password", "/admin/reset-password"]);

export default function AdminMobileNavigation() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [canShowNav, setCanShowNav] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "العمل اليومي": true,
  });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAccess() {
      setIsOpen(false);
      if (!pathname.startsWith("/admin") || authPaths.has(pathname)) {
        if (isMounted) {
          setCanShowNav(false);
          setRole(null);
          setIsCheckingAccess(false);
        }
        return;
      }

      setIsCheckingAccess(true);
      const access = await getCurrentAdminProfile();
      if (!isMounted) return;
      setCanShowNav(access.isAuthorized && Boolean(access.profile));
      setRole(access.profile?.role ?? null);
      setIsCheckingAccess(false);
    }

    void checkAccess();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const visibleGroups = useMemo(
    () =>
      mobileAdminGroups
        .map((group) => ({
          ...group,
          links: group.links.filter((link) => !link.superAdminOnly || role === "super_admin"),
        }))
        .filter((group) => group.links.length > 0),
    [role]
  );

  const activeHref = useMemo(
    () =>
      visibleGroups
        .flatMap((group) => group.links)
        .filter((link) =>
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href || pathname.startsWith(`${link.href}/`)
        )
        .sort((left, right) => right.href.length - left.href.length)[0]?.href ?? null,
    [pathname, visibleGroups]
  );

  const activeGroupTitle = useMemo(
    () => visibleGroups.find((group) => group.links.some((link) => link.href === activeHref))?.title ?? null,
    [activeHref, visibleGroups]
  );

  useEffect(() => {
    if (!activeGroupTitle) return;
    setExpandedGroups((current) =>
      current[activeGroupTitle] ? current : { ...current, [activeGroupTitle]: true }
    );
  }, [activeGroupTitle]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  if (!pathname.startsWith("/admin") || authPaths.has(pathname) || isCheckingAccess || !canShowNav) {
    return null;
  }

  function closeDrawer(returnFocus = true) {
    setIsOpen(false);
    if (returnFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <div className="lg:hidden" data-testid="admin-mobile-navigation-shell">
      <div
        className="relative z-[75] flex min-h-14 items-center justify-between gap-3 border-b border-purple-400/15 bg-[#09000f]/98 px-3 py-2 shadow-[0_12px_34px_rgba(10,2,16,0.24)]"
        data-testid="admin-mobile-bar"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-black tracking-[0.06em] text-yellow-200">HAMZA AGENCY</p>
          <p className="text-[11px] font-bold text-white/45">لوحة التحكم</p>
        </div>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(true)}
          aria-expanded={isOpen}
          aria-controls="admin-mobile-drawer"
          aria-label="فتح قائمة لوحة التحكم"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-purple-300/30 bg-purple-600 px-3 text-sm font-black text-white shadow-[0_0_24px_rgba(124,58,237,0.20)] transition hover:bg-purple-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
          data-testid="admin-mobile-menu-trigger"
        >
          <MenuIcon />
          <span>القائمة</span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[190]" data-testid="admin-mobile-drawer-overlay">
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            aria-label="إغلاق قائمة لوحة التحكم"
            onClick={() => closeDrawer()}
          />
          <aside
            id="admin-mobile-drawer"
            data-testid="admin-mobile-drawer"
            className="absolute inset-y-3 right-3 flex w-[min(340px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.5rem] border border-purple-400/25 bg-[#09000f] shadow-[0_0_70px_rgba(124,58,237,0.30)]"
            aria-label="قائمة لوحة التحكم على الجوال"
          >
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-[0.06em] text-yellow-200">HAMZA AGENCY</p>
                <p className="mt-0.5 text-[11px] font-bold text-white/45">التنقل الإداري</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => closeDrawer()}
                aria-label="إغلاق قائمة لوحة التحكم"
                data-testid="admin-mobile-drawer-close"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.035] text-xl font-black text-white transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200"
              >
                ×
              </button>
            </header>

            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-3" aria-label="أقسام لوحة التحكم على الجوال">
              <div className="space-y-2.5">
                {visibleGroups.map((group, index) => {
                  const expanded = expandedGroups[group.title] ?? false;
                  const panelId = `admin-mobile-group-${index}`;
                  const buttonId = `${panelId}-button`;
                  const hasActiveRoute = group.links.some((link) => link.href === activeHref);

                  return (
                    <section
                      key={group.title}
                      className={`overflow-hidden rounded-xl border ${
                        hasActiveRoute ? "border-purple-400/25 bg-purple-500/[0.045]" : "border-white/[0.07] bg-white/[0.02]"
                      }`}
                    >
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() =>
                          setExpandedGroups((current) => ({
                            ...current,
                            [group.title]: !expanded,
                          }))
                        }
                        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2.5 text-right text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-200"
                        data-testid={`admin-mobile-group-toggle-${index}`}
                      >
                        <span className="min-w-0 truncate">{group.title}</span>
                        <span
                          aria-hidden="true"
                          className={`shrink-0 text-xs text-purple-200 transition-transform ${expanded ? "rotate-180" : ""}`}
                        >
                          ⌄
                        </span>
                      </button>
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        hidden={!expanded}
                        className="border-t border-white/[0.06] px-2 pb-2 pt-1.5"
                      >
                        <div className="space-y-1">
                          {group.links.map((link) => {
                            const active = link.href === activeHref;
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => closeDrawer(false)}
                                aria-current={active ? "page" : undefined}
                                className={`flex min-h-11 items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200 ${
                                  active
                                    ? "border-purple-300/30 bg-purple-600 text-white"
                                    : "border-transparent text-white/70 hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
                                }`}
                              >
                                <span
                                  aria-hidden="true"
                                  className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-yellow-200" : "bg-purple-300/45"}`}
                                />
                                <span className="min-w-0 flex-1">{link.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}
