"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const labels = { ar: "عرض تفاصيل البرنامج", en: "View program details", tr: "Program ayrıntılarını görüntüle" };

export default function PartnerDetailsLink({ href }: { href: string }) {
  const language = useSiteLanguage();
  return <Link dir={getLanguageDirection(language)} href={href} className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white/80 transition hover:border-purple-300/40 hover:bg-purple-500/10">{labels[language]}</Link>;
}
