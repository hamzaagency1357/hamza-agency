"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { AGENT_PUBLIC_PATH, localizePublicHref } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const agencyType: Record<SiteLanguage, string> = { ar: "وكالة حمزة", en: "Content Creator Agency", tr: "İçerik Üreticisi Ajansı" };
const identity = {
  ar: { managedBy: "بإدارة الوكيل ⚔عܓོراب✴سܓོوريا⚔", semanticIdentity: "HAMZA AGENCY بإدارة الوكيل عراب سوريا", navLabel: "التنقل الرئيسي", logoAlt: "شعار HAMZA AGENCY" },
  en: { managedBy: "Managed by agent Arab Syria", semanticIdentity: "HAMZA AGENCY managed by agent Arab Syria", navLabel: "Primary navigation", logoAlt: "HAMZA AGENCY logo" },
  tr: { managedBy: "Arab Syria yönetiminde", semanticIdentity: "HAMZA AGENCY, Arab Syria yönetiminde", navLabel: "Ana gezinme", logoAlt: "HAMZA AGENCY logosu" },
} as const;
const navigation: Record<SiteLanguage, Array<{ label: string; href: string }>> = {
  ar: [{ label: "الرئيسية", href: "/" }, { label: "البرامج", href: "/programs" }, { label: "الخدمات", href: "/services" }, { label: "الوكيل", href: AGENT_PUBLIC_PATH }, { label: "قصص النجاح", href: "/success-stories" }, { label: "المدونة", href: "/blog" }, { label: "تواصل معنا", href: "/contact" }],
  en: [{ label: "Home", href: "/" }, { label: "Programs", href: "/programs" }, { label: "Services", href: "/services" }, { label: "Agent", href: AGENT_PUBLIC_PATH }, { label: "Success stories", href: "/success-stories" }, { label: "Blog", href: "/blog" }, { label: "Contact", href: "/contact" }],
  tr: [{ label: "Ana sayfa", href: "/" }, { label: "Programlar", href: "/programs" }, { label: "Hizmetler", href: "/services" }, { label: "Temsilci", href: AGENT_PUBLIC_PATH }, { label: "Başarı hikâyeleri", href: "/success-stories" }, { label: "Blog", href: "/blog" }, { label: "İletişim", href: "/contact" }],
};
function shouldHideHeader(pathname: string) { return pathname.startsWith("/admin") || pathname.startsWith("/portal") || pathname === "/maintenance" || pathname === "/pr99-e2e"; }

export default function PublicGlobalHeader() {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();
  if (shouldHideHeader(pathname)) return null;
  const t = identity[language];
  const direction = getLanguageDirection(language);
  return <header dir={direction} className="sticky top-0 z-[80] border-b border-white/10 bg-[#070009]/92 px-3 py-3 text-white shadow-[0_18px_55px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:px-5" data-testid="public-global-header">
    <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center justify-between gap-3">
        <Link href={localizePublicHref("/", language)} className="group flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300" aria-label={t.semanticIdentity}>
          <Image src="/Logo%20hamza%20agency.jpg" alt={t.logoAlt} width={48} height={48} priority className="h-12 w-12 shrink-0 rounded-2xl border border-yellow-300/25 object-cover shadow-[0_0_24px_rgba(168,85,247,0.2)]" />
          <span className="min-w-0"><strong className="block truncate text-sm font-black text-yellow-200 sm:text-base" dir="ltr">HAMZA AGENCY</strong><span className="block truncate text-xs font-bold text-white/75">{agencyType[language]}</span><span className="hidden truncate text-[11px] text-white/50 sm:block">{t.managedBy}</span><span className="sr-only">{t.semanticIdentity}</span></span>
        </Link>
        <LanguageSwitcher />
      </div>
      <nav aria-label={t.navLabel} className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1 sm:grid-cols-4 lg:flex">
        {navigation[language].map((item) => { const href = localizePublicHref(item.href, language); const active = item.href === "/" ? pathname === "/" || pathname === "/en" || pathname === "/tr" : pathname === href || pathname.startsWith(`${href}/`); return <Link key={item.href} href={href} aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 ${active ? "bg-purple-500/20 text-yellow-100" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>{item.label}</Link>; })}
      </nav>
    </div>
  </header>;
}
