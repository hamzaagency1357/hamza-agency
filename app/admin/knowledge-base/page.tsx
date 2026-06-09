"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type KnowledgeBaseRow = Record<string, unknown>;
type FilterKey = "all" | "published" | "draft" | "hidden" | "faq" | "program" | "service" | "policy";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";

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

function getCategoryKey(row: KnowledgeBaseRow): FilterKey {
  const text = `${getCategory(row)} ${getTitle(row)} ${getContent(row)}`.toLowerCase();

  if (["faq", "question", "سؤال", "أسئلة"].some((word) => text.includes(word))) return "faq";
  if (["program", "platform", "tiktok", "bigo", "yaahlan", "xena", "catchii", "برنامج"].some((word) => text.includes(word))) return "program";
  if (["service", "خدمة", "خدمات"].some((word) => text.includes(word))) return "service";
  if (["policy", "privacy", "terms", "ai", "سياسة", "شروط"].some((word) => text.includes(word))) return "policy";

  return "all";
}

export default function AdminKnowledgeBasePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [records, setRecords] = useState<KnowledgeBaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("dashboard");

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
          <p className="mt-4 leading-8 text-white/60">إدارة قاعدة المعرفة مخصصة لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
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
            <div className="mb-3 inline-flex rounded-full border border-violet-400/25 bg-violet-500/10 px-5 py-2 text-sm font-bold text-violet-100">
              قاعدة المعرفة
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Knowledge Base</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              مركز إدارة المعرفة التي ستدعم لاحقاً مساعد الوكالة الذكي، الأسئلة المتكررة، معلومات البرامج، وسياسات التشغيل.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadKnowledgeBase}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث البيانات"}
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 leading-8 text-red-100">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="عناصر المعرفة" value={records.length} tone="purple" />
          <StatCard label="منشور" value={publishedCount} tone="green" />
          <StatCard label="مسودات" value={draftCount} tone="blue" />
          <StatCard label="مخفي" value={hiddenCount} tone="red" />
          <StatCard label="التصنيفات" value={categoriesCount} tone="cyan" />
        </div>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في العنوان أو المحتوى أو التصنيف..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-violet-300/40"
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterKey)}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none focus:border-violet-300/40"
            >
              {filters.map((item) => (
                <option key={item.key} value={item.key} className="bg-[#120018]">
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">عناصر قاعدة المعرفة</h2>
              <p className="mt-2 text-sm text-white/45">عدد النتائج: {filteredRecords.length}</p>
            </div>
          </div>

          {filteredRecords.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-white/55">
              لا توجد عناصر معرفة مطابقة حالياً.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredRecords.map((record, index) => (
              <article key={`${getRecordId(record)}-${index}`} className={`rounded-3xl border p-5 ${toneClass(getStatus(record) === "published" ? "green" : getStatus(record) === "hidden" ? "red" : "purple")}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-1 text-sm font-black">
                      {getStatusLabel(record)}
                    </div>
                    <h3 className="text-2xl font-black">{getTitle(record)}</h3>
                    <p className="mt-2 text-sm opacity-75">التصنيف: {getCategory(record)}</p>
                    <p className="mt-1 text-sm opacity-75">المعرّف: {getRecordId(record)}</p>
                  </div>

                  <div className="text-sm opacity-70 md:text-left">
                    {formatDate(getCreatedAt(record))}
                  </div>
                </div>

                {getContent(record) && (
                  <p className="mt-4 line-clamp-4 leading-8 opacity-80">
                    {getContent(record)}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function toneClass(tone: Tone) {
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
