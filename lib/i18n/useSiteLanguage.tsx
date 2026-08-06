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
  const [language, setLanguage] = useState<SiteLanguage>(initialLanguage);

  useEffect(() => {
    if (!isSupportedPublicPath(pathname || "/")) return;

    const nextLanguage = getPathLanguage(pathname || "/");
    setLanguage(nextLanguage);
    applySiteLanguage(nextLanguage);
  }, [pathname]);

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
