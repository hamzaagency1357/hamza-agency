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
type ViewportMetrics = { top: number; left: number; width: number; height: number };
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

function focusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'));
}

function readVisualViewport(): ViewportMetrics {
  const viewport = window.visualViewport;
  return {
    top: Math.max(0, Math.round(viewport?.offsetTop ?? 0)),
    left: Math.max(0, Math.round(viewport?.offsetLeft ?? 0)),
    width: Math.max(1, Math.round(viewport?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(viewport?.height ?? window.innerHeight)),
  };
}

export default function CookieConsent() {
  const pathname = usePathname();
  const locale = getPathLanguage(pathname || "/");
  const strings = getCookieConsentCopy(locale);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);
  const [choices, setChoices] = useState<Choices>(emptyChoices);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [viewport, setViewport] = useState<ViewportMetrics | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = document.createElement("div");
    host.id = PORTAL_ID;
    host.dataset.cookiePortal = "true";
    document.body.appendChild(host);
    setPortalHost(host);
    return () => {
      host.remove();
    };
  }, []);

  useEffect(() => {
    const stored = readStoredConsent();
    if (!stored) {
      setOpen(true);
    } else {
      setChoices({ analytics: stored.analytics, preferences: stored.preferences, marketing: stored.marketing });
      setCanDismiss(true);
      document.documentElement.dataset.consentAnalytics = String(stored.analytics);
      document.documentElement.dataset.consentPreferences = String(stored.preferences);
      document.documentElement.dataset.consentMarketing = String(stored.marketing);
    }
    const reopen = () => {
      const current = readStoredConsent();
      if (current) setChoices({ analytics: current.analytics, preferences: current.preferences, marketing: current.marketing });
      setCanDismiss(Boolean(current));
      setExpanded(true);
      setOpen(true);
    };
    window.addEventListener("hamza:cookie-settings", reopen);
    return () => window.removeEventListener("hamza:cookie-settings", reopen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updateViewport = () => setViewport(readVisualViewport());
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !portalHost || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const inertSnapshots: InertSnapshot[] = [];

    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === portalHost) continue;
      inertSnapshots.push({ element: child, inert: child.inert, ariaHidden: child.getAttribute("aria-hidden") });
      child.inert = true;
      child.setAttribute("aria-hidden", "true");
    }

    document.body.classList.add("hamza-cookie-consent-open");
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && canDismiss) {
        event.preventDefault();
        setOpen(false);
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
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0 });
      (focusable(dialog)[0] || dialog).focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("hamza-cookie-consent-open");
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      for (const snapshot of inertSnapshots) {
        snapshot.element.inert = snapshot.inert;
        if (snapshot.ariaHidden === null) snapshot.element.removeAttribute("aria-hidden");
        else snapshot.element.setAttribute("aria-hidden", snapshot.ariaHidden);
      }
      previousFocus?.focus();
    };
  }, [open, canDismiss, portalHost]);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: 0 });
  }, [locale, open]);

  async function save(next: Choices) {
    const record: Consent = { version: VERSION, necessary: true, ...next, recordedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    document.cookie = `ha_consent=${encodeURIComponent(JSON.stringify(record))}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    document.documentElement.dataset.consentAnalytics = String(next.analytics);
    document.documentElement.dataset.consentPreferences = String(next.preferences);
    document.documentElement.dataset.consentMarketing = String(next.marketing);
    setChoices(next);
    setCanDismiss(true);
    setOpen(false);
    void fetch("/api/product-expansion/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ anonymousId: anonymousId(), consentVersion: VERSION, ...next, region: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown" }),
      keepalive: true,
    }).catch(() => undefined);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => { setExpanded(true); setOpen(true); }} className="hamza-cookie-settings-desktop fixed bottom-3 left-3 hidden rounded-full border border-white/15 bg-black/80 px-3 py-2 text-xs text-white/80 backdrop-blur hover:text-white md:block" data-testid="cookie-settings-desktop">
        {strings.settings}
      </button>
    );
  }

  if (!portalHost) return null;
  const activeViewport = viewport ?? readVisualViewport();

  const modal = (
    <div
      className="hamza-cookie-backdrop flex items-center justify-center overflow-hidden bg-black/75 px-2 backdrop-blur-sm sm:px-4"
      style={{
        top: `${activeViewport.top}px`,
        left: `${activeViewport.left}px`,
        width: `${activeViewport.width}px`,
        height: `${activeViewport.height}px`,
        paddingTop: "max(.5rem, env(safe-area-inset-top, 0px))",
        paddingBottom: "max(.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      data-testid="cookie-backdrop"
      onPointerDown={(event) => { if (event.target === event.currentTarget && canDismiss) setOpen(false); }}
    >
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
        className="hamza-cookie-dialog flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-violet-300/25 bg-[#0b0710]/98 text-white shadow-2xl"
      >
        <header className="flex flex-none items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <h2 id="cookie-consent-title" className="text-balance text-lg font-black leading-tight sm:text-xl">{strings.title}</h2>
            <nav className="mt-3 grid w-fit max-w-full grid-cols-3 gap-2" aria-label={strings.settings} data-testid="cookie-locale-switcher">
              {(["ar", "en", "tr"] as const).map((candidate) => (
                <Link key={candidate} href={localizePublicHref(pathname || "/", candidate)} data-testid={`cookie-locale-${candidate}`} aria-current={candidate === locale ? "page" : undefined} className={`flex min-h-9 min-w-12 items-center justify-center rounded-full border px-3 py-1.5 text-xs font-black uppercase ${candidate === locale ? "border-violet-300/60 bg-violet-500/25 text-white" : "border-white/10 text-white/65"}`}>
                  {candidate}
                </Link>
              ))}
            </nav>
          </div>
          {canDismiss && <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/10 text-xl text-white/70" aria-label={strings.close} data-testid="cookie-close">×</button>}
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5" data-testid="cookie-dialog-scroll">
          <p id="cookie-consent-description" className="text-sm leading-6 text-white/75">{strings.body}</p>
          {expanded && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="cookie-categories">
              <label className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-4 opacity-70"><span>{strings.necessary}</span><input type="checkbox" checked readOnly aria-label={strings.necessary} /></label>
              {(["analytics", "preferences", "marketing"] as const).map((key) => (
                <label key={key} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/10 px-4"><span>{strings[key]}</span><input type="checkbox" checked={choices[key]} data-testid={`cookie-choice-${key}`} aria-label={strings[key]} onChange={(event) => setChoices((current) => ({ ...current, [key]: event.target.checked }))} /></label>
              ))}
            </div>
          )}
          <Link href={localizePublicHref("/cookie-policy", locale)} className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-violet-200 underline underline-offset-4" data-testid="cookie-policy-link">{strings.policy}</Link>
        </div>

        <footer className="grid flex-none grid-cols-2 gap-2 border-t border-white/10 bg-black/25 p-3 text-xs sm:p-5 sm:text-sm">
          <button type="button" onClick={() => void save({ analytics: true, preferences: true, marketing: true })} className="min-h-11 rounded-xl bg-violet-600 px-2 py-2 font-bold sm:px-4" data-testid="cookie-accept-all">{strings.acceptAll}</button>
          <button type="button" onClick={() => void save(choices)} className="min-h-11 rounded-xl border border-violet-300/30 px-2 py-2 font-bold sm:px-4" data-testid="cookie-accept-selected">{strings.acceptSelected}</button>
          <button type="button" onClick={() => void save(emptyChoices)} className="min-h-11 rounded-xl border border-white/10 px-2 py-2 sm:px-4" data-testid="cookie-necessary-only">{strings.necessaryOnly}</button>
          <button type="button" onClick={() => { setExpanded((value) => !value); requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 })); }} className="min-h-11 rounded-xl border border-white/10 px-2 py-2 text-white/80 sm:px-4" aria-expanded={expanded} data-testid="cookie-settings-toggle">{strings.settings}</button>
        </footer>
      </section>
    </div>
  );

  return createPortal(modal, portalHost);
}
