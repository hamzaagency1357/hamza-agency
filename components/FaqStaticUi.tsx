"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: {
    backHome: "← العودة إلى الرئيسية",
    contactTitle: "تواصل معنا مباشرة",
    contactDescription: "يمكنك التواصل مع فريق وكالة حمزة عبر واتساب عند الحاجة إلى مساعدة إضافية.",
    contactPage: "صفحة التواصل",
    whatsapp: "واتساب",
    whatsappMessage: "مرحباً، لدي سؤال بخصوص وكالة حمزة.",
  },
  en: {
    backHome: "← Back to home",
    contactTitle: "Contact us directly",
    contactDescription: "Contact the HAMZA AGENCY team on WhatsApp when you need additional help.",
    contactPage: "Contact page",
    whatsapp: "WhatsApp",
    whatsappMessage: "Hello, I have a question about HAMZA AGENCY.",
  },
  tr: {
    backHome: "← Ana sayfaya dön",
    contactTitle: "Doğrudan iletişime geçin",
    contactDescription: "Ek yardıma ihtiyacınız olduğunda HAMZA AGENCY ekibiyle WhatsApp üzerinden iletişime geçebilirsiniz.",
    contactPage: "İletişim sayfası",
    whatsapp: "WhatsApp",
    whatsappMessage: "Merhaba, HAMZA AGENCY hakkında bir sorum var.",
  },
};

export function FaqBackHomeLink() {
  const language = useSiteLanguage();
  const text = copy[language];

  return (
    <Link href="/" dir={getLanguageDirection(language)} className="mb-8 inline-block text-purple-200">
      {text.backHome}
    </Link>
  );
}

export function FaqDirectContact({ cleanWhatsapp }: { cleanWhatsapp: string }) {
  const language = useSiteLanguage();
  const text = copy[language];

  return (
    <div dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
      <h2 className="text-3xl font-black">{text.contactTitle}</h2>
      <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{text.contactDescription}</p>
      <div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row">
        <Link href="/contact" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black">
          {text.contactPage}
        </Link>
        <a href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(text.whatsappMessage)}`} target="_blank" className="rounded-full bg-green-500 px-7 py-4 font-black text-white">
          {text.whatsapp}
        </a>
      </div>
    </div>
  );
}
