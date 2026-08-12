"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copy = {
  ar: {
    back: "← العودة إلى الرئيسية",
    managementTitle: "إدارة الوكالة",
    managementBody: "تُدار وكالة حمزة بإشراف الوكيل عراب سوريا، وفق معايير مهنية تركز على الثقة والخصوصية والمتابعة الدقيقة.",
    values: [["إدارة احترافية", "نساعد صناع المحتوى على فهم طريقة العمل داخل البرامج، تنظيم خطواتهم، ومتابعة تقدمهم بوضوح."], ["دعم ومتابعة", "نوفر متابعة للطلبات والمشاكل الفنية والتواصل مع المتقدمين عبر واتساب عند الحاجة."], ["برامج متعددة", "نقدم مسارات عبر TikTok وBIGO LIVE وYaahlan وXena وCatchii، مع خيارات تناسب مجالات محتوى مختلفة."], ["تجربة منظمة", "نجمع معلومات البرامج والطلبات والخدمات في تجربة واضحة وسهلة للزائر."]],
    missionTitle: "رسالتنا", missionText: "تقديم تجربة واضحة وسهلة للمتقدمين، مع متابعة منظمة للطلبات والبرامج والمحتوى بدون تعقيد.", systemTitle: "رحلة واضحة مع الوكالة",
    milestones: ["تصفح البرامج المتاحة", "إرسال الطلب ببيانات واضحة", "مراجعة الطلب حسب البرنامج", "المتابعة عبر القنوات الرسمية"],
    ctaTitle: "هل تريد الانضمام للوكالة؟", ctaText: "يمكنك تصفح البرامج المتاحة وإرسال طلب الانضمام، أو التواصل معنا مباشرة عبر واتساب.", programs: "عرض البرامج", whatsapp: "تواصل واتساب",
  },
  en: {
    back: "← Back to home", managementTitle: "Agency management",
    managementBody: "HAMZA AGENCY is managed by Agent Hamza, following professional standards focused on trust, privacy, and careful follow-up.",
    values: [["Professional management", "We help content creators understand how programs work, organize their steps, and follow their progress clearly."], ["Support and follow-up", "We provide follow-up for applications and technical issues, with WhatsApp communication when needed."], ["Multiple programs", "We offer paths across TikTok, BIGO LIVE, Yaahlan, Xena, and Catchii, with options for different types of content."], ["An organized experience", "Program, application, and service information comes together in one clear visitor experience."]],
    missionTitle: "Our mission", missionText: "To provide applicants with a clear, easy experience and organized follow-up for applications, programs, and content.", systemTitle: "A clear agency journey",
    milestones: ["Explore available programs", "Submit clear application details", "Have the application reviewed for the selected program", "Follow up through official channels"],
    ctaTitle: "Would you like to join the agency?", ctaText: "You can browse the available programs and submit an application, or contact us directly on WhatsApp.", programs: "View programs", whatsapp: "Contact on WhatsApp",
  },
  tr: {
    back: "← Ana sayfaya dön", managementTitle: "Ajans yönetimi",
    managementBody: "HAMZA AGENCY, güven, gizlilik ve titiz takibe odaklanan profesyonel standartlar doğrultusunda Temsilci Hamza yönetiminde çalışır.",
    values: [["Profesyonel yönetim", "İçerik üreticilerinin programların nasıl çalıştığını anlamasına, adımlarını düzenlemesine ve ilerlemelerini açıkça takip etmesine yardımcı oluyoruz."], ["Destek ve takip", "Başvurular ve teknik sorunlar için takip sağlıyor, gerektiğinde WhatsApp üzerinden iletişim kuruyoruz."], ["Birden fazla program", "TikTok, BIGO LIVE, Yaahlan, Xena ve Catchii üzerinden farklı içerik alanlarına uygun yollar sunuyoruz."], ["Düzenli deneyim", "Program, başvuru ve hizmet bilgilerini ziyaretçiler için açık ve kolay bir deneyimde bir araya getiriyoruz."]],
    missionTitle: "Misyonumuz", missionText: "Başvuranlar için açık ve kolay bir deneyim, başvurular ve programlar için düzenli takip sunmak.", systemTitle: "Açık bir ajans yolculuğu",
    milestones: ["Mevcut programları inceleyin", "Başvuru bilgilerini açık şekilde gönderin", "Başvurunuz seçilen programa göre incelensin", "Resmî kanallardan takip alın"],
    ctaTitle: "Ajansa katılmak ister misiniz?", ctaText: "Mevcut programları inceleyip başvuru gönderebilir veya doğrudan WhatsApp üzerinden bizimle iletişime geçebilirsiniz.", programs: "Programları görüntüle", whatsapp: "WhatsApp ile iletişime geç",
  },
} as const;

function useAboutCopy() { const language = useSiteLanguage(); return { text: copy[language], direction: getLanguageDirection(language) }; }
export function AboutContentShell({ children }: { children: ReactNode }) { const { direction } = useAboutCopy(); return <section dir={direction} className="relative z-10 mx-auto max-w-7xl px-5 py-16">{children}</section>; }
export function AboutBackLink() { const { text } = useAboutCopy(); return <Link href="/" className="mb-8 inline-block text-purple-200">{text.back}</Link>; }
export function AboutManagementPanel({ agencyName }: { agencyName: string }) { const { text } = useAboutCopy(); return <div className="mt-8 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-6"><h2 className="text-2xl font-black text-yellow-100">{text.managementTitle}</h2><p className="mt-4 text-xl leading-9 text-white/80">{text.managementBody}</p><span className="sr-only">{agencyName}</span></div>; }
export function AboutValues() { const { text } = useAboutCopy(); return <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">{text.values.map(([title, description]) => <div key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"><h3 className="text-2xl font-black">{title}</h3><p className="mt-4 leading-8 text-white/65">{description}</p></div>)}</div>; }
export function AboutMission() { const { text } = useAboutCopy(); return <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-500/10 p-7 backdrop-blur"><h2 className="text-3xl font-black">{text.missionTitle}</h2><p className="mt-5 leading-9 text-white/72">{text.missionText}</p></div>; }
export function AboutMilestones() { const { text } = useAboutCopy(); return <div className="mt-10 rounded-[2rem] border border-white/10 bg-black/35 p-7 backdrop-blur"><h2 className="text-3xl font-black">{text.systemTitle}</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{text.milestones.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-white/75">{item}</div>)}</div></div>; }
export function AboutCta({ cleanWhatsapp }: { cleanWhatsapp: string }) { const { text } = useAboutCopy(); return <div className="mt-10 rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur"><h2 className="text-3xl font-black">{text.ctaTitle}</h2><p className="mx-auto mt-4 max-w-2xl leading-8 text-white/70">{text.ctaText}</p><div className="mt-7 flex flex-col justify-center gap-4 sm:flex-row"><Link href="/programs" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black">{text.programs}</Link><a href={`https://wa.me/${cleanWhatsapp}`} target="_blank" rel="noreferrer" className="rounded-full bg-green-500 px-7 py-4 font-black text-white">{text.whatsapp}</a></div></div>; }
