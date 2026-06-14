"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type KnowledgeBaseRow = Record<string, unknown>;
type KnowledgePayload = Record<string, string | boolean>;
type FilterKey = "all" | "published" | "draft" | "hidden" | "faq" | "program" | "service" | "policy";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";
type RecordId = string | number;

type KnowledgeFormState = {
  title: string;
  content: string;
  category: string;
  status: "published" | "draft";
};

const initialFormState: KnowledgeFormState = {
  title: "",
  content: "",
  category: "عام",
  status: "published",
};

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "published", label: "منشور" },
  { key: "draft", label: "مسودة" },
  { key: "hidden", label: "مخفي" },
  { key: "faq", label: "أسئلة" },
  { key: "program", label: "برامج" },
  { key: "service", label: "خدمات" },
  { key: "policy", label: "سياسات" },
];

const categoryOptions = ["عام", "أسئلة", "برامج", "خدمات", "سياسات", "انضمام", "تواصل"];

function getString(row: KnowledgeBaseRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function getBoolean(row: KnowledgeBaseRow, keys: string[], fallback = false) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "published", "active", "visible"].includes(normalized)) return true;
      if (["false", "0", "no", "draft", "hidden", "inactive"].includes(normalized)) return false;
    }
  }

  return fallback;
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

function getTitle(row: KnowledgeBaseRow) {
  return getString(row, ["title", "question", "name", "headline", "label"], "عنصر معرفة");
}

function getContent(row: KnowledgeBaseRow) {
  return getString(row, ["content", "answer", "description", "body", "summary", "text"], "");
}

function getCategory(row: KnowledgeBaseRow) {
  return getString(row, ["category", "type", "section", "module", "group"], "عام");
}

function getStatus(row: KnowledgeBaseRow) {
  const explicitStatus = getString(row, ["status", "state", "visibility"], "").toLowerCase();
  if (["published", "active", "visible", "enabled"].includes(explicitStatus)) return "published";
  if (["draft", "pending"].includes(explicitStatus)) return "draft";
  if (["hidden", "inactive", "disabled", "archived"].includes(explicitStatus)) return "hidden";

  const isVisible = getBoolean(row, ["is_visible", "is_published", "published", "is_active"], false);
  return isVisible ? "published" : "draft";
}

function getStatusLabel(row: KnowledgeBaseRow) {
  const status = getStatus(row);
  if (status === "published") return "منشور";
  if (status === "hidden") return "مخفي";
  return "مسودة";
}

function getCreatedAt(row: KnowledgeBaseRow) {
  return getString(row, ["created_at", "updated_at", "published_at", "date"], "");
}

function getRecordId(row: KnowledgeBaseRow) {
  return getString(row, ["id", "slug", "code", "key"], "غير متوفر");
}

function getRawId(row: KnowledgeBaseRow): RecordId | null {
  const id = row.id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

function getCategoryKey(row: KnowledgeBaseRow): FilterKey {
  const text = `${getCategory(row)} ${getTitle(row)} ${getContent(row)}`.toLowerCase();

  if (["faq", "question", "سؤال", "أسئلة"].some((word) => text.includes(word))) return "faq";
  if (["program", "platform", "tiktok", "bigo", "yaahlan", "xena", "catchii", "برنامج"].some((word) => text.includes(word))) return "program";
  if (["service", "خدمة", "خدمات"].some((word) => text.includes(word))) return "service";
  if (["policy", "privacy", "terms", "ai", "سياسة", "شروط"].some((word) => text.includes(word))) return "policy";

  return "all";
}

function buildKnowledgePayloads(form: KnowledgeFormState): KnowledgePayload[] {
  const cleanTitle = form.title.trim();
  const cleanContent = form.content.trim();
  const cleanCategory = form.category.trim() || "عام";
  const isPublished = form.status === "published";

  return [
    { title: cleanTitle, content: cleanContent, category: cleanCategory, status: form.status },
    { title: cleanTitle, content: cleanContent, category: cleanCategory, is_active: isPublished },
    { title: cleanTitle, content: cleanContent, category: cleanCategory },
    { question: cleanTitle, answer: cleanContent, category: cleanCategory, status: form.status },
    { question: cleanTitle, answer: cleanContent, category: cleanCategory, is_active: isPublished },
    { question: cleanTitle, answer: cleanContent, category: cleanCategory },
    { question: cleanTitle, answer: cleanContent },
    { title: cleanTitle, content: cleanContent },
  ];
}

const hideKnowledgePayloads: KnowledgePayload[] = [
  { status: "hidden" },
  { is_active: false },
  { is_visible: false },
  { published: false },
];

function asSupabasePayload(payload: KnowledgePayload) {
  return payload as never;
}

export default function AdminKnowledgeBasePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [records, setRecords] = useState<KnowledgeBaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<RecordId | null>(null);
  const [form, setForm] = useState<KnowledgeFormState>(initialFormState);

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("knowledge_base");

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
    loadKnowledgeBase();
  }, [isAuthorized]);

  async function loadKnowledgeBase() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setIsLoading(true);

    const { data, error: knowledgeError } = await supabase
      .from("knowledge_base")
      .select("*")
      .limit(200);

    setIsLoading(false);

    if (knowledgeError) {
      setError("تعذر تحميل قاعدة المعرفة. يرجى التأكد من إعدادات جدول knowledge_base وصلاحيات القراءة.");
      return;
    }

    setRecords((data || []) as KnowledgeBaseRow[]);
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialFormState);
  }

  function startEdit(record: KnowledgeBaseRow) {
    const id = getRawId(record);
    if (id === null) {
      setMessage("لا يمكن تعديل هذا العنصر لأنه لا يحتوي على id واضح.");
      return;
    }

    setEditingId(id);
    setForm({
      title: getTitle(record),
      content: getContent(record),
      category: getCategory(record),
      status: getStatus(record) === "published" ? "published" : "draft",
    });
    setMessage("تم تحميل العنصر في نموذج التعديل.");
  }

  async function saveKnowledgeItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    if (!form.title.trim() || !form.content.trim()) {
      setMessage("يرجى كتابة عنوان ومحتوى قبل الحفظ.");
      return;
    }

    setIsSaving(true);
    let lastError = "";

    for (const payload of buildKnowledgePayloads(form)) {
      const safePayload = asSupabasePayload(payload);
      const result = editingId === null
        ? await supabase.from("knowledge_base").insert(safePayload)
        : await supabase.from("knowledge_base").update(safePayload).eq("id", editingId);

      if (!result.error) {
        setIsSaving(false);
        setMessage(editingId === null ? "تمت إضافة عنصر المعرفة بنجاح." : "تم تحديث عنصر المعرفة بنجاح.");
        resetForm();
        await loadKnowledgeBase();
        return;
      }

      lastError = result.error.message;
    }

    setIsSaving(false);
    setError(`تعذر حفظ عنصر المعرفة. آخر خطأ: ${lastError || "غير معروف"}`);
  }

  async function hideKnowledgeItem(record: KnowledgeBaseRow) {
    setMessage("");
    setError("");

    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const id = getRawId(record);
    if (id === null) {
      setMessage("لا يمكن إخفاء هذا العنصر لأنه لا يحتوي على id واضح.");
      return;
    }

    let lastError = "";

    for (const payload of hideKnowledgePayloads) {
      const { error: hideError } = await supabase
        .from("knowledge_base")
        .update(asSupabasePayload(payload))
        .eq("id", id);

      if (!hideError) {
        setMessage("تم إخفاء عنصر المعرفة بنجاح.");
        await loadKnowledgeBase();
        return;
      }

      lastError = hideError.message;
    }

    setError(`تعذر إخفاء عنصر المعرفة. آخر خطأ: ${lastError || "غير معروف"}`);
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const status = getStatus(record);
      const categoryKey = getCategoryKey(record);

      const matchesFilter =
        filter === "all" ||
        status === filter ||
        categoryKey === filter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const text = [
        getTitle(record),
        getContent(record),
        getCategory(record),
        getStatusLabel(record),
        getRecordId(record),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [records, filter, search]);

  const publishedCount = records.filter((record) => getStatus(record) === "published").length;
  const draftCount = records.filter((record) => getStatus(record) === "draft").length;
  const hiddenCount = records.filter((record) => getStatus(record) === "hidden").length;
  const categoriesCount = new Set(records.map((record) => getCategory(record))).size;

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
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض قاعدة المعرفة لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">قاعدة المعرفة مخصصة لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
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
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">
              قاعدة المعرفة
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Knowledge Base</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              مصدر المعلومات المعتمد للدعم الذكي: الأسئلة، البرامج، الخدمات، السياسات، والمعلومات التي يجب أن يعتمد عليها الرد الآلي.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadKnowledgeBase}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-3 font-black text-white shadow-[0_0_30px_rgba(34,211,238,0.18)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث القاعدة"}
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <form onSubmit={saveKnowledgeItem} className="mb-8 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-5 backdrop-blur">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">{editingId === null ? "إضافة عنصر معرفة" : "تعديل عنصر معرفة"}</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">هذه العناصر يستخدمها الدعم الذكي كمصدر إجابات موثوق.</p>
            </div>
            {editingId !== null && (
              <button type="button" onClick={resetForm} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-bold text-white/70">
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-white/70">
              العنوان / السؤال
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
                placeholder="مثال: كيف أنضم إلى وكالة حمزة؟"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-white/70">
              التصنيف
              <select
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
              >
                {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold text-white/70">
              الحالة
              <select
                value={form.status}
                onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as KnowledgeFormState["status"] }))}
                className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
              >
                <option value="published">منشور</option>
                <option value="draft">مسودة</option>
              </select>
            </label>
          </div>

          <label className="mt-4 grid gap-2 text-sm font-bold text-white/70">
            المحتوى / الجواب
            <textarea
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              className="min-h-32 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 leading-7 text-white outline-none focus:border-cyan-300/50"
              placeholder="اكتب الجواب المعتمد الذي يجب أن يستخدمه الدعم الذكي."
            />
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-5 rounded-full bg-gradient-to-r from-cyan-600 to-purple-600 px-7 py-3 font-black text-white disabled:opacity-60"
          >
            {isSaving ? "جاري الحفظ..." : editingId === null ? "إضافة إلى قاعدة المعرفة" : "حفظ التعديل"}
          </button>
        </form>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="منشور" value={publishedCount} tone="green" />
          <StatCard label="مسودات" value={draftCount} tone="yellow" />
          <StatCard label="مخفي" value={hiddenCount} tone="red" />
          <StatCard label="تصنيفات" value={categoriesCount} tone="cyan" />
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
            placeholder="بحث في قاعدة المعرفة..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-cyan-300/50"
          />
        </div>

        <div className="grid gap-4">
          {filteredRecords.length === 0 && !error && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد عناصر معرفة مطابقة حالياً.
            </div>
          )}

          {filteredRecords.map((record, index) => (
            <article key={`${getRecordId(record)}-${index}`} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-cyan-400/40 hover:bg-cyan-500/10">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge tone={getStatus(record) === "published" ? "green" : getStatus(record) === "hidden" ? "red" : "yellow"}>{getStatusLabel(record)}</Badge>
                <Badge tone="cyan">{getCategory(record)}</Badge>
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/60">
                  {getRecordId(record)}
                </span>
              </div>

              <h2 className="text-2xl font-black leading-9">{getTitle(record)}</h2>
              <p className="mt-3 whitespace-pre-wrap leading-8 text-white/70">
                {getContent(record) || "لا يوجد محتوى نصي واضح لهذا العنصر."}
              </p>
              <div className="mt-4 text-sm text-white/40">آخر تاريخ: {formatDate(getCreatedAt(record))}</div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" onClick={() => startEdit(record)} className="rounded-full border border-cyan-300/25 bg-cyan-500/10 px-5 py-2 text-sm font-black text-cyan-100">
                  تعديل
                </button>
                <button type="button" onClick={() => hideKnowledgeItem(record)} className="rounded-full border border-red-300/25 bg-red-500/10 px-5 py-2 text-sm font-black text-red-100">
                  إخفاء
                </button>
              </div>
            </article>
          ))}
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

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={active ? "rounded-full bg-cyan-600 px-5 py-3 text-sm font-black text-white" : "rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65"}>
      {children}
    </button>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: Tone }) {
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
