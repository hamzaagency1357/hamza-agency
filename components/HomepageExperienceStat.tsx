"use client";

import { useEffect,useState } from "react";
import { usePathname } from "next/navigation";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { stripLocalePrefix } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { isSupabaseConfigured,supabase } from "@/lib/supabase";

const labels={ar:"سنوات خبرة",en:"Years of experience",tr:"Yıllık deneyim"} as const;
const INITIAL_APPROVED_YEARS="7";
export default function HomepageExperienceStat(){const pathname=usePathname()||"/";const language=useSiteLanguage();const[value,setValue]=useState(INITIAL_APPROVED_YEARS);const publicPath=stripLocalePrefix(pathname);useEffect(()=>{let live=true;if(publicPath!=="/"||!isSupabaseConfigured||!supabase)return;void supabase.from("settings").select("setting_value").eq("setting_key","home_stat_5_number").eq("is_public",true).order("updated_at",{ascending:false}).limit(1).maybeSingle().then(({data})=>{const configured=data?.setting_value?.trim();if(live&&configured)setValue(configured)});return()=>{live=false}},[publicPath]);if(publicPath!=="/")return null;return <section dir={getLanguageDirection(language)} aria-label={labels[language]} data-testid="homepage-experience-stat" className="relative z-10 mx-auto -mt-16 mb-20 max-w-sm px-5 text-center"><div className="rounded-3xl border border-white/12 bg-black/45 p-5 text-white shadow-xl backdrop-blur-xl"><div className="text-4xl font-black">{value}</div><div className="mt-2 font-bold text-white/65">{labels[language]}</div></div></section>}
