"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: {
    home: "الرئيسية",
    blog: "المدونة",
    current: "المحتوى الحالي",
  },
  en: {
    home: "Home",
    blog: "Blog",
    current: "Current page",
  },
  tr: {
    home: "Ana sayfa",
    blog: "Blog",
    current: "Mevcut sayfa",
  },
} as const;

export default function PublicBreadcrumbs({ currentLabel }: { currentLabel?: string }) {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();
  const direction = getLanguageDirection(language);
  const t = copy[language];

  const parts = pathname.split("/").filter(Boolean);
  const isBlogDetail = pathname.startsWith("/blog/") && parts[0] === "blog" && parts.length > 1;

  if (!pathname.startsWith("/blog")) return null;

  return (
    <nav aria-label="Breadcrumb" dir={direction} className="mb-6 flex flex-wrap items-center gap-2 text-sm font-bold text-white/70">
      <Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:text-white">
        {t.home}
      </Link>
      <span>/</span>
      <Link href="/blog" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 transition hover:text-white">
        {t.blog}
      </Link>
      {isBlogDetail ? <><span>/</span><span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-2 text-purple-100">{currentLabel || t.current}</span></> : null}
    </nav>
  );
}
