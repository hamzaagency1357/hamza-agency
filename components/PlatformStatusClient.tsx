"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type Health={status?:string};
export default function PlatformStatusClient(){
 const language=useSiteLanguage();const[health,setHealth]=useState<Health|null>(null);const[failed,setFailed]=useState(false);
 const copy=language==="ar"?{title:"حالة المنصة",intro:"يمكنك هنا الاطلاع على الحالة العامة للموقع وخدماته الأساسية.",checking:"جاري التحقق من الحالة...",ok:"الموقع يعمل والخدمات الأساسية متاحة",bad:"تعذر التحقق من الحالة الآن",home:"الرئيسية",contact:"تواصل معنا"}:language==="tr"?{title:"Platform durumu",intro:"Buradan sitenin ve temel hizmetlerin genel durumunu kontrol edebilirsiniz.",checking:"Durum kontrol ediliyor...",ok:"Site çalışıyor ve temel hizmetler kullanılabilir",bad:"Durum şu anda doğrulanamadı",home:"Ana sayfa",contact:"İletişim"}:{title:"Platform status",intro:"View the general availability of the website and its essential services.",checking:"Checking status...",ok:"The website is operating and essential services are available",bad:"Status could not be verified right now",home:"Home",contact:"Contact"};
 useEffect(()=>{let live=true;void fetch("/api/health",{cache:"no-store"}).then(async(response)=>{if(!response.ok)throw new Error("health");const body=await response.json() as Health;if(live)setHealth(body)}).catch(()=>{if(live)setFailed(true)});return()=>{live=false}},[]);
 const healthy=health?.status==="ok"||health?.status==="healthy";
 return <PublicLanguageMain className="min-h-screen bg-[#070009] px-5 py-12 pb-[calc(7rem+env(safe-area-inset-bottom))] text-white"><section className="mx-auto max-w-4xl"><nav className="flex justify-between gap-3"><Link href={localizePublicHref("/",language)} className="rounded-full border border-white/15 px-5 py-3 font-black">{copy.home}</Link><Link href={localizePublicHref("/contact",language)} className="rounded-full border border-purple-300/25 bg-purple-500/10 px-5 py-3 font-black">{copy.contact}</Link></nav><article className="mt-8 rounded-[2rem] border border-purple-300/20 bg-[radial-gradient(circle_at_top,rgba(124,58,237,.28),rgba(0,0,0,.35))] p-7 md:p-10"><h1 className="text-4xl font-black md:text-6xl">{copy.title}</h1><p className="mt-5 max-w-2xl leading-8 text-white/65">{copy.intro}</p><div className={`mt-8 rounded-3xl border p-6 ${healthy?"border-green-300/25 bg-green-500/10":failed?"border-red-300/25 bg-red-500/10":"border-yellow-300/25 bg-yellow-500/10"}`}><p className="text-2xl font-black">{healthy?copy.ok:failed?copy.bad:copy.checking}</p></div></article></section></PublicLanguageMain>;
}
