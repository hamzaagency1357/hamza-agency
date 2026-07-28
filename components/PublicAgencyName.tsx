"use client";

import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

export default function PublicAgencyName({ value }: { value: string }) {
  const language = useSiteLanguage();

  return <>{language === "ar" ? value : "HAMZA AGENCY"}</>;
}
