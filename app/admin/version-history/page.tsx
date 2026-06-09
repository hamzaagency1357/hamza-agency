"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type VersionHistoryRow = Record<string, unknown>;
type FilterKey = "all" | "created" | "updated" | "deleted" | "restored" | "published" | "system";
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "slate";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "created", label: "إنشاء" },
  { key: "updated", label: "تعديل" },
  { key: "deleted", label: "حذف" },
  { key: "restored", label: "استعادة" },
  { key: "published", label: "نشر" },
  { key: "system", label: "النظام" },
];

function getString(row: VersionHistoryRow, keys: string[], fallback = "") {
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

function getAction(row: VersionHistoryRow) {
  return getString(row, ["action", "event", "operation", "change_type", "type", "status"], "updated").toLowerCase();
}

function getActionKey(row: VersionHistoryRow): FilterKey {
  const action = getAction(row);

  if (["create", "created", "insert", "added", "add"].some((word) => action.includes(word))) return "created";
  if (["delete", "deleted", "remove", "removed"].some((word) => action.includes(word))) return "deleted";
  if (["restore", "restored", "recover", "recovered"].some((word) => action.includes(word))) return "restored";
  if (["publish", "published", "visible", "enabled"].some((word) => action.includes(word))) return "published";
  if (["system", "auto", "migration", "seed"].some((word) => action.includes(word))) return "system";

  return "updated";
}

function getActionLabel(row: VersionHistoryRow) {
  const actionKey = getActionKey(row);
  if (actionKey === "created") return "إنشاء";
  if (actionKey === "deleted") return "حذف";
  if (actionKey === "restored") return "استعادة";
  if (actionKey === "published") return "نشر";
  if (actionKey === "system") return "النظام";
  return "تعديل";
}

function getTone(row: VersionHistoryRow): Tone {
  const actionKey = getActionKey(row);
  if (actionKey === "created") return "green";
  if (actionKey === "deleted") return "red";
  if (actionKey === "restored") return "blue";
  if (actionKey === "published") return "yellow";
  if (actionKey === "system") return "slate";
  return "purple";
}

function getTitle(row: VersionHistoryRow) {
  return getString(row, ["title", "item_title", "entity_title", "name", "page_title", "record_title"], "سجل إصدار");
}

function getEntity(row: VersionHistoryRow) {
  return getString(row, ["entity", "entity_type", "table_name", "module", "section", "resource"], "غير محدد");
}

function getRecordId(row: VersionHistoryRow) {
  return getString(row, ["record_id", "entity_id", "item_id", "row_id", "reference_id", "id"], "غير متوفر");
}

function getActor(row: VersionHistoryRow) {
  return getString(row, ["changed_by", "created_by", "updated_by", "admin_email", "actor_email", "user_email", "email"], "غير محدد");
}

function getCreatedAt(row: VersionHistoryRow) {
  return getString(row, ["created_at", "changed_at", "updated_at", "timestamp", "date"], "");
}

function getTimeValue(row: VersionHistoryRow) {
  const time = Date.parse(getCreatedAt(row));
  return Number.isNaN(time) ? 0 : time;
}

function getDetails(row: VersionHistoryRow) {
  return row.summary ?? row.description ?? row.details ?? row.changes ?? row.metadata ?? row.payload ?? row.notes ?? "";
}

export default function AdminVersionHistoryPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [records, setRecords] = useState<VersionHistoryRow[]>([]);
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
    loadVersionHistory();
  }, [isAuthorized]);

  async function loadVersionHistory() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setIsLoading(true);

    const { data, error: historyError } = await supabase.from("version_history").select("*").limit(150);

    setIsLoading(false);

    if (historyError) {
      setError("تعذر تحميل سجل الإصدارات. يرجى التأكد من إعدادات جدول version_history.");
      return;
    }

    const sortedRecords = ((data || []) as VersionHistoryRow[])
      .slice()
      .sort((first, second) => getTimeValue(second) - getTimeValue(first));

    setRecords(sortedRecords);
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      const actionKey = getActionKey(record);
      const matchesFilter = filter === "all" || actionKey === filter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const text = [
        getTitle(record),
        getActionLabel(record),
        getEntity(record),
        getRecordId(record),
        getActor(record),
        formatValue(getDetails(record)),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [records, filter, search]);

  const createdCount = records.filter((record) => getActionKey(record) === "created").length;
  const updatedCount = records.filter((record) => getActionKey(record) === "updated").length;
  const deletedCount = records.filter((record) => getActionKey(record) === "deleted").length;
  const systemCount = records.filter((record) => getActionKey(record) === "system").length;

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
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض سجل الإصدارات لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">سجل الإصدارات مخصص لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
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
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
              سجل الإصدارات
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Version History</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              متابعة التغييرات الإدارية المهمة ومعرفة نوع التغيير والقسم والحساب المسؤول عنه.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadVersionHistory}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث السجل"}
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
          <StatCard label="إجمالي السجلات" value={records.length} tone="purple" />
          <StatCard label="إنشاء" value={createdCount} tone="green" />
          <StatCard label="تعديل" value={updatedCount} tone="blue" />
          <StatCard label="حذف" value={deletedCount} tone="red" />
          <StatCard label="النظام" value={systemCount} tone="slate" />
        </div>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث حسب العنوان أو القسم أو الحساب..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-purple-300/40"
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterKey)}
              className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none focus:border-purple-300/40"
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
              <h2 className="text-2xl font-black">سجلات التغييرات</h2>
              <p className="mt-2 text-sm text-white/45">عدد النتائج: {filteredRecords.length}</p>
            </div>
          </div>

          {filteredRecords.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-white/55">
              لا توجد سجلات إصدار مطابقة.
            </div>
          )}

          <div className="grid gap-4">
            {filteredRecords.map((record, index) => {
              const details = getDetails(record);

              return (
                <article key={`${getRecordId(record)}-${index}`} className={`rounded-3xl border p-5 ${toneClass(getTone(record))}`}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-1 text-sm font-black">
                        {getActionLabel(record)}
                      </div>
                      <h3 className="text-2xl font-black">{getTitle(record)}</h3>
                      <p className="mt-2 text-sm opacity-75">القسم: {getEntity(record)}</p>
                      <p className="mt-1 text-sm opacity-75">معرّف السجل: {getRecordId(record)}</p>
                    </div>

                    <div className="text-sm opacity-75 lg:text-left">
                      <p>الحساب: {getActor(record)}</p>
                      <p className="mt-1">التاريخ: {formatDate(getCreatedAt(record))}</p>
                    </div>
                  </div>

                  {Boolean(details) && (
                    <pre className="mt-4 max-h-52 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-7 opacity-80">
                      {formatValue(details)}
                    </pre>
                  )}
                </article>
              );
            })}
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
    slate: "border-slate-400/20 bg-slate-500/10 text-slate-100",
  };

  return classes[tone];
}
