"use client";

import { useEffect } from "react";
import { applySiteLanguage } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

/**
 * Keeps client navigation aligned with the locale already selected by middleware.
 */
export default function SiteLanguageDocumentSync() {
  const language = useSiteLanguage();

  useEffect(() => {
    applySiteLanguage(language);
  }, [language]);

  return null;
}
