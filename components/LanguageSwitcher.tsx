"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getLanguageDirection,
  setStoredSiteLanguage,
  SITE_LANGUAGES,
  type SiteLanguage,
} from "@/lib/i18n/locale";
import {
  localizePublicPath,
  stripLocalePrefix,
} from "@/lib/i18n/publicLocales";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const languageNames: Record<
  SiteLanguage,
  Record<SiteLanguage, string>
> = {
  ar: { ar: "العربية", en: "الإنجليزية", tr: "التركية" },
  en: { ar: "Arabic", en: "English", tr: "Turkish" },
  tr: { ar: "Arapça", en: "İngilizce", tr: "Türkçe" },
};

function findOrCreateHeaderTarget(pathname: string) {
  const main = document.querySelector<HTMLElement>("main");
  if (!main) return { target: null, created: null };

  if (stripLocalePrefix(pathname || "/") === "/") {
    const homeHeader = main.querySelector<HTMLElement>(":scope > nav");
    if (homeHeader) return { target: homeHeader, created: null };
  }

  const existing = main.querySelector<HTMLElement>(
    ":scope > [data-inline-language-host='true']"
  );
  if (existing) return { target: existing, created: null };

  const host = document.createElement("div");
  host.dataset.inlineLanguageHost = "true";
  host.className = "hamza-inline-language-host";
  main.insertBefore(host, main.firstChild);
  return { target: host, created: host };
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const language = useSiteLanguage();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const copy = (key: Parameters<typeof getStaticCopy>[1]) =>
    getStaticCopy(language, key);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname === "/maintenance") {
      setTarget(null);
      return;
    }

    let active = true;
    let createdHost: HTMLElement | null = null;

    const syncTarget = () => {
      if (!active) return;
      const result = findOrCreateHeaderTarget(pathname || "/");
      if (!result.target) return;
      createdHost = result.created;
      setTarget(result.target);
    };

    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    syncTarget();

    return () => {
      active = false;
      observer.disconnect();
      setMobileOpen(false);
      if (createdHost?.isConnected) createdHost.remove();
    };
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const closeOnOutsidePress = (event: MouseEvent | TouchEvent) => {
      const node = event.target as Node | null;
      if (node && switcherRef.current?.contains(node)) return;
      setMobileOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("touchstart", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("touchstart", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  if (
    pathname.startsWith("/admin") ||
    pathname === "/maintenance" ||
    !target
  ) {
    return null;
  }

  function changeLanguage(nextLanguage: SiteLanguage) {
    if (nextLanguage === language) {
      setMobileOpen(false);
      return;
    }

    setStoredSiteLanguage(nextLanguage);
    window.location.assign(
      `${localizePublicPath(pathname, nextLanguage)}${window.location.search}${window.location.hash}`
    );
  }

  return createPortal(
    <div
      ref={switcherRef}
      dir={getLanguageDirection(language)}
      className="hamza-language-switcher relative z-[175] shrink-0 print:hidden"
      data-language-switcher-location="header"
    >
      <div className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-[#09000f]/82 p-1 shadow-[0_0_28px_rgba(124,58,237,0.18)] backdrop-blur-xl md:flex">
        {SITE_LANGUAGES.map((item) => {
          const active = item.code === language;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => changeLanguage(item.code)}
              aria-label={`${copy("languageSwitcherLabel")}: ${languageNames[language][item.code]}`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-3 py-2 text-xs font-black transition ${
                active
                  ? "bg-gradient-to-r from-purple-600 to-yellow-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.shortLabel}
            </button>
          );
        })}
      </div>

      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label={copy("languageSwitcherLabel")}
          aria-haspopup="menu"
          aria-expanded={mobileOpen}
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/12 bg-[#09000f]/92 px-3 py-2 text-xs font-black text-white shadow-[0_0_24px_rgba(124,58,237,0.2)] backdrop-blur-xl"
        >
          <span>{language.toUpperCase()}</span>
          <span aria-hidden="true" className="text-[10px] text-yellow-200/80">
            ▾
          </span>
        </button>

        {mobileOpen ? (
          <div
            role="menu"
            className="absolute top-[calc(100%+0.5rem)] min-w-36 rounded-2xl border border-purple-300/25 bg-[#09000f]/98 p-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl [inset-inline-end:0]"
          >
            {SITE_LANGUAGES.map((item) => {
              const active = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="menuitem"
                  onClick={() => changeLanguage(item.code)}
                  className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-purple-500/20 text-yellow-100"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{languageNames[language][item.code]}</span>
                  <span className="text-xs text-white/45">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>,
    target
  );
}
