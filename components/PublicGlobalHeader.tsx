"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { localizePublicHref } from "@/lib/i18n/publicLocales";

const identity = {
  ar: "وكالة حمزة",
  en: "Content Creator Agency",
  tr: "İçerik Üreticisi Ajansı",
} as const;

const links = {
  ar: [
    ["الرئيسية", "/"],
    ["البرامج", "/programs"],
    ["الخدمات", "/services"],
    ["اتصل بنا", "/contact"],
  ],
  en: [
    ["Home", "/"],
    ["Programs", "/programs"],
    ["Services", "/services"],
    ["Contact", "/contact"],
  ],
  tr: [
    ["Ana sayfa", "/"],
    ["Programlar", "/programs"],
    ["Hizmetler", "/services"],
    ["İletişim", "/contact"],
  ],
} as const;

export default function PublicGlobalHeader() {
  const pathname = usePathname();
  const language = useSiteLanguage();

  if (pathname.startsWith("/admin") || pathname === "/maintenance") return null;

  return (
    <header className="hamza-global-header relative z-[190] border-b border-white/10 bg-[#070009]/92 px-3 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))] text-white backdrop-blur-xl">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <Link href={localizePublicHref("/", language)} className="flex min-w-0 items-center gap-2">
            <Image
              src="/Logo%20hamza%20agency.jpg"
              alt="HAMZA AGENCY"
              width={44}
              height={44}
              unoptimized
              className="h-11 w-11 shrink-0 rounded-xl object-cover"
            />
            <span className="min-w-0">
              <strong className="block truncate text-sm" dir="ltr">HAMZA AGENCY</strong>
              <span className="block truncate text-xs text-yellow-200/80">{identity[language]}</span>
            </span>
          </Link>
          <LanguageSwitcher />
        </div>

        <nav className="mt-2 grid grid-cols-4 gap-1" aria-label="Primary navigation">
          {links[language].map(([label, href]) => (
            <Link
              key={href}
              href={localizePublicHref(href, language)}
              className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-1 text-center text-[11px] font-bold text-white/75 transition hover:border-purple-300/40 hover:text-white sm:text-sm"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
