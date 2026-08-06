"use client";

import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: { title: "تعذر تحميل المدونة", text: "حدث خطأ مؤقت أثناء تحميل المقالات. يمكنك المحاولة مرة أخرى.", retry: "إعادة المحاولة" },
  en: { title: "The blog could not be loaded", text: "A temporary error occurred while loading the articles. Please try again.", retry: "Try again" },
  tr: { title: "Blog yüklenemedi", text: "Makaleler yüklenirken geçici bir hata oluştu. Lütfen tekrar deneyin.", retry: "Tekrar dene" },
} as const;

export default function BlogError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const language = useSiteLanguage();
  const t = copy[language];
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white">
      <section role="alert" className="max-w-xl rounded-[2rem] border border-red-300/20 bg-red-500/10 p-8 text-center">
        <h1 className="text-3xl font-black">{t.title}</h1>
        <p className="mt-4 leading-8 text-white/70">{t.text}</p>
        <button type="button" onClick={reset} className="mt-6 min-h-11 rounded-full bg-purple-600 px-6 py-3 font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300">{t.retry}</button>
      </section>
    </main>
  );
}
