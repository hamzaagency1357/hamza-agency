"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type BackupRow = Record<string, unknown>;
type FilterKey = "all" | "completed" | "pending" | "failed" | "manual" | "auto";
type Tone = "green" | "blue" | "yellow" | "red" | "purple" | "slate";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "completed", label: "مكتملة" },
  { key: "pending", label: "قيد التنفيذ" },
  { key: "failed", label: "فاشلة" },
  { key: "manual", label: "يدوية" },
  { key: "auto", label: "تلقائية" },
];

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
  if (["failed", "error", "cancelled", "canceled"].includes(status)) return "فاشلة";
  if (["running", "processing", "in_progress", "pending"].includes(status)) return "قيد التنفيذ";
  return status || "غير محدد";
}

function getStatusKey(row: BackupRow): FilterKey {
  const status = getStatus(row);
  if (["completed", "complete", "success", "done", "ready"].includes(status)) return "completed";
  if (["failed", "error", "cancelled", "canceled"].includes(status)) return "failed";
  return "pending";
}

function getBackupMode(row: BackupRow): FilterKey {
  const mode = getString(row, ["mode", "type", "backup_type", "source"], "").toLowerCase();
  if (["manual", "admin", "user"].some((word) => mode.includes(word))) return "manual";
  if (["auto", "automatic", "scheduled", "system"].some((word) => mode.includes(word))) return "auto";
  return "manual";
}

function getTone(row: BackupRow): Tone {
  const status = getStatusKey(row);
  if (status === "completed") return "green";
  if (status === "failed") return "red";
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

export default function AdminBackupsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [backups, setBackups] = useState<BackupRow[]>([]);
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
    loadBackups();
  }, [isAuthorized]);

  async function loadBackups() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setIsLoading(true);

    const { data, error: backupsError } = await supabase.from("backups").select("*").limit(120);

    setIsLoading(false);

    if (backupsError) {
      setError("تعذر تحميل سجلات النسخ الاحتياطي. يرجى التأكد من إعدادات جدول backups.");
      return;
    }

    const sortedBackups = ((data || []) as BackupRow[])
      .slice()
      .sort((first, second) => getTimeValue(second) - getTimeValue(first));

    setBackups(sortedBackups);
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
              النسخ الاحتياطي
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Backup System</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              عرض سجلات النسخ الاحتياطي الخاصة بالنظام. هذه الصفحة للقراءة والمتابعة فقط حالياً.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadBackups}
              disabled={isLoading}
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
          إنشاء النسخ الاحتياطية والاسترجاع غير مفعلين حالياً. هذه النسخة مخصصة لعرض سجلات النسخ فقط.
        </div>

        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="مكتملة" value={completedCount} tone="green" />
          <StatCard label="قيد التنفيذ" value={pendingCount} tone="yellow" />
          <StatCard label="فاشلة" value={failedCount} tone="red" />
          <StatCard label="يدوية" value={manualCount} tone="blue" />
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
            placeholder="بحث في النسخ الاحتياطية..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-emerald-300/50"
          />
        </div>

        <div className="grid gap-4">
          {filteredBackups.length === 0 && !error && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد سجلات نسخ احتياطي مطابقة حالياً.
            </div>
          )}

          {filteredBackups.map((backup, index) => {
            const details = getDetails(backup);
            return (
              <article key={getString(backup, ["id"], String(index))} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-emerald-400/40 hover:bg-emerald-500/10">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone={getTone(backup)}>{getStatusLabel(backup)}</Badge>
                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/60">
                        {getBackupMode(backup) === "auto" ? "تلقائية" : "يدوية"}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black">{getTitle(backup)}</h2>
                    <div className="mt-2 grid gap-2 text-sm text-white/55 md:grid-cols-4">
                      <div>الكود: <span className="text-white/80">{getBackupCode(backup)}</span></div>
                      <div>الحجم: <span className="text-white/80">{getSize(backup)}</span></div>
                      <div>بواسطة: <span className="text-white/80">{getCreatedBy(backup)}</span></div>
                      <div>التاريخ: <span className="text-white/80">{formatDate(getCreatedAt(backup))}</span></div>
                    </div>

                    {details !== "" && (
                      <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-left text-xs leading-6 text-white/65" dir="ltr">
                        {formatValue(details)}
                      </pre>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
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
    <button onClick={onClick} className={active ? "rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white" : "rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65"}>
      {children}
    </button>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneSoftClasses(tone)}`}>{children}</span>;
}

function toneSoftClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    slate: "border-slate-400/20 bg-slate-500/10 text-slate-100",
  };

  return classes[tone];
}
