"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

type HeaderTargets = {
  desktop: HTMLElement | null;
  mobile: HTMLElement | null;
};

type PanelPosition = {
  top: number;
  left: number;
  width: number;
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

const structuralHeaderStyles = `
body.public-site-page main nav div[class*="lg:flex"] > a,
body.public-site-page main div[class*="lg:hidden"] div[class*="overflow-x-auto"] > a {
  display: none !important;
}

body.public-site-page main nav div[class*="lg:flex"],
body.public-site-page main div[class*="lg:hidden"] div[class*="overflow-x-auto"] {
  overflow: visible !important;
}

body.public-site-page main div[class*="lg:hidden"] div[class*="overflow-x-auto"] {
  flex-wrap: wrap !important;
  row-gap: 0.75rem !important;
  padding-bottom: 0.75rem !important;
}

.hamza-structural-header-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hamza-structural-header-nav-mobile {
  flex-wrap: wrap;
  width: 100%;
}
`;

function getLanguageDirection(language: SiteLanguage) {
  return language === "ar" ? "rtl" : "ltr";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSafePanelPosition(button: HTMLButtonElement | null): PanelPosition {
  const viewportWidth = window.innerWidth || 360;
  const viewportHeight = window.innerHeight || 640;
  const margin = 12;
  const width = Math.min(288, viewportWidth - margin * 2);

  if (!button) {
    return { top: 96, left: margin, width };
  }

  const rect = button.getBoundingClientRect();
  const preferredLeft = rect.left + rect.width / 2 - width / 2;
  const left = clamp(preferredLeft, margin, Math.max(margin, viewportWidth - width - margin));
  const top = clamp(rect.bottom + 8, margin, Math.max(margin, viewportHeight - 260));

  return { top, left, width };
}

function HeaderMenuPanel({
  group,
  labels,
  position,
  onClose,
}: {
  group: HeaderDropdownGroup;
  labels: Record<HeaderNavLabelKey, string>;
  position: PanelPosition;
  onClose: () => void;
}) {
  return createPortal(
    <div
      dir="rtl"
      className="fixed z-[260] rounded-3xl border border-purple-300/25 bg-[#09000f]/97 p-2 shadow-[0_28px_90px_rgba(9,0,15,0.55)] backdrop-blur-xl"
      style={{ top: position.top, left: position.left, width: position.width }}
    >
      <div className="grid gap-2">
        {group.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/80 transition hover:border-yellow-300/35 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/65"
          >
            <span className="block">{labels[link.labelKey]}</span>
            <span className="mt-1 block text-[11px] font-normal text-white/40" dir="ltr">
              {link.href}
            </span>
          </Link>
        ))}
      </div>
    </div>,
    document.body
  );
}

function HeaderDropdownNavigation({ variant }: { variant: "desktop" | "mobile" }) {
  const language = useSiteLanguage();
  const [openMenu, setOpenMenu] = useState<HeaderNavLabelKey | null>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({ top: 96, left: 12, width: 288 });
  const navRef = useRef<HTMLElement | null>(null);
  const buttonRefs = useRef<Partial<Record<HeaderNavLabelKey, HTMLButtonElement | null>>>({});
  const labels = headerDropdownCopy[language] || headerDropdownCopy.ar;
  const direction = getLanguageDirection(language);
  const isDesktop = variant === "desktop";
  const activeGroup = headerDropdownGroups.find((group) => group.titleKey === openMenu) || null;

  function closeMenu() {
    setOpenMenu(null);
  }

  function toggleMenu(group: HeaderDropdownGroup) {
    const button = buttonRefs.current[group.titleKey] || null;
    setPanelPosition(getSafePanelPosition(button));
    setOpenMenu((current) => (current === group.titleKey ? null : group.titleKey));
  }

  useLayoutEffect(() => {
    if (!activeGroup) return;
    const button = buttonRefs.current[activeGroup.titleKey] || null;
    setPanelPosition(getSafePanelPosition(button));
  }, [activeGroup]);

  useEffect(() => {
    if (!openMenu) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && navRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleViewportChange() {
      const groupKey = openMenu;
      const button = buttonRefs.current[groupKey] || null;
      setPanelPosition(getSafePanelPosition(button));
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openMenu]);

  return (
    <>
      <nav
        ref={navRef}
        aria-label={labels.home}
        dir={direction}
        className={`hamza-structural-header-nav ${
          isDesktop ? "" : "hamza-structural-header-nav-mobile"
        }`}
      >
        <Link
          href="/"
          onClick={closeMenu}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70"
        >
          {labels.home}
        </Link>

        {headerDropdownGroups.map((group) => (
          <button
            key={group.titleKey}
            ref={(node) => {
              buttonRefs.current[group.titleKey] = node;
            }}
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === group.titleKey}
            onClick={() => toggleMenu(group)}
            onMouseEnter={() => {
              if (isDesktop) {
                const button = buttonRefs.current[group.titleKey] || null;
                setPanelPosition(getSafePanelPosition(button));
                setOpenMenu(group.titleKey);
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70"
          >
            <span>{labels[group.titleKey]}</span>
            <span aria-hidden="true" className="text-[10px] text-yellow-200/75">
              ▾
            </span>
          </button>
        ))}
      </nav>

      {activeGroup ? (
        <HeaderMenuPanel
          group={activeGroup}
          labels={labels}
          position={panelPosition}
          onClose={closeMenu}
        />
      ) : null}
    </>
  );
}

export default function PublicHeaderDropdownNav() {
  const pathname = usePathname();
  const [targets, setTargets] = useState<HeaderTargets>({ desktop: null, mobile: null });
  const isPublicHome = pathname === "/";

  useEffect(() => {
    if (!isPublicHome) {
      setTargets({ desktop: null, mobile: null });
      return;
    }

    const desktop = document.querySelector<HTMLElement>("main nav div.hidden.items-center.gap-2");
    const mobile = document.querySelector<HTMLElement>(
      'main div[class*="lg:hidden"] div[class*="overflow-x-auto"]'
    );

    setTargets({ desktop, mobile });
  }, [isPublicHome]);

  if (!isPublicHome) return null;

  return (
    <>
      <style>{structuralHeaderStyles}</style>
      {targets.desktop ? createPortal(<HeaderDropdownNavigation variant="desktop" />, targets.desktop) : null}
      {targets.mobile ? createPortal(<HeaderDropdownNavigation variant="mobile" />, targets.mobile) : null}
    </>
  );
}
