"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { getPwaRuntimeCopy } from "@/lib/i18n/privacyAndPwaCopy";

type InstallState = {
  available: boolean;
  installed: boolean;
  outcome?: "accepted" | "dismissed";
};

type BrowserContext = "checking" | "standalone" | "custom-tab" | "ios" | "browser";

const STATE_EVENT = "hamza:pwa-install-state";
const QUERY_EVENT = "hamza:pwa-install-query";
const REQUEST_EVENT = "hamza:pwa-install-request";

function detectContext(): BrowserContext {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true) return "standalone";
  if (document.referrer.startsWith("android-app://")) return "custom-tab";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  return "browser";
}

export default function InstallAppPage({ language }: { language: SiteLanguage }) {
  const strings = getPwaRuntimeCopy(language);
  const [context, setContext] = useState<BrowserContext>("checking");
  const [installState, setInstallState] = useState<InstallState>({ available: false, installed: false });

  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<InstallState>).detail;
      if (detail) setInstallState(detail);
    };
    setContext(detectContext());
    window.addEventListener(STATE_EVENT, update);
    window.dispatchEvent(new Event(QUERY_EVENT));
    return () => window.removeEventListener(STATE_EVENT, update);
  }, []);

  const chromeIntent = typeof window === "undefined"
    ? "#"
    : `intent://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}#Intent;scheme=https;package=com.android.chrome;end`;

  const installed = context === "standalone" || installState.installed;
  const ready = context === "browser" && installState.available && !installed;

  function requestInstall() {
    window.dispatchEvent(new Event(REQUEST_EVENT));
  }

  return (
    <main
      dir={getLanguageDirection(language)}
      data-testid="install-app-page"
      className="min-h-[70svh] bg-[#070009] px-4 py-12 text-white sm:px-6"
    >
      <section className="mx-auto w-full max-w-3xl rounded-[2rem] border border-violet-300/20 bg-white/[0.045] p-6 shadow-[0_24px_80px_rgba(76,29,149,.22)] sm:p-10">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-yellow-200">{strings.pageEyebrow}</p>
        <h1 className="mt-4 text-balance text-4xl font-black leading-tight sm:text-5xl">{strings.pageTitle}</h1>
        <p className="mt-5 text-lg leading-8 text-white/70">{strings.pageDescription}</p>

        <div data-testid="install-app-status" className="mt-8 rounded-3xl border border-white/10 bg-black/25 p-5 sm:p-6">
          {installed ? (
            <>
              <h2 className="text-2xl font-black text-emerald-200">{strings.installedTitle}</h2>
              <p className="mt-3 leading-7 text-white/70">{strings.installedDescription}</p>
            </>
          ) : context === "custom-tab" ? (
            <div data-testid="install-custom-tab-instructions">
              <h2 className="text-2xl font-black text-yellow-200">{strings.customTabTitle}</h2>
              <p className="mt-3 leading-7 text-white/70">{strings.customTabDescription}</p>
              <a href={chromeIntent} className="mt-5 inline-flex min-h-12 items-center rounded-full bg-violet-600 px-6 py-3 font-black" data-testid="install-open-chrome">
                {strings.openChrome}
              </a>
            </div>
          ) : context === "ios" ? (
            <div data-testid="install-app-fallback">
              <h2 className="text-2xl font-black text-yellow-200">{strings.iosTitle}</h2>
              <p className="mt-3 leading-7 text-white/70">{strings.iosDescription}</p>
            </div>
          ) : ready ? (
            <>
              <h2 className="text-2xl font-black text-violet-200">{strings.readyTitle}</h2>
              <p className="mt-3 leading-7 text-white/70">{strings.readyDescription}</p>
              <button type="button" onClick={requestInstall} className="mt-5 min-h-12 rounded-full bg-violet-600 px-7 py-3 font-black" data-testid="install-app-action">
                {strings.installButton}
              </button>
              {installState.outcome === "dismissed" && <p className="mt-3 text-sm text-yellow-100" role="status">{strings.dismissed}</p>}
            </>
          ) : (
            <div data-testid="install-app-fallback">
              <h2 className="text-2xl font-black text-white">{context === "checking" ? strings.waitingTitle : strings.fallbackTitle}</h2>
              <p className="mt-3 leading-7 text-white/70">{context === "checking" ? strings.waitingDescription : strings.fallbackDescription}</p>
            </div>
          )}
        </div>

        <Link href={localizePublicHref("/", language)} className="mt-7 inline-flex min-h-11 items-center font-black text-violet-200 underline underline-offset-4" data-testid="install-app-back-home">
          {strings.backHome}
        </Link>
      </section>
    </main>
  );
}
