"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SiteLanguage = "ar" | "en" | "tr";

const storageKey = "hamza-agency-language";

const languages: {
  code: SiteLanguage;
  label: string;
  shortLabel: string;
  dir: "rtl" | "ltr";
}[] = [
  { code: "ar", label: "العربية", shortLabel: "AR", dir: "rtl" },
  { code: "en", label: "English", shortLabel: "EN", dir: "ltr" },
  { code: "tr", label: "Türkçe", shortLabel: "TR", dir: "ltr" },
];

const helperText: Record<SiteLanguage, string> = {
  ar: "واجهة اللغة",
  en: "Language UI",
  tr: "Dil arayüzü",
};

const scopeText: Record<SiteLanguage, string> = {
  ar: "تبديل اتجاه وأزرار الواجهة حالياً، والمحتوى العربي هو النسخة الرسمية.",
  en: "Changes interface direction/buttons for now. Arabic content is the official version.",
  tr: "Şimdilik arayüz yönünü/düğmeleri değiştirir. Resmi içerik Arapçadır.",
};

function isSupportedLanguage(value: string | null): value is SiteLanguage {
  return value === "ar" || value === "en" || value === "tr";
}

function detectPreferredLanguage(): SiteLanguage {
  if (typeof window === "undefined") return "ar";

  const savedLanguage = window.localStorage.getItem(storageKey);
  if (isSupportedLanguage(savedLanguage)) return savedLanguage;

  const browserLanguage = window.navigator.language.toLowerCase();
  if (browserLanguage.startsWith("tr")) return "tr";
  if (browserLanguage.startsWith("en")) return "en";

  return "ar";
}

function applyDocumentLanguage(language: SiteLanguage) {
  const languageDefinition = languages.find((item) => item.code === language) || languages[0];

  document.documentElement.lang = languageDefinition.code;
  document.documentElement.dir = languageDefinition.dir;
  document.body.dir = languageDefinition.dir;
  document.body.dataset.siteLanguage = languageDefinition.code;
}

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const [language, setLanguage] = useState<SiteLanguage>("ar");
  const [isReady, setIsReady] = useState(false);
  const [showScope, setShowScope] = useState(false);

  useEffect(() => {
    const preferredLanguage = detectPreferredLanguage();
    setLanguage(preferredLanguage);
    applyDocumentLanguage(preferredLanguage);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    applyDocumentLanguage(language);
    window.localStorage.setItem(storageKey, language);
    window.dispatchEvent(new CustomEvent("hamza-language-change", { detail: { language } }));
  }, [language, isReady]);

  if (pathname.startsWith("/admin") || pathname === "/maintenance") return null;

  return (
    <div dir="ltr" className="fixed left-3 top-3 z-[120] print:hidden sm:left-4 sm:top-4">
      <div
        className="rounded-2xl border border-white/10 bg-[#09000f]/85 p-1 shadow-[0_0_35px_rgba(124,58,237,0.22)] backdrop-blur-xl"
        onMouseEnter={() => setShowScope(true)}
        onMouseLeave={() => setShowScope(false)}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowScope((current) => !current)}
            className="hidden px-3 text-xs font-black text-white/45 transition hover:text-white/75 sm:inline"
            aria-label="شرح نطاق تبديل اللغة"
          >
            {helperText[language]}
          </button>

          {languages.map((item) => {
            const active = item.code === language;

            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                aria-label={`Switch language UI to ${item.label}`}
                className={`rounded-full px-3 py-2 text-xs font-black transition ${
                  active
                    ? "bg-gradient-to-r from-purple-600 to-yellow-500 text-white shadow-[0_0_22px_rgba(168,85,247,0.28)]"
                    : "text-white/55 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        {showScope && (
          <div className="mt-1 max-w-56 px-3 pb-2 text-[11px] leading-5 text-white/48" dir={language === "ar" ? "rtl" : "ltr"}>
            {scopeText[language]}
          </div>
        )}
      </div>
    </div>
  );
}
