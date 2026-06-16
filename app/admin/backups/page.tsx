"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type BackupRow = Record<string, unknown>;
type ExportedRow = Record<string, unknown>;
type FilterKey = "all" | "completed" | "pending" | "failed" | "manual" | "auto";
type Tone = "green" | "blue" | "yellow" | "red" | "purple" | "slate" | "cyan";

type BackupTableDefinition = {
  table: string;
  label: string;
  critical?: boolean;
};

type BackupTableResult = {
  table: string;
  label: string;
  status: "success" | "error";
  count: number;
  rows: ExportedRow[];
  error: string | null;
};

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "completed", label: "مكتملة" },
  { key: "pending", label: "قيد التنفيذ" },
  { key: "failed", label: "فاشلة" },
  { key: "manual", label: "يدوية" },
  { key: "auto", label: "تلقائية" },
];

const backupTables: BackupTableDefinition[] = [
  { table: "settings", label: "إعدادات الموقع", critical: true },
  { table: "pages", label: "الصفحات", critical: true },
  { table: "sections", label: "أقسام الصفحات", critical: true },
  { table: "programs", label: "البرامج", critical: true },
  { table: "media", label: "الوسائط", critical: true },
  { table: "announcements", label: "الإعلانات" },
  { table: "agency_applications", label: "طلبات الانضمام", critical: true },
  { table: "service_requests", label: "طلبات الخدمات", critical: true },
  { table: "jobs", label: "الوظائف" },
  { table: "job_applications", label: "طلبات الوظائف" },
  { table: "reviews", label: "التقييمات" },
  { table: "success_stories", label: "قصص النجاح" },
  { table: "partners", label: "الشركاء" },
  { table: "gallery_items", label: "المعرض" },
  { table: "faqs", label: "الأسئلة الشائعة" },
  { table: "knowledge_base", label: "قاعدة المعرفة" },
  { table: "content_translations", label: "ترجمات المحتوى" },
  { table: "white_label_projects", label: "مشاريع White Label" },
  { table: "page_builder_sections", label: "أقسام Page Builder" },
  { table: "visual_experience_settings", label: "إعدادات Visual Experience" },
  { table: "trash_items", label: "سلة المحذوفات" },
  { table: "admin_users", label: "حسابات الإدارة" },
  { table: "admin_permissions", label: "صلاحيات الإدارة" },
  { table: "activity_logs", label: "سجل النشاطات" },
  { table: "version_history", label: "سجل الإصدارات" },
  { table: "ai_conversations", label: "محادثات الدعم الذكي" },
  { table: "ai_unanswered_questions", label: "أسئلة الدعم الذكي غير المجابة" },
  { table: "backups", label: "سجلات النسخ الاحتياطي" },
];

const backupPageSize = 1000;
const maxBackupPagesPerTable = 50;

function getString(row: BackupRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function formatDate(value: string) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function getStatus(row: BackupRow) {
  return getString(row, ["status", "state", "backup_status"], "pending").toLowerCase();
}

function getStatusLabel(row: BackupRow) {
  const status = getStatus(row);
  if (["completed", "complete", "success", "done", "ready"].includes(status)) return "مكتملة";
  if (["completed_with_warnings", "warning", "warnings"].includes(status)) return "مكتملة مع تحذيرات";
  if (["failed", "error", "cancelled", "canceled"].includes(status)) return "فاشلة";
  if (["running", "processing", "in_progress", "pending"].includes(status)) return "قيد التنفيذ";
  return status || "غير محدد";
}

function getStatusKey(row: BackupRow): FilterKey {
  const status = getStatus(row);
  if (["completed", "complete", "success", "done", "ready", "completed_with_warnings", "warning", "warnings"].includes(status)) return "completed";
  if (["failed", "error", "cancelled", "canceled"].includes(status)) return "failed";
  return "pending";
}

function getBackupMode(row: BackupRow): FilterKey {
  const mode = getString(row, ["mode", "type", "backup_type", "source"], "").toLowerCase();
  if (["auto", "automatic", "scheduled", "system"].some((word) => mode.includes(word))) return "auto";
  return "manual";
}

function getTone(row: BackupRow): Tone {
  const status = getStatus(row);
  if (["completed_with_warnings", "warning", "warnings"].includes(status)) return "yellow";
  const statusKey = getStatusKey(row);
  if (statusKey === "completed") return "green";
  if (statusKey === "failed") return "red";
  return "yellow";
}

function getTitle(row: BackupRow) {
  return getString(row, ["title", "name", "backup_name", "file_name", "filename"], "نسخة احتياطية");
}

function getBackupCode(row: BackupRow) {
  return getString(row, ["backup_code", "code", "reference", "id"], "غير متوفر");
}

function getCreatedBy(row: BackupRow) {
  return getString(row, ["created_by", "admin_email", "user_email", "actor_email", "email", "user_id"], "غير محدد");
}

function getCreatedAt(row: BackupRow) {
  return getString(row, ["created_at", "started_at", "backup_at", "timestamp", "date"], "");
}

function getTimeValue(row: BackupRow) {
  const time = Date.parse(getCreatedAt(row));
  return Number.isNaN(time) ? 0 : time;
}

function getSize(row: BackupRow) {
  const value = row.size_bytes ?? row.file_size ?? row.size;
  if (typeof value === "number") {
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
    return `${value} B`;
  }
  return formatValue(value);
}

function getDetails(row: BackupRow) {
  return row.details ?? row.metadata ?? row.payload ?? row.description ?? row.notes ?? "";
}

function downloadJsonFile(fileName: string, payload: Record<string, unknown>) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return new TextEncoder().encode(json).length;
}

async function exportTableRows(tableDefinition: BackupTableDefinition): Promise<BackupTableResult> {
  if (!supabase) {
    return {
      table: tableDefinition.table,
      label: tableDefinition.label,
      status: "error",
      count: 0,
      rows: [],
      error: "الاتصال بقاعدة البيانات غير مفعل.",
    };
  }

  const rows: ExportedRow[] = [];

  for (let page = 0; page < maxBackupPagesPerTable; page += 1) {
    const from = page * backupPageSize;
    const to = from + backupPageSize - 1;
    const { data, error } = await supabase.from(tableDefinition.table).select("*").range(from, to);

    if (error) {
      return {
        table: tableDefinition.table,
        label: tableDefinition.label,
        status: "error",
        count: rows.length,
        rows,
        error: error.message,
      };
    }

    const pageRows = (data || []) as ExportedRow[];
    rows.push(...pageRows);
    if (pageRows.length < backupPageSize) break;
  }

  return {
    table: tableDefinition.table,
    label: tableDefinition.label,
    status: "success",
    count: rows.length,
    rows,
    error: null,
  };
}

export default function AdminBackupsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("backups");

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
    loadBackups();
  }, [isAuthorized]);

  async function loadBackups() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setMessage("");
    setIsLoading(true);

    const { data, error: backupsError } = await supabase.from("backups").select("*").limit(120);

    setIsLoading(false);

    if (backupsError) {
      setError("تعذر تحميل سجلات النسخ الاحتياطي. يمكنك إنشاء نسخة JSON حتى لو لم يكن جدول backups جاهزاً بعد.");
      return;
    }

    const sortedBackups = ((data || []) as BackupRow[]).slice().sort((first, second) => getTimeValue(second) - getTimeValue(first));
    setBackups(sortedBackups);
  }

  async function saveBackupLog(logPayload: Record<string, unknown>) {
    if (!supabase) return false;

    const attempts = [
      logPayload,
      {
        name: logPayload.title,
        status: logPayload.status,
        source: logPayload.mode,
        admin_email: logPayload.created_by,
        size_bytes: logPayload.size_bytes,
        metadata: logPayload.details,
        created_at: logPayload.created_at,
      },
      {
        status: logPayload.status,
        details: logPayload.details,
        created_at: logPayload.created_at,
      },
    ];

    for (const attempt of attempts) {
      const { error: insertError } = await supabase.from("backups").insert(attempt);
      if (!insertError) return true;
    }

    return false;
  }

  async function createManualBackup() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const confirmed = window.confirm(
      "هل تريد إنشاء نسخة JSON احتياطية الآن؟ الملف قد يحتوي بيانات حساسة مثل الطلبات والصلاحيات، لذلك احفظه في مكان آمن."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setIsCreatingBackup(true);

    const createdAt = new Date().toISOString();
    const backupCode = `HAMZA-${createdAt.replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    const results: BackupTableResult[] = [];

    for (const tableDefinition of backupTables) {
      results.push(await exportTableRows(tableDefinition));
    }

    const exportedTables = results.filter((item) => item.status === "success");
    const failedTables = results.filter((item) => item.status === "error");
    const failedCriticalTables = failedTables.filter((item) => backupTables.some((table) => table.table === item.table && table.critical));
    const totalRows = exportedTables.reduce((sum, item) => sum + item.count, 0);
    const backupStatus = failedCriticalTables.length ? "failed" : failedTables.length ? "completed_with_warnings" : "completed";

    const backupPayload = {
      schema_version: 3,
      backup_code: backupCode,
      project: "HAMZA AGENCY",
      created_at: createdAt,
      created_by: adminEmail,
      status: backupStatus,
      tables_count: exportedTables.length,
      failed_tables_count: failedTables.length,
      failed_critical_tables_count: failedCriticalTables.length,
      total_rows: totalRows,
      page_size: backupPageSize,
      tables: results,
      notes: "This backup may contain sensitive operational and admin data. Store it securely and do not upload it publicly.",
    };

    const fileName = `hamza-agency-backup-${createdAt.slice(0, 10)}-${backupCode}.json`;
    const sizeBytes = downloadJsonFile(fileName, backupPayload);
    const logSaved = await saveBackupLog({
      backup_code: backupCode,
      title: `Manual backup ${backupCode}`,
      file_name: fileName,
      status: backupStatus,
      mode: "manual",
      created_by: adminEmail,
      size_bytes: sizeBytes,
      details: {
        schema_version: 3,
        tables: exportedTables.map((item) => ({ table: item.table, label: item.label, count: item.count })),
        failed_tables: failedTables.map((item) => ({ table: item.table, label: item.label, error: item.error })),
        total_rows: totalRows,
      },
      created_at: createdAt,
    });

    await supabase.from("activity_logs").insert({
      admin_email: adminEmail,
      action: "create_manual_backup",
      entity_type: "backups",
      entity_id: backupCode,
      old_data: "",
      new_data: JSON.stringify({ backupCode, fileName, sizeBytes, totalRows, status: backupStatus }),
      ip_address: "",
    });

    setIsCreatingBackup(false);
    await loadBackups();

    if (backupStatus === "failed") {
      setError("تم تنزيل ملف النسخة، لكن بعض الجداول الأساسية فشلت. راجع تفاصيل الملف لمعرفة الجداول التي تحتاج ضبط صلاحيات أو إنشاء.");
      return;
    }

    setMessage(
      logSaved
        ? `تم إنشاء وتحميل النسخة الاحتياطية بنجاح. الجداول المصدّرة: ${exportedTables.length}، الصفوف: ${totalRows}.`
        : `تم إنشاء وتحميل النسخة الاحتياطية. الجداول المصدّرة: ${exportedTables.length}، الصفوف: ${totalRows}. لكن تعذر تسجيلها داخل جدول backups.`
    );
  }

  const filteredBackups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return backups.filter((backup) => {
      const statusKey = getStatusKey(backup);
      const modeKey = getBackupMode(backup);
      const matchesFilter = filter === "all" || statusKey === filter || modeKey === filter;
      if (!matchesFilter) return false;
      if (!query) return true;

      const text = [getTitle(backup), getBackupCode(backup), getStatusLabel(backup), getCreatedBy(backup), formatValue(getDetails(backup))]
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [backups, filter, search]);

  const completedCount = backups.filter((backup) => getStatusKey(backup) === "completed").length;
  const pendingCount = backups.filter((backup) => getStatusKey(backup) === "pending").length;
  const failedCount = backups.filter((backup) => getStatusKey(backup) === "failed").length;
  const manualCount = backups.filter((backup) => getBackupMode(backup) === "manual").length;

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
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض النسخ الاحتياطية لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">سجلات النسخ الاحتياطي مخصصة لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
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
            <div className="mb-3 inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/10 px-5 py-2 text-sm font-bold text-emerald-100">
              النسخ الاحتياطي الحقيقي
            </div>
            <h1 className="text-4xl font-black md:text-5xl">نظام Backup JSON</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              إنشاء نسخة JSON فعلية للجداول الأساسية والإدارية المتاحة، مع تضمين جداول الترجمة وWhite Label وPage Builder وVisual Experience والسلة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={createManualBackup}
              disabled={isCreatingBackup || isLoading}
              className="rounded-full bg-gradient-to-r from-yellow-500 to-emerald-600 px-6 py-3 font-black text-black shadow-[0_0_30px_rgba(250,204,21,0.22)] disabled:opacity-60"
            >
              {isCreatingBackup ? "جاري إنشاء النسخة..." : "إنشاء نسخة JSON الآن"}
            </button>
            <button
              onClick={loadBackups}
              disabled={isLoading || isCreatingBackup}
              className="rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(16,185,129,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث السجلات"}
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة التحكم
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        <div className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 leading-8 text-yellow-50/85">
          ملف النسخة الاحتياطية قد يحتوي بيانات تشغيلية حساسة مثل الطلبات والصلاحيات. احفظ الملف في مكان آمن ولا ترفعه داخل GitHub أو أي مكان عام.
        </div>

        <div className="mb-6 rounded-3xl border border-green-400/20 bg-green-500/10 p-5 leading-8 text-green-50/85">
          النسخ اليدوي يسحب البيانات على دفعات حتى {backupPageSize} صف لكل دفعة، ويسجل الجداول غير المتاحة كتحذير داخل ملف النسخة بدلاً من إيقاف العملية بالكامل.
        </div>

        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}
        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="مكتملة" value={completedCount} tone="green" />
          <StatCard label="قيد التنفيذ" value={pendingCount} tone="yellow" />
          <StatCard label="فاشلة" value={failedCount} tone="red" />
          <StatCard label="يدوية" value={manualCount} tone="blue" />
        </div>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`rounded-full border px-4 py-2 text-sm font-black ${
                  filter === item.key ? "border-emerald-300/40 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-black/20 text-white/55"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث في النسخ الاحتياطية..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-emerald-300/40"
          />
        </section>

        <section className="grid gap-4">
          {filteredBackups.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد سجلات نسخ احتياطي مطابقة حالياً.
            </div>
          ) : (
            filteredBackups.map((backup, index) => (
              <article key={`${getBackupCode(backup)}-${index}`} className={`rounded-[2rem] border p-5 ${toneClass(getTone(backup))}`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-1 text-sm font-black">
                      {getStatusLabel(backup)} · {getBackupMode(backup) === "auto" ? "تلقائية" : "يدوية"}
                    </div>
                    <h2 className="text-2xl font-black">{getTitle(backup)}</h2>
                    <p className="mt-3 text-sm opacity-75">الكود: {getBackupCode(backup)}</p>
                  </div>

                  <div className="text-sm opacity-75 md:text-left">
                    <div>{formatDate(getCreatedAt(backup))}</div>
                    <div className="mt-1">الحجم: {getSize(backup)}</div>
                    <div className="mt-1">بواسطة: {getCreatedBy(backup)}</div>
                  </div>
                </div>

                <details className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <summary className="cursor-pointer font-black">تفاصيل النسخة</summary>
                  <pre dir="ltr" className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-6 text-white/70">
                    {formatValue(getDetails(backup))}
                  </pre>
                </details>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    slate: "border-slate-400/20 bg-slate-500/10 text-slate-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
