"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentAdminProfile, type AdminRole } from "@/lib/adminAccess";

type AdminIconName =
  | "home"
  | "users"
  | "document"
  | "service"
  | "star"
  | "mail"
  | "bell"
  | "briefcase"
  | "play"
  | "blog"
  | "pages"
  | "layers"
  | "media"
  | "gallery"
  | "megaphone"
  | "help"
  | "trophy"
  | "language"
  | "handshake"
  | "operations"
  | "chart"
  | "workspace"
  | "permissions"
  | "settings"
  | "book"
  | "support"
  | "sparkles"
  | "system"
  | "activity"
  | "backup"
  | "history"
  | "export"
  | "trash"
  | "visual"
  | "package"
  | "audit"
  | "launch";

type AdminLink = {
  label: string;
  description: string;
  href: string;
  icon: AdminIconName;
  superAdminOnly?: boolean;
};

type AdminGroup = {
  title: string;
  description: string;
  links: AdminLink[];
};

const adminGroups: AdminGroup[] = [
  {
    title: "العمل اليومي",
    description: "الطلبات والمتابعة اليومية التي تحتاج انتباه الفريق أولًا.",
    links: [
      { label: "الرئيسية", description: "ملخص سريع لما يحتاج انتباهك.", href: "/admin", icon: "home" },
      { label: "مركز جميع الطلبات", description: "عرض الطلبات المختلفة من مكان واحد.", href: "/admin/requests", icon: "document" },
      { label: "طلبات الانضمام", description: "مراجعة طلبات الانضمام وتحديث حالتها.", href: "/admin/applications", icon: "users" },
      { label: "طلبات الخدمات", description: "متابعة طلبات الخدمات وحالة التنفيذ.", href: "/admin/service-requests", icon: "service" },
      { label: "التقييمات", description: "مراجعة التقييمات وإدارتها.", href: "/admin/reviews", icon: "star" },
      { label: "رسائل التواصل", description: "قراءة رسائل الزوار ومتابعتها.", href: "/admin/contact", icon: "mail" },
      { label: "الإشعارات", description: "متابعة التنبيهات والأحداث المهمة.", href: "/admin/notifications", icon: "bell" },
      { label: "الوظائف", description: "إدارة الوظائف وطلبات التوظيف.", href: "/admin/jobs", icon: "briefcase" },
    ],
  },
  {
    title: "المحتوى",
    description: "المحتوى المنشور والوسائط والترجمات.",
    links: [
      { label: "البرامج", description: "إدارة البرامج وشروطها وصورها.", href: "/admin/programs", icon: "play" },
      { label: "المدونة", description: "إدارة المقالات والمسودات والنشر.", href: "/admin/blog", icon: "blog" },
      { label: "الصفحات", description: "إدارة الصفحات الأساسية وحالة نشرها.", href: "/admin/pages", icon: "pages" },
      { label: "الأقسام المنشورة", description: "تنظيم أقسام المحتوى وترتيبها.", href: "/admin/sections", icon: "layers" },
      { label: "منشئ الصفحات المتقدم", description: "بناء وترتيب أقسام الصفحات عند الحاجة.", href: "/admin/page-builder", icon: "layers" },
      { label: "الوسائط والصور", description: "رفع الوسائط وتنظيم استخدامها.", href: "/admin/media", icon: "media" },
      { label: "المعرض", description: "تنظيم الصور والمواد المعروضة.", href: "/admin/gallery", icon: "gallery" },
      { label: "الإعلانات", description: "إنشاء الإعلانات وترتيب ظهورها.", href: "/admin/announcements", icon: "megaphone" },
      { label: "الأسئلة الشائعة", description: "إدارة الأسئلة والإجابات المنشورة.", href: "/admin/faqs", icon: "help" },
      { label: "قصص النجاح", description: "إدارة قصص النجاح المعتمدة.", href: "/admin/success-stories", icon: "trophy" },
      { label: "مركز إدارة الترجمات", description: "إدارة ترجمات المحتوى.", href: "/admin/translations", icon: "language" },
      { label: "تغطية الترجمات", description: "معرفة ما ينقص كل لغة.", href: "/admin/translations/coverage", icon: "language" },
      { label: "مراجعة إصدارات الترجمة", description: "مقارنة تعديلات الترجمة ومراجعتها.", href: "/admin/translations/revisions", icon: "history" },
      { label: "مراجعة تفاصيل البرامج", description: "مراجعة ترجمات تفاصيل البرامج.", href: "/admin/translations/program-details", icon: "play" },
      { label: "المساعدة في الترجمة", description: "مراجعة اقتراحات الترجمة قبل اعتمادها.", href: "/admin/translations/automation", icon: "sparkles" },
    ],
  },
  {
    title: "الإدارة",
    description: "تشغيل الوكالة والعضويات والصلاحيات.",
    links: [
      { label: "الشركاء", description: "إدارة الشركاء وشعاراتهم وروابطهم.", href: "/admin/partners", icon: "handshake" },
      { label: "إدارة التشغيل", description: "متابعة المهام ومسارات العمل والحوادث.", href: "/admin/product-operations", icon: "operations" },
      { label: "التحليلات التشغيلية", description: "متابعة مؤشرات الطلبات والخدمات.", href: "/admin/analytics", icon: "chart" },
      { label: "حوكمة الوكالة ومساحات العمل", description: "إدارة مساحة العمل والخصائص الإدارية.", href: "/admin/product-expansion", icon: "workspace", superAdminOnly: true },
      { label: "الدعوات والعضويات", description: "إدارة الدعوات والأدوار وحالات العضوية.", href: "/admin/product-expansion/invitations", icon: "users", superAdminOnly: true },
      { label: "الصلاحيات", description: "مراجعة صلاحيات المديرين وإدارتها.", href: "/admin/permissions", icon: "permissions", superAdminOnly: true },
    ],
  },
  {
    title: "الإعدادات",
    description: "إعدادات الموقع والدعم والمعلومات المساعدة.",
    links: [
      { label: "إعدادات الموقع", description: "الهوية والتواصل والفوتر والألوان والوسائط.", href: "/admin/settings", icon: "settings" },
      { label: "إعدادات الصفحة الرئيسية", description: "إدارة محتوى وإحصاءات الصفحة الرئيسية.", href: "/admin/settings/homepage", icon: "settings" },
      { label: "قاعدة المعرفة", description: "إدارة الشروحات والإجابات المعتمدة.", href: "/admin/knowledge-base", icon: "book" },
      { label: "الدعم الذكي", description: "متابعة المحادثات والأسئلة والتحويلات.", href: "/admin/ai-support", icon: "support" },
      { label: "إعدادات الدعم الذكي", description: "ضبط سلوك الدعم ومصادر الإجابات.", href: "/admin/ai-settings", icon: "settings" },
      { label: "مساعد الإدارة", description: "عرض الملخصات الإدارية المتاحة.", href: "/admin/ai-copilot", icon: "sparkles" },
    ],
  },
  {
    title: "متقدم",
    description: "أدوات أقل استخدامًا أو مخصصة للمسؤول الأعلى.",
    links: [
      { label: "تحليلات المنتج المتقدمة", description: "مؤشرات تقنية وتشغيلية متقدمة.", href: "/admin/product-analytics", icon: "chart" },
      { label: "صحة النظام", description: "متابعة الاتصال والأخطاء التشغيلية.", href: "/admin/system-health", icon: "system", superAdminOnly: true },
      { label: "سجل النشاطات", description: "مراجعة العمليات والتغييرات المسجلة.", href: "/admin/activity-logs", icon: "activity", superAdminOnly: true },
      { label: "النسخ والاستعادة", description: "إدارة نطاقات النسخ والاستعادة.", href: "/admin/backups", icon: "backup", superAdminOnly: true },
      { label: "سجل الإصدارات", description: "عرض نسخ المحتوى السابقة واستعادتها.", href: "/admin/version-history", icon: "history" },
      { label: "مركز التصدير", description: "تجهيز ملفات التصدير المسموح بها.", href: "/admin/export-center", icon: "export" },
      { label: "سلة المحذوفات", description: "استعادة العناصر المحذوفة أو حذفها نهائيًا.", href: "/admin/trash", icon: "trash", superAdminOnly: true },
      { label: "التجربة البصرية", description: "إدارة التجارب المرئية قبل اعتمادها.", href: "/admin/visual-experience", icon: "visual", superAdminOnly: true },
      { label: "تجهيز نسخة وكالة مستقلة", description: "إعداد وتصدير هوية نسخة مستقلة.", href: "/admin/white-label", icon: "package", superAdminOnly: true },
      { label: "التدقيق المتقدم", description: "مراجعة التفاصيل التقنية والحقول الحساسة.", href: "/admin/audit-mode", icon: "audit", superAdminOnly: true },
      { label: "فحص الجاهزية", description: "فحص تقني قبل الإطلاق للمسؤول الأعلى.", href: "/admin/launch-checklist", icon: "launch", superAdminOnly: true },
    ],
  },
];

const publicPreviewLinks = [
  { label: "الرئيسية", href: "/" },
  { label: "من نحن", href: "/about" },
  { label: "البرامج", href: "/programs" },
  { label: "الخدمات", href: "/services" },
  { label: "الخدمات الرقمية", href: "/digital-services" },
  { label: "الوظائف", href: "/jobs" },
  { label: "قصص النجاح", href: "/success-stories" },
  { label: "الشركاء", href: "/partners" },
  { label: "المعرض", href: "/gallery" },
  { label: "مركز المعرفة", href: "/knowledge-center" },
  { label: "اتصل بنا", href: "/contact" },
];

const authPaths = new Set(["/admin/login", "/admin/forgot-password", "/admin/reset-password"]);

export default function AdminQuickNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [canShowNav, setCanShowNav] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

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
      adminGroups
        .map((group) => ({
          ...group,
          links: group.links.filter((link) => !link.superAdminOnly || role === "super_admin"),
        }))
        .filter((group) => group.links.length > 0),
    [role]
  );

  const activeHref = useMemo(() => {
    return (
      visibleGroups
        .flatMap((group) => group.links)
        .filter((link) =>
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href || pathname.startsWith(`${link.href}/`)
        )
        .sort((left, right) => right.href.length - left.href.length)[0]?.href ?? null
    );
  }, [pathname, visibleGroups]);

  if (!pathname.startsWith("/admin") || authPaths.has(pathname) || isCheckingAccess || !canShowNav) {
    return null;
  }

  const navContent = (
    <>
      <header className="border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-11 w-11 shrink-0 rounded-xl border border-purple-400/25 bg-black/30 bg-contain bg-center bg-no-repeat shadow-[0_0_28px_rgba(168,85,247,0.20)]"
            style={{ backgroundImage: 'url("/icons/icon.svg")' }}
          />
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-[0.08em] text-yellow-200">HAMZA AGENCY</p>
            <p className="mt-0.5 text-xs font-bold text-white/50">لوحة التحكم</p>
          </div>
        </div>
      </header>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="أقسام لوحة التحكم">
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <section key={group.title} aria-labelledby={`admin-group-${group.title}`}>
              <div className="mb-1.5 flex items-center gap-2 px-2">
                <span className="h-px flex-1 bg-gradient-to-l from-yellow-300/20 to-transparent" aria-hidden="true" />
                <h3 id={`admin-group-${group.title}`} className="shrink-0 text-[11px] font-black text-yellow-200/85">
                  {group.title}
                </h3>
              </div>
              <p className="sr-only">{group.description}</p>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const active = link.href === activeHref;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={active ? "page" : undefined}
                      title={link.description}
                      className={`group flex min-h-10 items-center gap-3 rounded-xl border px-3 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                        active
                          ? "border-purple-300/35 bg-purple-600 text-white shadow-[0_0_24px_rgba(124,58,237,0.22)]"
                          : "border-transparent text-white/72 hover:border-white/10 hover:bg-white/[0.045] hover:text-white"
                      }`}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${active ? "text-yellow-100" : "text-white/50 group-hover:text-purple-200"}`}>
                        <NavIcon name={link.icon} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

          <details className="border-t border-white/10 pt-4">
            <summary className="cursor-pointer list-none rounded-xl px-2 py-2 text-xs font-black text-yellow-100 transition hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-purple-300">
              معاينة الموقع
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {publicPreviewLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-10 rounded-xl border border-white/10 bg-white/[0.025] px-2 py-2 text-center text-[11px] font-bold text-white/65 transition hover:border-yellow-300/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </nav>
    </>
  );

  return (
    <>
      <aside
        className="fixed inset-y-0 right-0 z-[70] hidden w-[276px] flex-col border-l border-purple-400/15 bg-[#09000f]/98 shadow-[-18px_0_60px_rgba(20,7,30,0.34)] backdrop-blur-xl lg:flex"
        aria-label="التنقل الرئيسي للوحة التحكم"
      >
        {navContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            aria-label="إغلاق قائمة لوحة التحكم"
            onClick={() => setIsOpen(false)}
          />
          <aside
            id="admin-mobile-navigation"
            className="absolute inset-y-3 right-3 flex w-[min(340px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.5rem] border border-purple-400/25 bg-[#09000f] shadow-[0_0_70px_rgba(124,58,237,0.30)]"
            aria-label="قائمة لوحة التحكم على الجوال"
          >
            <div className="absolute left-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="إغلاق قائمة لوحة التحكم"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/50 text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-purple-300"
              >
                ×
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="admin-mobile-navigation"
        aria-label={isOpen ? "إغلاق قائمة لوحة التحكم" : "فتح قائمة لوحة التحكم"}
        className="fixed bottom-4 left-4 z-[95] inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full border border-purple-300/35 bg-purple-600 px-4 text-sm font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 lg:hidden"
      >
        <NavIcon name="pages" />
        <span>{isOpen ? "إغلاق" : "القائمة"}</span>
      </button>
    </>
  );
}

function NavIcon({ name }: { name: AdminIconName }) {
  const commonProps = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "home": return <svg {...commonProps}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M9.5 20v-5.5h5V20" /></svg>;
    case "users": return <svg {...commonProps}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.6-3.2 2.4-5 5.5-5s4.9 1.8 5.5 5" /><path d="M16 6.5a2.5 2.5 0 0 1 0 5" /><path d="M17 14c2.2.4 3.4 2 3.8 4.5" /></svg>;
    case "star": return <svg {...commonProps}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" /></svg>;
    case "mail": return <svg {...commonProps}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
    case "bell": return <svg {...commonProps}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 6 2 7H4c0-1 2-1 2-7" /><path d="M9.5 19a3 3 0 0 0 5 0" /></svg>;
    case "briefcase": return <svg {...commonProps}><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M9 7V5h6v2" /><path d="M3 12h18" /></svg>;
    case "play": return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4V8Z" /></svg>;
    case "pages":
    case "blog":
    case "document": return <svg {...commonProps}><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="M9 12h6M9 16h6" /></svg>;
    case "service": return <svg {...commonProps}><path d="M7 4h10v16H7z" /><path d="M10 8h4M10 12h4M10 16h2" /></svg>;
    case "layers": return <svg {...commonProps}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></svg>;
    case "media":
    case "gallery": return <svg {...commonProps}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m5 17 4-4 3 3 2-2 5 3" /></svg>;
    case "megaphone": return <svg {...commonProps}><path d="M4 13V9h4l9-4v12l-9-4H4Z" /><path d="m8 13 1.5 6h3" /><path d="M20 8v6" /></svg>;
    case "help": return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 1 1 3.2 2.4c-.8.3-.9.8-.9 1.6" /><path d="M12 17h.01" /></svg>;
    case "trophy": return <svg {...commonProps}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4" /><path d="M12 13v4M8 20h8M9 17h6" /></svg>;
    case "language": return <svg {...commonProps}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9S14.5 18.4 12 21M12 3c-2.5 2.6-3.7 5.6-3.7 9S9.5 18.4 12 21" /></svg>;
    case "handshake": return <svg {...commonProps}><path d="m3 12 4-4 4 2 2-2 4 1 4 4" /><path d="m7 15 3 3a2 2 0 0 0 3 0l5-5" /><path d="m3 9 3 3M21 10l-3 3" /></svg>;
    case "operations":
    case "activity": return <svg {...commonProps}><path d="M4 18V6M4 12h4l2-5 4 10 2-5h4" /></svg>;
    case "chart": return <svg {...commonProps}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
    case "workspace": return <svg {...commonProps}><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 5V3h8v2M8 10h8M8 14h5" /></svg>;
    case "permissions": return <svg {...commonProps}><path d="M12 3 5 6v5c0 4.6 2.5 7.8 7 10 4.5-2.2 7-5.4 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "settings": return <svg {...commonProps}><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>;
    case "book": return <svg {...commonProps}><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v17H7.5A3.5 3.5 0 0 0 4 22V5.5Z" /><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H13v17h3.5A3.5 3.5 0 0 1 20 22V5.5Z" /></svg>;
    case "support": return <svg {...commonProps}><path d="M4 13v-2a8 8 0 0 1 16 0v2" /><path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2ZM20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z" /><path d="M17 19c-.7 1.3-2 2-4 2" /></svg>;
    case "sparkles": return <svg {...commonProps}><path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3-3.3-1.2 3.3-1.2L12 3Z" /><path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" /><path d="m6 14 .7 1.8 1.8.7-1.8.7L6 19l-.7-1.8-1.8-.7 1.8-.7L6 14Z" /></svg>;
    case "system": return <svg {...commonProps}><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4M7 9h3l2-3 2 6 2-3h2" /></svg>;
    case "backup": return <svg {...commonProps}><path d="M5 17a5 5 0 0 1 1-9.9A7 7 0 0 1 19 9a4 4 0 0 1 0 8H5Z" /><path d="m9 13 3-3 3 3M12 10v9" /></svg>;
    case "history": return <svg {...commonProps}><path d="M4 5v5h5" /><path d="M5.5 9A8 8 0 1 1 6 17" /><path d="M12 8v4l3 2" /></svg>;
    case "export": return <svg {...commonProps}><path d="M12 3v12" /><path d="m8 7 4-4 4 4" /><path d="M5 12v8h14v-8" /></svg>;
    case "trash": return <svg {...commonProps}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>;
    case "visual": return <svg {...commonProps}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
    case "package": return <svg {...commonProps}><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg>;
    case "audit": return <svg {...commonProps}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4M8.5 11h5M11 8.5v5" /></svg>;
    case "launch": return <svg {...commonProps}><path d="M14 5c3-2 6-2 7-2 0 1 0 4-2 7l-6 6-5-5 6-6Z" /><path d="m8 11-4 1-2 4 6-1M13 16l-1 6 4-2 1-4" /><circle cx="16" cy="8" r="1" /></svg>;
    default: return <svg {...commonProps}><circle cx="12" cy="12" r="8" /></svg>;
  }
}
