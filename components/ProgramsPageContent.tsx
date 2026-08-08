"use client";

import ProgramsGridWithTranslations from "@/components/ProgramsGridWithTranslations";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type Program={id:number;name:string;slug:string;description:string|null;short_description:string|null;status:string|null;sort_order:number|null;is_visible:boolean|null;is_active:boolean|null;logo_url?:string|null;hero_image_url?:string|null;mobile_image_url?:string|null;og_image_url?:string|null;alt_ar?:string|null;alt_en?:string|null;alt_tr?:string|null};
type ProgramMedia={id:number;name:string|null;file_url:string|null;file_type:string|null;category:string|null;page_slug:string|null;alt_text:string|null;is_active:boolean|null};
export default function ProgramsPageContent({programs,mediaItems,whatsappHref}:{programs:Program[];mediaItems:ProgramMedia[];whatsappHref:string}){
 const language=useSiteLanguage();const copy=(key:Parameters<typeof getStaticCopy>[1])=>getStaticCopy(language,key);const highlights=[copy("programsHighlightDirectApply"),copy("programsHighlightReview"),copy("programsHighlightWhatsApp"),copy("programsHighlightBestFit")];
 return <section dir={getLanguageDirection(language)} className="relative z-10 mx-auto max-w-7xl px-5 py-16 pb-[calc(7rem+env(safe-area-inset-bottom))]">
  <div className="mb-14 text-center"><div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100 backdrop-blur">{copy("programsEyebrow")}</div><h1 className="text-4xl font-black leading-tight md:text-6xl">{copy("programsHeroTitle")}<span className="block bg-gradient-to-r from-purple-300 via-white to-yellow-300 bg-clip-text text-transparent">{copy("programsHeroAccent")}</span></h1><p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/72">{copy("programsHeroDescription")}</p></div>
  <div className="mb-10 grid gap-4 md:grid-cols-4">{highlights.map((item)=><div key={item} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 text-center text-sm font-bold text-white/75 backdrop-blur">{item}</div>)}</div>
  <ProgramsGridWithTranslations programs={programs} mediaItems={mediaItems}/>
  <div className="mt-14 rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 text-center backdrop-blur"><h2 className="text-2xl font-black text-yellow-100">{copy("programsHelpTitle")}</h2><p className="mx-auto mt-3 max-w-2xl leading-8 text-white/70">{copy("programsHelpDescription")}</p><a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex rounded-full bg-green-500 px-7 py-4 font-black text-white shadow-2xl">{copy("programsWhatsAppCta")}</a></div>
 </section>;
}
