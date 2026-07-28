"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import {
  formatPublicFormDate,
  getPublicFormsCopy,
  getServiceStatusInfo,
  getServiceTypeLabel,
} from "@/lib/i18n/publicForms";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ServiceRequestRecord = {
  id: number;
  request_code: string | null;
  service_type: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeRequestCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export default function ServiceStatusPage() {
  const language = useSiteLanguage();
  const forms = getPublicFormsCopy(language).serviceTracking;
  const [requestCode, setRequestCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [serviceRequest, setServiceRequest] = useState<ServiceRequestRecord | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setServiceRequest(null);
    const code = normalizeRequestCode(requestCode);

    if (!code || code.length < 8) {
      setMessage(forms.invalidCode);
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setMessage(forms.trackingUnavailable);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase.rpc("lookup_public_service_request", {
      p_request_code: code,
    });
    setIsLoading(false);

    if (error) {
      console.error("Service request status lookup error:", error);
      setMessage(forms.lookupError);
      return;
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (!record) {
      setMessage(forms.notFound);
      return;
    }
    setServiceRequest(record as ServiceRequestRecord);
  }

  const statusInfo = serviceRequest ? getServiceStatusInfo(language, serviceRequest.status) : null;

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
          <Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:text-white">{getStaticCopy(language, "backHome")}</Link>
          <Link href="/service-request" className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15">{getStaticCopy(language, "serviceRequest")}</Link>
        </nav>

        <header className="mb-8 rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{forms.eyebrow}</div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">{forms.title}</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70">{forms.description}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur">
            <label className="block text-sm font-black text-white/80">{forms.requestCode}</label>
            <input value={requestCode} onChange={(event) => setRequestCode(event.target.value)} placeholder="SR-2026-123456" dir="ltr" autoComplete="off" className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/60" />
            <button type="submit" disabled={isLoading} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? forms.searching : forms.search}</button>
            {message && <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">{message}</div>}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4"><h2 className="text-sm font-black text-white/80">{forms.notesTitle}</h2><div className="mt-3 grid gap-2 text-sm leading-7 text-white/48">{forms.trackingNotes.map((note) => <p key={note}>{note}</p>)}</div></div>
          </form>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <h2 className="text-2xl font-black">{forms.resultTitle}</h2>
            {!serviceRequest && <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 text-white/60">{forms.emptyResult}</div>}
            {serviceRequest && statusInfo && (
              <div className="mt-6 space-y-4">
                <div className={`rounded-2xl border p-5 ${statusInfo.className}`}><div className="text-sm font-bold opacity-80">{forms.currentStatus}</div><div className="mt-2 text-3xl font-black">{statusInfo.label}</div><p className="mt-3 leading-8 opacity-90">{statusInfo.description}</p></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox label={forms.requestCodeLabel} value={serviceRequest.request_code || forms.unavailable} dir="ltr" />
                  <InfoBox label={forms.serviceType} value={getServiceTypeLabel(language, serviceRequest.service_type)} />
                  <InfoBox label={forms.platform} value={serviceRequest.platform || forms.unspecified} />
                  <InfoBox label={forms.requestDate} value={formatPublicFormDate(serviceRequest.created_at, language)} />
                  <InfoBox label={forms.updatedAt} value={formatPublicFormDate(serviceRequest.updated_at || serviceRequest.created_at, language)} />
                  <InfoBox label={forms.followUpMethod} value={forms.officialWhatsApp} />
                </div>
                <a href="https://wa.me/905011730377" target="_blank" rel="noreferrer" className="block rounded-2xl bg-green-500 px-5 py-4 text-center font-black text-white shadow-2xl transition hover:bg-green-400">{forms.followUpWhatsApp}</a>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function InfoBox({ label, value, dir }: { label: string; value: string; dir?: "rtl" | "ltr" }) {
  return <div className="rounded-2xl border border-white/10 bg-black/25 p-4"><div className="text-xs font-bold text-white/40">{label}</div><div className="mt-2 break-words text-lg font-black text-white" dir={dir}>{value}</div></div>;
}
