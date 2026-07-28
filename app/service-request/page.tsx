"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getPlatformLabel, getPublicFormsCopy, getServiceTypeHint, getServiceTypeLabel, type ServiceType } from "@/lib/i18n/publicForms";
import { getStaticCopy } from "@/lib/i18n/staticCopy";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";

const serviceTypes: ServiceType[] = ["platform_topup", "withdrawal", "digital_service", "technical_support", "other"];
const platforms = ["TikTok", "BIGO LIVE", "Yaahlan", "Xena", "Catchii", "other"];
type FormState = { fullName: string; country: string; whatsapp: string; serviceType: ServiceType; platform: string; accountIdentifier: string; requestedAmount: string; notes: string; website: string };
const initialFormState: FormState = { fullName: "", country: "", whatsapp: "", serviceType: "platform_topup", platform: "TikTok", accountIdentifier: "", requestedAmount: "", notes: "", website: "" };
const normalizeDigits = (value: string) => value.replace(/[^0-9]/g, "");

export default function ServiceRequestPage() {
  const language = useSiteLanguage();
  const forms = getPublicFormsCopy(language).serviceRequest;
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState("");
  const [message, setMessage] = useState("");
  const startedAt = useRef(new Date().toISOString());
  const selectedService = useMemo(() => serviceTypes.find((item) => item === form.serviceType), [form.serviceType]);
  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setSuccessCode("");
    const cleanedWhatsapp = normalizeDigits(form.whatsapp);
    if (!form.fullName.trim()) return setMessage(forms.fullNameRequired);
    if (!cleanedWhatsapp || cleanedWhatsapp.length < 8) return setMessage(forms.invalidWhatsapp);
    if (!form.serviceType.trim()) return setMessage(forms.selectService);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/public-submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "service_request",
          startedAt: startedAt.current,
          honeypot: form.website,
          payload: {
            full_name: form.fullName.trim(), country: form.country.trim(), whatsapp: form.whatsapp.trim(), service_type: form.serviceType,
            platform: form.platform === "other" ? "منصة أخرى" : form.platform.trim(), account_identifier: form.accountIdentifier.trim(),
            requested_amount: form.requestedAmount.trim(), notes: form.notes.trim(),
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error("submission_failed");
      setSuccessCode(result.trackingCode || ""); setMessage(forms.success); setForm(initialFormState); startedAt.current = new Date().toISOString();
    } catch { setMessage(forms.error); }
    finally { setIsSubmitting(false); }
  }

  return <main dir={getLanguageDirection(language)} className="min-h-screen bg-[#070009] px-5 py-8 text-white">
    <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.32),transparent_45%)]"/><div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(40,10,70,0.35),rgba(7,0,9,0.95))]"/></div>
    <section className="relative z-10 mx-auto max-w-5xl">
      <nav className="mb-8 flex items-center justify-between gap-4"><Link href="/" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/75">{getStaticCopy(language,"backHome")}</Link><Link href="/digital-services" className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-5 py-3 text-sm font-bold text-yellow-100">{getStaticCopy(language,"digitalServices")}</Link></nav>
      <div className="mb-8 rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-7 text-center"><div className="mx-auto mb-5 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">{forms.eyebrow}</div><h1 className="text-4xl font-black md:text-6xl">{forms.title}</h1><p className="mx-auto mt-5 max-w-3xl text-lg leading-9 text-white/70">{forms.description}</p></div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="rounded-[2rem] border border-white/10 bg-black/30 p-6">
          <input tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={form.website} onChange={(e)=>updateField("website",e.target.value)} className="absolute h-px w-px -translate-x-[9999px] opacity-0" />
          <div className="grid gap-5 md:grid-cols-2">
            <Field label={forms.fullName}><input value={form.fullName} onChange={(e)=>updateField("fullName",e.target.value)} placeholder={forms.fullNamePlaceholder} autoComplete="name" className={inputClassName}/></Field>
            <Field label={forms.country}><input value={form.country} onChange={(e)=>updateField("country",e.target.value)} placeholder={forms.countryPlaceholder} autoComplete="country-name" className={inputClassName}/></Field>
            <Field label={forms.whatsapp}><input value={form.whatsapp} onChange={(e)=>updateField("whatsapp",e.target.value)} placeholder="+905011730377" inputMode="tel" autoComplete="tel" dir="ltr" className={`${inputClassName} text-left`}/></Field>
            <Field label={forms.serviceType}><select value={form.serviceType} onChange={(e)=>updateField("serviceType",e.target.value as ServiceType)} className={inputClassName}>{serviceTypes.map((type)=><option key={type} value={type}>{getServiceTypeLabel(language,type)}</option>)}</select></Field>
            <Field label={forms.platform}><select value={form.platform} onChange={(e)=>updateField("platform",e.target.value)} className={inputClassName}>{platforms.map((platform)=><option key={platform} value={platform}>{getPlatformLabel(language,platform)}</option>)}</select></Field>
            <Field label={forms.accountIdentifier}><input value={form.accountIdentifier} onChange={(e)=>updateField("accountIdentifier",e.target.value)} placeholder={forms.accountIdentifierPlaceholder} className={inputClassName}/></Field>
            <Field label={forms.requestedAmount}><input value={form.requestedAmount} onChange={(e)=>updateField("requestedAmount",e.target.value)} placeholder={forms.requestedAmountPlaceholder} className={inputClassName}/></Field>
          </div>
          <div className="mt-5"><Field label={forms.notes}><textarea value={form.notes} onChange={(e)=>updateField("notes",e.target.value)} placeholder={forms.notesPlaceholder} className={`${inputClassName} min-h-36 resize-none`}/></Field></div>
          {selectedService&&<div className="mt-5 rounded-3xl border border-purple-400/20 bg-purple-500/10 p-5 text-sm leading-7 text-purple-100"><span className="font-black">{forms.note}</span> {getServiceTypeHint(language,selectedService)}</div>}
          {message&&<div className={`mt-5 rounded-3xl border p-5 text-center font-bold ${successCode?"border-green-400/30 bg-green-500/10 text-green-100":"border-yellow-400/30 bg-yellow-500/10 text-yellow-100"}`}><p>{message}</p>{successCode&&<div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">{forms.trackingCode}<span className="mx-2 font-black text-yellow-200" dir="ltr">{successCode}</span><Link href="/service-status" className="mt-3 block text-sm font-black text-purple-100 underline">{forms.openTracking}</Link></div>}</div>}
          <button type="submit" disabled={isSubmitting} className="mt-6 w-full rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-5 text-xl font-black disabled:opacity-60">{isSubmitting?forms.submitting:forms.submit}</button>
        </form>
        <aside className="space-y-5"><div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-6"><h2 className="text-2xl font-black text-yellow-100">{forms.beforeSend}</h2><p className="mt-4 leading-8 text-yellow-50/75">{forms.beforeSendDescription}</p></div><div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"><h2 className="text-2xl font-black">{forms.nextTitle}</h2><div className="mt-5 space-y-4 text-white/65">{forms.steps.map((text,index)=><Step key={text} number={String(index+1)} text={text}/>)}</div></div></aside>
      </div>
    </section>
  </main>;
}

const inputClassName="w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/70 focus:ring-4 focus:ring-purple-500/10";
function Field({label,children}:{label:string;children:ReactNode}){return <label className="block"><span className="mb-3 block text-sm font-black text-white/75">{label}</span>{children}</label>}
function Step({number,text}:{number:string;text:string}){return <div className="flex gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-sm font-black text-purple-100">{number}</div><p className="leading-8">{text}</p></div>}
