"use client";

import { useEffect, useState } from "react";
import {
  getStoredSiteLanguage,
  SITE_LANGUAGE_CHANGE_EVENT,
  type SiteLanguage,
} from "@/lib/i18n/locale";

export function useSiteLanguage() {
  const [language, setLanguage] = useState<SiteLanguage>("ar");

  useEffect(() => {
    function syncLanguage() {
      setLanguage(getStoredSiteLanguage());
    }

    syncLanguage();
    window.addEventListener(SITE_LANGUAGE_CHANGE_EVENT, syncLanguage);
    window.addEventListener("storage", syncLanguage);

    return () => {
      window.removeEventListener(SITE_LANGUAGE_CHANGE_EVENT, syncLanguage);
      window.removeEventListener("storage", syncLanguage);
    };
  }, []);

  return language;
}
