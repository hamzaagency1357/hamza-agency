"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const language = useSiteLanguage();
  const [activeLanguage, setActiveLanguage] = useState<SiteLanguage>(language);
  const [isPending, startTransition] = useTransition();

  useEffect(() => setActiveLanguage(language), [language]);

  const localizedTargets = useMemo(() => {
    const query = searchParams.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    return Object.fromEntries(
      SITE_LANGUAGES.map(({ code }) => {
        const localizedPath = localizePublicPath(pathname || "/", code);
        return [code, `${localizedPath}${query ? `?${query}` : ""}${hash}`];
      })
    ) as Record<SiteLanguage, string>;
  }, [pathname, searchParams]);

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
