"use client";

import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: { platforms: "المنصات", count: "عدد التقييمات", average: "متوسط التقييم", multiple: "متعددة" },
  en: { platforms: "Platforms", count: "Review count", average: "Average rating", multiple: "Multiple" },
  tr: { platforms: "Platformlar", count: "Değerlendirme sayısı", average: "Ortalama puan", multiple: "Çoklu" },
};

export default function ReviewsStatsUi({ isDefault, count, rating }: { isDefault:boolean; count:number; rating:string }) {
  const language = useSiteLanguage(); const t = copy[language];
  if(isDefault)return null;
  const labels = [t.count, t.average, t.platforms];
  const values = [String(count), rating, t.multiple];
  return <div dir={getLanguageDirection(language)} className="mt-10 grid gap-5 md:grid-cols-3">{labels.map((label, index) => <div key={label} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 text-center backdrop-blur"><div className="text-4xl font-black text-yellow-100">{values[index]}</div><div className="mt-3 text-sm font-bold text-white/55">{label}</div></div>)}</div>;
}
