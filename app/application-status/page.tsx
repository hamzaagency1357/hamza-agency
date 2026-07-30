"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import {
  formatPublicFormDate,
  getApplicationStatusInfo,
  getPublicFormsCopy,
} from "@/lib/i18n/publicForms";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type ApplicationRecord = {
  tracking_code: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
};

type LookupResponse = {
  ok?: boolean;
  code?: string;
  record?: ApplicationRecord | null;
};

const trackingCopy = {
  ar: {
    description: "أدخل رقم التتبع الذي ظهر بعد إرسال طلب الانضمام لمعرفة آخر حالة مسجلة لطلبك لدى وكالة حمزة.",
    trackingCodeLabel: "رقم تتبع طلب الانضمام",
    trackingCode: "رقم التتبع",
    emptyResult: "أدخل رقم التتبع واضغط على زر عرض الحالة لمعرفة آخر تحديث مرتبط بطلب الانضمام.",
    invalidTrackingCode: "يرجى إدخال رقم تتبع صحيح مثل APP-2026-ABCDEF1234.",
    notFound: "لم يتم العثور على طلب بهذا الرقم. تأكد من إدخال رقم التتبع كما ظهر بعد إرسال الطلب.",
    privacyNotes: [
      "استخدم رقم التتبع كما ظهر بعد الإرسال بدون مسافات إضافية.",
      "لا تحتاج إلى إدخال رقم واتساب أو اسم البرنامج للبحث عن الطلب.",
      "تعرض الصفحة حالة الطلب العامة فقط ولا تعرض الاسم أو رقم واتساب أو الملاحظات أو الخبرات السابقة.",
      "احتفظ برقم التتبع لأن الوكالة قد تطلبه عند المتابعة عبر القنوات الرسمية.",
    ],
  },
  en: {
    description: "Enter the tracking code shown after submitting your agency application to view its latest recorded status.",
    trackingCodeLabel: "Application tracking code",
    trackingCode: "Tracking code",
    emptyResult: "Enter the tracking code and view the latest update linked to your agency application.",
    invalidTrackingCode: "Enter a valid tracking code, such as APP-2026-ABCDEF1234.",
    notFound: "No application was found with this code. Enter the code exactly as it appeared after submission.",
    privacyNotes: [
      "Use the tracking code exactly as it appeared after submission, with no extra spaces.",
      "You do not need to enter a WhatsApp number or program name to find the application.",
      "The page shows only the general status and does not display your name, WhatsApp number, notes, or previous experience.",
      "Keep the tracking code because the agency may request it during official follow-up.",
    ],
  },
  tr: {
    description: "Ajans başvurusunu gönderdikten sonra gösterilen takip kodunu girerek en son kaydedilen durumu görüntüleyin.",
    trackingCodeLabel: "Başvuru takip kodu",
    trackingCode: "Takip kodu",
    emptyResult: "Takip kodunu girerek ajans başvurunuza bağlı en son güncellemeyi görüntüleyin.",
    invalidTrackingCode: "APP-2026-ABCDEF1234 gibi geçerli bir takip kodu girin.",
    notFound: "Bu kodla bir başvuru bulunamadı. Kodu gönderimden sonra göründüğü şekilde tam olarak girin.",
    privacyNotes: [
      "Takip kodunu gönderimden sonra göründüğü şekilde, fazladan boşluk olmadan kullanın.",
      "Başvuruyu bulmak için WhatsApp numarası veya program adı girmeniz gerekmez.",
      "Sayfa yalnızca genel durumu gösterir; adınızı, WhatsApp numaranızı, notlarınızı veya önceki deneyiminizi göstermez.",
      "Ajans resmî takip sırasında isteyebileceği için takip kodunu saklayın.",
    ],
  },
} as const;

function normalizeTrackingCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export default function ApplicationStatusPage() {
  const language = useSiteLanguage();
  const forms = getPublicFormsCopy(language).application;
  const tracking = trackingCopy[language];
  const [trackingCode, setTrackingCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState<ApplicationRecord | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setApplication(null);

    const code = normalizeTrackingCode(trackingCode);
    if (!/^APP-[0-9]{4}-[A-F0-9]{10}$/.test(code)) {
      setMessage(tracking.invalidTrackingCode);
      return;
    }

    setIsLoading(true);
    const response = await fetch("/api/application-status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trackingCode: code }),
    }).catch(() => null);
    const result = response
      ? await response.json().catch(() => ({} as LookupResponse)) as LookupResponse
      : null;
    setIsLoading(false);

    if (!response || !response.ok || !result?.ok) {
      setMessage(result?.code === "rate_limited" ? forms.lookupError : forms.trackingUnavailable);
      return;
    }
    if (!result.record) {
      setMessage(tracking.notFound);
      return;
    }
    setApplication(result.record);
  }

  const statusInfo = application ? getApplicationStatusInfo(language, application.status) : null;

  return (
    <main dir={getLanguageDirection(language)} className="relative min-h-screen overflow-hidden bg-[#070009] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.34),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(40,10,70,0.38),rgba(7,0,9,0.96))]" />
        <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute -left-24 bottom-24 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
      </div>

      <section className="relative z-10 mx-auto max-w-5xl">
        <nav className="mb-8 flex items-center justify-between gap-4">
          <Link href={localizePublicHref("/", language)} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:text-white">{getStaticCopy(language, "backHome")}</Link>
          <Link href={localizePublicHref("/programs", language)} className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15">{getStaticCopy(language, "programs")}</Link>
        </nav>

        <header className="mb-8 rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{forms.eyebrow}</div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">{forms.title}</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70">{tracking.description}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur">
            <label className="block text-sm font-black text-white/80">{tracking.trackingCodeLabel}</label>
            <input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="APP-2026-ABCDEF1234" inputMode="text" autoComplete="off" dir="ltr" className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left font-mono uppercase tracking-wider text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/60" />

            <button type="submit" disabled={isLoading} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? forms.searching : forms.search}</button>
            {message && <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">{message}</div>}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><h2 className="text-sm font-black text-white/80">{forms.privacyTitle}</h2><div className="mt-3 grid gap-2 text-sm leading-7 text-white/48">{tracking.privacyNotes.map((note) => <p key={note}>{note}</p>)}</div></div>
          </form>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <h2 className="text-2xl font-black">{forms.resultTitle}</h2>
            {!application && <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 text-white/60">{tracking.emptyResult}</div>}
            {application && statusInfo && (
              <div className="mt-6 space-y-4">
                <div className={`rounded-2xl border p-5 ${statusInfo.className}`}><div className="text-sm font-bold opacity-80">{forms.currentStatus}</div><div className="mt-2 text-3xl font-black">{statusInfo.label}</div><p className="mt-3 leading-8 opacity-90">{statusInfo.description}</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox label={tracking.trackingCode} value={application.tracking_code || forms.unavailable} dir="ltr" />
                  <InfoBox label={forms.platform} value={application.platform || forms.unavailable} />
                  <InfoBox label={forms.applicationDate} value={formatPublicFormDate(application.created_at, language)} />
                  <InfoBox label={forms.followUpMethod} value={forms.officialWhatsApp} />
                </div>
                <a href="https://wa.me/905011730377" target="_blank" rel="noreferrer" className="block rounded-2xl bg-green-500 px-5 py-4 text-center font-black text-white shadow-2xl transition hover:bg-green-400">{forms.contactWhatsApp}</a>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function InfoBox({ label, value, dir }: { label: string; value: string; dir?: "rtl" | "ltr" }) {
  return <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><div className="text-xs font-bold text-white/45">{label}</div><div className="mt-2 font-black text-white" dir={dir}>{value}</div></div>;
}
