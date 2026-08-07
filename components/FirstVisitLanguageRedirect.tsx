"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FIRST_VISIT_LANGUAGE_SESSION_KEY,
  languageHomepage,
  resolveFirstVisitLanguage,
} from "@/lib/i18n/firstVisitLanguage.mjs";
import { SITE_LANGUAGE_STORAGE_KEY } from "@/lib/i18n/locale";

export default function FirstVisitLanguageRedirect() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return;

    let alreadyResolved = false;
    try {
      alreadyResolved =
        window.sessionStorage.getItem(FIRST_VISIT_LANGUAGE_SESSION_KEY) === "1";
    } catch {
      alreadyResolved = false;
    }

    let savedLanguage: string | null = null;
    try {
      savedLanguage = window.localStorage.getItem(
        SITE_LANGUAGE_STORAGE_KEY
      );
    } catch {
      savedLanguage = null;
    }

    const language = resolveFirstVisitLanguage({
      pathname,
      savedLanguage,
      navigatorLanguages: window.navigator.languages?.length
        ? window.navigator.languages
        : [window.navigator.language],
      userAgent: window.navigator.userAgent,
      alreadyResolved,
    });

    try {
      window.sessionStorage.setItem(FIRST_VISIT_LANGUAGE_SESSION_KEY, "1");
    } catch {
      // Privacy modes can disable sessionStorage. The URL check still prevents loops.
    }

    if (!language || language === "ar") return;

    const target = `${languageHomepage(language)}${window.location.search}${window.location.hash}`;
    router.replace(target, { scroll: false });
  }, [pathname, router]);

  return null;
}
