"use client";

import { useState } from "react";
import TrackingReceipt from "@/components/TrackingReceipt";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { submitPublicForm } from "@/lib/publicSubmission";

type Form = {
  fullName: string;
  email: string;
  whatsapp: string;
  subject: string;
  message: string;
};

const emptyForm: Form = { fullName: "", email: "", whatsapp: "", subject: "", message: "" };

const copyByLanguage = {
  ar: {
    title: "أرسل رسالة إلى الوكالة",
    description: "تُرسل الرسالة عبر مسار خادم محمي، وستحصل على رقم CNT لمتابعتها.",
    fullName: "الاسم الكامل",
    email: "البريد الإلكتروني",
    whatsapp: "رقم واتساب",
    subject: "موضوع الرسالة",
    message: "اكتب رسالتك",
    submit: "إرسال الرسالة",
    submitting: "جارٍ الإرسال...",
    validation: "يرجى إدخال الاسم والرسالة بشكل صحيح.",
    success: "تم استلام رسالتك. احتفظ برقم التتبع التالي.",
    error: "تعذر الإرسال حالياً. حاول لاحقاً أو استخدم واتساب الرسمي.",
  },
  en: {
    title: "Send a message to the agency",
    description: "Your message is sent through a protected server route, and you will receive a CNT tracking number.",
    fullName: "Full name",
    email: "Email address",
    whatsapp: "WhatsApp number",
    subject: "Message subject",
    message: "Write your message",
    submit: "Send message",
    submitting: "Sending...",
    validation: "Enter a valid name and message.",
    success: "Your message was received. Keep the tracking number below.",
    error: "The message could not be sent right now. Try later or use the official WhatsApp number.",
  },
  tr: {
    title: "Ajansa mesaj gönderin",
    description: "Mesajınız korumalı bir sunucu yolu üzerinden gönderilir ve bir CNT takip numarası alırsınız.",
    fullName: "Ad soyad",
    email: "E-posta adresi",
    whatsapp: "WhatsApp numarası",
    subject: "Mesaj konusu",
    message: "Mesajınızı yazın",
    submit: "Mesajı gönder",
    submitting: "Gönderiliyor...",
    validation: "Geçerli bir ad ve mesaj girin.",
    success: "Mesajınız alındı. Aşağıdaki takip numarasını saklayın.",
    error: "Mesaj şu anda gönderilemedi. Daha sonra tekrar deneyin veya resmi WhatsApp numarasını kullanın.",
  },
} as const;

export default function PublicContactForm() {
  const language = useSiteLanguage();
  const copy = copyByLanguage[language];
  const [form, setForm] = useState<Form>(emptyForm);
  const [website, setWebsite] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setTrackingCode("");
    if (form.fullName.trim().length < 2 || form.message.trim().length < 4) {
      setStatus(copy.validation);
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      const result = await submitPublicForm(
        "contact",
        {
          full_name: form.fullName.trim(),
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
        startedAt,
        website,
      );
      setForm(emptyForm);
      setWebsite("");
      setStartedAt(new Date().toISOString());
      setStatus(copy.success);
      setTrackingCode(result.trackingCode || "");
    } catch {
      setStatus(copy.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6 backdrop-blur">
      <h2 className="text-3xl font-black">{copy.title}</h2>
      <p className="mt-3 text-white/65">{copy.description}</p>
      <form onSubmit={submit} className="mt-6 grid gap-4 md:grid-cols-2">
        <input aria-hidden="true" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} className="absolute -left-[10000px] h-px w-px opacity-0" />
        <Input placeholder={copy.fullName} value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} />
        <Input placeholder={copy.email} value={form.email} onChange={(value) => setForm({ ...form, email: value })} type="email" />
        <Input placeholder={copy.whatsapp} value={form.whatsapp} onChange={(value) => setForm({ ...form, whatsapp: value })} dir="ltr" />
        <Input placeholder={copy.subject} value={form.subject} onChange={(value) => setForm({ ...form, subject: value })} />
        <textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder={copy.message} className="min-h-36 rounded-2xl border border-white/10 bg-black/30 p-4 outline-none focus:border-purple-400 md:col-span-2" />
        {status && <p className={`rounded-2xl border p-4 font-bold leading-7 md:col-span-2 ${trackingCode ? "border-green-400/25 bg-green-500/10 text-green-100" : "border-yellow-400/25 bg-yellow-500/10 text-yellow-100"}`}>{status}</p>}
        {trackingCode && <TrackingReceipt trackingCode={trackingCode} className="md:col-span-2" />}
        <button type="submit" disabled={busy} className="rounded-full bg-purple-600 px-6 py-4 font-black disabled:opacity-50 md:col-span-2">{busy ? copy.submitting : copy.submit}</button>
      </form>
    </section>
  );
}

function Input({ placeholder, value, onChange, type = "text", dir }: { placeholder: string; value: string; onChange: (value: string) => void; type?: string; dir?: "ltr" | "rtl" }) {
  return <input type={type} dir={dir} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-2xl border border-white/10 bg-black/30 p-4 outline-none focus:border-purple-400" />;
}
