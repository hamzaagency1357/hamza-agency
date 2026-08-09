"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getLanguageDirection, type SiteLanguage } from "@/lib/i18n/locale";
import { getSharedNavigationLabel } from "@/lib/i18n/sharedChrome";
import { AGENT_PUBLIC_PATH, localizePublicHref } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { defaultPublicNavigationConfig, getPublicNavigationConfig, type PublicNavigationLink } from "@/lib/publicNavigation";

const AGENCY_NAME = "HAMZA" + " AGENCY";

const agencyType: Record<SiteLanguage, string> = {
  ar: "وكالة حمزة",
  en: "Content Creator Agency",
  tr: "İçerik Üreticisi Ajansı",
};

const identity = {
  ar: { managedBy: "بإدارة الوكيل عراب سوريا", semanticIdentity: "HAMZA AGENCY بإدارة الوكيل عراب سوريا", navLabel: "التنقل الرئيسي", logoAlt: "شعار الوكالة" },
  en: { managedBy: "Managed by the Godfather of Syria", semanticIdentity: `${AGENCY_NAME} managed by the Godfather of Syria`, navLabel: "Primary navigation", logoAlt: "Agency logo" },
  tr: { managedBy: "Suriye'nin Vaftiz Babası yönetiminde", semanticIdentity: `${AGENCY_NAME}, Suriye'nin Vaftiz Babası yönetiminde`, navLabel: "Ana gezinme", logoAlt: "Ajans logosu" },
} as const;

const navigation: Record<SiteLanguage, Array<{ label: string; href: string }>> = {
  ar: [
    { label: "الرئيسية", href: "/" },
    { label: "البرامج", href: "/programs" },
    { label: "الخدمات", href: "/services" },
    { label: "قصص النجاح", href: "/success-stories" },
    { label: "المدونة", href: "/blog" },
    { label: "الوكيل", href: AGENT_PUBLIC_PATH },
    { label: "تواصل معنا", href: "/contact" },
  ],
  en: [
    { label: "Home", href: "/" },
    { label: "Programs", href: "/programs" },
    { label: "Services", href: "/services" },
    { label: "Success stories", href: "/success-stories" },
    { label: "Blog", href: "/blog" },
    { label: "Agent", href: AGENT_PUBLIC_PATH },
    { label: "Contact", href: "/contact" },
  ],
  tr: [
    { label: "Ana sayfa", href: "/" },
    { label: "Programlar", href: "/programs" },
    { label: "Hizmetler", href: "/services" },
    { label: "Başarı hikâyeleri", href: "/success-stories" },
    { label: "Blog", href: "/blog" },
    { label: "Temsilci", href: AGENT_PUBLIC_PATH },
    { label: "İletişim", href: "/contact" },
  ],
};

function shouldHideHeader(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/portal") || pathname === "/maintenance" || pathname === "/pr99-e2e";
}

export default function PublicGlobalHeader() {
  const pathname = usePathname() || "/";
  const language = useSiteLanguage();
  const [managedLinks, setManagedLinks] = useState<PublicNavigationLink[]>(defaultPublicNavigationConfig.headerLinks);

  useEffect(() => {
    let live = true;
    void getPublicNavigationConfig().then((config) => {
      if (live) setManagedLinks(config.headerLinks);
    }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const items = useMemo(() => navigation[language].map((fallback) => {
    const managed = managedLinks.find((link) => link.href === fallback.href);
    if (!managed) return fallback;
    return {
      ...fallback,
      label: language === "ar" ? managed.label : getSharedNavigationLabel(language, managed),
    };
  }), [language, managedLinks]);

  if (shouldHideHeader(pathname)) return null;
  const t = identity[language];

  return (
    <header dir={getLanguageDirection(language)} className="sticky top-0 z-[80] border-b border-white/10 bg-[#070009]/92 px-2 py-3 text-white shadow-[0_18px_55px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:px-5" data-testid="public-global-header">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <Link href={localizePublicHref("/", language)} className="group flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300" aria-label={t.semanticIdentity}>
            <Image src="/Logo%20hamza%20agency.jpg" alt={t.logoAlt} width={48} height={48} priority className="h-12 w-12 shrink-0 rounded-2xl border border-yellow-300/25 object-cover" />
            <span className="min-w-0"><strong className="block truncate text-sm font-black text-yellow-200 sm:text-base" dir="ltr">{AGENCY_NAME}</strong><span className="block truncate text-xs font-bold text-white/75">{agencyType[language]}</span><span className="hidden truncate text-[11px] text-white/50 sm:block">{t.managedBy}</span><span className="sr-only">{t.semanticIdentity}</span></span>
          </Link>
          <LanguageSwitcher />
        </div>
        <nav aria-label={t.navLabel} className="w-full overflow-hidden rounded-2xl border border-purple-300/20 bg-purple-500/[.075] p-1" data-testid="public-primary-navigation">
          <div className="grid w-full grid-cols-7 items-stretch gap-[2px]" data-testid="public-primary-navigation-row" data-mobile-width-contract="320,360,375,390,412,430">
            {items.map((item) => {
              const href = localizePublicHref(item.href, language);
              const active = item.href === "/" ? pathname === "/" || pathname === "/en" || pathname === "/tr" : pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={item.href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-xl px-[1px] py-2 text-center text-[clamp(.43rem,2.05vw,.78rem)] font-black leading-none tracking-[-.035em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 sm:min-h-11 sm:px-2 sm:text-xs md:text-sm ${active ? "bg-yellow-300/10 text-yellow-200" : "text-white/78 hover:bg-white/10 hover:text-white"}`}>{item.label}</Link>;
            })}
          </div>
        </nav>
      </div>
    </header>
  );
}
