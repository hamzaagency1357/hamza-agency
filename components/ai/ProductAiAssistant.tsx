"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Surface = "public" | "creator" | "client" | "employee" | "partner" | "admin";
type Message = { role: "user" | "assistant"; text: string; code?: string; sources?: string[] };

export default function ProductAiAssistant({ surface, title = "المساعد الذكي" }: { surface: Surface; title?: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [consent, setConsent] = useState(false);
  const [authorized, setAuthorized] = useState(surface === "public");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (surface === "public") return;
    void (async () => {
      const { data } = await supabase?.auth.getUser() ?? { data: { user: null } };
      setAuthorized(Boolean(data.user));
    })();
  }, [surface]);

  async function send() {
    if (!question.trim() || !consent || loading) return;
    setLoading(true); setError("");
    const prompt = question.trim();
    setQuestion("");
    setMessages((current) => [...current, { role: "user", text: prompt }]);
    const session = surface === "public" ? null : (await supabase?.auth.getSession())?.data.session;
    try {
      const response = await fetch("/api/product-expansion/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ question: prompt, surface, locale: document.documentElement.lang, consent: true }),
      });
      const result = await response.json() as { ok?: boolean; answer?: string; code?: string; sourceIds?: string[] };
      if (!response.ok || !result.ok) throw new Error(result.code || "assistant_failed");
      setMessages((current) => [...current, { role: "assistant", text: result.answer || "", code: result.code, sources: result.sourceIds }]);
    } catch {
      setError("تعذر إكمال الإجابة الآن. يمكنك متابعة طلبك مع فريق الدعم البشري.");
    } finally { setLoading(false); }
  }

  if (!authorized) return <main className="min-h-screen bg-[#09050f] px-4 py-28 text-center text-red-100">يجب تسجيل الدخول لاستخدام هذا المساعد.</main>;
  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir="rtl">
      <section className="mx-auto flex min-h-[620px] max-w-4xl flex-col rounded-3xl border border-violet-300/20 bg-white/5 p-5 shadow-2xl sm:p-7">
        <header><p className="text-sm text-violet-200">Provider-neutral · Tenant-scoped · Human escalation</p><h1 className="mt-2 text-3xl font-black">{title}</h1><p className="mt-2 text-sm text-white/55">يعتمد فقط على محتوى قاعدة المعرفة المسموح، وينقح البيانات الشخصية ويرفض تعليمات تجاوز الحماية. لا ينفذ أي تغيير مدمر أو تحديث حالة تلقائياً.</p></header>
        <div className="mt-6 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
          {messages.map((message, index) => <article key={`${message.role}-${index}`} className={`max-w-[90%] rounded-2xl p-4 ${message.role === "user" ? "mr-auto bg-violet-600/25" : "ml-auto bg-white/8"}`}><p className="whitespace-pre-wrap leading-7">{message.text}</p>{message.code && <p className="mt-2 text-xs text-white/40">{message.code}{message.sources?.length ? ` · Sources: ${message.sources.join(", ")}` : ""}</p>}</article>)}
          {!messages.length && <p className="py-16 text-center text-white/40">ابدأ بسؤال مرتبط بخدمات الوكالة أو العمليات أو المعرفة المنشورة.</p>}
        </div>
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 p-3 text-red-100">{error}</p>}
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 p-3 text-sm text-white/65"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1"/><span>أوافق على معالجة السؤال بعد تنقيح البيانات الشخصية، وعلى استخدام الرد الآلي مع إمكانية التصعيد البشري. يمكنني إيقاف الذكاء الاصطناعي من مركز الخصوصية.</span></label>
        <div className="mt-3 flex gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value.slice(0, 4000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="اكتب سؤالك…" className="min-h-14 flex-1 resize-none rounded-xl border border-white/10 bg-black/40 p-3"/><button type="button" disabled={!consent || loading || !question.trim()} onClick={() => void send()} className="min-h-14 rounded-xl bg-violet-600 px-6 font-bold disabled:opacity-40">{loading ? "جارٍ التحقق…" : "إرسال"}</button></div>
      </section>
    </main>
  );
}
