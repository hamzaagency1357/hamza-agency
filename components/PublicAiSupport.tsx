"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import SmartSupportPanel from "@/components/SmartSupportPanel";

type Props={open?:boolean;onOpenChange?:(open:boolean)=>void;mobileDockMode?:boolean;panelId?:string};
export default function PublicAiSupport({open,onOpenChange,mobileDockMode=false,panelId="hamza-ai-support-panel"}:Props={}){
 const pathname=usePathname();const language=useSiteLanguage();const[internalOpen,setInternalOpen]=useState(false);const controlled=open!==undefined;const isOpen=controlled?open:internalOpen;
 function setOpen(value:boolean){if(!controlled)setInternalOpen(value);onOpenChange?.(value)}
 useEffect(()=>{if(mobileDockMode)return;document.body.classList.toggle("public-ai-support-open",isOpen);return()=>document.body.classList.remove("public-ai-support-open")},[isOpen,mobileDockMode]);
 useEffect(()=>{if(!mobileDockMode&&!controlled)setInternalOpen(false)},[pathname,mobileDockMode,controlled]);
 if(pathname.startsWith("/admin")||pathname==="/maintenance")return null;
 const panel=isOpen?<div id={panelId} className="md:mb-3 md:w-[min(390px,calc(100vw-2rem))]"><SmartSupportPanel language={language} compact onClose={()=>setOpen(false)}/></div>:null;
 if(mobileDockMode)return panel;
 return <div dir={getLanguageDirection(language)} className="hamza-ai-support fixed bottom-24 right-6 z-[165] hidden print:hidden md:block">{panel}<button type="button" onClick={()=>setOpen(!isOpen)} aria-controls={panelId} aria-expanded={isOpen} className="min-h-12 rounded-full border border-fuchsia-300/35 bg-[#12051f]/95 px-5 py-3 text-sm font-black text-fuchsia-100">{isOpen?"×":"Smart Support"}</button></div>;
}
