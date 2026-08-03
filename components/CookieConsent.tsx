"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getPathLanguage, localizePublicHref } from "@/lib/i18n/publicLocales";
import { getCookieConsentCopy } from "@/lib/i18n/privacyAndPwaCopy";

type Consent = {
  version: string;
  necessary: true;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
  recordedAt: string;
};

type Choices = Pick<Consent, "analytics" | "preferences" | "marketing">;
type Surface = "loading" | "closed" | "banner" | "preferences";
type InertSnapshot = { element: HTMLElement; inert: boolean; ariaHidden: string | null };

const VERSION = "1.0";
const STORAGE_KEY = "hamza_agency_cookie_consent";
const PORTAL_ID = "hamza-cookie-consent-portal";
const emptyChoices: Choices = { analytics: false, preferences: false, marketing: false };

function readStoredConsent(): Consent | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Consent | null;
    return stored?.version === VERSION ? stored : null;
  } catch {
    return null;
  }
}

function anonymousId() {
  const key = "hamza_agency_anonymous_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem(key, value);
  return value;
}

function applyConsentToDocument(consent: Pick<Consent, "analytics" | "preferences" | "marketing">) {
  document.documentElement.dataset.consentAnalytics = String(consent.analytics);
  document.documentElement.dataset.consentPreferences = String(consent.preferences);
  document.documentElement.dataset.consentMarketing = String(consent.marketing);
}

function focusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'));
}

export default function CookieConsent() {
  const pathname = usePathname();
  const locale = getPathLanguage(pathname || "/");
  const strings = getCookieConsentCopy(locale);
  const [surface, setSurface] = useState<Surface>("loading");
  const [choices, setChoices] = useState<Choices>(emptyChoices);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const host = document.createElement("div");
    host.id = PORTAL_ID;
    host.dataset.cookiePortal = "true";
    document.body.appendChild(host);
    setPortalHost(host);
    return () => host.remove();
  }, []);

  useEffect(() => {
    const stored = readStoredConsent();
    if (stored) {
      const storedChoices = { analytics: stored.analytics, preferences: stored.preferences, marketing: stored.marketing };
      setChoices(storedChoices);
      applyConsentToDocument(storedChoices);
      setSurface("closed");
    } else {
      setSurface("banner");
    }

    const reopen = () => {
      const current = readStoredConsent();
      if (current) setChoices({ analytics: current.analytics, preferences: current.preferences, marketing: current.marketing });
      setSurface("preferences");
    };
    window.addEventListener("hamza:cookie-settings", reopen);
    return () => window.removeEventListener("hamza:cookie-settings", reopen);
  }, []);

  useEffect(() => {
    if (surface !== "preferences" || !portalHost || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const inertSnapshots: InertSnapshot[] = [];

    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === portalHost) continue;
      inertSnapshots.push({ element: child, inert: child.inert, ariaHidden: child.getAttribute("aria-hidden") });
      child.inert = true;
      child.setAttribute("aria-hidden", "true");
    }

    document.body.classList.add("hamza-cookie-preferences-open");
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSurface(readStoredConsent() ? "closed" : "banner");
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable(dialog);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const frame = requestAnimationFrame(() => (focusable(dialog)[0] || dialog).focus());

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("hamza-cookie-preferences-open");
      document.body.style.overflow = previousOverflow;
      for (const snapshot of inertSnapshots) {
        snapshot.element.inert = snapshot.inert;
        if (snapshot.ariaHidden === null) snapshot.element.removeAttribute("aria-hidden");
        else snapshot.element.setAttribute("aria-hidden", snapshot.ariaHidden);
      }
      previousFocus?.focus();
    };
  }, [surface, portalHost]);

  async function save(next: Choices) {
    const record: Consent = { version: VERSION, necessary: true, ...next, recordedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    document.cookie = `ha_consent=${encodeURIComponent(JSON.stringify(record))}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    applyConsentToDocument(next);
    setChoices(next);
    setSurface("closed");
    void fetch("/api/product-expansion/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymousId: anonymousId(), consentVersion: VERSION, ...next, region: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown" }),
      keepalive: true,
    }).catch(() => undefined);
  }

  if (surface === "loading" || surface === "closed") return null;

  if (surface === "banner") {
    return (
      <section
        role="region"
        aria-labelledby="cookie-banner-title"
        dir={getLanguageDirection(locale)}
        data-cookie-locale={locale}
        data-testid="cookie-banner"
        className="hamza-cookie-banner rounded-2xl border border-violet-300/25 bg-[#0b0710]/96 p-4 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="min-w-0">
          <h2 id="cookie-banner-title" className="text-base font-black">{strings.title}</h2>
          <p className="mt-1 text-sm leading-6 text-white/70">{strings.body}</p>
          <Link href={localizePublicHref("/cookie-policy", locale)} className="mt-2 inline-flex text-xs font-bold text-violet-200 underline underline-offset-4" data-testid="cookie-policy-link">{strings.policy}</Link>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => void save({ analytics: true, preferences: true, marketing: true })} className="min-h-11 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold" data-testid="cookie-accept-all">{strings.acceptAll}</button>
          <button type="button" onClick={() => void save(emptyChoices)} className="min-h-11 rounded-xl border border-white/15 px-3 py-2 text-sm font-bold" data-testid="cookie-necessary-only">{strings.necessaryOnly}</button>
          <button type="button" onClick={() => setSurface("preferences")} className="min-h-11 rounded-xl border border-violet-300/25 px-3 py-2 text-sm font-bold text-violet-100" data-testid="cookie-manage-preferences">{strings.managePreferences}</button>
        </div>
      </section>
    );
  }

  if (!portalHost) return null;

  return createPortal(
    <div className="hamza-cookie-backdrop flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-5" data-testid="cookie-backdrop">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        aria-describedby="cookie-consent-description"
        tabIndex={-1}
        dir={getLanguageDirection(locale)}
        data-testid="cookie-dialog"
        data-cookie-locale={locale}
        className="hamza-cookie-dialog my-auto w-full max-w-2xl rounded-3xl border border-violet-300/25 bg-[#0b0710] p-5 text-white shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="cookie-consent-title" className="text-xl font-black">{strings.settings}</h2>
            <p id="cookie-consent-description" className="mt-2 text-sm leading-6 text-white/70">{strings.body}</p>
          </div>
          <button type="button" onClick={() => setSurface(readStoredConsent() ? "closed" : "banner")} className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/15 text-xl" aria-label={strings.close} data-testid="cookie-close">×</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2" data-testid="cookie-categories">
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-4 opacity-70"><span>{strings.necessary}</span><input type="checkbox" checked readOnly aria-label={strings.necessary} /></label>
          {(["analytics", "preferences", "marketing"] as const).map((key) => (
            <label key={key} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-4"><span>{strings[key]}</span><input type="checkbox" checked={choices[key]} data-testid={`cookie-choice-${key}`} aria-label={strings[key]} onChange={(event) => setChoices((current) => ({ ...current, [key]: event.target.checked }))} /></label>
          ))}
        </div>

        <Link href={localizePublicHref("/cookie-policy", locale)} className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-violet-200 underline underline-offset-4" data-testid="cookie-policy-link">{strings.policy}</Link>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => void save({ analytics: true, preferences: true, marketing: true })} className="min-h-11 rounded-xl bg-violet-600 px-4 py-2 font-bold" data-testid="cookie-accept-all">{strings.acceptAll}</button>
          <button type="button" onClick={() => void save(choices)} className="min-h-11 rounded-xl border border-violet-300/30 px-4 py-2 font-bold" data-testid="cookie-accept-selected">{strings.savePreferences}</button>
          <button type="button" onClick={() => void save(emptyChoices)} className="min-h-11 rounded-xl border border-white/15 px-4 py-2 font-bold" data-testid="cookie-necessary-only">{strings.necessaryOnly}</button>
        </div>
      </section>
    </div>,
    portalHost,
  );
}
