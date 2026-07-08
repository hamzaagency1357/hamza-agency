"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type PublicBackHomeLinkProps = {
  className?: string;
};

export default function PublicBackHomeLink({
  className = "mb-8 inline-block text-purple-200",
}: PublicBackHomeLinkProps) {
  const language = useSiteLanguage();
  const direction = getLanguageDirection(language);

  return (
    <Link href="/" dir={direction} lang={language} className={className}>
      ← {getStaticCopy(language, "backHome")}
    </Link>
  );
}
