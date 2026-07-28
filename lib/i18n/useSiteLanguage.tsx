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
import {
  applySiteLanguage,
  getStoredSiteLanguage,
  SITE_LANGUAGE_CHANGE_EVENT,
  setStoredSiteLanguage,
  type SiteLanguage,
} from "@/lib/i18n/locale";
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
    if (!isSupportedPublicPath(pathname || "/")) {
      return;
    }

    const pathLanguage = getPathLanguage(pathname || "/");
    const nextLanguage =
      pathLanguage === "ar" && initialLanguage !== "ar"
        ? initialLanguage
        : pathLanguage;
    setLanguage(nextLanguage);
    setStoredSiteLanguage(nextLanguage);
  }, [initialLanguage, pathname]);

  useEffect(() => {
    function syncLanguage() {
      const nextLanguage = getStoredSiteLanguage();
      setLanguage(nextLanguage);
      applySiteLanguage(nextLanguage);
    }

    window.addEventListener(SITE_LANGUAGE_CHANGE_EVENT, syncLanguage);
    window.addEventListener("storage", syncLanguage);

    return () => {
      window.removeEventListener(SITE_LANGUAGE_CHANGE_EVENT, syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

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
