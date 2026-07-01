"use client";

import { useEffect } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import {
  getKnownHomeSharedChromeText,
  getSharedNavigationLabelByHref,
} from "@/lib/i18n/sharedChrome";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

function setTextIfChanged(element: HTMLElement, nextText: string) {
  if (element.textContent === nextText) return;
  element.textContent = nextText;
}

/**
 * The homepage header and footer are currently rendered inside app/page.tsx and
 * receive configurable link labels from public CMS settings. This bridge runs
 * after hydration to keep that CMS ownership intact: known route labels are
 * localized by href, while unknown/custom CMS labels remain untouched.
 */
export default function HomeSharedChromeTranslationBridge() {
  const language = useSiteLanguage();

  useEffect(() => {
    const root = document.querySelector("main");
    if (!root) return;

    const direction = getLanguageDirection(language);
    let scheduled = false;

    const applySharedChromeLanguage = () => {
      scheduled = false;

      if (root.getAttribute("dir") !== direction) {
        root.setAttribute("dir", direction);
      }

      root.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
        // Preserve the logo/brand link and any structured custom content.
        if (anchor.children.length > 0) return;

        const nextLabel = getSharedNavigationLabelByHref(
          language,
          anchor.getAttribute("href") || "",
          anchor.textContent || ""
        );

        setTextIfChanged(anchor, nextLabel);
      });

      root.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        if (button.children.length > 0) return;
        setTextIfChanged(
          button,
          getKnownHomeSharedChromeText(language, button.textContent || "")
        );
      });

      root.querySelectorAll<HTMLElement>("footer h3").forEach((heading) => {
        setTextIfChanged(
          heading,
          getKnownHomeSharedChromeText(language, heading.textContent || "")
        );
      });
    };

    const scheduleApply = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(applySharedChromeLanguage);
    };

    applySharedChromeLanguage();

    const observer = new MutationObserver(scheduleApply);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["dir", "href"],
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  return null;
}
