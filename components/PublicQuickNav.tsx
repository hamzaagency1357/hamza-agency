"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type PublicLink = {
  label: string;
  href: string;
};

type PublicLinkGroup = {
  title: string;
  links: PublicLink[];
};

const publicLinkGroups: PublicLinkGroup[] = [
  {
    title: "أساسيات الوكالة",
    links: [
      { label: "الرئيسية", href: "/" },
      { label: "البرامج", href: "/programs" },
      { label: "من نحن", href: "/about" },
      { label: "الخدمات", href: "/services" },
      { label: "الخدمات الرقمية", href: "/digital-services" },
      { label: "تواصل معنا", href: "/contact" },
    ],
  },
  {
    title: "تفاصيل البرامج",
    links: [
      { label: "TikTok", href: "/programs/tiktok" },
      { label: "BIGO LIVE", href: "/programs/bigo-live" },
      { label: "Yaahlan", href: "/programs/yaahlan" },
      { label: "Xena", href: "/programs/xena" },
      { label: "Catchii", href: "/programs/catchii" },
    ],
  },
  {
    title: "الطلبات والمتابعة",
    links: [
      { label: "طلب خدمة", href: "/service-request" },
      { label: "تتبع طلب خدمة", href: "/service-status" },
      { label: "تتبع طلب الانضمام", href: "/application-status" },
      { label: "الوظائف", href: "/jobs" },
    ],
  },
  {
    title: "الثقة والمحتوى",
    links: [
      { label: "التقييمات", href: "/reviews" },
      { label: "قصص النجاح", href: "/success-stories" },
      { label: "الشركاء والبرامج", href: "/partners" },
      { label: "المعرض", href: "/gallery" },
      { label: "مركز المعرفة", href: "/knowledge-center" },
      { label: "الأسئلة الشائعة", href: "/faq" },
      { label: "الدعم الذكي", href: "/ai-support" },
    ],
  },
  {
    title: "معلومات قانونية",
    links: [
      { label: "سياسة الخصوصية", href: "/privacy-policy" },
      { label: "الشروط والأحكام", href: "/terms-and-conditions" },
      { label: "سياسة الذكاء الاصطناعي", href: "/ai-policy" },
    ],
  },
];

const hiddenPublicQuickNavRoutes = ["/maintenance"];
const containerClassName =
  "fixed bottom-[7.75rem] right-4 z-[160] print:hidden md:bottom-6 md:left-6 md:right-auto";
const panelClassName =
  "mb-3 max-h-[62vh] w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-purple-400/25 bg-[#09000f]/95 p-3 shadow-[0_0_70px_rgba(124,58,237,0.35)] backdrop-blur-xl";
const groupTitleClassName =
  "rounded-2xl border border-purple-400/15 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-100";
const linkBaseClassName = "rounded-2xl border px-4 py-3 text-sm font-bold transition";
const activeLinkClassName = "border-yellow-300/35 bg-yellow-400/15 text-yellow-100";
const inactiveLinkClassName =
  "border-white/10 bg-white/[0.04] text-white/75 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-white";

function shouldHidePublicQuickNav(pathname: string) {
  return pathname.startsWith("/admin") || hiddenPublicQuickNavRoutes.includes(pathname);
}

function isActiveLink(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function getLinkClassName(active: boolean) {
  return `${linkBaseClassName} ${active ? activeLinkClassName : inactiveLinkClassName}`;
}

export default function PublicQuickNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  if (shouldHidePublicQuickNav(pathname)) return null;

  return (
    <div dir="rtl" className={containerClassName}>
      {isOpen && (
        <div className={panelClassName}>
          <div className="mb-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
            <div className="text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
              HAMZA AGENCY
            </div>
            <div className="mt-1 text-sm font-black text-white">قائمة الموقع</div>
            <p className="mt-2 text-xs leading-6 text-white/55">
              تنقل سريع بين جميع صفحات الموقع العامة، بدون روابط لوحة الإدارة.
            </p>
          </div>

          <nav className="grid gap-4">
            {publicLinkGroups.map((group) => (
              <div key={group.title} className="grid gap-2">
                <div className={groupTitleClassName}>{group.title}</div>

                {group.links.map((link) => {
                  const active = isActiveLink(pathname, link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className={getLinkClassName(active)}
                    >
                      <span className="block">{link.label}</span>
                      <span className="mt-1 block text-[11px] font-normal text-white/38" dir="ltr">
                        {link.href}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "إغلاق قائمة الموقع" : "فتح قائمة الموقع"}
        className="rounded-full border border-yellow-300/40 bg-[#12051f]/95 px-4 py-3 text-xs font-black text-yellow-100 shadow-[0_0_34px_rgba(234,179,8,0.2)] transition hover:bg-purple-900/90 md:px-5 md:text-sm"
      >
        {isOpen ? "إغلاق القائمة" : "القائمة"}
      </button>
    </div>
  );
}
