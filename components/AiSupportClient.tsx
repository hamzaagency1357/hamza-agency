"use client";

import { useState } from "react";

type SupportResponse = {
  ok: boolean;
  answer?: string;
  status?: string;
  source?: string;
  message?: string;
};

export default function AiSupportClient() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<SupportResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAnswer(null);

    if (question.trim().length < 3) {
      setAnswer({ ok: false, message: "اكتب سؤالاً واضحاً قبل الإرسال." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ai-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const data = (await response.json()) as SupportResponse;
      setAnswer(data);
    } catch {
      setAnswer({ ok: false, message: "تعذر تشغيل الدعم حالياً." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-10 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6 backdrop-blur">
      <h2 className="text-3xl font-black">اسأل الدعم الذكي</h2>
      <p className="mt-3 leading-8 text-white/65">
        اكتب سؤالك وسيتم البحث داخل قاعدة المعرفة المنشورة من الإدارة.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="min-h-36 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-white outline-none focus:border-purple-300"
          placeholder="اكتب سؤالك هنا..."
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black text-white disabled:opacity-60"
        >
          {isSubmitting ? "جاري البحث..." : "إرسال السؤال"}
        </button>
      </form>

      {answer && (
        <div className={`mt-6 rounded-2xl border p-5 leading-8 ${answer.ok ? "border-green-400/25 bg-green-500/10 text-green-50" : "border-red-400/25 bg-red-500/10 text-red-100"}`}>
          <p>{answer.answer || answer.message}</p>
          {answer.source && <div className="mt-3 text-xs text-white/45">المصدر: {answer.source}</div>}
        </div>
      )}
    </section>
  );
}
