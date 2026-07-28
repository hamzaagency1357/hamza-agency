"use client";

import { useState } from "react";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getAiSupportCopy } from "@/lib/i18n/aiSupport";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { submitPublicForm } from "@/lib/publicSubmission";

type SupportResponse = { ok:boolean; answer?:string; status?:string; source?:string; message?:string };

export default function AiSupportClient() {
  const language = useSiteLanguage();
  const copy = getAiSupportCopy(language);
  const [question, setQuestion] = useState("");
  const [website, setWebsite] = useState("");
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [answer, setAnswer] = useState<SupportResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setAnswer(null);
    const cleanQuestion = question.trim();
    if (cleanQuestion.length < 3) { setAnswer({ ok:false, message:copy.formValidation }); return; }
    setIsSubmitting(true);
    try {
      await submitPublicForm("ai_support", { question:cleanQuestion, language, page_url:"/ai-support" }, startedAt, website);
      const response = await fetch("/api/ai-support", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ question:cleanQuestion }) });
      const data = (await response.json()) as SupportResponse;
      setAnswer(data);
      setStartedAt(new Date().toISOString());
      setWebsite("");
    } catch { setAnswer({ ok:false, message:copy.formError }); }
    finally { setIsSubmitting(false); }
  }

  return <section dir={getLanguageDirection(language)} className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6 backdrop-blur"><h2 className="text-3xl font-black">{copy.formTitle}</h2><p className="mt-3 leading-8 text-white/65">{copy.formDescription}</p><form onSubmit={handleSubmit} className="mt-6 grid gap-4"><input aria-hidden="true" tabIndex={-1} autoComplete="off" value={website} onChange={(event)=>setWebsite(event.target.value)} className="absolute -left-[10000px] h-px w-px opacity-0"/><textarea value={question} onChange={(event)=>setQuestion(event.target.value)} className="min-h-36 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-purple-300" placeholder={copy.formPlaceholder}/><button type="submit" disabled={isSubmitting} className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white disabled:opacity-60">{isSubmitting?copy.formSubmitting:copy.formSubmit}</button></form>{answer&&<div className={`mt-6 rounded-2xl border p-5 leading-8 ${answer.ok?"border-green-400/25 bg-green-500/10 text-green-50":"border-red-400/25 bg-red-500/10 text-red-100"}`}><p>{answer.answer||answer.message}</p>{answer.source&&<div className="mt-3 text-xs text-white/45">{copy.sourceLabel}: {answer.source}</div>}</div>}</section>;
}
