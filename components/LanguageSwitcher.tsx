"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  rememberLanguagePreference,
  SITE_LANGUAGES,
  type SiteLanguage,
} from "@/lib/i18n/locale";
import {
  getPathLanguage,
  localizePublicPath,
} from "@/lib/i18n/publicLocales";

const ariaLabels: Record<SiteLanguage, string> = {
  ar: "اختيار لغة الموقع",
  en: "Choose site language",
  tr: "Site dilini seçin",
};

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const activeLanguage = getPathLanguage(pathname || "/");
  const [isNavigating, setIsNavigating] = useState(false);

  const localizedTargets = useMemo(
    () =>
      Object.fromEntries(
        SITE_LANGUAGES.map(({ code }) => [
          code,
          localizePublicPath(pathname || "/", code),
        ])
      ) as Record<SiteLanguage, string>,
    [pathname]
  );

  function changeLanguage(nextLanguage: SiteLanguage) {
    if (isNavigating || nextLanguage === activeLanguage) return;

    setIsNavigating(true);
    rememberLanguagePreference(nextLanguage);
    const target = `${localizedTargets[nextLanguage]}${window.location.search}${window.location.hash}`;
    window.location.assign(target);
  }

  return (
    <div
      className="hamza-language-segmented inline-grid grid-cols-3 overflow-hidden rounded-xl border border-white/15 bg-[#09000f]/90 p-1 shadow-[0_0_24px_rgba(124,58,237,0.18)] backdrop-blur-xl"
      role="group"
      aria-label={ariaLabels[activeLanguage]}
      data-language-switcher="segmented"
      aria-busy={isNavigating}
    >
      {SITE_LANGUAGES.map(({ code, shortLabel, label }) => {
        const active = code === activeLanguage;
        return (
          <button
            key={code}
            type="button"
            disabled={isNavigating}
            onClick={() => changeLanguage(code)}
            aria-current={active ? "page" : undefined}
            aria-label={shortLabel}
            title={label}
            data-language-code={code}
            className={`min-h-11 min-w-11 rounded-lg px-2 text-xs font-black transition disabled:cursor-wait ${
              active
                ? "bg-gradient-to-r from-purple-600 to-yellow-500 text-white"
                : "text-white/65 hover:bg-white/10 hover:text-white"
            }`}
          >
            {shortLabel}
          </button>
        );
      })}
    </div>
  );
}
