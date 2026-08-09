"use client";

import Link from "next/link";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const labels = {
  ar: "الدعم الذكي",
  en: "Smart Support",
  tr: "Akıllı Destek",
} as const;

export default function DigitalSmartSupportLink() {
  const language = useSiteLanguage();
  return (
    <Link
      href={localizePublicHref("/ai-support", language)}
      className="inline-flex min-h-11 items-center justify-center rounded-full border border-green-300/25 bg-green-500/10 px-6 py-3 text-sm font-black text-green-100 transition hover:bg-green-500/15"
    >
      {labels[language]}
    </Link>
  );
}
