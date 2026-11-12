import Link from "next/link";
import { localizePublicPath } from "@/lib/i18n/publicLocales";
import { getRequestSiteContext } from "@/lib/i18n/serverPublicMetadata";
import { DEFAULT_PUBLIC_IDENTITY } from "@/lib/publicIdentity";

const maintenanceCopy = {
  ar: {
    title: "الموقع تحت الصيانة المؤقتة", description: "نعمل على تحسين تجربة وكالة حمزة. سيعود الموقع للعمل قريبًا.",
    website: "حالة الموقع", maintenance: "صيانة مؤقتة", services: "الخدمات", updating: "قيد التحديث",
    contact: "التواصل", available: "متاح عبر واتساب", whatsapp: "تواصل عبر واتساب", home: "العودة للرئيسية",
  },
  en: {
    title: "The website is under maintenance", description: "We are improving the HAMZA AGENCY website. It will be back soon.",
    website: "Website status", maintenance: "Temporary maintenance", services: "Services", updating: "Being updated",
    contact: "Contact", available: "Available on WhatsApp", whatsapp: "Contact on WhatsApp", home: "Back to home",
  },
  tr: {
    title: "Web sitesi geçici olarak bakımda", description: "Hamza Ajansı web sitesini iyileştiriyoruz. Site yakında yeniden açılacak.",
    website: "Site durumu", maintenance: "Geçici bakım", services: "Hizmetler", updating: "Güncelleniyor",
    contact: "İletişim", available: "WhatsApp üzerinden ulaşabilirsiniz", whatsapp: "WhatsApp ile iletişime geçin", home: "Ana sayfaya dön",
  },
} as const;

export default async function MaintenancePage() {
  const { language, direction } = await getRequestSiteContext();
  const copy = maintenanceCopy[language];
  return (
    <main dir={direction} className="relative min-h-screen overflow-hidden bg-[#050008] px-5 py-10 text-white md:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-purple-700/25 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[-10%] h-96 w-96 rounded-full bg-yellow-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="w-full rounded-[2.5rem] border border-purple-300/20 bg-white/[0.045] p-7 text-center shadow-[0_0_90px_rgba(126,34,206,0.22)] backdrop-blur-xl md:p-12">
          <div className="mx-auto mb-6 inline-flex rounded-full border border-yellow-300/25 bg-yellow-400/10 px-5 py-2 text-sm font-black text-yellow-100">
            {DEFAULT_PUBLIC_IDENTITY.agencyName[language]}
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-6xl">
            {copy.title}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-9 text-white/65 md:text-xl">
            {copy.description}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatusCard title={copy.website} value={copy.maintenance} />
            <StatusCard title={copy.services} value={copy.updating} />
            <StatusCard title={copy.contact} value={copy.available} />
          </div>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="https://wa.me/905011730377"
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.28)] transition hover:scale-[1.02]"
            >
              {copy.whatsapp}
            </a>
            <Link
              href={localizePublicPath("/", language)}
              className="rounded-full border border-white/10 bg-white/[0.05] px-7 py-4 font-bold text-white/75 transition hover:border-purple-300/40 hover:text-white"
            >
              {copy.home}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="text-sm font-bold text-white/45">{title}</div>
      <div className="mt-2 text-xl font-black text-white">{value}</div>
    </div>
  );
}
