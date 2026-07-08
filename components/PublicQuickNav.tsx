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
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getSharedNavigationGroupTitle, getSharedNavigationLabel } from "@/lib/i18n/sharedChrome";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const hiddenPublicQuickNavRoutes = ["/maintenance"];
const containerClassName =
  "fixed bottom-[7.75rem] right-4 z-[160] print:hidden md:bottom-6 md:left-6 md:right-auto";
const panelClassName =
  "mb-3 max-h-[calc(100svh-10.5rem)] w-[min(340px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-purple-400/25 bg-[#09000f]/95 p-3 pt-4 shadow-[0_0_70px_rgba(124,58,237,0.35)] backdrop-blur-xl";
const groupTitleClassName =
  "rounded-2xl border border-purple-400/15 bg-purple-500/10 px-3 py-2 text-xs font-black text-purple-100";
const linkBaseClassName = "rounded-2xl border px-4 py-3 text-sm font-bold transition";
const activeLinkClassName = "border-yellow-300/35 bg-yellow-400/15 text-yellow-100";
const inactiveLinkClassName =
  "border-white/10 bg-white/[0.04] text-white/75 hover:border-purple-300/45 hover:bg-purple-500/10 hover:text-white";
const mobilePolishStyles = `
body.public-site-page footer h3 + p,
body.public-site-page footer p.break-all {
  direction: ltr !important;
  unicode-bidi: isolate !important;
  text-align: left !important;
  max-width: 100% !important;
  display: block !important;
}

body.public-site-page footer h3 + p {
  white-space: nowrap !important;
}

body.public-site-page footer p.break-all {
  margin-top: 0.5rem !important;
  white-space: nowrap !important;
  word-break: normal !important;
  overflow-wrap: normal !important;
}

@media (max-width: 768px) {
  body.public-quick-nav-open > div[class*="top-3"][class*="left-3"],
  body.public-quick-nav-open > div[class*="top-4"][class*="left-4"] {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  body.public-site-page footer {
    padding-bottom: calc(7.5rem + env(safe-area-inset-bottom, 0px)) !important;
  }

  body.public-site-page footer p.break-all {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }
}
`;

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

function sanitizePublicQuickNavGroups(groups: PublicNavigationGroup[]) {
  return groups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => isSafePublicHref(link.href) && link.isVisible !== false),
    }))
    .filter((group) => group.isVisible !== false && group.links.length > 0);
}

function isInternalHref(href: string) {
  return href.startsWith("/") || href.startsWith("#");
}

function PublicQuickNavLink({
  link,
  active,
  onClick,
  label,
}: {
  link: PublicNavigationLink;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  const className = getLinkClassName(active);
  const content = (
    <>
      <span className="block">{label}</span>
      <span className="mt-1 block text-[11px] font-normal text-white/38" dir="ltr">
        {link.href}
      </span>
    </>
  );

  if (isInternalHref(link.href)) {
    return (
      <Link href={link.href} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <a href={link.href} target={link.target || "_blank"} rel={link.rel || "noreferrer"} onClick={onClick} className={className}>
      {content}
    </a>
  );
}

export default function PublicQuickNav() {
  const pathname = usePathname();
  const language = useSiteLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [quickNavGroups, setQuickNavGroups] = useState<PublicNavigationGroup[]>(
    defaultPublicNavigationConfig.quickNavGroups
  );
  const copy = (key: Parameters<typeof getStaticCopy>[1]) => getStaticCopy(language, key);

  useEffect(() => {
    let isMounted = true;

    async function loadNavigation() {
      const config = await getPublicNavigationConfig();
      if (!isMounted) return;
      setQuickNavGroups(sanitizePublicQuickNavGroups(config.quickNavGroups));
    }

    void loadNavigation();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("public-quick-nav-open", isOpen);

    return () => {
      document.body.classList.remove("public-quick-nav-open");
    };
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const visibleGroups = useMemo(() => {
    const sanitizedGroups = sanitizePublicQuickNavGroups(quickNavGroups);
    return sanitizedGroups.length ? sanitizedGroups : defaultPublicNavigationConfig.quickNavGroups;
  }, [quickNavGroups]);

  if (shouldHidePublicQuickNav(pathname)) return null;

  return (
    <>
      <style>{mobilePolishStyles}</style>
      <div dir={getLanguageDirection(language)} className={containerClassName}>
        {isOpen && (
          <div className={panelClassName}>
            <div className="mb-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
              <div className="text-xs font-black uppercase tracking-[0.25em] text-yellow-200">
                HAMZA AGENCY
              </div>
              <div className="mt-1 text-sm font-black text-white">{copy("quickNavTitle")}</div>
              <p className="mt-2 text-xs leading-6 text-white/55">
                {copy("quickNavDescription")}
              </p>
            </div>

            <nav className="grid gap-4">
              {visibleGroups.map((group) => (
                <div key={group.title} className="grid gap-2">
                  <div className={groupTitleClassName}>{getSharedNavigationGroupTitle(language, group)}</div>

                  {group.links.map((link) => {
                    const active = isInternalHref(link.href) ? isActiveLink(pathname, link.href) : false;

                    return (
                      <PublicQuickNavLink
                        key={`${group.title}-${link.href}-${link.label}`}
                        link={link}
                        active={active}
                        label={getSharedNavigationLabel(language, link)}
                        onClick={() => setIsOpen(false)}
                      />
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
          aria-label={isOpen ? copy("quickNavClose") : copy("quickNavOpen")}
          className="rounded-full border border-yellow-300/40 bg-[#12051f]/95 px-4 py-3 text-xs font-black text-yellow-100 shadow-[0_0_34px_rgba(234,179,8,0.2)] transition hover:bg-purple-900/90 md:px-5 md:text-sm"
        >
          {isOpen ? copy("quickNavClose") : copy("quickNavOpen")}
        </button>
      </div>
    </>
  );
}
