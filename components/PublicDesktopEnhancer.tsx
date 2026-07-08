"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SiteLanguage } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type HeaderNavLabelKey =
  | "home"
  | "aboutGroup"
  | "about"
  | "gallery"
  | "successStories"
  | "reviews"
  | "jobs"
  | "servicesGroup"
  | "programs"
  | "agencyServices"
  | "digitalServices"
  | "partners"
  | "requestsGroup"
  | "serviceRequest"
  | "serviceStatus"
  | "applicationStatus"
  | "supportGroup"
  | "knowledgeCenter"
  | "faq"
  | "contact";

type HeaderDropdownItem = {
  labelKey: HeaderNavLabelKey;
  href: string;
};

type HeaderDropdownGroup = {
  titleKey: HeaderNavLabelKey;
  links: HeaderDropdownItem[];
};

const headerDropdownCopy: Record<SiteLanguage, Record<HeaderNavLabelKey, string>> = {
  ar: {
    home: "الرئيسية",
    aboutGroup: "من نحن",
    about: "من نحن",
    gallery: "المعرض",
    successStories: "قصص النجاح",
    reviews: "التقييمات",
    jobs: "الوظائف",
    servicesGroup: "الخدمات والبرامج",
    programs: "البرامج",
    agencyServices: "خدمات الوكالة",
    digitalServices: "الخدمات الرقمية",
    partners: "الشركاء",
    requestsGroup: "الطلبات",
    serviceRequest: "طلب خدمة",
    serviceStatus: "تتبع طلب خدمة",
    applicationStatus: "تتبع طلب الانضمام",
    supportGroup: "الدعم",
    knowledgeCenter: "مركز المعرفة",
    faq: "الأسئلة الشائعة",
    contact: "اتصل بنا",
  },
  en: {
    home: "Home",
    aboutGroup: "About",
    about: "About us",
    gallery: "Gallery",
    successStories: "Success stories",
    reviews: "Reviews",
    jobs: "Careers",
    servicesGroup: "Services & programs",
    programs: "Programs",
    agencyServices: "Agency services",
    digitalServices: "Digital services",
    partners: "Partners",
    requestsGroup: "Requests",
    serviceRequest: "Request a service",
    serviceStatus: "Track service request",
    applicationStatus: "Track application",
    supportGroup: "Support",
    knowledgeCenter: "Knowledge center",
    faq: "FAQ",
    contact: "Contact",
  },
  tr: {
    home: "Ana sayfa",
    aboutGroup: "Hakkımızda",
    about: "Hakkımızda",
    gallery: "Galeri",
    successStories: "Başarı hikâyeleri",
    reviews: "Yorumlar",
    jobs: "Kariyer",
    servicesGroup: "Hizmetler ve programlar",
    programs: "Programlar",
    agencyServices: "Ajans hizmetleri",
    digitalServices: "Dijital hizmetler",
    partners: "İş ortakları",
    requestsGroup: "Talepler",
    serviceRequest: "Hizmet talebi",
    serviceStatus: "Hizmet talebini takip et",
    applicationStatus: "Başvuruyu takip et",
    supportGroup: "Destek",
    knowledgeCenter: "Bilgi merkezi",
    faq: "SSS",
    contact: "İletişim",
  },
};

const headerDropdownGroups: HeaderDropdownGroup[] = [
  {
    titleKey: "aboutGroup",
    links: [
      { labelKey: "about", href: "/about" },
      { labelKey: "gallery", href: "/gallery" },
      { labelKey: "successStories", href: "/success-stories" },
      { labelKey: "reviews", href: "/reviews" },
      { labelKey: "jobs", href: "/jobs" },
    ],
  },
  {
    titleKey: "servicesGroup",
    links: [
      { labelKey: "programs", href: "/programs" },
      { labelKey: "agencyServices", href: "/services" },
      { labelKey: "digitalServices", href: "/digital-services" },
      { labelKey: "partners", href: "/partners" },
    ],
  },
  {
    titleKey: "requestsGroup",
    links: [
      { labelKey: "serviceRequest", href: "/service-request" },
      { labelKey: "serviceStatus", href: "/service-status" },
      { labelKey: "applicationStatus", href: "/application-status" },
    ],
  },
  {
    titleKey: "supportGroup",
    links: [
      { labelKey: "knowledgeCenter", href: "/knowledge-center" },
      { labelKey: "faq", href: "/faq" },
      { labelKey: "contact", href: "/contact" },
    ],
  },
];

const headerDropdownStyles = `
@media (min-width: 1024px) {
  .hamza-header-dropdown-target {
    overflow: visible !important;
  }

  .hamza-header-dropdown-target > a {
    display: none !important;
  }
}

@media (max-width: 1023px) {
  .hamza-header-dropdown-nav {
    display: none !important;
  }
}
`;

function getLanguageDirection(language: SiteLanguage) {
  return language === "ar" ? "rtl" : "ltr";
}

function getPanelEdgeClassName(language: SiteLanguage, group: HeaderDropdownGroup) {
  if (language === "ar") {
    return group.titleKey === "supportGroup" ? "left-0" : "right-0";
  }

  return group.titleKey === "supportGroup" ? "right-0" : "left-0";
}

function HeaderDropdownNavigation() {
  const language = useSiteLanguage();
  const labels = headerDropdownCopy[language] || headerDropdownCopy.ar;
  const direction = getLanguageDirection(language);

  return (
    <nav
      aria-label={labels.home}
      dir={direction}
      className="hamza-header-dropdown-nav flex items-center gap-2"
    >
      <Link
        href="/"
        className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70"
      >
        {labels.home}
      </Link>

      {headerDropdownGroups.map((group) => (
        <div key={group.titleKey} className="group relative">
          <button
            type="button"
            aria-haspopup="true"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70"
          >
            <span>{labels[group.titleKey]}</span>
            <span aria-hidden="true" className="text-[10px] text-yellow-200/75">
              ▾
            </span>
          </button>

          <div
            className={`${getPanelEdgeClassName(
              language,
              group
            )} pointer-events-none absolute top-full z-[80] mt-3 w-64 max-w-[calc(100vw-2rem)] translate-y-2 rounded-3xl border border-purple-300/20 bg-[#09000f]/96 p-2 opacity-0 shadow-[0_24px_80px_rgba(9,0,15,0.45)] backdrop-blur-xl transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100`}
          >
            <div className="grid gap-2">
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white/75 transition hover:border-yellow-300/35 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/65"
                >
                  <span className="block">{labels[link.labelKey]}</span>
                  <span className="mt-1 block text-[11px] font-normal text-white/40" dir="ltr">
                    {link.href}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function PublicDesktopEnhancer() {
  const pathname = usePathname();
  const [headerNavTarget, setHeaderNavTarget] = useState<HTMLElement | null>(null);
  const isAdmin = pathname.startsWith("/admin");
  const isPublicHome = !isAdmin && pathname === "/";

  useEffect(() => {
    document.body.classList.toggle("public-site-page", !isAdmin);
    document.body.classList.toggle("admin-site-page", isAdmin);

    return () => {
      document.body.classList.remove("public-site-page");
      document.body.classList.remove("admin-site-page");
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isPublicHome) {
      setHeaderNavTarget(null);
      return;
    }

    const target = document.querySelector<HTMLElement>(
      "main nav div.hidden.items-center.gap-2"
    );

    if (!target) {
      setHeaderNavTarget(null);
      return;
    }

    target.classList.add("hamza-header-dropdown-target");
    setHeaderNavTarget(target);

    return () => {
      target.classList.remove("hamza-header-dropdown-target");
    };
  }, [isPublicHome]);

  return (
    <>
      {!isAdmin && <style>{headerDropdownStyles}</style>}
      {isPublicHome && headerNavTarget
        ? createPortal(<HeaderDropdownNavigation />, headerNavTarget)
        : null}
    </>
  );
}
