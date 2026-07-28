"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import {
  localizePublicPath,
  stripLocalePrefix,
} from "@/lib/i18n/publicLocales";

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
  | "aiSupport"
  | "faq"
  | "contact"
  | "privacyPolicy"
  | "termsAndConditions"
  | "aiPolicy";

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
  maxHeight: number;
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
    aiSupport: "الدعم الذكي",
    faq: "الأسئلة الشائعة",
    contact: "اتصل بنا",
    privacyPolicy: "سياسة الخصوصية",
    termsAndConditions: "الشروط والأحكام",
    aiPolicy: "سياسة الذكاء الاصطناعي",
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
    aiSupport: "AI support",
    faq: "FAQ",
    contact: "Contact",
    privacyPolicy: "Privacy policy",
    termsAndConditions: "Terms and conditions",
    aiPolicy: "AI policy",
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
    aiSupport: "Yapay zekâ desteği",
    faq: "SSS",
    contact: "İletişim",
    privacyPolicy: "Gizlilik politikası",
    termsAndConditions: "Şartlar ve koşullar",
    aiPolicy: "Yapay zekâ politikası",
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
      { labelKey: "aiSupport", href: "/ai-support" },
      { labelKey: "faq", href: "/faq" },
      { labelKey: "contact", href: "/contact" },
      { labelKey: "privacyPolicy", href: "/privacy-policy" },
      { labelKey: "termsAndConditions", href: "/terms-and-conditions" },
      { labelKey: "aiPolicy", href: "/ai-policy" },
    ],
  },
];

const structuralNavReadyClass = "public-structural-nav-ready";
const emptyHeaderTargets: HeaderTargets = { desktop: null, mobile: null };

const structuralHeaderStyles = `
body.public-site-page.${structuralNavReadyClass} main nav div[class*="lg:flex"] > a,
body.public-site-page.${structuralNavReadyClass} main div[class*="lg:hidden"] div[class*="overflow-x-auto"] > a {
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

.hamza-structural-header-shell-desktop {
  display: contents;
}

.hamza-structural-header-shell-mobile {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.75rem;
}

.hamza-structural-header-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hamza-structural-header-nav-mobile {
  flex-wrap: wrap;
  width: 100%;
  justify-content: center;
}

.hamza-structural-header-panel-mobile {
  width: min(100%, calc(100vw - 1.5rem));
  margin-inline: auto;
}

body.public-site-page a.hamza-structural-header-menu-link {
  display: block !important;
}
`;

function findHeaderTargets(): HeaderTargets {
  return {
    desktop: document.querySelector<HTMLElement>("main nav div.hidden.items-center.gap-2"),
    mobile: document.querySelector<HTMLElement>(
      'main div[class*="lg:hidden"] div[class*="overflow-x-auto"]'
    ),
  };
}

function areSameHeaderTargets(current: HeaderTargets, next: HeaderTargets) {
  return current.desktop === next.desktop && current.mobile === next.mobile;
}

function hasMountedStructuralNavigation(
  target: HTMLElement | null,
  variant: "desktop" | "mobile"
) {
  return Boolean(
    target?.isConnected &&
      target.querySelector(`[data-public-structural-nav="${variant}"]`)
  );
}

function updateStructuralNavigationReadiness(targets: HeaderTargets) {
  const isReady =
    hasMountedStructuralNavigation(targets.desktop, "desktop") &&
    hasMountedStructuralNavigation(targets.mobile, "mobile");

  document.body.classList.toggle(structuralNavReadyClass, isReady);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getSafePanelPosition(button: HTMLButtonElement | null): PanelPosition {
  const viewportWidth = typeof window === "undefined" ? 360 : window.innerWidth || 360;
  const viewportHeight = typeof window === "undefined" ? 640 : window.innerHeight || 640;
  const margin = 12;
  const width = Math.min(288, viewportWidth - margin * 2);

  if (!button) {
    const top = 96;
    return {
      top,
      left: margin,
      width,
      maxHeight: Math.max(96, viewportHeight - top - margin),
    };
  }

  const rect = button.getBoundingClientRect();
  const preferredLeft = rect.left + rect.width / 2 - width / 2;
  const left = clamp(preferredLeft, margin, Math.max(margin, viewportWidth - width - margin));
  const top = rect.bottom + 8;

  return {
    top,
    left,
    width,
    maxHeight: Math.max(96, viewportHeight - top - margin),
  };
}

function HeaderDropdownNavigation({ variant }: { variant: "desktop" | "mobile" }) {
  const language = useSiteLanguage();
  const [openMenu, setOpenMenu] = useState<HeaderNavLabelKey | null>(null);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({
    top: 96,
    left: 12,
    width: 288,
    maxHeight: 532,
  });
  const shellRef = useRef<HTMLDivElement | null>(null);
  const buttonRefs = useRef<Partial<Record<HeaderNavLabelKey, HTMLButtonElement | null>>>({});
  const panelId = useId();
  const labels = headerDropdownCopy[language];
  const direction = getLanguageDirection(language);
  const isDesktop = variant === "desktop";
  const activeGroup = headerDropdownGroups.find((group) => group.titleKey === openMenu) || null;

  function closeMenu() {
    setOpenMenu(null);
  }

  function openGroup(group: HeaderDropdownGroup) {
    if (isDesktop) {
      const button = buttonRefs.current[group.titleKey] || null;
      setPanelPosition(getSafePanelPosition(button));
    }
    setOpenMenu(group.titleKey);
  }

  function toggleGroup(group: HeaderDropdownGroup) {
    if (openMenu === group.titleKey) {
      closeMenu();
      return;
    }

    openGroup(group);
  }

  useEffect(() => {
    if (!openMenu) return;
    const activeMenu = openMenu;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && shellRef.current?.contains(target)) return;
      closeMenu();
    }

    function handleViewportChange() {
      if (!isDesktop) return;
      const button = buttonRefs.current[activeMenu] || null;
      setPanelPosition(getSafePanelPosition(button));
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [openMenu, isDesktop]);

  return (
    <div
      ref={shellRef}
      data-public-structural-nav={variant}
      className={
        isDesktop
          ? "hamza-structural-header-shell-desktop"
          : "hamza-structural-header-shell-mobile"
      }
    >
      <nav
        aria-label={labels.home}
        dir={direction}
        className={`hamza-structural-header-nav ${
          isDesktop ? "" : "hamza-structural-header-nav-mobile"
        }`}
      >
        <Link
          href={localizePublicPath("/", language)}
          onClick={closeMenu}
          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70 xl:px-4 xl:text-sm"
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
            aria-controls={openMenu === group.titleKey ? panelId : undefined}
            onClick={() => toggleGroup(group)}
            onMouseEnter={() => {
              if (isDesktop) openGroup(group);
            }}
            onFocus={() => {
              if (isDesktop) openGroup(group);
            }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300/70 xl:gap-2 xl:px-4 xl:text-sm"
          >
            <span>{labels[group.titleKey]}</span>
            <span aria-hidden="true" className="text-[10px] text-yellow-200/75">
              ▾
            </span>
          </button>
        ))}
      </nav>

      {activeGroup ? (
        <div
          id={panelId}
          dir={direction}
          role="menu"
          className={
            isDesktop
              ? "fixed z-[260] overflow-y-auto overscroll-contain rounded-3xl border border-purple-300/25 bg-[#09000f]/95 p-2 shadow-[0_28px_90px_rgba(9,0,15,0.55)] backdrop-blur-xl"
              : "hamza-structural-header-panel-mobile relative z-[120] max-h-[min(60svh,28rem)] overflow-y-auto overscroll-contain rounded-3xl border border-purple-300/25 bg-[#09000f]/95 p-2 shadow-[0_20px_60px_rgba(9,0,15,0.35)] backdrop-blur-xl"
          }
          style={
            isDesktop
              ? {
                  top: panelPosition.top,
                  left: panelPosition.left,
                  width: panelPosition.width,
                  maxHeight: panelPosition.maxHeight,
                }
              : undefined
          }
        >
          <div className="grid gap-2">
            {activeGroup.links.map((link) => (
              <Link
                key={link.href}
                href={localizePublicPath(link.href, language)}
                role="menuitem"
                onClick={closeMenu}
                className="hamza-structural-header-menu-link rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/80 transition hover:border-yellow-300/35 hover:bg-purple-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200/65"
              >
                {labels[link.labelKey]}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PublicHeaderDropdownNav() {
  const pathname = usePathname();
  const [targets, setTargets] = useState<HeaderTargets>({ desktop: null, mobile: null });
  const targetsRef = useRef<HeaderTargets>(emptyHeaderTargets);
  const isPublicHome = stripLocalePrefix(pathname || "/") === "/";

  useLayoutEffect(() => {
    document.body.classList.remove(structuralNavReadyClass);

    if (!isPublicHome) {
      targetsRef.current = emptyHeaderTargets;
      setTargets((current) =>
        areSameHeaderTargets(current, emptyHeaderTargets) ? current : emptyHeaderTargets
      );
      return;
    }

    let isActive = true;

    function syncStructuralNavigation() {
      if (!isActive) return;

      const nextTargets = findHeaderTargets();

      if (!areSameHeaderTargets(targetsRef.current, nextTargets)) {
        document.body.classList.remove(structuralNavReadyClass);
        targetsRef.current = nextTargets;
        setTargets(nextTargets);
        return;
      }

      updateStructuralNavigationReadiness(nextTargets);
    }

    const observer = new MutationObserver(syncStructuralNavigation);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("pageshow", syncStructuralNavigation);
    syncStructuralNavigation();

    return () => {
      isActive = false;
      observer.disconnect();
      window.removeEventListener("pageshow", syncStructuralNavigation);
      document.body.classList.remove(structuralNavReadyClass);
      targetsRef.current = emptyHeaderTargets;
    };
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
