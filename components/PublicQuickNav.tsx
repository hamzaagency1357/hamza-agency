"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  defaultPublicNavigationConfig,
  getPublicNavigationConfig,
  type PublicNavigationGroup,
  type PublicNavigationLink,
} from "@/lib/publicNavigation";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { getSharedNavigationLabel } from "@/lib/i18n/sharedChrome";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { localizePublicHref, stripLocalePrefix } from "@/lib/i18n/publicLocales";

type PublicQuickNavProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mobileDockMode?: boolean;
  panelId?: string;
};

const hiddenPublicQuickNavRoutes = ["/maintenance"];
const groupTitleClassName =
  "rounded-2xl border border-purple-400/15 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-100";
const linkBaseClassName =
  "min-h-[44px] rounded-2xl border px-4 py-3 text-sm font-bold transition";
const activeLinkClassName =
  "border-yellow-300/35 bg-yellow-400/15 text-yellow-100";
const inactiveLinkClassName =
  "border-white/10 bg-white/[0.04] text-white/75 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-white";

const quickNavGroupTitleCopy: Record<SiteLanguage, Record<string, string>> = {
  ar: {
    "أساسيات الوكالة": "أساسيات الوكالة",
    "تفاصيل البرامج": "تفاصيل البرامج",
    "الطلبات والمتابعة": "الطلبات والمتابعة",
    "الثقة والمحتوى": "الثقة والمحتوى",
    "معلومات قانونية": "معلومات قانونية",
  },
  en: {
    "أساسيات الوكالة": "Agency essentials",
    "تفاصيل البرامج": "Programs",
    "الطلبات والمتابعة": "Requests and tracking",
    "الثقة والمحتوى": "Trust and content",
    "معلومات قانونية": "Legal information",
  },
  tr: {
    "أساسيات الوكالة": "Ajans temelleri",
    "تفاصيل البرامج": "Programlar",
    "الطلبات والمتابعة": "Talepler ve takip",
    "الثقة والمحتوى": "Güven ve içerik",
    "معلومات قانونية": "Yasal bilgiler",
  },
};

function shouldHidePublicQuickNav(pathname: string) {
  return pathname.startsWith("/admin") || hiddenPublicQuickNavRoutes.includes(pathname);
}

function isActiveLink(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function getLinkClassName(active: boolean) {
  return `${linkBaseClassName} ${active ? activeLinkClassName : inactiveLinkClassName}`;
}

function isSafePublicHref(href: string) {
  if (!href || href.startsWith("/admin")) return false;
  return href.startsWith("/") || href.startsWith("#") || href.startsWith("https://") || href.startsWith("http://") || href.startsWith("mailto:") || href.startsWith("tel:");
}

function getQuickNavLinkKey(link: PublicNavigationLink) {
  return link.href.split("?")[0]?.split("#")[0] || link.href;
}

function sanitizePublicQuickNavGroups(groups: PublicNavigationGroup[]) {
  const seenLinks = new Set<string>();
  return groups
    .map((group) => ({
      ...group,
      links: group.links
        .filter((link) => isSafePublicHref(link.href) && link.isVisible !== false)
        .filter((link) => {
          const key = getQuickNavLinkKey(link);
          if (seenLinks.has(key)) return false;
          seenLinks.add(key);
          return true;
        }),
    }))
    .filter((group) => group.isVisible !== false && group.links.length > 0);
}

function getQuickNavGroupTitle(language: SiteLanguage, group: PublicNavigationGroup) {
  return quickNavGroupTitleCopy[language][group.title] || group.title;
}

function isInternalHref(href: string) {
  return href.startsWith("/") || href.startsWith("#");
}

function PublicQuickNavLink({
  link,
  active,
  onClick,
  label,
  language,
}: {
  link: PublicNavigationLink;
  active: boolean;
  onClick: () => void;
  label: string;
  language: SiteLanguage;
}) {
  const className = getLinkClassName(active);

  if (isInternalHref(link.href)) {
    return (
      <Link href={localizePublicHref(link.href, language)} onClick={onClick} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <a href={link.href} target={link.target || "_blank"} rel={link.rel || "noreferrer"} onClick={onClick} className={className}>
      {label}
    </a>
  );
}

export default function PublicQuickNav({
  open,
  onOpenChange,
  mobileDockMode = false,
  panelId = "hamza-quick-nav-panel",
}: PublicQuickNavProps = {}) {
  const pathname = usePathname();
  const language = useSiteLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const [quickNavGroups, setQuickNavGroups] = useState<PublicNavigationGroup[]>(defaultPublicNavigationConfig.quickNavGroups);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const copy = (key: Parameters<typeof getStaticCopy>[1]) => getStaticCopy(language, key);
  const publicPath = stripLocalePrefix(pathname || "/");

  function setIsOpen(nextOpen: boolean) {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    let isMounted = true;
    async function loadNavigation() {
      const config = await getPublicNavigationConfig();
      if (isMounted) setQuickNavGroups(sanitizePublicQuickNavGroups(config.quickNavGroups));
    }
    void loadNavigation();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (mobileDockMode) return;
    document.body.classList.toggle("public-quick-nav-open", isOpen);
    return () => document.body.classList.remove("public-quick-nav-open");
  }, [isOpen, mobileDockMode]);

  useEffect(() => {
    if (!mobileDockMode) setIsOpen(false);
  }, [pathname, mobileDockMode]);

  const visibleGroups = useMemo(() => {
    const sanitizedGroups = sanitizePublicQuickNavGroups(quickNavGroups);
    return sanitizedGroups.length ? sanitizedGroups : defaultPublicNavigationConfig.quickNavGroups;
  }, [quickNavGroups]);

  if (shouldHidePublicQuickNav(pathname)) return null;

  const panel = isOpen ? (
    <div
      id={panelId}
      className="hamza-quick-nav-panel max-h-[calc(100svh-var(--public-mobile-dock-height)-2rem)] w-full overflow-y-auto overscroll-contain rounded-3xl border border-purple-400/25 bg-[#09000f]/95 p-3 pt-4 shadow-[0_0_70px_rgba(124,58,237,0.35)] backdrop-blur-xl md:mb-3 md:w-[min(340px,calc(100vw-2rem))]"
    >
      <div className="mb-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-yellow-200">HAMZA AGENCY</div>
            <div className="mt-1 text-sm font-black text-white">{copy("quickNavTitle")}</div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="min-h-[44px] shrink-0 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-black text-white/85"
            aria-label={copy("quickNavClose")}
          >
            {copy("quickNavClose")}
          </button>
        </div>
        <p className="mt-2 text-xs leading-6 text-white/55">{copy("quickNavDescription")}</p>
      </div>

      <nav className="grid gap-4" aria-label={copy("quickNavTitle")}>
        {visibleGroups.map((group) => (
          <div key={group.title} className="grid gap-2">
            <div className={groupTitleClassName}>{getQuickNavGroupTitle(language, group)}</div>
            {group.links.map((link) => (
              <PublicQuickNavLink
                key={`${group.title}-${link.href}-${link.label}`}
                link={link}
                active={isInternalHref(link.href) ? isActiveLink(publicPath, stripLocalePrefix(link.href)) : false}
                label={getSharedNavigationLabel(language, link)}
                language={language}
                onClick={() => setIsOpen(false)}
              />
            ))}
          </div>
        ))}
      </nav>
    </div>
  ) : null;

  if (mobileDockMode) return panel;

  return (
    <div dir={getLanguageDirection(language)} className="hamza-quick-nav fixed bottom-6 right-6 z-[160] hidden print:hidden md:block">
      {panel}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? copy("quickNavClose") : copy("quickNavOpen")}
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="min-h-12 rounded-full border border-yellow-300/40 bg-[#12051f]/95 px-5 py-3 text-sm font-black text-yellow-100 shadow-[0_0_34px_rgba(234,179,8,0.2)] transition hover:bg-purple-900/90"
      >
        {isOpen ? copy("quickNavClose") : copy("quickNavOpen")}
      </button>
    </div>
  );
}
