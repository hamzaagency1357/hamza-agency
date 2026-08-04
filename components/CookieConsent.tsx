"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ACCEPT_ALL_COOKIE_CONSENT,
  applyCookieConsentToDocument,
  COOKIE_CONSENT_UPDATED_EVENT,
  NECESSARY_ONLY_COOKIE_CONSENT,
  readStoredCookieConsent,
  saveCookieConsent,
  type CookieConsentChoices,
  type CookieConsentRecord,
} from "@/lib/cookieConsent";
import { getLanguageDirection } from "@/lib/i18n/locale";
import {
  getPathLanguage,
  localizePublicHref,
  stripLocalePrefix,
} from "@/lib/i18n/publicLocales";
import { getCookieConsentCopy } from "@/lib/i18n/privacyAndPwaCopy";

type Surface = "loading" | "closed" | "banner";

export default function CookieConsent() {
  const pathname = usePathname();
  const locale = getPathLanguage(pathname || "/");
  const publicPath = stripLocalePrefix(pathname || "/");
  const strings = getCookieConsentCopy(locale);
  const [surface, setSurface] = useState<Surface>("loading");

  useEffect(() => {
    const stored = readStoredCookieConsent();
    if (stored) {
      applyCookieConsentToDocument(stored);
      setSurface("closed");
      return;
    }

    setSurface(publicPath === "/cookie-settings" ? "closed" : "banner");
  }, [publicPath]);

  useEffect(() => {
    const closeAfterSave = (event: Event) => {
      const record = (event as CustomEvent<CookieConsentRecord>).detail;
      if (record) applyCookieConsentToDocument(record);
      setSurface("closed");
    };

    window.addEventListener(
      COOKIE_CONSENT_UPDATED_EVENT,
      closeAfterSave
    );
    return () =>
      window.removeEventListener(
        COOKIE_CONSENT_UPDATED_EVENT,
        closeAfterSave
      );
  }, []);

  function save(choices: CookieConsentChoices) {
    saveCookieConsent(choices);
    setSurface("closed");
  }

  if (surface !== "banner") return null;

  return (
    <section
      role="region"
      aria-labelledby="cookie-banner-title"
      dir={getLanguageDirection(locale)}
      data-cookie-locale={locale}
      data-testid="cookie-banner"
      className="hamza-cookie-banner rounded-2xl border border-violet-300/25 bg-[#0b0710]/96 p-4 text-white shadow-2xl backdrop-blur-xl"
    >
      <div className="hamza-cookie-banner-content min-w-0">
        <h2 id="cookie-banner-title" className="text-base font-black">
          {strings.title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-white/70">
          {strings.body}
        </p>
        <Link
          href={localizePublicHref("/cookie-policy", locale)}
          className="mt-1.5 inline-flex text-xs font-bold text-violet-200 underline underline-offset-4"
          data-testid="cookie-policy-link"
        >
          {strings.policy}
        </Link>
      </div>

      <div className="hamza-cookie-banner-actions mt-3">
        <button
          type="button"
          onClick={() => save(ACCEPT_ALL_COOKIE_CONSENT)}
          className="hamza-cookie-banner-primary min-h-11 rounded-xl bg-violet-600 px-4 py-2 text-sm font-black"
          data-testid="cookie-accept-all"
        >
          {strings.acceptAll}
        </button>
        <button
          type="button"
          onClick={() => save(NECESSARY_ONLY_COOKIE_CONSENT)}
          className="hamza-cookie-banner-secondary min-h-11 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white/85"
          data-testid="cookie-necessary-only"
        >
          {strings.necessaryOnly}
        </button>
        <Link
          href={localizePublicHref("/cookie-settings", locale)}
          className="hamza-cookie-banner-manage inline-flex min-h-10 items-center justify-center px-2 text-sm font-bold text-violet-200 underline underline-offset-4"
          data-testid="cookie-manage-preferences"
        >
          {strings.managePreferences}
        </Link>
      </div>
    </section>
  );
}
