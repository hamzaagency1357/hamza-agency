"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  setStoredSiteLanguage,
  SITE_LANGUAGES,
  type SiteLanguage,
} from "@/lib/i18n/locale";
import { localizePublicPath } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const language = useSiteLanguage();
  const [activeLanguage, setActiveLanguage] = useState<SiteLanguage>(language);
  const [locationSuffix, setLocationSuffix] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => setActiveLanguage(language), [language]);
  useEffect(() => {
    setLocationSuffix(`${window.location.search}${window.location.hash}`);
  }, [pathname]);

  const localizedTargets = useMemo(
    () =>
      Object.fromEntries(
        SITE_LANGUAGES.map(({ code }) => [
          code,
          `${localizePublicPath(pathname || "/", code)}${locationSuffix}`,
        ])
      ) as Record<SiteLanguage, string>,
    [locationSuffix, pathname]
  );

  useEffect(() => {
    for (const target of Object.values(localizedTargets)) router.prefetch(target);
  }, [localizedTargets, router]);

  function changeLanguage(nextLanguage: SiteLanguage) {
    if (isPending || nextLanguage === activeLanguage) return;
    setActiveLanguage(nextLanguage);
    setStoredSiteLanguage(nextLanguage);
    startTransition(() => {
      router.replace(localizedTargets[nextLanguage], { scroll: false });
    });
  }

  return (
    <div
      className="hamza-language-segmented inline-grid grid-cols-3 overflow-hidden rounded-xl border border-white/15 bg-[#09000f]/90 p-1 shadow-[0_0_24px_rgba(124,58,237,0.18)] backdrop-blur-xl"
      role="group"
      aria-label="Language"
      data-language-switcher="segmented"
      aria-busy={isPending}
    >
      {SITE_LANGUAGES.map(({ code, shortLabel }) => {
        const active = code === activeLanguage;
        return (
          <button
            key={code}
            type="button"
            disabled={isPending}
            onClick={() => changeLanguage(code)}
            aria-current={active ? "page" : undefined}
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
