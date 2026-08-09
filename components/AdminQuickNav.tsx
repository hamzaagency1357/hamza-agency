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
  accent: string;
  links: AdminLink[];
};

const adminGroups: AdminGroup[] = [
  {
    title: "العمل اليومي والطلبات",
    description: "استقبال الطلبات ومراجعتها ومتابعة التواصل مع أصحابها.",
    accent: "border-sky-400/25 bg-sky-400/10 text-sky-100",
    links: [
      { label: "الرئيسية", description: "ملخص سريع لأهم الأعمال والتنبيهات.", href: "/admin" },
      { label: "مركز جميع الطلبات", description: "طلبات الانضمام والخدمات والوظائف ورسائل التواصل في مكان واحد.", href: "/admin/requests" },
      { label: "طلبات الانضمام", description: "مراجعة طلبات الانضمام وتحديث حالتها والتواصل مع المتقدمين.", href: "/admin/applications" },
      { label: "طلبات الخدمات", description: "متابعة طلبات الخدمات الرقمية وتفاصيل تنفيذها.", href: "/admin/service-requests" },
      { label: "رسائل التواصل", description: "قراءة رسائل الزوار وإضافة ملاحظات المتابعة.", href: "/admin/contact" },
      { label: "الوظائف", description: "إدارة الوظائف المنشورة وطلبات التوظيف.", href: "/admin/jobs" },
    ],
  },
  {
    title: "المحتوى والموقع",
    description: "إدارة ما يظهر للزائر في صفحات الموقع واللغات المختلفة.",
    accent: "border-violet-400/25 bg-violet-400/10 text-violet-100",
    links: [
      { label: "الصفحات", description: "إدارة بيانات الصفحات الأساسية وحالة نشرها.", href: "/admin/pages" },
      { label: "منشئ الصفحات المتقدم", description: "بناء الأقسام وترتيبها ومعاينتها ونشرها.", href: "/admin/page-builder" },
      { label: "الأقسام المنشورة", description: "تنظيم أقسام المحتوى الظاهرة وترتيبها.", href: "/admin/sections" },
      { label: "البرامج", description: "إدارة البرامج وشروطها وصورها وحالة ظهورها.", href: "/admin/programs" },
      { label: "الوسائط والصور", description: "رفع الصور وتنظيمها ومعرفة أماكن استخدامها.", href: "/admin/media" },
      { label: "الإعلانات", description: "إنشاء الإعلانات وتحديد مدة ظهورها وترتيبها.", href: "/admin/announcements" },
      { label: "الأسئلة الشائعة", description: "إدارة الأسئلة والإجابات المنشورة للزوار.", href: "/admin/faqs" },
      { label: "التقييمات", description: "مراجعة التقييمات المنشورة وإدارتها.", href: "/admin/reviews" },
      { label: "قصص النجاح", description: "إدارة قصص النجاح المعتمدة للنشر.", href: "/admin/success-stories" },
      { label: "الشركاء", description: "إدارة الشركاء وشعاراتهم وروابطهم.", href: "/admin/partners" },
      { label: "المعرض", description: "تنظيم المواد والصور المعروضة في معرض الموقع.", href: "/admin/gallery" },
    ],
  },
  {
    title: "اللغات والترجمة",
    description: "مراجعة اكتمال العربية والإنجليزية والتركية قبل النشر.",
    accent: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    links: [
      { label: "مركز إدارة الترجمات", description: "إدارة ترجمات جميع أنواع المحتوى.", href: "/admin/translations" },
      { label: "تغطية الترجمات", description: "مراجعة العناصر الناقصة في كل لغة.", href: "/admin/translations/coverage" },
      { label: "مراجعة إصدارات الترجمة", description: "مقارنة التعديلات واعتماد النسخة المناسبة.", href: "/admin/translations/revisions" },
      { label: "مراجعة تفاصيل البرامج", description: "مراجعة ترجمات تفاصيل البرامج قبل نشرها.", href: "/admin/translations/program-details" },
      { label: "المساعدة في الترجمة", description: "إدارة اقتراحات الترجمة ومراجعتها قبل الاعتماد.", href: "/admin/translations/automation" },
    ],
  },
  {
    title: "الدعم والمعرفة",
    description: "إدارة معلومات الدعم والإجابات والإشعارات الموجهة للفريق.",
    accent: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    links: [
      { label: "قاعدة المعرفة", description: "إضافة الشروحات والإجابات وحفظها كمسودة أو نشرها.", href: "/admin/knowledge-base" },
      { label: "الدعم الذكي", description: "مراجعة الأسئلة والمحادثات وطلبات التحويل للموظفين.", href: "/admin/ai-support" },
      { label: "إعدادات الدعم الذكي", description: "ضبط سلوك الدعم ومصادر الإجابات المعتمدة.", href: "/admin/ai-settings" },
      { label: "مساعد الإدارة", description: "الحصول على ملخصات إدارية مبنية على البيانات المسموح بها.", href: "/admin/ai-copilot" },
      { label: "الإشعارات", description: "متابعة إشعارات الطلبات والمهام والأحداث المهمة.", href: "/admin/notifications" },
    ],
  },
  {
    title: "التشغيل والتحليلات",
    description: "متابعة العمليات والمهام والمؤشرات وحالة الخدمات.",
    accent: "border-rose-400/25 bg-rose-400/10 text-rose-100",
    links: [
      { label: "إدارة التشغيل المتكاملة", description: "المهام وأوقات الاستجابة ومسارات العمل والسوق والحوادث.", href: "/admin/product-operations" },
      { label: "التحليلات التشغيلية", description: "مؤشرات الطلبات والخدمات والوظائف.", href: "/admin/analytics" },
      { label: "تحليلات المنتج المتقدمة", description: "مؤشرات البوابات والمهام والسوق والخصوصية والجلسات.", href: "/admin/product-analytics" },
      { label: "صحة النظام", description: "متابعة الاتصال والنسخ الاحتياطي والأخطاء التشغيلية.", href: "/admin/system-health", superAdminOnly: true },
    ],
  },
  {
    title: "إدارة الوكالة والصلاحيات",
    description: "الهوية والإعدادات والعضويات والصلاحيات والسجلات الحساسة.",
    accent: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100",
    links: [
      { label: "إعدادات الموقع", description: "الهوية وبيانات التواصل والفوتر والألوان والوسائط.", href: "/admin/settings" },
      { label: "إعدادات الصفحة الرئيسية", description: "إدارة محتوى وإحصاءات الصفحة الرئيسية.", href: "/admin/settings/homepage" },
      { label: "حوكمة الوكالة ومساحات العمل", description: "إدارة هوية مساحة العمل والنطاقات والخصائص.", href: "/admin/product-expansion", superAdminOnly: true },
      { label: "الدعوات والعضويات", description: "إنشاء روابط الدعوة ومراجعة الأدوار وحالات العضوية.", href: "/admin/product-expansion/invitations", superAdminOnly: true },
      { label: "الصلاحيات", description: "تحديد ما يستطيع كل مدير عرضه أو تعديله.", href: "/admin/permissions", superAdminOnly: true },
      { label: "سجل النشاطات", description: "مراجعة العمليات الإدارية والتغييرات المسجلة.", href: "/admin/activity-logs", superAdminOnly: true },
      { label: "سلة المحذوفات", description: "استعادة العناصر المحذوفة أو حذفها نهائيًا بعد المراجعة.", href: "/admin/trash", superAdminOnly: true },
      { label: "النسخ والاستعادة", description: "إدارة نطاقات النسخ والاستعادة مع توضيح أثر كل نطاق.", href: "/admin/backups", superAdminOnly: true },
      { label: "سجل الإصدارات", description: "عرض نسخ المحتوى السابقة واستعادتها عند الحاجة.", href: "/admin/version-history" },
      { label: "مركز التصدير", description: "تجهيز ملفات تصدير بحسب الصلاحيات والنطاق المحدد.", href: "/admin/export-center" },
    ],
  },
  {
    title: "أدوات الإدارة المتقدمة",
    description: "أدوات حساسة مخصصة للمسؤول الأعلى وليست للاستخدام اليومي.",
    accent: "border-slate-400/25 bg-slate-400/10 text-slate-100",
    links: [
      { label: "التجربة البصرية", description: "إدارة الخلفيات والتجارب المرئية قبل اعتمادها.", href: "/admin/visual-experience", superAdminOnly: true },
      { label: "تجهيز نسخة وكالة مستقلة", description: "إعداد نسخة مستقلة من هوية الوكالة وتصدير إعداداتها.", href: "/admin/white-label", superAdminOnly: true },
      { label: "التدقيق المتقدم", description: "مراجعة تفاصيل العمليات والحقول للمسؤول الأعلى.", href: "/admin/audit-mode", superAdminOnly: true },
      { label: "فحص الجاهزية", description: "فحص تقني قبل الإطلاق؛ مخصص للمسؤول الأعلى.", href: "/admin/launch-checklist", superAdminOnly: true },
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
      if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
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
    () => adminGroups.map((group) => ({
      ...group,
      links: group.links.filter((link) => !link.superAdminOnly || role === "super_admin"),
    })).filter((group) => group.links.length > 0),
    [role]
  );

  const activeHref = useMemo(() => {
    return visibleGroups
      .flatMap((group) => group.links)
      .filter((link) => link.href === "/admin" ? pathname === "/admin" : pathname === link.href || pathname.startsWith(`${link.href}/`))
      .sort((left, right) => right.href.length - left.href.length)[0]?.href ?? null;
  }, [pathname, visibleGroups]);

  if (!pathname.startsWith("/admin") || pathname === "/admin/login" || isCheckingAccess || !canShowNav) return null;

  return (
    <div dir="rtl" className="fixed bottom-20 left-3 z-[80] print:hidden md:bottom-4 md:left-4">
      {isOpen && (
        <div className="mb-3 max-h-[78vh] w-[min(390px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-purple-400/25 bg-[#09000f]/95 p-3 shadow-[0_0_70px_rgba(124,58,237,0.35)] backdrop-blur-xl">
          <header className="mb-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
            <p className="text-xs font-black tracking-[0.2em] text-yellow-200">HAMZA AGENCY</p>
            <h2 className="mt-1 text-base font-black text-white">دليل لوحة التحكم</h2>
            <p className="mt-2 text-xs leading-6 text-white/65">الأدوات مجمعة حسب وظيفتها، وكل رابط يوضح ما يمكنك إنجازه داخله.</p>
          </header>

          <nav className="space-y-4" aria-label="أقسام لوحة التحكم">
            {visibleGroups.map((group) => (
              <section key={group.title} className="space-y-2">
                <div className={`rounded-2xl border px-3 py-2 ${group.accent}`}>
                  <h3 className="text-sm font-black">{group.title}</h3>
                  <p className="mt-1 text-[11px] leading-5 opacity-75">{group.description}</p>
                </div>
                <div className="grid gap-2">
                  {group.links.map((link) => {
                    const active = link.href === activeHref;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`rounded-2xl border px-4 py-3 transition ${active ? "border-yellow-300/35 bg-yellow-400/15 text-yellow-50" : "border-white/10 bg-white/[0.04] text-white/80 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-white"}`}
                      >
                        <span className="block text-sm font-black">{link.label}</span>
                        <span className="mt-1 block text-[11px] leading-5 text-white/50">{link.description}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <section className="mt-4 space-y-2">
            <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-sm font-black text-yellow-100">معاينة الموقع العام</div>
            <div className="grid grid-cols-2 gap-2">
              {publicPreviewLinks.map((link) => (
                <Link key={link.href} href={link.href} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-xs font-bold text-white/75 hover:border-yellow-300/40 hover:text-white">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "إغلاق دليل لوحة التحكم" : "فتح دليل لوحة التحكم"}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-300/35 bg-purple-600 text-lg font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.35)] transition hover:bg-purple-500 md:h-auto md:w-auto md:px-5 md:py-3 md:text-sm"
      >
        <span className="md:hidden">{isOpen ? "×" : "☰"}</span>
        <span className="hidden md:inline">{isOpen ? "إغلاق الدليل" : "دليل الإدارة"}</span>
      </button>
    </div>
  );
}
