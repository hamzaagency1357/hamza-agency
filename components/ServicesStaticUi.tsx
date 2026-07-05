"use client";

import Link from "next/link";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type ServiceCard = { title: string; text: string };

type ServicesCopy = {
  backHome: string;
  serviceRequest: string;
  badge: string;
  viewPrograms: string;
  requestDigitalService: string;
  cards: ServiceCard[];
  processTitle: string;
  processSteps: string[];
  requestTitle: string;
  requestText: string;
  openRequest: string;
};

const copy: Record<"ar" | "en" | "tr", ServicesCopy> = {
  ar: {
    backHome: "العودة للرئيسية",
    serviceRequest: "إرسال طلب خدمة",
    badge: "خدمات HAMZA AGENCY",
    viewPrograms: "عرض البرامج",
    requestDigitalService: "طلب خدمة رقمية",
    cards: [
      { title: "متابعة طلبات الانضمام", text: "تنظيم طلبات صناع المحتوى ومتابعة حالتها من لوحة إدارة واضحة." },
      { title: "دعم البرامج", text: "توجيه المتقدمين حسب البرنامج المناسب ومتطلبات كل منصة." },
      { title: "تنظيم التواصل", text: "تسهيل التواصل مع فريق الوكالة عبر قنوات واضحة ومتابعة منظمة." },
      { title: "الخدمات الرقمية", text: "استقبال طلبات الخدمات الرقمية وتحويلها إلى مسار متابعة واضح." },
    ],
    processTitle: "كيف تتم المتابعة؟",
    processSteps: ["تحديد نوع الطلب أو الخدمة المطلوبة.", "إرسال البيانات الأساسية من الصفحة المناسبة.", "مراجعة الطلب من فريق وكالة حمزة.", "التواصل مع صاحب الطلب عبر واتساب عند الحاجة."],
    requestTitle: "هل تحتاج طلب خدمة؟",
    requestText: "صفحة طلب الخدمة مخصصة لإرسال التفاصيل المطلوبة بشكل منظم حتى يتمكن فريق الوكالة من مراجعتها ومتابعتها.",
    openRequest: "فتح صفحة طلب الخدمة",
  },
  en: {
    backHome: "Back to home",
    serviceRequest: "Submit a service request",
    badge: "HAMZA AGENCY Services",
    viewPrograms: "View programs",
    requestDigitalService: "Request a digital service",
    cards: [
      { title: "Joining request follow-up", text: "Organize content-creator requests and follow their status through a clear management workflow." },
      { title: "Program support", text: "Guide applicants based on the suitable program and each platform's requirements." },
      { title: "Communication management", text: "Make it easier to communicate with the agency team through clear channels and organized follow-up." },
      { title: "Digital services", text: "Receive digital-service requests and move them into a clear follow-up workflow." },
    ],
    processTitle: "How does follow-up work?",
    processSteps: ["Identify the required request or service type.", "Submit the essential details from the appropriate page.", "The HAMZA AGENCY team reviews the request.", "The request owner is contacted on WhatsApp when needed."],
    requestTitle: "Need to submit a service request?",
    requestText: "The service request page is designed to collect the required details in an organized way so the agency team can review and follow up on them.",
    openRequest: "Open service request page",
  },
  tr: {
    backHome: "Ana sayfaya dön",
    serviceRequest: "Hizmet talebi gönder",
    badge: "HAMZA AGENCY Hizmetleri",
    viewPrograms: "Programları görüntüle",
    requestDigitalService: "Dijital hizmet talep et",
    cards: [
      { title: "Katılım başvurusu takibi", text: "İçerik üreticisi başvurularını düzenler ve durumlarını açık bir yönetim akışı üzerinden takip eder." },
      { title: "Program desteği", text: "Başvuru sahiplerini uygun programa ve her platformun gereksinimlerine göre yönlendirir." },
      { title: "İletişim yönetimi", text: "Açık kanallar ve düzenli takip yoluyla ajans ekibiyle iletişimi kolaylaştırır." },
      { title: "Dijital hizmetler", text: "Dijital hizmet taleplerini alır ve bunları açık bir takip akışına taşır." },
    ],
    processTitle: "Takip nasıl ilerler?",
    processSteps: ["Gerekli talep veya hizmet türü belirlenir.", "Temel bilgiler uygun sayfadan gönderilir.", "HAMZA AGENCY ekibi talebi inceler.", "Gerektiğinde talep sahibiyle WhatsApp üzerinden iletişime geçilir."],
    requestTitle: "Hizmet talebi mi göndermek istiyorsunuz?",
    requestText: "Hizmet talebi sayfası, ajans ekibinin inceleyip takip edebilmesi için gerekli bilgileri düzenli biçimde iletmek üzere tasarlanmıştır.",
    openRequest: "Hizmet talebi sayfasını aç",
  },
};

function useCopy() {
  const language = useSiteLanguage();
  return { language, text: copy[language] };
}

export function ServicesNav() {
  const { language, text } = useCopy();
  return (
    <nav dir={getLanguageDirection(language)} className="mb-8 flex items-center justify-between gap-4">
      <Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:text-white">{text.backHome}</Link>
      <Link href="/service-request" className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15">{text.serviceRequest}</Link>
    </nav>
  );
}

export function ServicesBadge() {
  const { language, text } = useCopy();
  return <div dir={getLanguageDirection(language)} className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{text.badge}</div>;
}

export function ServicesHeroActions() {
  const { language, text } = useCopy();
  return (
    <div dir={getLanguageDirection(language)} className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
      <Link href="/programs" className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.25)]">{text.viewPrograms}</Link>
      <Link href="/service-request" className="rounded-full border border-white/15 bg-white/[0.05] px-8 py-4 font-black text-white/80 backdrop-blur transition hover:border-purple-400/50 hover:text-white">{text.requestDigitalService}</Link>
    </div>
  );
}

export function ServicesStaticContent() {
  const { language, text } = useCopy();
  return (
    <>
      <div dir={getLanguageDirection(language)} className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {text.cards.map((item) => <div key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur"><h3 className="text-xl font-black">{item.title}</h3><p className="mt-4 leading-8 text-white/65">{item.text}</p></div>)}
      </div>
      <div dir={getLanguageDirection(language)} className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/30 p-7 backdrop-blur">
          <h2 className="text-3xl font-black">{text.processTitle}</h2>
          <div className="mt-6 grid gap-4">{text.processSteps.map((step, index) => <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-black text-purple-100">{index + 1}</div><p className="leading-8 text-white/72">{step}</p></div>)}</div>
        </div>
        <div className="rounded-[2rem] border border-green-400/20 bg-green-500/10 p-7 text-center backdrop-blur">
          <h2 className="text-3xl font-black text-green-100">{text.requestTitle}</h2>
          <p className="mx-auto mt-4 max-w-xl leading-8 text-white/70">{text.requestText}</p>
          <Link href="/service-request" className="mt-7 inline-flex rounded-full bg-green-500 px-8 py-4 font-black text-white shadow-[0_0_30px_rgba(34,197,94,0.2)]">{text.openRequest}</Link>
        </div>
      </div>
    </>
  );
}
