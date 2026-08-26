"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: {
    title: "أنت غير متصل حالياً",
    body: "يمكنك متابعة الصفحات العامة المحفوظة مسبقاً. بيانات الحسابات والطلبات والبوابات لا تُخزّن للعمل دون اتصال حفاظاً على الخصوصية.",
    action: "إعادة المحاولة من الصفحة الرئيسية",
  },
  en: {
    title: "You are offline",
    body: "You can continue using public pages that were saved previously. Account, request, and portal data is not stored for offline use in order to protect your privacy.",
    action: "Try again from the home page",
  },
  tr: {
    title: "Çevrimdışısınız",
    body: "Daha önce kaydedilmiş herkese açık sayfaları kullanmaya devam edebilirsiniz. Gizliliğinizi korumak için hesap, talep ve portal verileri çevrimdışı kullanım amacıyla saklanmaz.",
    action: "Ana sayfadan yeniden deneyin",
  },
} as const;

export default function OfflinePage() {
  const language = useSiteLanguage();
  const text = copy[language];
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#09050f] px-5 text-white"
      dir={getLanguageDirection(language)}
    >
      <section className="w-full max-w-xl rounded-3xl border border-violet-300/20 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/20 text-3xl" aria-hidden="true">⌁</div>
        <h1 className="mt-5 text-3xl font-black">{text.title}</h1>
        <p className="mt-3 leading-7 text-white/70">{text.body}</p>
        <Link
          href={localizePublicHref("/", language)}
          className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-violet-600 px-6 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          {text.action}
        </Link>
      </section>
    </main>
  );
}
