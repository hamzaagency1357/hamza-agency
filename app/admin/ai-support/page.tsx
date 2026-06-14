"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";
import { supabase } from "@/lib/supabase";

type GenericRow = Record<string, unknown>;
type KnowledgePayload = Record<string, string | number | boolean>;
type FilterKey = "all" | "open" | "answered" | "unanswered" | "escalated";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "open", label: "مفتوح" },
  { key: "answered", label: "تمت الإجابة" },
  { key: "unanswered", label: "غير مجاب" },
  { key: "escalated", label: "محول للمتابعة" },
];

function getString(row: GenericRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "غير متوفر";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "بيانات غير قابلة للعرض";
  }
}

function formatDate(value: string) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatus(row: GenericRow): FilterKey {
  const status = getString(row, ["status", "state", "conversation_status", "question_status"], "open").toLowerCase();

  if (["answered", "resolved", "closed", "done", "converted"].includes(status)) return "answered";
  if (["unanswered", "pending", "new"].includes(status)) return "unanswered";
  if (["escalated", "whatsapp", "human", "support"].includes(status)) return "escalated";

  return "open";
}

function getStatusLabel(row: GenericRow) {
  const status = getStatus(row);
  if (status === "answered") return "تمت الإجابة";
  if (status === "unanswered") return "غير مجاب";
  if (status === "escalated") return "محول للمتابعة";
  return "مفتوح";
}

function getQuestion(row: GenericRow) {
  return getString(row, ["question", "message", "user_message", "last_message", "prompt", "title", "content"], "محادثة دعم ذكي");
}

function getAnswer(row: GenericRow) {
  return getString(row, ["answer", "response", "ai_response", "assistant_response", "reply"], "");
}

function getVisitor(row: GenericRow) {
  return getString(row, ["visitor_name", "name", "user_name", "full_name", "visitor_id", "session_id", "phone", "whatsapp"], "غير محدد");
}

function getCreatedAt(row: GenericRow) {
  return getString(row, ["created_at", "updated_at", "last_message_at", "asked_at", "date"], "");
}

function getRecordId(row: GenericRow) {
  return getString(row, ["id", "conversation_id", "question_id", "session_id"], "غير متوفر");
}

function toneForStatus(status: FilterKey): Tone {
  if (status === "answered") return "green";
  if (status === "unanswered") return "red";
  if (status === "escalated") return "yellow";
  return "purple";
}

function asSupabasePayload(payload: KnowledgePayload) {
  return payload as never;
}

function buildKnowledgePayloads(question: string, answer: string): KnowledgePayload[] {
  const cleanQuestion = question.trim();
  const cleanAnswer = answer.trim();
  const summary = cleanAnswer.length > 180 ? `${cleanAnswer.slice(0, 180)}...` : cleanAnswer;

  return [
    {
      title: cleanQuestion,
      summary,
      content: cleanAnswer,
      category: "أسئلة الدعم الذكي",
      sort_order: 1,
      is_published: true,
      status: "published",
    },
    {
      title: cleanQuestion,
      summary,
      content: cleanAnswer,
      category: "أسئلة الدعم الذكي",
      sort_order: 1,
      is_published: true,
    },
    {
      title: cleanQuestion,
      content: cleanAnswer,
      category: "أسئلة الدعم الذكي",
      status: "published",
    },
    {
      question: cleanQuestion,
      answer: cleanAnswer,
      category: "أسئلة الدعم الذكي",
      status: "published",
    },
    {
      question: cleanQuestion,
      answer: cleanAnswer,
      category: "أسئلة الدعم الذكي",
    },
  ];
}

export default function AdminAiSupportPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [conversations, setConversations] = useState<GenericRow[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<GenericRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConverting, setIsConverting] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [knowledgeAnswers, setKnowledgeAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("ai_support");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/admin/login");
        return;
      }

      if (access.profile.role === "program_admin") {
        setAdminEmail(access.profile.email || access.user?.email || "");
        setIsForbidden(true);
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadAiSupportData();
  }, [isAuthorized]);

  async function loadAiSupportData() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setMessage("");
    setIsLoading(true);

    const [conversationsResult, unansweredResult] = await Promise.all([
      supabase.from("ai_conversations").select("*").limit(120),
      supabase.from("ai_unanswered_questions").select("*").limit(120),
    ]);

    setIsLoading(false);

    if (conversationsResult.error || unansweredResult.error) {
      setError("تعذر تحميل بيانات الدعم الذكي. يرجى التأكد من إعدادات جداول ai_conversations و ai_unanswered_questions وصلاحيات القراءة.");
      return;
    }

    setConversations((conversationsResult.data || []) as GenericRow[]);
    setUnansweredQuestions((unansweredResult.data || []) as GenericRow[]);
  }

  function setDraft(recordKey: string, value: string) {
    setKnowledgeAnswers((current) => ({ ...current, [recordKey]: value }));
  }

  async function convertToKnowledgeBase(row: GenericRow, recordKey: string) {
    setError("");
    setMessage("");

    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const question = getQuestion(row);
    const answer = (knowledgeAnswers[recordKey] || getAnswer(row)).trim();

    if (!question.trim() || !answer) {
      setError("اكتب إجابة معتمدة قبل تحويل السؤال إلى قاعدة المعرفة.");
      return;
    }

    setIsConverting(recordKey);
    let lastError = "";

    for (const payload of buildKnowledgePayloads(question, answer)) {
      const { error: insertError } = await supabase
        .from("knowledge_base")
        .insert(asSupabasePayload(payload));

      if (!insertError) {
        const id = row.id;
        if (typeof id === "string" || typeof id === "number") {
          await supabase.from("ai_unanswered_questions").update({ status: "converted" } as never).eq("id", id);
        }

        await logAdminActivity({
          action: "convert_ai_question_to_knowledge_base",
          module: "ai_support",
          adminEmail,
          recordId: getRecordId(row),
          details: "تحويل سؤال غير مجاب من الدعم الذكي إلى قاعدة المعرفة",
          oldData: row,
          newData: {
            title: question,
            content: answer,
            category: "أسئلة الدعم الذكي",
            status: "published",
          },
        });

        setIsConverting("");
        setMessage("تم تحويل السؤال إلى Knowledge Base بنجاح.");
        setKnowledgeAnswers((current) => ({ ...current, [recordKey]: "" }));
        await loadAiSupportData();
        return;
      }

      lastError = insertError.message;
    }

    setIsConverting("");
    setError(`تعذر تحويل السؤال إلى قاعدة المعرفة. آخر خطأ: ${lastError || "غير معروف"}`);
  }

  const allItems = useMemo(() => {
    return [
      ...conversations.map((row) => ({ row, source: "conversation" as const })),
      ...unansweredQuestions.map((row) => ({ row, source: "unanswered" as const })),
    ];
  }, [conversations, unansweredQuestions]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allItems.filter((item) => {
      const status = item.source === "unanswered" ? "unanswered" : getStatus(item.row);
      const matchesFilter = filter === "all" || status === filter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const text = [
        getQuestion(item.row),
        getAnswer(item.row),
        getVisitor(item.row),
        getStatusLabel(item.row),
        getRecordId(item.row),
        item.source,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [allItems, filter, search]);

  const answeredCount = conversations.filter((row) => getStatus(row) === "answered").length;
  const escalatedCount = conversations.filter((row) => getStatus(row) === "escalated").length;
  const unansweredCount = unansweredQuestions.length;

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (isForbidden) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center">
          <div className="text-sm font-black tracking-[0.25em] text-red-100">صلاحيات محدودة</div>
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض الدعم الذكي لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">إدارة الدعم الذكي مخصصة لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
          <p className="mt-3 text-sm text-white/45">الحساب: {adminEmail}</p>
          <Link href="/admin" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 font-bold text-white/75">
            العودة إلى لوحة التحكم
          </Link>
        </section>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">
              الدعم الذكي
            </div>
            <h1 className="text-4xl font-black md:text-5xl">AI Support</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              مركز متابعة محادثات الدعم الذكي والأسئلة غير المجاب عنها وتحويل الحالات التي تحتاج متابعة بشرية.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadAiSupportData}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-3 font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث البيانات"}
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <StatCard label="إجمالي العناصر" value={allItems.length} tone="purple" />
          <StatCard label="تمت الإجابة" value={answeredCount} tone="green" />
          <StatCard label="غير مجاب" value={unansweredCount} tone="red" />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <FilterButton key={item.key} active={filter === item.key} onClick={() => setFilter(item.key)}>
                {item.label}
              </FilterButton>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث في الدعم الذكي..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-fuchsia-300/50"
          />
        </div>

        <div className="grid gap-4">
          {filteredItems.length === 0 && !error && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد عناصر دعم ذكي مطابقة حالياً.
            </div>
          )}

          {filteredItems.map((item, index) => {
            const status = item.source === "unanswered" ? "unanswered" : getStatus(item.row);
            const answer = getAnswer(item.row);
            const recordKey = `${item.source}-${getRecordId(item.row)}-${index}`;

            return (
              <article key={recordKey} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={toneForStatus(status)}>{item.source === "unanswered" ? "غير مجاب" : getStatusLabel(item.row)}</Badge>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/60">
                    {item.source === "unanswered" ? "سؤال غير مجاب" : "محادثة"}
                  </span>
                </div>

                <h2 className="text-2xl font-black leading-9">{getQuestion(item.row)}</h2>
                <div className="mt-2 grid gap-2 text-sm text-white/55 md:grid-cols-3">
                  <div>الزائر: <span className="text-white/80">{getVisitor(item.row)}</span></div>
                  <div>الرقم: <span className="text-white/80" dir="ltr">{getRecordId(item.row)}</span></div>
                  <div>التاريخ: <span className="text-white/80">{formatDate(getCreatedAt(item.row))}</span></div>
                </div>

                {answer && (
                  <div className="mt-4 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 leading-8 text-green-50/90">
                    {answer}
                  </div>
                )}

                {item.source === "unanswered" && (
                  <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                    <label className="text-sm font-black text-cyan-100">إجابة معتمدة للتحويل إلى Knowledge Base</label>
                    <textarea
                      value={knowledgeAnswers[recordKey] || ""}
                      onChange={(event) => setDraft(recordKey, event.target.value)}
                      className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-white outline-none focus:border-cyan-300"
                      placeholder="اكتب الجواب الرسمي هنا..."
                    />
                    <button
                      type="button"
                      onClick={() => convertToKnowledgeBase(item.row, recordKey)}
                      disabled={isConverting === recordKey}
                      className="mt-3 rounded-full bg-cyan-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                    >
                      {isConverting === recordKey ? "جاري التحويل..." : "تحويل إلى Knowledge Base"}
                    </button>
                  </div>
                )}

                {formatValue(item.row) !== "غير متوفر" && (
                  <details className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/50">
                    <summary className="cursor-pointer font-black text-white/70">عرض البيانات الخام</summary>
                    <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-left leading-6" dir="ltr">
                      {formatValue(item.row)}
                    </pre>
                  </details>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-500/10 p-5 leading-8 text-cyan-50/85">
          الحالات المحولة للمتابعة البشرية: {escalatedCount}. الأسئلة غير المجابة يمكن تحويلها الآن إلى Knowledge Base من نفس الصفحة.
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneSoftClasses(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={active ? "rounded-full bg-fuchsia-600 px-5 py-3 text-sm font-black text-white" : "rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65"}>
      {children}
    </button>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneSoftClasses(tone)}`}>{children}</span>;
}

function toneSoftClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
