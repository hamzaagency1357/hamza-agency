"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { AGENT_PUBLIC_PATH, localizePublicHref } from "@/lib/i18n/publicLocales";
import { getCookieConsentCopy, getPwaRuntimeCopy } from "@/lib/i18n/privacyAndPwaCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { defaultPublicNavigationConfig, getPublicNavigationConfig, type PublicNavigationLink } from "@/lib/publicNavigation";

function shouldHideFooter(pathname: string) { return pathname.startsWith("/admin") || pathname.startsWith("/portal") || pathname === "/maintenance" || pathname === "/pr99-e2e"; }
const identity = {
  ar:{prefix:"HAMZA AGENCY — بإدارة الوكيل",readable:"عراب سوريا",decorated:"⚔عܓོراب✴سܓོوريا⚔",agent:"تعرف على الوكيل عراب سوريا"},
  en:{prefix:"HAMZA AGENCY — Managed by",readable:"Godfather of Syria",decorated:"⚔عܓོراب✴سܓོوريا⚔",agent:"Meet the Godfather of Syria"},
  tr:{prefix:"HAMZA AGENCY — Yönetim",readable:"Suriye'nin Vaftiz Babası",decorated:"⚔عܓོراب✴سܓོوريا⚔",agent:"Suriye'nin Vaftiz Babası'nı tanıyın"},
} as const;
function isInternal(href:string){return href.startsWith("/")||href.startsWith("#")}
function FooterManagedLink({link,language}:{link:PublicNavigationLink;language:"ar"|"en"|"tr"}){
  const className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/78 transition hover:border-purple-300/40 hover:text-white";
  if(isInternal(link.href)) return <Link href={localizePublicHref(link.href,language)} className={className}>{link.label}</Link>;
  return <a href={link.href} target={link.target||"_blank"} rel={link.rel||"noopener noreferrer"} className={className}>{link.label}</a>;
}
export default function PublicFooterLinks(){
  const pathname=usePathname()||"/"; const language=useSiteLanguage();
  const[managedLinks,setManagedLinks]=useState<PublicNavigationLink[]>(defaultPublicNavigationConfig.footerLinks);
  useEffect(()=>{let live=true;getPublicNavigationConfig().then((config)=>{if(live)setManagedLinks(config.footerLinks)}).catch(()=>undefined);return()=>{live=false}},[]);
  if(shouldHideFooter(pathname))return null;
  const cookieCopy=getCookieConsentCopy(language);const installCopy=getPwaRuntimeCopy(language);const t=identity[language];
  return <footer dir={getLanguageDirection(language)} className="hamza-public-utility-footer border-t border-white/10 bg-[#050008] px-4 py-6 pb-[calc(1.5rem+var(--public-mobile-dock-height,0px)+env(safe-area-inset-bottom))] text-white md:pb-6" data-testid="public-footer-links">
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><p className="text-sm font-black leading-7"><span>{t.prefix} </span><bdi dir="ltr" className="inline-block max-w-full whitespace-nowrap [unicode-bidi:isolate] text-yellow-200" aria-hidden="true">{t.decorated}</bdi><span className="sr-only"> {t.readable}</span></p><Link href={localizePublicHref(AGENT_PUBLIC_PATH,language)} aria-label={t.agent} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-yellow-200 underline-offset-4 hover:underline" data-testid="footer-agent-link">{t.agent}</Link></div>
        <div className="flex flex-wrap gap-2">{managedLinks.map((link)=><FooterManagedLink key={`${link.href}-${link.label}`} link={link} language={language}/>)}</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55"><Link href={localizePublicHref("/install-app",language)} className="underline underline-offset-4" data-testid="footer-install-app">{installCopy.installButton}</Link><Link href={localizePublicHref("/cookie-settings",language)} className="underline underline-offset-4" data-testid="footer-cookie-settings">{cookieCopy.settings}</Link></div>
    </div>
  </footer>;
}
