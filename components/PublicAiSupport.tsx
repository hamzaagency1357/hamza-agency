"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { getLanguageDirection } from "@/lib/i18n/locale";
import { getAiSupportCopy, getAiSupportFallbackAnswers } from "@/lib/i18n/aiSupport";
import { useSiteLanguage } from "@/lib/i18n/useSiteLanguage";
import { localizeDynamicPublicCopy } from "@/lib/i18n/localizeDynamicPublicCopy";

type KnowledgeRow = Record<string, unknown>;
type ChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type PublicAiSupportProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mobileDockMode?: boolean;
  panelId?: string;
};

const whatsappNumber = "905011730377";

function getString(row: KnowledgeRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function isPublished(row: KnowledgeRow) {
  const status = getString(row, ["status", "state", "visibility"], "").toLowerCase();
  if (["published", "active", "visible", "enabled"].includes(status)) return true;
  if (["draft", "hidden", "inactive", "disabled", "archived"].includes(status)) return false;

  return ["is_visible", "is_published", "published", "is_active"].some((key) => row[key] === true);
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function scoreKnowledge(question: string, row: KnowledgeRow) {
  const questionWords = normalizeText(question)
    .split(" ")
    .filter((word) => word.length > 2);
  const title = getString(row, ["title", "question", "name", "headline", "label"], "");
  const content = getString(row, ["content", "answer", "description", "body", "summary", "text"], "");
  const category = getString(row, ["category", "type", "section", "module", "group"], "");
  const searchableText = normalizeText(`${title} ${content} ${category}`);

  return questionWords.reduce((score, word) => (searchableText.includes(word) ? score + 1 : score), 0);
}

function getKnowledgeAnswer(question: string, knowledgeRows: KnowledgeRow[]) {
  const rankedRows = knowledgeRows
    .filter(isPublished)
    .map((row) => ({ row, score: scoreKnowledge(question, row) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score);
  const bestMatch = rankedRows[0]?.row;
  if (!bestMatch) return "";

  return getString(bestMatch, ["answer", "content", "description", "body", "summary", "text"], "");
}

function getFallbackAnswer(
  question: string,
  answers: ReturnType<typeof getAiSupportFallbackAnswers>
) {
  const normalizedQuestion = normalizeText(question);
  return answers.find((item) => item.keywords.some((keyword) => normalizedQuestion.includes(normalizeText(keyword))))?.answer || "";
}

export default function PublicAiSupport({
  open,
  onOpenChange,
  mobileDockMode = false,
  panelId = "hamza-ai-support-panel",
}: PublicAiSupportProps = {}) {
  const pathname = usePathname();
  const language = useSiteLanguage();
  const copy = getAiSupportCopy(language);
  const fallbackAnswers = getAiSupportFallbackAnswers(language);
  const [internalOpen, setInternalOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [knowledgeRows, setKnowledgeRows] = useState<KnowledgeRow[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  function setIsOpen(nextOpen: boolean) {
    if (!isControlled) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    setMessages([{ role: "assistant", text: copy.widgetWelcome }]);
  }, [copy.widgetWelcome]);

  useEffect(() => {
    if (mobileDockMode) return;
    document.body.classList.toggle("public-ai-support-open", isOpen);
    return () => document.body.classList.remove("public-ai-support-open");
  }, [isOpen, mobileDockMode]);

  useEffect(() => {
    if (!mobileDockMode) setIsOpen(false);
  }, [pathname, mobileDockMode]);

  useEffect(() => {
    async function loadKnowledge() {
      if (!isSupabaseConfigured || !supabase) return;
      setIsLoadingKnowledge(true);
      const { data } = await supabase.from("knowledge_base").select("*").limit(200);
      setKnowledgeRows((data || []) as KnowledgeRow[]);
      setIsLoadingKnowledge(false);
    }

    void loadKnowledge();
  }, []);

  const whatsappLink = useMemo(() => {
    const text = encodeURIComponent(copy.widgetWhatsAppMessage);
    return `https://wa.me/${whatsappNumber}?text=${text}`;
  }, [copy.widgetWhatsAppMessage]);

  if (pathname.startsWith("/admin") || pathname === "/maintenance") return null;

  async function saveUnansweredQuestion(text: string) {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from("ai_unanswered_questions").insert({
      question: text,
      status: "new",
      source: "public_ai_support",
      created_at: new Date().toISOString(),
    });
  }

  async function saveConversation(userMessage: string, assistantReply: string) {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.from("ai_conversations").insert({
      question: userMessage,
      answer: assistantReply,
      status: assistantReply ? "answered" : "escalated",
      source: "public_ai_support",
      created_at: new Date().toISOString(),
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const userQuestion = question.trim();
    if (!userQuestion || isAnswering) return;

    setQuestion("");
    setIsAnswering(true);
    setMessages((current) => [...current, { role: "user", text: userQuestion }]);
    const answerFromKnowledge = localizeDynamicPublicCopy(
      getKnowledgeAnswer(userQuestion, knowledgeRows),
      language
    );
    const fallbackAnswer = answerFromKnowledge || getFallbackAnswer(userQuestion, fallbackAnswers);
    const assistantReply = fallbackAnswer || copy.widgetUnknownAnswer;

    if (!fallbackAnswer) await saveUnansweredQuestion(userQuestion);
    await saveConversation(userQuestion, assistantReply);
    setMessages((current) => [...current, { role: "assistant", text: assistantReply }]);
    setIsAnswering(false);
  }

  const panel = isOpen ? (
    <div
      id={panelId}
      className="hamza-ai-support-panel flex max-h-[calc(100svh-var(--public-mobile-dock-height)-2rem)] w-full flex-col overflow-hidden rounded-[2rem] border border-fuchsia-400/25 bg-[#09000f]/95 shadow-[0_0_70px_rgba(168,85,247,0.32)] backdrop-blur-xl md:mb-3 md:w-[min(360px,calc(100vw-2rem))]"
    >
      <div className="border-b border-white/10 bg-gradient-to-r from-fuchsia-600/25 to-purple-600/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.25em] text-fuchsia-100">HAMZA AGENCY</div>
            <div className="mt-1 text-lg font-black text-white">{copy.widgetTitle}</div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label={copy.widgetCloseAria}
            className="min-h-[44px] shrink-0 rounded-full border border-white/15 bg-black/25 px-3 py-2 text-xs font-black text-white/85 transition hover:border-fuchsia-300/40 hover:bg-fuchsia-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300/70"
          >
            {copy.widgetClose}
          </button>
        </div>
        <p className="mt-2 text-xs leading-6 text-white/55">{copy.widgetIntro}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            data-user-generated-content={message.role === "user" ? "true" : undefined}
            data-no-runtime-translate={message.role === "user" ? "true" : undefined}
            className={`rounded-2xl p-3 text-sm leading-7 ${
              message.role === "assistant"
                ? "border border-purple-400/20 bg-purple-500/10 text-purple-50"
                : "ms-auto max-w-[85%] border border-yellow-400/20 bg-yellow-500/10 text-yellow-50"
            }`}
          >
            {message.text}
          </div>
        ))}
        {isLoadingKnowledge && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs text-white/45">
            {copy.widgetLoadingKnowledge}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/10 p-3">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={copy.widgetPlaceholder}
          aria-label={copy.widgetPlaceholder}
          className="min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-3 text-sm leading-7 text-white outline-none placeholder:text-white/35 focus:border-fuchsia-300/50"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="submit"
            disabled={isAnswering}
            className="min-h-[44px] rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {isAnswering ? copy.widgetSubmitting : copy.widgetSubmit}
          </button>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[44px] items-center justify-center rounded-2xl border border-green-400/25 bg-green-500/10 px-4 py-3 text-center text-sm font-black text-green-100"
          >
            {copy.widgetWhatsApp}
          </a>
        </div>
      </form>
    </div>
  ) : null;

  if (mobileDockMode) return panel;

  return (
    <div
      dir={getLanguageDirection(language)}
      className="hamza-ai-support fixed bottom-24 right-6 z-[165] hidden print:hidden md:block"
    >
      {panel}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? copy.widgetCloseAria : copy.widgetOpenAria}
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="min-h-12 rounded-full border border-fuchsia-300/35 bg-[#12051f]/95 px-5 py-3 text-sm font-black text-fuchsia-100 shadow-[0_0_35px_rgba(168,85,247,0.28)] transition hover:bg-purple-900/90"
      >
        {isOpen ? copy.widgetClose : copy.widgetOpen}
      </button>
    </div>
  );
}
