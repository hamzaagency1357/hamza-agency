"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import PublicLanguageMain from "@/components/PublicLanguageMain";
import TrackingReceipt from "@/components/TrackingReceipt";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

type TrackRecord = {
  tracking_code?: string;
  request_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  public_title?: string | null;
};

const pattern = /^(APP|SR|JOB|CNT)-[0-9]{4}-[A-F0-9]{10}$/;

export default function TrackPage() {
  const language = useSiteLanguage();
  const [code, setCode] = useState("");
  const [record, setRecord] = useState<TrackRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = language === "ar"
    ? { title: "تتبع طلبك", intro: "أدخل رقم APP أو SR أو JOB أو CNT فقط. لا نطلب الاسم أو رقم واتساب للبحث.", label: "رقم التتبع", button: "عرض الحالة", notFound: "لم يتم العثور على طلب مطابق.", invalid: "تحقق من رقم التتبع وحاول مجدداً.", rate: "محاولات كثيرة. حاول لاحقاً.", state: "الحالة", type: "نوع الطلب", created: "تاريخ الإرسال", updated: "آخر تحديث", back: "الرئيسية", contact: "تواصل معنا" }
    : language === "tr"
      ? { title: "Talebinizi takip edin", intro: "Yalnızca APP, SR, JOB veya CNT kodunu girin. Arama için ad ya da WhatsApp numarası istemeyiz.", label: "Takip kodu", button: "Durumu göster", notFound: "Eşleşen talep bulunamadı.", invalid: "Takip kodunu kontrol edin.", rate: "Çok fazla deneme. Daha sonra tekrar deneyin.", state: "Durum", type: "Talep türü", created: "Gönderim tarihi", updated: "Son güncelleme", back: "Ana sayfa", contact: "İletişim" }
      : { title: "Track your request", intro: "Enter an APP, SR, JOB, or CNT code only. We never ask for your name or WhatsApp number to search.", label: "Tracking code", button: "View status", notFound: "No matching request was found.", invalid: "Check the tracking code and try again.", rate: "Too many attempts. Try again later.", state: "Status", type: "Request type", created: "Submitted", updated: "Last update", back: "Home", contact: "Contact" };

  useEffect(() => {
    const initialCode = new URLSearchParams(window.location.search).get("code");
    if (initialCode) setCode(initialCode.toUpperCase().replace(/\s+/g, "").slice(0, 40));
  }, []);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalized = code.toUpperCase().replace(/\s+/g, "").slice(0, 40);
    setCode(normalized);
    setMessage("");
    setRecord(null);
    if (!pattern.test(normalized)) {
      setMessage(copy.invalid);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: normalized }),
      });
      const body = (await response.json()) as { found?: boolean; record?: TrackRecord; code?: string };
      if (response.status === 429) setMessage(copy.rate);
      else if (!response.ok) setMessage(copy.invalid);
      else if (!body.found) setMessage(copy.notFound);
      else setRecord(body.record || null);
    } catch {
      setMessage(copy.invalid);
    } finally {
      setBusy(false);
    }
  }

  const locale = language === "tr" ? "tr-TR" : language === "en" ? "en" : "ar";
  const formatDate = (value?: string) => value ? new Date(value).toLocaleString(locale) : "—";

  return (
    <PublicLanguageMain className="relative min-h-screen overflow-hidden bg-[#070009] px-5 py-12 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.34),transparent_52%)]" />
      <section className="relative z-10 mx-auto max-w-3xl">
        <nav className="mb-8 flex justify-between gap-3 print:hidden">
          <Link href={localizePublicHref("/", language)} className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 font-bold text-white/75">{copy.back}</Link>
          <Link href={localizePublicHref("/contact", language)} className="rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100">{copy.contact}</Link>
        </nav>
        <header className="rounded-[2rem] border border-purple-400/25 bg-black/40 p-7 text-center backdrop-blur">
          <h1 className="text-4xl font-black md:text-6xl">{copy.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/65">{copy.intro}</p>
        </header>
        <form onSubmit={lookup} className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 print:hidden">
          <label className="block font-bold">
            {copy.label}
            <input autoFocus inputMode="text" autoCapitalize="characters" value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 40))} dir="ltr" className="mt-3 w-full rounded-2xl border border-white/15 bg-black/40 p-4 text-left font-mono uppercase tracking-wide outline-none focus:border-purple-400" />
          </label>
          <button disabled={busy} className="mt-4 w-full rounded-full bg-purple-600 px-6 py-4 font-black disabled:opacity-50">{busy ? "…" : copy.button}</button>
        </form>
        {message && <p aria-live="polite" className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-center font-bold text-yellow-100">{message}</p>}
        {record && (
          <div aria-live="polite" className="mt-6 space-y-5">
            <TrackingReceipt trackingCode={record.tracking_code || code} />
            <article className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-2">
              <Detail label={copy.type} value={record.request_type || "—"} />
              <Detail label={copy.state} value={record.status || "—"} />
              <Detail label={copy.created} value={formatDate(record.created_at)} />
              <Detail label={copy.updated} value={formatDate(record.updated_at)} />
              {record.public_title && <Detail label="" value={record.public_title} className="sm:col-span-2" />}
            </article>
          </div>
        )}
      </section>
    </PublicLanguageMain>
  );
}

function Detail({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return <div className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${className}`}><p className="text-xs font-black text-purple-200">{label}</p><p className="mt-2 break-words font-bold text-white/80">{value}</p></div>;
}
