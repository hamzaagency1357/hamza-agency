"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { getSharedNavigationLabelByHref } from "@/lib/i18n/sharedChrome";
import {
  getPublicNavigationConfig,
  type PublicNavigationLink,
} from "@/lib/publicNavigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type HeaderLink = Pick<PublicNavigationLink, "label" | "href"> &
  Partial<Omit<PublicNavigationLink, "label" | "href">>;

type HeaderProgram = {
  id: number;
  name: string | null;
  slug: string | null;
  sort_order: number | null;
};

type PublicSetting = {
  setting_key: string | null;
  setting_value: string | null;
};

type PublicMedia = {
  file_url: string | null;
};

type HeaderGroupKey = "agency" | "programs" | "services" | "support";

type HeaderGroup = {
  key: HeaderGroupKey;
  title: string;
  links: HeaderLink[];
};

const FALLBACK_LOGO = "/Logo%20hamza%20agency.jpg";

const FALLBACK_HEADER_LINKS: HeaderLink[] = [
  { label: "الرئيسية", href: "/", type: "internal", isVisible: true, sortOrder: 1 },
  { label: "البرامج", href: "/programs", type: "internal", isVisible: true, sortOrder: 2 },
  { label: "من نحن", href: "/about", type: "internal", isVisible: true, sortOrder: 3 },
  { label: "الخدمات", href: "/services", type: "internal", isVisible: true, sortOrder: 4 },
  { label: "الخدمات الرقمية", href: "/digital-services", type: "internal", isVisible: true, sortOrder: 5 },
  { label: "طلب خدمة", href: "/service-request", type: "internal", isVisible: true, sortOrder: 6 },
  { label: "تتبع طلب خدمة", href: "/service-status", type: "internal", isVisible: true, sortOrder: 7 },
  { label: "تتبع طلب الانضمام", href: "/application-status", type: "internal", isVisible: true, sortOrder: 8 },
  { label: "الوظائف", href: "/jobs", type: "internal", isVisible: true, sortOrder: 9 },
  { label: "التقييمات", href: "/reviews", type: "internal", isVisible: true, sortOrder: 10 },
  { label: "قصص النجاح", href: "/success-stories", type: "internal", isVisible: true, sortOrder: 11 },
  { label: "شركاؤنا", href: "/partners", type: "internal", isVisible: true, sortOrder: 12 },
  { label: "المعرض", href: "/gallery", type: "internal", isVisible: true, sortOrder: 13 },
  { label: "مركز المعرفة", href: "/knowledge-center", type: "internal", isVisible: true, sortOrder: 14 },
  { label: "FAQ", href: "/faq", type: "internal", isVisible: true, sortOrder: 15 },
  { label: "اتصل بنا", href: "/contact", type: "internal", isVisible: true, sortOrder: 16 },
];

const FALLBACK_PRIMARY_CTA: HeaderLink = {
  key: "primary_join",
  label: "انضم الآن",
  href: "/apply",
  type: "cta",
  isVisible: true,
  sortOrder: 1,
};

const headerCopy: Record<
  SiteLanguage,
  {
    menu: string;
    openMenu: string;
    closeMenu: string;
    agency: string;
    programs: string;
    services: string;
    support: string;
  }
> = {
  ar: {
    menu: "قائمة التنقل",
    openMenu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
    agency: "عن الوكالة",
    programs: "البرامج",
    services: "الخدمات والطلبات",
    support: "الدعم والتواصل",
  },
  en: {
    menu: "Navigation menu",
    openMenu: "Open navigation menu",
    closeMenu: "Close navigation menu",
    agency: "About the agency",
    programs: "Programs",
    services: "Services and requests",
    support: "Support and contact",
  },
  tr: {
    menu: "Gezinme menüsü",
    openMenu: "Menüyü aç",
    closeMenu: "Menüyü kapat",
    agency: "Ajans hakkında",
    programs: "Programlar",
    services: "Hizmetler ve talepler",
    support: "Destek ve iletişim",
  },
};

function getSetting(rows: PublicSetting[], keys: string[], fallback: string) {
  for (const key of keys) {
    const value = rows.find((item) => item.setting_key === key)?.setting_value;
    if (value?.trim()) return value.trim();
  }

  return fallback;
}

function isInternalHref(href: string) {
  return href.startsWith("/") || href.startsWith("#");
}

function getGroupKey(href: string): HeaderGroupKey | null {
  if (href === "/") return null;

  if (
    href === "/about" ||
    href === "/partners" ||
    href === "/reviews" ||
    href === "/success-stories" ||
    href === "/gallery"
  ) {
    return "agency";
  }

  if (href === "/programs" || href.startsWith("/programs/")) {
    return "programs";
  }

  if (
    href === "/services" ||
    href === "/digital-services" ||
    href === "/service-request" ||
    href === "/service-status" ||
    href === "/application-status"
  ) {
    return "services";
  }

  return "support";
}

function isActiveLink(pathname: string, href: string) {
  if (!isInternalHref(href)) return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function dedupeLinks(links: HeaderLink[]) {
  const seen = new Set<string>();

  return links.filter((link) => {
    if (!link.href || link.isVisible === false || seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

function HeaderLinkItem({
  link,
  label,
  pathname,
  onNavigate,
  className,
  role,
}: {
  link: HeaderLink;
  label: string;
  pathname: string;
  onNavigate: () => void;
  className: string;
  role?: string;
}) {
  const active = isActiveLink(pathname, link.href);
  const resolvedClassName = `${className}${active ? " hamza-header-link-active" : ""}`;

  if (isInternalHref(link.href)) {
    return (
      <Link
        href={link.href}
        className={resolvedClassName}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        role={role}
      >
        {label}
      </Link>
    );
  }

  return (
    <a
      href={link.href}
      target={link.target || "_blank"}
      rel={link.rel || "noreferrer"}
      className={resolvedClassName}
      onClick={onNavigate}
      role={role}
    >
      {label}
    </a>
  );
}

export default function PublicSiteHeader() {
  const pathname = usePathname();
  const language = useSiteLanguage();
  const copy = headerCopy[language];
  const headerRef = useRef<HTMLElement>(null);

  const [links, setLinks] = useState<HeaderLink[]>(FALLBACK_HEADER_LINKS);
  const [programs, setPrograms] = useState<HeaderProgram[]>([]);
  const [brand, setBrand] = useState({
    englishName: "HAMZA AGENCY",
    agencyName: "وكالة حمزة",
    logoUrl: FALLBACK_LOGO,
  });
  const [primaryCta, setPrimaryCta] = useState<HeaderLink>(FALLBACK_PRIMARY_CTA);
  const [openDesktopGroup, setOpenDesktopGroup] = useState<HeaderGroupKey | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openMobileGroup, setOpenMobileGroup] = useState<HeaderGroupKey | null>(null);

  useEffect(() => {
    const shouldShowHeader = pathname === "/";
    document.body.classList.toggle("has-luxury-header", shouldShowHeader);

    return () => {
      document.body.classList.remove("has-luxury-header");
    };
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;

    async function loadHeaderData() {
      const navigation = await getPublicNavigationConfig();
      let settings: PublicSetting[] = [];
      let media: PublicMedia[] = [];
      let activePrograms: HeaderProgram[] = [];

      if (isSupabaseConfigured && supabase) {
        const [settingsResult, mediaResult, programsResult] = await Promise.all([
          supabase
            .from("settings")
            .select("setting_key, setting_value")
            .eq("is_public", true),
          supabase
            .from("media")
            .select("file_url")
            .eq("is_active", true)
            .eq("category", "logo")
            .limit(1),
          supabase
            .from("programs")
            .select("id, name, slug, sort_order")
            .eq("is_visible", true)
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

        if (!settingsResult.error && settingsResult.data) {
          settings = settingsResult.data as PublicSetting[];
        }

        if (!mediaResult.error && mediaResult.data) {
          media = mediaResult.data as PublicMedia[];
        }

        if (!programsResult.error && programsResult.data) {
          activePrograms = programsResult.data as HeaderProgram[];
        }
      }

      if (!isMounted) return;

      const hasConfiguredHeaderLinks = Boolean(
        settings.find((item) => item.setting_key === "public_header_links_json")
          ?.setting_value?.trim()
      );
      const configuredPrimaryCta =
        navigation.ctaLinks.find((link) => link.key === "primary_join") ||
        navigation.ctaLinks.find((link) => link.href === "/apply") ||
        FALLBACK_PRIMARY_CTA;
      const logoUrl = media[0]?.file_url || FALLBACK_LOGO;

      setLinks(
        dedupeLinks(
          hasConfiguredHeaderLinks ? navigation.headerLinks : FALLBACK_HEADER_LINKS
        )
      );
      setPrograms(activePrograms);
      setPrimaryCta(configuredPrimaryCta);
      setBrand({
        englishName: getSetting(
          settings,
          ["agency_name_en", "site_name", "site_name_en", "english_name", "company_name"],
          "HAMZA AGENCY"
        ),
        agencyName: getSetting(
          settings,
          ["agency_name_ar", "agency_name", "site_name", "brand_name"],
          "وكالة حمزة"
        ),
        logoUrl:
          logoUrl.startsWith("http") || logoUrl.startsWith("/")
            ? logoUrl
            : FALLBACK_LOGO,
      });
    }

    void loadHeaderData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setOpenDesktopGroup(null);
    setIsMobileOpen(false);
    setOpenMobileGroup(null);
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenDesktopGroup(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpenDesktopGroup(null);
      setIsMobileOpen(false);
      setOpenMobileGroup(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const allLinks = useMemo(() => {
    const programLinks: HeaderLink[] = programs
      .filter((program) => Boolean(program.slug && program.name))
      .map((program, index) => ({
        label: program.name || "",
        href: `/programs/${program.slug}`,
        type: "program",
        isVisible: true,
        sortOrder: 100 + index,
      }));

    return dedupeLinks([...links, ...programLinks]);
  }, [links, programs]);

  const homeLink = allLinks.find((link) => link.href === "/") || null;

  const groups = useMemo<HeaderGroup[]>(() => {
    const buckets: Record<HeaderGroupKey, HeaderLink[]> = {
      agency: [],
      programs: [],
      services: [],
      support: [],
    };

    allLinks.forEach((link) => {
      const key = getGroupKey(link.href);
      if (key) buckets[key].push(link);
    });

    return [
      { key: "agency", title: copy.agency, links: buckets.agency },
      { key: "programs", title: copy.programs, links: buckets.programs },
      { key: "services", title: copy.services, links: buckets.services },
      { key: "support", title: copy.support, links: buckets.support },
    ].filter((group) => group.links.length > 0);
  }, [allLinks, copy]);

  const getLabel = (link: HeaderLink) =>
    getSharedNavigationLabelByHref(language, link.href, link.label);

  if (pathname !== "/") return null;

  return (
    <header
      ref={headerRef}
      dir={getLanguageDirection(language)}
      className="hamza-site-header relative z-[120] mx-auto w-full px-4 pt-3 sm:px-5"
    >
      <div className="hamza-site-header-inner mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className="hamza-header-brand flex min-w-0 items-center gap-3" onClick={() => setIsMobileOpen(false)}>
          <img
            src={brand.logoUrl}
            alt={brand.englishName}
            className="h-11 w-11 shrink-0 rounded-xl object-cover"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-wide text-white" dir="ltr">
              {brand.englishName}
            </span>
            <span className="block truncate text-xs font-bold text-yellow-100/85">
              {brand.agencyName}
            </span>
          </span>
        </Link>

        <nav className="hamza-header-desktop hidden items-center gap-1 xl:flex" aria-label={copy.menu}>
          {homeLink && (
            <HeaderLinkItem
              link={homeLink}
              label={getLabel(homeLink)}
              pathname={pathname}
              onNavigate={() => setOpenDesktopGroup(null)}
              className="hamza-header-desktop-link"
            />
          )}

          {groups.map((group) => {
            const isOpen = openDesktopGroup === group.key;
            const menuId = `hamza-header-menu-${group.key}`;

            return (
              <div key={group.key} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-controls={menuId}
                  aria-expanded={isOpen}
                  onClick={() =>
                    setOpenDesktopGroup((current) =>
                      current === group.key ? null : group.key
                    )
                  }
                  className="hamza-header-desktop-link hamza-header-group-trigger"
                >
                  <span>{group.title}</span>
                  <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}>
                    <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                  </svg>
                </button>

                {isOpen && (
                  <div id={menuId} role="menu" className="hamza-header-dropdown">
                    {group.links.map((link) => (
                      <HeaderLinkItem
                        key={link.href}
                        link={link}
                        label={getLabel(link)}
                        pathname={pathname}
                        onNavigate={() => setOpenDesktopGroup(null)}
                        className="hamza-header-dropdown-link"
                        role="menuitem"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          {primaryCta.isVisible !== false && (
            <HeaderLinkItem
              link={primaryCta}
              label={getLabel(primaryCta)}
              pathname={pathname}
              onNavigate={() => setOpenDesktopGroup(null)}
              className="hamza-header-cta"
            />
          )}
        </div>

        <button
          type="button"
          className="hamza-header-menu-button xl:hidden"
          aria-label={isMobileOpen ? copy.closeMenu : copy.openMenu}
          aria-expanded={isMobileOpen}
          aria-controls="hamza-mobile-header-menu"
          onClick={() => setIsMobileOpen((current) => !current)}
        >
          <span className="sr-only">{isMobileOpen ? copy.closeMenu : copy.openMenu}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
            {isMobileOpen ? (
              <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            )}
          </svg>
        </button>
      </div>

      {isMobileOpen && (
        <div id="hamza-mobile-header-menu" className="hamza-header-mobile-panel xl:hidden">
          <nav className="grid gap-2" aria-label={copy.menu}>
            {homeLink && (
              <HeaderLinkItem
                link={homeLink}
                label={getLabel(homeLink)}
                pathname={pathname}
                onNavigate={() => setIsMobileOpen(false)}
                className="hamza-header-mobile-home"
              />
            )}

            {groups.map((group) => {
              const isOpen = openMobileGroup === group.key;
              const panelId = `hamza-mobile-header-${group.key}`;

              return (
                <section key={group.key} className="hamza-header-mobile-group">
                  <button
                    type="button"
                    className="hamza-header-mobile-group-trigger"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() =>
                      setOpenMobileGroup((current) =>
                        current === group.key ? null : group.key
                      )
                    }
                  >
                    <span>{group.title}</span>
                    <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-5 w-5 transition ${isOpen ? "rotate-180" : ""}`}>
                      <path d="m5.5 7.5 4.5 4.5 4.5-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div id={panelId} className="hamza-header-mobile-links">
                      {group.links.map((link) => (
                        <HeaderLinkItem
                          key={link.href}
                          link={link}
                          label={getLabel(link)}
                          pathname={pathname}
                          onNavigate={() => setIsMobileOpen(false)}
                          className="hamza-header-mobile-link"
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {primaryCta.isVisible !== false && (
              <HeaderLinkItem
                link={primaryCta}
                label={getLabel(primaryCta)}
                pathname={pathname}
                onNavigate={() => setIsMobileOpen(false)}
                className="hamza-header-mobile-cta"
              />
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
