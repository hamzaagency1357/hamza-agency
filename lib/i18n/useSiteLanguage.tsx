"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
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
  const [isHydrated, setIsHydrated] = useState(false);
  const nextLanguage = getPathLanguage(pathname || "/");
  // Rewrites can expose the internal Arabic route during server rendering.
  // Use the URL-derived server locale until the browser pathname is available.
  const language = isHydrated && isSupportedPublicPath(pathname || "/")
    ? nextLanguage
    : initialLanguage;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
