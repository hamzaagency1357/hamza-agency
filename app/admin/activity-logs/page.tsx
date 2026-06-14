"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type ActivityLogRow = Record<string, unknown>;
type FilterKey = "all" | "create" | "update" | "delete" | "auth" | "system" | "other";
type Tone = "purple" | "blue" | "green" | "yellow" | "red" | "cyan" | "slate";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "create", label: "إضافة" },
  { key: "update", label: "تعديل" },
  { key: "delete", label: "حذف" },
  { key: "auth", label: "دخول وصلاحيات" },
  { key: "system", label: "النظام" },
  { key: "other", label: "أخرى" },
];

function getStringValue(row: ActivityLogRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function getDateValue(row: ActivityLogRow) {
  return getStringValue(row, ["created_at", "createdAt", "timestamp", "date"], "");
}

function formatDate(value: string) {
  if (!value) return "غير متوفر";

  try {
    return new Intl.DateTimeFormat("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "غير متوفر";
  }
}

function formatRawValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "غير متوفر";

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "بيانات غير قابلة للعرض";
  }
}

function getAction(row: ActivityLogRow) {
  return getStringValue(row, ["action", "event", "activity", "operation", "type"], "system");
}

function getActionCategory(row: ActivityLogRow): FilterKey {
  const action = getAction(row).toLowerCase();
  const moduleName = getModuleName(row).toLowerCase();

  if (["system", "backup", "export", "import", "maintenance"].some((word) => action.includes(word) || moduleName.includes(word))) {
    return "system";
  }

  if (["create", "insert", "add", "publish", "restore"].some((word) => action.includes(word))) {
    return "create";
  }

  if (["update", "edit", "save", "change", "status", "approve", "reject", "hide", "show"].some((word) => action.includes(word))) {
    return "update";
  }

  if (["delete", "remove", "trash", "destroy"].some((word) => action.includes(word))) {
    return "delete";
  }

  if (["login", "logout", "auth", "permission", "role", "access"].some((word) => action.includes(word))) {
    return "auth";
  }

  return "other";
}

function getActionLabel(row: ActivityLogRow) {
  const action = getAction(row);
  const normalized = action.toLowerCase();

  if (normalized.includes("backup")) return "نسخة احتياطية";
  if (normalized.includes("export")) return "تصدير";
  if (normalized.includes("create") || normalized.includes("insert") || normalized.includes("add")) return "إضافة";
  if (normalized.includes("update") || normalized.includes("edit") || normalized.includes("save")) return "تعديل";
  if (normalized.includes("status")) return "تغيير حالة";
  if (normalized.includes("delete") || normalized.includes("remove") || normalized.includes("trash")) return "حذف";
  if (normalized.includes("login")) return "تسجيل دخول";
  if (normalized.includes("logout")) return "تسجيل خروج";

  return action || "نشاط إداري";
}

function getTone(category: FilterKey): Tone {
  if (category === "create") return "green";
  if (category === "update") return "blue";
  if (category === "delete") return "red";
  if (category === "auth") return "purple";
  if (category === "system") return "cyan";
  return "slate";
}

function getModuleName(row: ActivityLogRow) {
  return getStringValue(row, ["module", "table_name", "table", "entity", "entity_type", "resource"], "النظام");
}

function getModuleLabel(row: ActivityLogRow) {
  const moduleName = getModuleName(row);

  const labels: Record<string, string> = {
    agency_applications: "طلبات الانضمام",
    service_requests: "طلبات الخدمات",
    programs: "البرامج",
    pages: "الصفحات",
    media: "الوسائط",
    announcements: "الإعلانات",
    jobs: "الوظائف",
    job_applications: "طلبات الوظائف",
    reviews: "التقييمات",
    success_stories: "قصص النجاح",
    partners: "الشركاء",
    gallery_items: "المعرض",
    settings: "الإعدادات",
    admin_users: "المستخدمون الإداريون",
    backups: "النسخ الاحتياطي",
    activity_logs: "سجل النشاطات",
    knowledge_base: "قاعدة المعرفة",
    ai_conversations: "محادثات الدعم الذكي",
    ai_unanswered_questions: "أسئلة الدعم الذكي غير المجابة",
  };

  return labels[moduleName] || moduleName;
}

function getActor(row: ActivityLogRow) {
  return getStringValue(
    row,
    ["admin_email", "user_email", "email", "actor_email", "created_by", "admin", "user_id"],
    "غير محدد"
  );
}

function getRecordId(row: ActivityLogRow) {
  return getStringValue(row, ["record_id", "entity_id", "target_id", "item_id", "backup_code", "code"], "غير متوفر");
}

function getDetails(row: ActivityLogRow) {
  return (
    row.details ??
    row.description ??
    row.notes ??
    row.metadata ??
    row.payload ??
    row.new_values ??
    row.new_data ??
    row.old_values ??
    row.old_data ??
    ""
  );
}

export default function AdminActivityLogsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("activity_logs");

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
    loadActivityLogs();
  }, [isAuthorized]);

  async function loadActivityLogs() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setIsLoading(true);

    const { data, error: logsError } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(120);

    setIsLoading(false);

    if (logsError) {
      setError("تعذر تحميل سجل النشاطات. يرجى التأكد من صلاحيات جدول activity_logs.");
      return;
    }

    setLogs((data || []) as ActivityLogRow[]);
  }

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const category = getActionCategory(log);
      const matchesFilter = filter === "all" || category === filter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const text = [
        getActionLabel(log),
        getModuleLabel(log),
        getActor(log),
        getRecordId(log),
        formatRawValue(getDetails(log)),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [logs, filter, search]);

  const createCount = logs.filter((log) => getActionCategory(log) === "create").length;
  const updateCount = logs.filter((log) => getActionCategory(log) === "update").length;
  const deleteCount = logs.filter((log) => getActionCategory(log) === "delete").length;
  const systemCount = logs.filter((log) => getActionCategory(log) === "system").length;

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
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض سجل النشاطات لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">
            سجل النشاطات مخصص لحسابات السوبر أدمن ونائب السوبر أدمن فقط.
          </p>
          <p className="mt-3 text-sm text-white/45">الحساب: {adminEmail}</p>
          <Link
            href="/admin"
            className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 font-bold text-white/75"
          >
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
              سجل النشاطات
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Activity Log</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              متابعة آخر العمليات الإدارية المهمة داخل النظام، مثل الإضافة والتعديل والحذف وتغييرات الحالة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadActivityLogs}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث السجل"}
            </button>
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75"
            >
              لوحة التحكم
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="إضافة" value={createCount} tone="green" />
          <StatCard label="تعديل" value={updateCount} tone="blue" />
          <StatCard label="حذف" value={deleteCount} tone="red" />
          <StatCard label="النظام" value={systemCount} tone="cyan" />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-wrap gap-3">
            {filters.map((item) => (
              <FilterButton
                key={item.key}
                active={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </FilterButton>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث في السجل..."
            className="w-full rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-purple-300/50"
          />
        </div>

        <div className="grid gap-4">
          {filteredLogs.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
              لا توجد نشاطات مطابقة حالياً.
            </div>
          )}

          {filteredLogs.map((log, index) => {
            const category = getActionCategory(log);
            const details = getDetails(log);

            return (
              <article
                key={getStringValue(log, ["id"], String(index))}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition hover:border-purple-400/45 hover:bg-purple-500/10"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone={getTone(category)}>{getActionLabel(log)}</Badge>
                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-black text-white/60">
                        {getModuleLabel(log)}
                      </span>
                    </div>

                    <h2 className="text-2xl font-black">{getActor(log)}</h2>
                    <div className="mt-2 grid gap-2 text-sm text-white/55 md:grid-cols-2">
                      <div>رقم العنصر: <span className="text-white/80">{getRecordId(log)}</span></div>
                      <div>التاريخ: <span className="text-white/80">{formatDate(getDateValue(log))}</span></div>
                    </div>

                    {details !== "" && (
                      <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/30 p-4 text-left text-xs leading-6 text-white/65" dir="ltr">
                        {formatRawValue(details)}
                      </pre>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white/55">
                    {category === "other" ? "نشاط عام" : filters.find((item) => item.key === category)?.label}
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
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full bg-purple-600 px-5 py-3 text-sm font-black text-white"
          : "rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65"
      }
    >
      {children}
    </button>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${toneSoftClasses(tone)}`}>
      {children}
    </span>
  );
}

function toneSoftClasses(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    slate: "border-slate-400/20 bg-slate-500/10 text-slate-100",
  };

  return classes[tone];
}
