"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: { back: "← العودة إلى الرئيسية", badge: "تقييمات HAMZA AGENCY", title: "تقييمات وكالة حمزة", accent: "آراء وتجارب العملاء", intro: "هذه الصفحة مخصصة لعرض الآراء المنشورة من صناع المحتوى والعملاء حول التواصل مع وكالة حمزة ومتابعة الطلبات والخدمات.", note: "لا توجد تقييمات منشورة حاليًا." },
  en: { back: "← Back to home", badge: "HAMZA AGENCY Reviews", title: "HAMZA AGENCY reviews", accent: "Client feedback and experiences", intro: "This page presents published feedback from content creators and clients about contacting HAMZA AGENCY, application follow-up, and services.", note: "There are currently no published reviews." },
  tr: { back: "← Ana sayfaya dön", badge: "HAMZA AGENCY Değerlendirmeleri", title: "HAMZA AGENCY değerlendirmeleri", accent: "Müşteri görüşleri ve deneyimleri", intro: "Bu sayfa, içerik üreticileri ve müşterilerin HAMZA AGENCY iletişimi, başvuru takibi ve hizmetleri hakkındaki yayınlanmış görüşlerini sunar.", note: "Şu anda yayınlanmış değerlendirme bulunmuyor." },
};
export function ReviewsBackLink(){const language=useSiteLanguage();const t=copy[language];return <Link href="/" dir={getLanguageDirection(language)} className="mb-8 inline-block text-purple-200">{t.back}</Link>}
export function ReviewsHero({isDefault}:{isDefault:boolean}){const language=useSiteLanguage();const t=copy[language];return <header dir={getLanguageDirection(language)} className="rounded-[2rem] border border-purple-400/20 bg-black/35 p-7 text-center shadow-[0_0_55px_rgba(168,85,247,0.14)] backdrop-blur md:p-10"><div className="mx-auto mb-5 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">{t.badge}</div><h1 className="text-5xl font-black leading-tight text-[color:var(--public-heading)] md:text-7xl">{t.title}<span className="block bg-gradient-to-r from-yellow-300 via-white to-purple-300 bg-clip-text text-transparent">{t.accent}</span></h1><p className="mx-auto mt-6 max-w-4xl text-lg leading-9 text-[color:var(--public-secondary)] md:text-xl">{t.intro}</p>{isDefault?<div className="mx-auto mt-6 max-w-4xl rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-50/80">{t.note}</div>:null}</header>}
