"use client";

import Link from "next/link";
import { useEffect, useState, type ChangeEvent } from "react";
import {
  ACCEPT_ALL_COOKIE_CONSENT,
  NECESSARY_ONLY_COOKIE_CONSENT,
  readStoredCookieConsent,
  saveCookieConsent,
  type CookieConsentChoices,
} from "@/lib/cookieConsent";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { getCookieConsentCopy } from "@/lib/i18n/privacyAndPwaCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const optionalCategories = [
  "analytics",
  "preferences",
  "marketing",
] as const;

export default function CookieSettingsPage() {
  const language = useSiteLanguage();
  const strings = getCookieConsentCopy(language);
  const descriptions = {
    analytics: strings.analyticsDescription,
    preferences: strings.preferencesDescription,
    marketing: strings.marketingDescription,
  };
  const [choices, setChoices] = useState<CookieConsentChoices>(
    NECESSARY_ONLY_COOKIE_CONSENT
  );
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const stored = readStoredCookieConsent();
    if (stored) {
      setChoices({
        analytics: stored.analytics,
        preferences: stored.preferences,
        marketing: stored.marketing,
      });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    setStatus("");
  }, [language]);

  function persist(next: CookieConsentChoices) {
    saveCookieConsent(next);
    setChoices(next);
    setStatus(strings.savedConfirmation);
  }

  return (
    <main
      dir={getLanguageDirection(language)}
      data-cookie-locale={language}
      data-testid="cookie-settings-page"
      className="min-h-[70svh] overflow-x-clip bg-[#070009] px-4 py-12 text-white sm:px-6 sm:py-16"
    >
      <section className="mx-auto w-full min-w-0 max-w-4xl rounded-[2rem] border border-violet-300/20 bg-white/[0.045] p-5 shadow-[0_24px_80px_rgba(76,29,149,.22)] sm:p-9">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-yellow-200">
          HAMZA AGENCY
        </p>
        <h1 className="mt-3 text-balance text-3xl font-black leading-tight sm:text-5xl">
          {strings.settings}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-white/70 sm:text-lg sm:leading-8">
          {strings.pageDescription}
        </p>
        <Link
          href={localizePublicHref("/cookie-policy", language)}
          className="mt-3 inline-flex min-h-10 items-center text-sm font-bold text-violet-200 underline underline-offset-4"
          data-testid="cookie-settings-policy"
        >
          {strings.policy}
        </Link>

        <div
          className="mt-7 grid min-w-0 gap-3"
          data-testid="cookie-settings-categories"
        >
          <label
            htmlFor="cookie-settings-necessary"
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5"
          >
            <span className="min-w-0">
              <span className="block text-base font-black">
                {strings.necessary}
              </span>
              <span className="mt-1 block text-sm leading-6 text-white/65">
                {strings.necessaryDescription}
              </span>
            </span>
            <input
              id="cookie-settings-necessary"
              type="checkbox"
              checked
              disabled
              readOnly
              aria-label={strings.necessary}
              data-testid="cookie-settings-necessary"
              className="h-6 w-6 flex-none accent-violet-500"
            />
          </label>

          {optionalCategories.map((key) => (
            <label
              key={key}
              htmlFor={`cookie-settings-${key}`}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5"
            >
              <span className="min-w-0">
                <span className="block text-base font-black">
                  {strings[key]}
                </span>
                <span className="mt-1 block text-sm leading-6 text-white/65">
                  {descriptions[key]}
                </span>
              </span>
              <input
                id={`cookie-settings-${key}`}
                type="checkbox"
                checked={choices[key]}
                disabled={!hydrated}
                aria-label={strings[key]}
                data-testid={`cookie-settings-choice-${key}`}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setChoices((current) => ({
                    ...current,
                    [key]: event.target.checked,
                  }))
                }
                className="h-6 w-6 flex-none accent-violet-500"
              />
            </label>
          ))}
        </div>

        <p
          role="status"
          aria-live="polite"
          data-testid="cookie-settings-status"
          className="mt-5 min-h-7 text-sm font-bold text-emerald-200"
        >
          {status}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={!hydrated}
            onClick={() => persist(choices)}
            className="min-h-12 rounded-xl bg-violet-600 px-5 py-3 font-black disabled:cursor-wait disabled:opacity-60"
            data-testid="cookie-settings-save-selected"
          >
            {strings.saveSelected}
          </button>
          <button
            type="button"
            disabled={!hydrated}
            onClick={() => persist(ACCEPT_ALL_COOKIE_CONSENT)}
            className="min-h-12 rounded-xl border border-violet-300/35 px-5 py-3 font-black text-violet-100 disabled:cursor-wait disabled:opacity-60"
            data-testid="cookie-settings-accept-all"
          >
            {strings.acceptAll}
          </button>
          <button
            type="button"
            disabled={!hydrated}
            onClick={() => persist(NECESSARY_ONLY_COOKIE_CONSENT)}
            className="min-h-12 rounded-xl border border-white/15 px-5 py-3 font-black text-white/85 disabled:cursor-wait disabled:opacity-60"
            data-testid="cookie-settings-necessary-only"
          >
            {strings.necessaryOnly}
          </button>
          <Link
            href={localizePublicHref("/", language)}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/15 px-5 py-3 text-center font-black text-white/85"
            data-testid="cookie-settings-back"
          >
            {strings.backToWebsite}
          </Link>
        </div>
      </section>
    </main>
  );
}
