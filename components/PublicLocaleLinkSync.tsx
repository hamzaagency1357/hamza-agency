"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  isSupportedPublicPath,
  localizePublicHref,
} from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

function updateLocalizedLinks(language: ReturnType<typeof useSiteLanguage>) {
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/"]:not([data-no-locale-link])'
  );

  for (const anchor of anchors) {
    const rawHref = anchor.getAttribute("href");
    if (!rawHref || rawHref.startsWith("//")) continue;

    const url = new URL(rawHref, window.location.origin);
    if (!isSupportedPublicPath(url.pathname)) continue;

    const localizedHref = localizePublicHref(
      `${url.pathname}${url.search}${url.hash}`,
      language
    );

    if (rawHref !== localizedHref) {
      anchor.setAttribute("href", localizedHref);
    }
  }
}

export default function PublicLocaleLinkSync() {
  const pathname = usePathname();
  const language = useSiteLanguage();

  useEffect(() => {
    let scheduled = false;
    const update = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        updateLocalizedLinks(language);
      });
    };

    update();

    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });

    return () => observer.disconnect();
  }, [language, pathname]);

  return null;
}
