"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentAdminProfile, type AdminRole } from "@/lib/adminAccess";

type AdminLink = {
  label: string;
  description: string;
  href: string;
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
    description: "ابدئي من هنا للطلبات والمتابعة اليومية.",
    links: [
      { label: "الرئيسية", description: "ملخص سريع لما يحتاج انتباهك.", href: "/admin" },
      { label: "مركز جميع الطلبات", description: "عرض الطلبات المختلفة من مكان واحد.", href: "/admin/requests" },
      { label: "طلبات الانضمام", description: "مراجعة طلبات الانضمام وتحديث حالتها.", href: "/admin/applications" },
      { label: "طلبات الخدمات", description: "متابعة طلبات الخدمات وحالة التنفيذ.", href: "/admin/service-requests" },
      { label: "التقييمات", description: "مراجعة التقييمات وإدارتها.", href: "/admin/reviews" },
      { label: "رسائل التواصل", description: "قراءة رسائل الزوار ومتابعتها.", href: "/admin/contact" },
      { label: "الإشعارات", description: "متابعة التنبيهات والأحداث المهمة.", href: "/admin/notifications" },
      { label: "الوظائف", description: "إدارة الوظائف وطلبات التوظيف.", href: "/admin/jobs" },
    ],
  },
  {
    title: "المحتوى",
    description: "كل ما يظهر للزائر ومحتوى اللغات المختلفة.",
    links: [
      { label: "البرامج", description: "إدارة البرامج وشروطها وصورها.", href: "/admin/programs" },
      { label: "المدونة", description: "إدارة المقالات والمسودات والنشر.", href: "/admin/blog" },
      { label: "الصفحات", description: "إدارة الصفحات الأساسية وحالة نشرها.", href: "/admin/pages" },
      { label: "الأقسام المنشورة", description: "تنظيم أقسام المحتوى وترتيبها.", href: "/admin/sections" },
      { label: "منشئ الصفحات المتقدم", description: "بناء وترتيب أقسام الصفحات عند الحاجة.", href: "/admin/page-builder" },
      { label: "الوسائط والصور", description: "رفع الوسائط وتنظيم استخدامها.", href: "/admin/media" },
      { label: "المعرض", description: "تنظيم الصور والمواد المعروضة.", href: "/admin/gallery" },
      { label: "الإعلانات", description: "إنشاء الإعلانات وترتيب ظهورها.", href: "/admin/announcements" },
      { label: "الأسئلة الشائعة", description: "إدارة الأسئلة والإجابات المنشورة.", href: "/admin/faqs" },
      { label: "قصص النجاح", description: "إدارة قصص النجاح المعتمدة.", href: "/admin/success-stories" },
      { label: "مركز إدارة الترجمات", description: "إدارة ترجمات المحتوى.", href: "/admin/translations" },
      { label: "تغطية الترجمات", description: "معرفة ما ينقص كل لغة.", href: "/admin/translations/coverage" },
      { label: "مراجعة إصدارات الترجمة", description: "مقارنة تعديلات الترجمة ومراجعتها.", href: "/admin/translations/revisions" },
      { label: "مراجعة تفاصيل البرامج", description: "مراجعة ترجمات تفاصيل البرامج.", href: "/admin/translations/program-details" },
      { label: "المساعدة في الترجمة", description: "مراجعة اقتراحات الترجمة قبل اعتمادها.", href: "/admin/translations/automation" },
    ],
  },
  {
    title: "الإدارة",
    description: "إدارة الوكالة والتشغيل والصلاحيات.",
    links: [
      { label: "الشركاء", description: "إدارة الشركاء وشعاراتهم وروابطهم.", href: "/admin/partners" },
      { label: "إدارة التشغيل", description: "متابعة المهام ومسارات العمل والحوادث.", href: "/admin/product-operations" },
      { label: "التحليلات التشغيلية", description: "متابعة مؤشرات الطلبات والخدمات.", href: "/admin/analytics" },
      { label: "حوكمة الوكالة ومساحات العمل", description: "إدارة مساحة العمل والخصائص الإدارية.", href: "/admin/product-expansion", superAdminOnly: true },
      { label: "الدعوات والعضويات", description: "إدارة الدعوات والأدوار وحالات العضوية.", href: "/admin/product-expansion/invitations", superAdminOnly: true },
      { label: "الصلاحيات", description: "مراجعة صلاحيات المديرين وإدارتها.", href: "/admin/permissions", superAdminOnly: true },
    ],
  },
  {
    title: "الإعدادات",
    description: "إعدادات الموقع والدعم والمعلومات المساعدة.",
    links: [
      { label: "إعدادات الموقع", description: "الهوية والتواصل والفوتر والألوان والوسائط.", href: "/admin/settings" },
      { label: "إعدادات الصفحة الرئيسية", description: "إدارة محتوى وإحصاءات الصفحة الرئيسية.", href: "/admin/settings/homepage" },
      { label: "قاعدة المعرفة", description: "إدارة الشروحات والإجابات المعتمدة.", href: "/admin/knowledge-base" },
      { label: "الدعم الذكي", description: "متابعة المحادثات والأسئلة والتحويلات.", href: "/admin/ai-support" },
      { label: "إعدادات الدعم الذكي", description: "ضبط سلوك الدعم ومصادر الإجابات.", href: "/admin/ai-settings" },
      { label: "مساعد الإدارة", description: "عرض الملخصات الإدارية المتاحة.", href: "/admin/ai-copilot" },
    ],
  },
  {
    title: "متقدم",
    description: "أدوات أقل استخدامًا أو مخصصة للمسؤول الأعلى.",
    links: [
      { label: "تحليلات المنتج المتقدمة", description: "مؤشرات تقنية وتشغيلية متقدمة.", href: "/admin/product-analytics" },
      { label: "صحة النظام", description: "متابعة الاتصال والأخطاء التشغيلية.", href: "/admin/system-health", superAdminOnly: true },
      { label: "سجل النشاطات", description: "مراجعة العمليات والتغييرات المسجلة.", href: "/admin/activity-logs", superAdminOnly: true },
      { label: "النسخ والاستعادة", description: "إدارة نطاقات النسخ والاستعادة.", href: "/admin/backups", superAdminOnly: true },
      { label: "سجل الإصدارات", description: "عرض نسخ المحتوى السابقة واستعادتها.", href: "/admin/version-history" },
      { label: "مركز التصدير", description: "تجهيز ملفات التصدير المسموح بها.", href: "/admin/export-center" },
      { label: "سلة المحذوفات", description: "استعادة العناصر المحذوفة أو حذفها نهائيًا.", href: "/admin/trash", superAdminOnly: true },
      { label: "التجربة البصرية", description: "إدارة التجارب المرئية قبل اعتمادها.", href: "/admin/visual-experience", superAdminOnly: true },
      { label: "تجهيز نسخة وكالة مستقلة", description: "إعداد وتصدير هوية نسخة مستقلة.", href: "/admin/white-label", superAdminOnly: true },
      { label: "التدقيق المتقدم", description: "مراجعة التفاصيل التقنية والحقول الحساسة.", href: "/admin/audit-mode", superAdminOnly: true },
      { label: "فحص الجاهزية", description: "فحص تقني قبل الإطلاق للمسؤول الأعلى.", href: "/admin/launch-checklist", superAdminOnly: true },
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
    () => adminGroups
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => !link.superAdminOnly || role === "super_admin"),
      }))
      .filter((group) => group.links.length > 0),
    [role]
  );

  const activeHref = useMemo(() => {
    return visibleGroups
      .flatMap((group) => group.links)
      .filter((link) => link.href === "/admin" ? pathname === "/admin" : pathname === link.href || pathname.startsWith(`${link.href}/`))
      .sort((left, right) => right.href.length - left.href.length)[0]?.href ?? null;
  }, [pathname, visibleGroups]);

  if (!pathname.startsWith("/admin") || authPaths.has(pathname) || isCheckingAccess || !canShowNav) return null;

  const navContent = (
    <>
      <header className="border-b border-white/10 px-4 pb-4 pt-5">
        <p className="text-xs font-black tracking-[0.2em] text-yellow-200">HAMZA AGENCY</p>
        <h2 className="mt-1 text-lg font-black text-white">لوحة التحكم</h2>
        <p className="mt-2 text-xs leading-6 text-white/55">اختاري القسم ثم المهمة التي تريدين تنفيذها.</p>
      </header>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="أقسام لوحة التحكم">
        {visibleGroups.map((group) => (
          <section key={group.title} aria-labelledby={`admin-group-${group.title}`}>
            <div className="mb-2 px-2">
              <h3 id={`admin-group-${group.title}`} className="text-xs font-black text-purple-200">{group.title}</h3>
              <p className="mt-1 text-[10px] leading-5 text-white/35">{group.description}</p>
            </div>
            <div className="space-y-1.5">
              {group.links.map((link) => {
                const active = link.href === activeHref;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`block min-h-11 rounded-xl border px-3 py-2.5 transition focus:outline-none focus:ring-2 focus:ring-purple-300 ${active ? "border-yellow-300/35 bg-yellow-400/10 text-yellow-50" : "border-transparent bg-white/[0.025] text-white/80 hover:border-purple-300/25 hover:bg-purple-500/10 hover:text-white"}`}
                  >
                    <span className="block text-sm font-black">{link.label}</span>
                    <span className="mt-1 hidden text-[10px] leading-5 text-white/40 xl:block">{link.description}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        <section className="border-t border-white/10 pt-4">
          <h3 className="px-2 text-xs font-black text-yellow-100">معاينة الموقع</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {publicPreviewLinks.map((link) => (
              <Link key={link.href} href={link.href} target="_blank" rel="noreferrer" className="min-h-10 rounded-xl border border-white/10 bg-white/[0.025] px-2 py-2 text-center text-[11px] font-bold text-white/65 transition hover:border-yellow-300/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-purple-300">
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </nav>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 right-0 z-[70] hidden w-[292px] flex-col border-l border-purple-400/15 bg-[#09000f]/97 shadow-[-20px_0_70px_rgba(42,10,70,0.22)] backdrop-blur-xl lg:flex" aria-label="التنقل الرئيسي للوحة التحكم">
        {navContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="إغلاق قائمة لوحة التحكم" onClick={() => setIsOpen(false)} />
          <aside id="admin-mobile-navigation" className="absolute inset-y-3 right-3 flex w-[min(340px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] border border-purple-400/25 bg-[#09000f] shadow-[0_0_70px_rgba(124,58,237,0.30)]" aria-label="قائمة لوحة التحكم على الجوال">
            <div className="absolute left-3 top-3 z-10">
              <button type="button" onClick={() => setIsOpen(false)} aria-label="إغلاق قائمة لوحة التحكم" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-purple-300">×</button>
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
        className="fixed bottom-4 left-4 z-[95] flex min-h-12 min-w-12 items-center justify-center rounded-full border border-purple-300/35 bg-purple-600 px-4 text-sm font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-300 lg:hidden"
      >
        {isOpen ? "إغلاق" : "القائمة"}
      </button>
    </>
  );
}
