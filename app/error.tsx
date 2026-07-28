"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { localizePublicPath } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: {
    title: "حدث خطأ غير متوقع",
    description:
      "نعتذر عن هذا الخلل المؤقت. يمكنك إعادة المحاولة أو العودة إلى الصفحة الرئيسية.",
    retry: "إعادة المحاولة",
    home: "العودة للرئيسية",
  },
  en: {
    title: "Something unexpected happened",
    description:
      "Sorry for the temporary issue. Try again or return to the home page.",
    retry: "Try again",
    home: "Back to home",
  },
  tr: {
    title: "Beklenmeyen bir sorun oluştu",
    description:
      "Bu geçici sorun için üzgünüz. Tekrar deneyebilir veya ana sayfaya dönebilirsiniz.",
    retry: "Tekrar dene",
    home: "Ana sayfaya dön",
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const language = useSiteLanguage();
  const text = copy[language];

  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main
      dir={getLanguageDirection(language)}
      lang={language}
      className="flex min-h-screen items-center justify-center bg-[#050008] px-5 py-16 text-white"
    >
      <section className="w-full max-w-2xl rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-8 text-center shadow-[0_0_80px_rgba(124,58,237,0.18)] backdrop-blur">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-300/30 bg-yellow-400/10 text-3xl text-yellow-100">
          !
        </div>

        <p className="text-sm font-bold uppercase tracking-[0.35em] text-yellow-200/80">
          HAMZA AGENCY
        </p>

        <h1 className="mt-4 text-3xl font-black md:text-5xl">
          {text.title}
        </h1>

        <p className="mx-auto mt-5 max-w-xl leading-8 text-white/65">
          {text.description}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-3 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.25)]"
          >
            {text.retry}
          </button>

          <Link
            href={localizePublicPath("/", language)}
            className="rounded-full border border-white/15 bg-white/[0.04] px-7 py-3 font-black text-white/80 transition hover:border-purple-300/50 hover:text-white"
          >
            {text.home}
          </Link>
        </div>
      </section>
    </main>
  );
}
