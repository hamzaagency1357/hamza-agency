"use client";

import { useEffect } from "react";
import { applySiteLanguage } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

/**
 * Keeps the document element aligned with the persisted site language after hydration.
 * The server-rendered default remains Arabic/RTL until client preferences are available.
 */
export default function SiteLanguageDocumentSync() {
  const language = useSiteLanguage();

  useEffect(() => {
    applySiteLanguage(language);
  }, [language]);

  return null;
}
