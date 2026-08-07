"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { applySiteLanguage, type SiteLanguage } from "@/lib/i18n/locale";
import {
  getPathLanguage,
  isSupportedPublicPath,
} from "@/lib/i18n/publicLocales";

const SiteLanguageContext = createContext<SiteLanguage>("ar");

export function SiteLanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: SiteLanguage;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const nextLanguage = getPathLanguage(pathname || "/");
  const language = isSupportedPublicPath(pathname || "/")
    ? nextLanguage
    : initialLanguage;

  useEffect(() => {
    applySiteLanguage(language);
  }, [language]);

  const value = useMemo(() => language, [language]);

  return (
    <SiteLanguageContext.Provider value={value}>
      {children}
    </SiteLanguageContext.Provider>
  );
}

export function useSiteLanguage() {
  return useContext(SiteLanguageContext);
}
