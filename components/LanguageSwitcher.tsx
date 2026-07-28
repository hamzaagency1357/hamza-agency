"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  getLanguageDirection,
  setStoredSiteLanguage,
  SITE_LANGUAGES,
  type SiteLanguage,
} from "@/lib/i18n/locale";
import { localizePublicPath } from "@/lib/i18n/publicLocales";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const scopeCopy: Record<SiteLanguage, string> = {
  ar: "تم تفعيل الترجمة الكاملة للصفحات العامة والمحتوى والنماذج إلى العربية والإنجليزية والتركية.",
  en: "Full translation is active across public pages, content, and forms in Arabic, English, and Turkish.",
  tr: "Genel sayfalar, içerikler ve formlar için Arapça, İngilizce ve Türkçe tam çeviri etkindir.",
};

const languageNames: Record<
  SiteLanguage,
  Record<SiteLanguage, string>
> = {
  ar: { ar: "العربية", en: "الإنجليزية", tr: "التركية" },
  en: { ar: "Arabic", en: "English", tr: "Turkish" },
  tr: { ar: "Arapça", en: "İngilizce", tr: "Türkçe" },
};

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const language = useSiteLanguage();
  const [showScope, setShowScope] = useState(false);
  const copy = (key: Parameters<typeof getStaticCopy>[1]) => getStaticCopy(language, key);

  if (pathname.startsWith("/admin") || pathname === "/maintenance") return null;

  function changeLanguage(nextLanguage: SiteLanguage) {
    if (nextLanguage === language) return;

    setStoredSiteLanguage(nextLanguage);
    window.location.assign(
      `${localizePublicPath(pathname, nextLanguage)}${window.location.search}${window.location.hash}`
    );
  }

  return (
    <div
      dir={getLanguageDirection(language)}
      className="hamza-language-switcher fixed left-3 top-3 z-[170] print:hidden sm:left-4 sm:top-4"
    >
      <div
        className="rounded-2xl border border-white/10 bg-[#09000f]/85 p-1 shadow-[0_0_35px_rgba(124,58,237,0.22)] backdrop-blur-xl"
        onMouseEnter={() => setShowScope(true)}
        onMouseLeave={() => setShowScope(false)}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowScope((current) => !current)}
            className="hidden px-3 text-xs font-black text-white/45 transition hover:text-white/75 sm:inline"
            aria-label={copy("languageSwitcherLabel")}
          >
            {copy("languageInterface")}
          </button>

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
                    ? "bg-gradient-to-r from-purple-600 to-yellow-500 text-white shadow-[0_0_22px_rgba(168,85,247,0.28)]"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {showScope && (
          <div
            className="mt-1 max-w-64 px-3 pb-2 text-[11px] leading-5 text-white/48"
            dir={getLanguageDirection(language)}
          >
            {scopeCopy[language]}
          </div>
        )}
      </div>
    </div>
  );
}
