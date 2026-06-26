"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  applySiteLanguage,
  getStoredSiteLanguage,
  setStoredSiteLanguage,
  SITE_LANGUAGES,
  type SiteLanguage,
} from "@/lib/i18n/locale";
import { getStaticCopy } from "@/lib/i18n/staticCopy";

const helperText: Record<SiteLanguage, string> = {
  ar: "واجهة اللغة",
  en: "Language UI",
  tr: "Dil arayüzü",
};

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const [language, setLanguage] = useState<SiteLanguage>("ar");
  const [isReady, setIsReady] = useState(false);
  const [showScope, setShowScope] = useState(false);

  useEffect(() => {
    const preferredLanguage = getStoredSiteLanguage();
    setLanguage(preferredLanguage);
    applySiteLanguage(preferredLanguage);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    setStoredSiteLanguage(language);
  }, [language, isReady]);

  if (pathname.startsWith("/admin") || pathname === "/maintenance") return null;

  return (
    <div dir="ltr" className="fixed left-3 top-3 z-[120] print:hidden sm:left-4 sm:top-4">
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
            aria-label="شرح نطاق تبديل اللغة"
          >
            {helperText[language]}
          </button>

          {SITE_LANGUAGES.map((item) => {
            const active = item.code === language;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                aria-label={`Switch language UI to ${item.label}`}
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
          <div className="mt-1 max-w-56 px-3 pb-2 text-[11px] leading-5 text-white/48" dir={language === "ar" ? "rtl" : "ltr"}>
            {getStaticCopy(language, "languageScope")}
          </div>
        )}
      </div>
    </div>
  );
}
