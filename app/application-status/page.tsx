"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import {
  formatPublicFormDate,
  getApplicationStatusInfo,
  getPlatformLabel,
  getPublicFormsCopy,
} from "@/lib/i18n/publicForms";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ApplicationRecord = {
  id: number;
  whatsapp: string | null;
  platform: string | null;
  status: string | null;
  created_at: string | null;
};

const platformOptions = ["TikTok", "BIGO LIVE", "Yaahlan", "Xena", "Catchii", "منصة أخرى"];

function normalizeDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function normalizePlatform(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function maskWhatsapp(value: string | null, notShown: string) {
  const digits = normalizeDigits(value || "");
  if (digits.length < 4) return notShown;
  return `•••• ${digits.slice(-4)}`;
}

export default function ApplicationStatusPage() {
  const language = useSiteLanguage();
  const forms = getPublicFormsCopy(language).application;
  const [whatsapp, setWhatsapp] = useState("");
  const [platform, setPlatform] = useState(platformOptions[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [application, setApplication] = useState<ApplicationRecord | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setApplication(null);

    const cleanedWhatsapp = normalizeDigits(whatsapp);
    const selectedPlatform = platform.trim();

    if (!cleanedWhatsapp || cleanedWhatsapp.length < 8) {
      setMessage(forms.invalidWhatsapp);
      return;
    }

    if (!selectedPlatform) {
      setMessage(forms.selectPlatform);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setMessage(forms.trackingUnavailable);
      return;
    }

    setIsLoading(true);
    const searchKey = cleanedWhatsapp.slice(-8);

    const { data, error } = await supabase
      .from("agency_applications")
      .select("id, whatsapp, platform, status, created_at")
      .ilike("whatsapp", `%${searchKey}%`)
      .ilike("platform", selectedPlatform === "منصة أخرى" ? "%" : `%${selectedPlatform}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    setIsLoading(false);

    if (error) {
      console.error("Application status lookup error:", error);
      setMessage(forms.lookupError);
      return;
    }

    const exactMatch = (data || []).find((item) => {
      if (selectedPlatform === "منصة أخرى") return true;
      return normalizePlatform(item.platform || "").includes(normalizePlatform(selectedPlatform));
    });

    if (!exactMatch) {
      setMessage(forms.notFound);
      return;
    }

    setApplication(exactMatch as ApplicationRecord);
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
          <Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75 backdrop-blur transition hover:border-purple-400/50 hover:text-white">
            {getStaticCopy(language, "backHome")}
          </Link>
          <Link href="/programs" className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100 backdrop-blur transition hover:bg-yellow-400/15">
            {getStaticCopy(language, "programs")}
          </Link>
        </nav>

        <header className="mb-8 rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center shadow-[0_0_60px_rgba(124,58,237,0.14)] backdrop-blur md:p-10">
          <div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{forms.eyebrow}</div>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">{forms.title}</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70">{forms.description}</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-black/30 p-6 backdrop-blur">
            <label className="block text-sm font-black text-white/80">{forms.whatsappLabel}</label>
            <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="+905011730377" inputMode="tel" autoComplete="tel" dir="ltr" className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/60" />

            <label className="mt-5 block text-sm font-black text-white/80">{forms.platformLabel}</label>
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="mt-3 w-full rounded-2xl border border-white/10 bg-[#12051f] px-4 py-4 text-white outline-none transition focus:border-purple-400/60">
              {platformOptions.map((item) => <option key={item} value={item}>{getPlatformLabel(language, item)}</option>)}
            </select>

            <button type="submit" disabled={isLoading} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.25)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
              {isLoading ? forms.searching : forms.search}
            </button>

            {message && <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-100">{message}</div>}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-sm font-black text-white/80">{forms.privacyTitle}</h2>
              <div className="mt-3 grid gap-2 text-sm leading-7 text-white/48">{forms.privacyNotes.map((note) => <p key={note}>{note}</p>)}</div>
            </div>
          </form>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <h2 className="text-2xl font-black">{forms.resultTitle}</h2>
            {!application && <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-5 text-white/60">{forms.emptyResult}</div>}
            {application && statusInfo && (
              <div className="mt-6 space-y-4">
                <div className={`rounded-2xl border p-5 ${statusInfo.className}`}>
                  <div className="text-sm font-bold opacity-80">{forms.currentStatus}</div>
                  <div className="mt-2 text-3xl font-black">{statusInfo.label}</div>
                  <p className="mt-3 leading-8 opacity-90">{statusInfo.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoBox label={forms.platform} value={application.platform || forms.unavailable} />
                  <InfoBox label={forms.applicationDate} value={formatPublicFormDate(application.created_at, language)} />
                  <InfoBox label={forms.searchNumber} value={maskWhatsapp(application.whatsapp, forms.notShown)} dir="ltr" />
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
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="text-xs font-bold text-white/45">{label}</div>
      <div className="mt-2 font-black text-white" dir={dir}>{value}</div>
    </div>
  );
}
