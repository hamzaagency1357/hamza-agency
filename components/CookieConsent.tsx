"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Consent = {
  version: string;
  necessary: true;
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
  recordedAt: string;
};

const VERSION = "1.0";
const STORAGE_KEY = "hamza_agency_cookie_consent";

const copy = {
  ar: {
    title: "إعدادات الخصوصية وملفات الارتباط",
    body: "نستخدم الملفات الضرورية لتشغيل المنصة. لن تعمل التحليلات أو التفضيلات أو التسويق قبل موافقتك.",
    necessary: "ضرورية",
    analytics: "تحليلات",
    preferences: "تفضيلات",
    marketing: "تسويق",
    accept: "قبول المحدد",
    all: "قبول الكل",
    reject: "الضرورية فقط",
    settings: "إعدادات ملفات الارتباط",
    policy: "سياسة ملفات الارتباط",
  },
  en: {
    title: "Privacy and cookie settings",
    body: "Necessary storage keeps the platform working. Analytics, preferences and marketing stay disabled until you consent.",
    necessary: "Necessary",
    analytics: "Analytics",
    preferences: "Preferences",
    marketing: "Marketing",
    accept: "Accept selected",
    all: "Accept all",
    reject: "Necessary only",
    settings: "Cookie settings",
    policy: "Cookie policy",
  },
  tr: {
    title: "Gizlilik ve çerez ayarları",
    body: "Gerekli depolama platformun çalışmasını sağlar. Analiz, tercihler ve pazarlama onayınız olmadan etkinleşmez.",
    necessary: "Gerekli",
    analytics: "Analiz",
    preferences: "Tercihler",
    marketing: "Pazarlama",
    accept: "Seçilenleri kabul et",
    all: "Tümünü kabul et",
    reject: "Yalnızca gerekli",
    settings: "Çerez ayarları",
    policy: "Çerez politikası",
  },
} as const;

type Locale = keyof typeof copy;

function currentLocale(): Locale {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang === "en" || document.documentElement.lang === "tr"
    ? document.documentElement.lang
    : "ar";
}

function anonymousId() {
  const key = "hamza_agency_anonymous_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  localStorage.setItem(key, value);
  return value;
}

export default function CookieConsent() {
  const [locale, setLocale] = useState<Locale>("ar");
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [choices, setChoices] = useState({ analytics: false, preferences: false, marketing: false });
  const strings = useMemo(() => copy[locale], [locale]);

  useEffect(() => {
    setLocale(currentLocale());
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Consent | null;
      if (!stored || stored.version !== VERSION) setOpen(true);
      else {
        setChoices({ analytics: stored.analytics, preferences: stored.preferences, marketing: stored.marketing });
        document.documentElement.dataset.consentAnalytics = String(stored.analytics);
        document.documentElement.dataset.consentPreferences = String(stored.preferences);
        document.documentElement.dataset.consentMarketing = String(stored.marketing);
      }
    } catch {
      setOpen(true);
    }
    const reopen = () => { setOpen(true); setExpanded(true); };
    window.addEventListener("hamza:cookie-settings", reopen);
    return () => window.removeEventListener("hamza:cookie-settings", reopen);
  }, []);

  async function save(next: typeof choices) {
    const record: Consent = { version: VERSION, necessary: true, ...next, recordedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    document.cookie = `ha_consent=${encodeURIComponent(JSON.stringify(record))}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    document.documentElement.dataset.consentAnalytics = String(next.analytics);
    document.documentElement.dataset.consentPreferences = String(next.preferences);
    document.documentElement.dataset.consentMarketing = String(next.marketing);
    setChoices(next);
    setOpen(false);
    void fetch("/api/product-expansion/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonymousId: anonymousId(),
        consentVersion: VERSION,
        ...next,
        region: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
      }),
      keepalive: true,
    }).catch(() => undefined);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setExpanded(true); }}
        className="fixed bottom-2 left-2 z-[105] rounded-full border border-white/15 bg-black/80 px-3 py-2 text-xs text-white/80 backdrop-blur hover:text-white"
      >
        {strings.settings}
      </button>
    );
  }

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-3 bottom-3 z-[160] mx-auto max-w-3xl rounded-3xl border border-violet-300/25 bg-[#0b0710]/95 p-5 text-white shadow-2xl backdrop-blur-xl"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <h2 id="cookie-consent-title" className="text-xl font-black">{strings.title}</h2>
      <p className="mt-2 text-sm leading-6 text-white/70">{strings.body}</p>
      {expanded && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-4 opacity-70">
            <span>{strings.necessary}</span><input type="checkbox" checked readOnly />
          </label>
          {(["analytics", "preferences", "marketing"] as const).map((key) => (
            <label key={key} className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-4">
              <span>{strings[key]}</span>
              <input type="checkbox" checked={choices[key]} onChange={(event) => setChoices((current) => ({ ...current, [key]: event.target.checked }))} />
            </label>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void save({ analytics: true, preferences: true, marketing: true })} className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold">{strings.all}</button>
        <button type="button" onClick={() => void save(choices)} className="min-h-11 rounded-xl border border-violet-300/30 px-4 font-bold">{strings.accept}</button>
        <button type="button" onClick={() => void save({ analytics: false, preferences: false, marketing: false })} className="min-h-11 rounded-xl border border-white/10 px-4">{strings.reject}</button>
        <button type="button" onClick={() => setExpanded((value) => !value)} className="min-h-11 rounded-xl px-3 text-white/70">{strings.settings}</button>
        <Link href="/cookie-policy" className="flex min-h-11 items-center px-3 text-violet-200 underline">{strings.policy}</Link>
      </div>
    </section>
  );
}
