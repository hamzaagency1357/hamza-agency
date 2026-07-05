"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type Step = readonly [title: string, text: string];
type Copy = {
  stats: readonly (readonly [value: string, title: string])[];
  badge: string;
  title: string;
  text: string;
  steps: readonly Step[];
  ctaTitle: string;
  ctaText: string;
  browse: string;
  whatsapp: string;
};

const copy: Record<"ar" | "en" | "tr", Copy> = {
  ar: {
    stats: [["5", "برامج تعاون أساسية"], ["متعددة", "مسارات لصناع المحتوى"], ["واتساب", "متابعة مباشرة"]],
    badge: "طريقة العمل",
    title: "كيف تساعدك وكالة حمزة في اختيار البرنامج المناسب؟",
    text: "يعتمد اختيار البرنامج على نوع المحتوى والخبرة السابقة وأهداف الانضمام، لذلك نبدأ بفهم بيانات المتقدم ثم نوجهه للمسار الأقرب لاحتياجه.",
    steps: [["فهم بيانات المتقدم", "مراجعة الدولة والمنصة المطلوبة والخبرة السابقة وطبيعة المحتوى."], ["توضيح البرامج المتاحة", "شرح الفروقات الأساسية بين البرامج ومتطلبات كل مسار."], ["اختيار المسار الأنسب", "توجيه المتقدم إلى البرنامج الأقرب لطبيعة حضوره وأهدافه."], ["متابعة مباشرة", "توفير تواصل واضح عبر واتساب عند الحاجة لاستكمال الخطوات."]],
    ctaTitle: "هل تريد معرفة البرنامج الأنسب لك؟",
    ctaText: "تصفح البرامج أو تواصل عبر واتساب للحصول على توجيه أولي قبل تقديم الطلب.",
    browse: "تصفح البرامج",
    whatsapp: "التواصل عبر واتساب",
  },
  en: {
    stats: [["5", "Core programs"], ["Multiple", "Creator pathways"], ["WhatsApp", "Direct follow-up"]],
    badge: "How it works",
    title: "How does HAMZA AGENCY help you choose the right program?",
    text: "Program selection depends on content type, previous experience, and joining goals. We first understand applicant details, then guide them toward the best fit.",
    steps: [["Understand applicant details", "Review country, requested platform, prior experience, and content type."], ["Clarify available programs", "Explain key differences and requirements for each available path."], ["Choose the right path", "Guide the applicant toward the program closest to their presence and goals."], ["Direct follow-up", "Provide clear WhatsApp communication when needed to complete the steps."]],
    ctaTitle: "Want to know which program suits you?",
    ctaText: "Browse programs or contact us on WhatsApp for initial guidance before applying.",
    browse: "Browse programs",
    whatsapp: "Contact via WhatsApp",
  },
  tr: {
    stats: [["5", "Temel programlar"], ["Çoklu", "İçerik üreticisi yolları"], ["WhatsApp", "Doğrudan takip"]],
    badge: "Çalışma şekli",
    title: "HAMZA AGENCY doğru programı seçmenize nasıl yardımcı olur?",
    text: "Program seçimi içerik türüne, önceki deneyime ve katılım hedeflerine bağlıdır. Önce başvuru bilgilerini anlar, ardından en uygun yola yönlendiririz.",
    steps: [["Başvuru sahibinin bilgilerini anlamak", "Ülke, istenen platform, önceki deneyim ve içerik türünü incelemek."], ["Mevcut programları açıklamak", "Her yol için temel farkları ve gereksinimleri açıklamak."], ["En uygun yolu seçmek", "Başvuru sahibini görünürlüğüne ve hedeflerine en yakın programa yönlendirmek."], ["Doğrudan takip", "Adımları tamamlamak için gerektiğinde net WhatsApp iletişimi sağlamak."]],
    ctaTitle: "Size en uygun programı öğrenmek ister misiniz?",
    ctaText: "Başvurmadan önce programları inceleyin veya ilk yönlendirme için WhatsApp üzerinden iletişime geçin.",
    browse: "Programları incele",
    whatsapp: "WhatsApp ile iletişime geç",
  },
};

function useCopy() {
  const language = useSiteLanguage();
  return { language, text: copy[language] };
}

export function PartnersStatsUi() {
  const { language, text } = useCopy();

  return (
    <div dir={getLanguageDirection(language)} className="mt-10 grid gap-5 md:grid-cols-3">
      {text.stats.map(([value, title]) => (
        <div key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 text-center backdrop-blur">
          <div className="text-4xl font-black text-yellow-100">{value}</div>
          <div className="mt-3 text-sm font-bold text-white/55">{title}</div>
        </div>
      ))}
    </div>
  );
}

export function PartnersGuidanceUi() {
  const { language, text } = useCopy();

  return (
    <section dir={getLanguageDirection(language)} className="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 backdrop-blur md:p-8">
        <div className="mb-3 inline-flex rounded-full border border-green-400/20 bg-green-500/10 px-4 py-2 text-sm font-black text-green-100">{text.badge}</div>
        <h2 className="text-3xl font-black md:text-4xl">{text.title}</h2>
        <p className="mt-4 leading-8 text-white/70">{text.text}</p>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {text.steps.map(([title, stepText], index) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-black/25 p-5">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-500/10 text-sm font-black text-yellow-100">{String(index + 1).padStart(2, "0")}</div>
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 leading-7 text-white/60">{stepText}</p>
            </div>
          ))}
        </div>
      </div>
      <aside className="rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur md:p-8">
        <h2 className="text-3xl font-black text-yellow-100 md:text-4xl">{text.ctaTitle}</h2>
        <p className="mt-4 leading-8 text-white/70">{text.ctaText}</p>
        <div className="mt-7 flex flex-col gap-3">
          <Link href="/programs" className="rounded-full bg-purple-600 px-8 py-4 text-center font-black text-white shadow-2xl shadow-purple-950/30 transition hover:bg-purple-500">{text.browse}</Link>
          <a href="https://wa.me/905011730377" target="_blank" rel="noreferrer" className="rounded-full bg-green-500 px-8 py-4 text-center font-black text-white shadow-2xl shadow-green-950/30 transition hover:bg-green-400">{text.whatsapp}</a>
        </div>
      </aside>
    </section>
  );
}
