"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { rememberLanguagePreference, SITE_LANGUAGES, type SiteLanguage } from "@/lib/i18n/locale";
import { getPathLanguage, localizePublicPath } from "@/lib/i18n/publicLocales";

const ariaLabels:Record<SiteLanguage,string>={ar:"اختيار لغة الموقع",en:"Choose site language",tr:"Site dilini seçin"};
const displayNames:Record<SiteLanguage,string>={ar:"العربية",en:"English",tr:"Türkçe"};
const short:Record<SiteLanguage,string>={ar:"AR",en:"EN",tr:"TR"};
function GlobeIcon(){return <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center" style={{color:"var(--tenant-primary)"}}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg></span>}

export default function LanguageSwitcher(){
  const pathname=usePathname();const router=useRouter();const activeLanguage=getPathLanguage(pathname||"/");
  const[locationSuffix,setLocationSuffix]=useState("");const[open,setOpen]=useState(false);const[isPending,startTransition]=useTransition();const rootRef=useRef<HTMLDivElement>(null);
  useEffect(()=>setLocationSuffix(`${window.location.search}${window.location.hash}`),[pathname]);
  const localizedTargets=useMemo(()=>Object.fromEntries(SITE_LANGUAGES.map(({code})=>[code,`${localizePublicPath(pathname||"/",code)}${locationSuffix}`])) as Record<SiteLanguage,string>,[locationSuffix,pathname]);
  useEffect(()=>{if(!open)return;const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};const pointer=(event:PointerEvent)=>{if(event.target instanceof Node&&!rootRef.current?.contains(event.target))setOpen(false)};document.addEventListener("keydown",key);document.addEventListener("pointerdown",pointer);return()=>{document.removeEventListener("keydown",key);document.removeEventListener("pointerdown",pointer)}},[open]);
  function changeLanguage(next:SiteLanguage){if(isPending||next===activeLanguage){setOpen(false);return}rememberLanguagePreference(next);setOpen(false);startTransition(()=>router.replace(localizedTargets[next],{scroll:false}))}
  return <div ref={rootRef} className="relative shrink-0" aria-busy={isPending}>
    <button type="button" onClick={()=>setOpen((value)=>!value)} disabled={isPending} aria-expanded={open} aria-haspopup="menu" aria-label={ariaLabels[activeLanguage]} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-black/35 px-2.5 text-xs font-black text-white shadow-sm backdrop-blur transition hover:bg-white/[.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-wait disabled:opacity-65" data-language-switcher="dropdown">
      <GlobeIcon/><span dir="ltr">{short[activeLanguage]}</span><span aria-hidden="true" className={`text-[9px] transition-transform ${open?"rotate-180":""}`}>▾</span>
    </button>
    {open&&<div role="menu" aria-label={ariaLabels[activeLanguage]} className="absolute end-0 top-[calc(100%+.45rem)] z-[220] min-w-40 overflow-hidden rounded-2xl border border-white/15 bg-black/95 p-1.5 text-white shadow-2xl backdrop-blur-xl">
      {SITE_LANGUAGES.map(({code})=><button key={code} type="button" role="menuitemradio" aria-checked={code===activeLanguage} onClick={()=>changeLanguage(code)} disabled={isPending} className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-start text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${code===activeLanguage?"bg-white/12 font-black text-white":"font-semibold text-white/75 hover:bg-white/[.08] hover:text-white"}`}><span>{displayNames[code]}</span><span dir="ltr" className="text-xs text-white/45">{short[code]}</span></button>)}
    </div>}
  </div>
}
