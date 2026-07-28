"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { translateSiteRuntimeText } from "@/lib/i18n/siteRuntimeTranslations";

const ATTRIBUTE_NAMES = ["placeholder", "aria-label", "title", "alt"] as const;

function translateMarkedElement(element: HTMLElement, language: "ar" | "en" | "tr") {
  const source = element.dataset.runtimeTranslateSource || element.textContent || "";
  if (source.trim()) element.textContent = translateSiteRuntimeText(source, language);

  for (const attribute of ATTRIBUTE_NAMES) {
    const sourceAttribute = element.getAttribute(`data-runtime-${attribute}`);
    if (sourceAttribute) {
      element.setAttribute(attribute, translateSiteRuntimeText(sourceAttribute, language));
    }
  }
}

export default function PublicSiteRuntimeTranslator() {
  const pathname = usePathname();
  const language = useSiteLanguage();

  useLayoutEffect(() => {
    if (pathname.startsWith("/admin") || pathname === "/maintenance") return;

    document
      .querySelectorAll<HTMLElement>("[data-runtime-translate='true']")
      .forEach((element) => translateMarkedElement(element, language));
  }, [language, pathname]);

  return null;
}
