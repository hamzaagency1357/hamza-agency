"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: {
    home: "العودة للرئيسية",
    programs: "عرض البرامج",
    whatsapp: "واتساب",
    whatsappMessage: "مرحباً، أريد التواصل مع وكالة حمزة.",
    about: "من نحن",
    services: "خدمات الوكالة",
    contact: "اتصل بنا",
  },
  en: {
    home: "Back to home",
    programs: "View programs",
    whatsapp: "WhatsApp",
    whatsappMessage: "Hello, I would like to contact HAMZA AGENCY.",
    about: "About us",
    services: "Agency services",
    contact: "Contact us",
  },
  tr: {
    home: "Ana sayfaya dön",
    programs: "Programları görüntüle",
    whatsapp: "WhatsApp",
    whatsappMessage: "Merhaba, HAMZA AGENCY ile iletişime geçmek istiyorum.",
    about: "Hakkımızda",
    services: "Ajans hizmetleri",
    contact: "Bize ulaşın",
  },
} as const;

function useNotFoundCopy() {
  const language = useSiteLanguage();
  return { text: copy[language], direction: getLanguageDirection(language) };
}

export function NotFoundShell({ children }: { children: ReactNode }) {
  const { direction } = useNotFoundCopy();
  return <main dir={direction} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070009] px-5 py-16 text-white">{children}</main>;
}

export function NotFoundActions({ cleanWhatsapp }: { cleanWhatsapp: string }) {
  const { text } = useNotFoundCopy();
  return <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"><Link href="/" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.25)]">{text.home}</Link><Link href="/programs" className="rounded-full border border-white/15 bg-white/[0.05] px-8 py-4 font-black text-white backdrop-blur transition hover:border-purple-400/50 hover:bg-purple-500/10">{text.programs}</Link><a href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" rel="noreferrer" className="rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-2xl">{text.whatsapp}</a></div>;
}

export function NotFoundQuickLinks() {
  const { text } = useNotFoundCopy();
  const links = [["/about", text.about], ["/services", text.services], ["/contact", text.contact]] as const;
  return <div className="mt-6 grid gap-4 md:grid-cols-3">{links.map(([href, label]) => <Link key={href} href={href} className="rounded-3xl border border-white/10 bg-white/[0.045] p-5 backdrop-blur transition hover:border-purple-400/50">{label}</Link>)}</div>;
}
