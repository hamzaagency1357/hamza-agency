"use client";

import type { ReactNode } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type PublicLanguageMainProps = {
  children: ReactNode;
  className?: string;
};

export default function PublicLanguageMain({ children, className }: PublicLanguageMainProps) {
  const language = useSiteLanguage();
  const direction = getLanguageDirection(language);

  return (
    <main dir={direction} lang={language} className={className}>
      {children}
    </main>
  );
}
