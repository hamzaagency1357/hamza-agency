"use client";

import Link from "next/link";
import { useState } from "react";
import { localizePublicHref } from "@/lib/i18n/publicLocales";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const copyByLanguage = {
  ar: {
    eyebrow: "إيصال تتبع",
    title: "احتفظ برقم التتبع",
    description: "هذا الرقم هو الطريقة الوحيدة الآمنة لمتابعة الطلب. لا تشاركه علناً.",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    open: "فتح صفحة التتبع",
    print: "طباعة الإيصال",
  },
  en: {
    eyebrow: "Tracking receipt",
    title: "Keep your tracking number",
    description: "This number is the only secure way to follow the request. Do not share it publicly.",
    copy: "Copy number",
    copied: "Copied",
    open: "Open tracking page",
    print: "Print receipt",
  },
  tr: {
    eyebrow: "Takip makbuzu",
    title: "Takip numaranızı saklayın",
    description: "Bu numara talebi güvenli biçimde takip etmenin tek yoludur. Herkese açık paylaşmayın.",
    copy: "Numarayı kopyala",
    copied: "Kopyalandı",
    open: "Takip sayfasını aç",
    print: "Makbuzu yazdır",
  },
} as const;

export default function TrackingReceipt({
  trackingCode,
  className = "",
}: {
  trackingCode: string;
  className?: string;
}) {
  const language = useSiteLanguage();
  const copy = copyByLanguage[language];
  const [copied, setCopied] = useState(false);
  const trackingHref = localizePublicHref(`/track?code=${encodeURIComponent(trackingCode)}`, language);

  async function copyTrackingCode() {
    try {
      await navigator.clipboard.writeText(trackingCode);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = trackingCode;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section
      data-tracking-receipt
      className={`rounded-[2rem] border border-green-400/30 bg-green-500/10 p-5 shadow-[0_0_45px_rgba(34,197,94,0.12)] print:border-black print:bg-white print:text-black ${className}`}
    >
      <p className="text-xs font-black uppercase tracking-[0.28em] text-green-200 print:text-black">
        {copy.eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-black">{copy.title}</h3>
      <p className="mt-3 leading-7 text-white/70 print:text-black">{copy.description}</p>
      <div
        dir="ltr"
        className="mt-5 break-all rounded-2xl border border-white/15 bg-black/35 px-4 py-5 text-center font-mono text-xl font-black tracking-wider text-yellow-200 print:border-black print:bg-white print:text-black"
      >
        {trackingCode}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 print:hidden">
        <button type="button" onClick={copyTrackingCode} className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-black hover:bg-white/10">
          {copied ? copy.copied : copy.copy}
        </button>
        <Link href={trackingHref} className="rounded-full bg-purple-600 px-4 py-3 text-center text-sm font-black text-white hover:bg-purple-500">
          {copy.open}
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-100 hover:bg-yellow-500/20">
          {copy.print}
        </button>
      </div>
    </section>
  );
}
