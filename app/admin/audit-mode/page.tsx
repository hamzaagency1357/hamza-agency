"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type AuditRow = Record<string, unknown>;
type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";

function getText(row: AuditRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return fallback;
}

function getDate(row: AuditRow) {
  return getText(row, ["created_at", "createdAt", "date"], "");
}

function formatDate(value: string) {
  if (!value) return "غير متوفر";
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "غير متوفر";
  }
}

function actionTone(action: string): Tone {
  const value = action.toLowerCase();
  if (value.includes("delete") || value.includes("remove")) return "red";
  if (value.includes("create") || value.includes("add")) return "blue";
  if (value.includes("update") || value.includes("edit") || value.includes("status")) return "yellow";
  if (value.includes("restore")) return "green";
  if (value.includes("convert")) return "cyan";
  return "purple";
}

export default function AdminAuditModePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("activity_logs");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
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
    loadLogs();
  }, [isAuthorized]);

  async function loadLogs() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoading(true);
    setError("");

    const { data, error: logsError } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250);

    setIsLoading(false);

    if (logsError) {
      setError("تعذر تحميل سجلات التدقيق.");
      return;
    }

    setLogs((data || []) as AuditRow[]);
  }

  const modules = useMemo(() => {
    return ["all", ...Array.from(new Set(logs.map((row) => getText(row, ["module", "entity_type", "section"], "غير محدد"))))];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((row) => {
      const action = getText(row, ["action", "event", "operation"], "");
      const moduleName = getText(row, ["module", "entity_type", "section"], "غير محدد");
      const details = getText(row, ["details", "description", "message"], "");
      const admin = getText(row, ["admin_email", "adminEmail", "email"], "");
      const recordId = getText(row, ["record_id", "entity_id", "id"], "");

      if (moduleFilter !== "all" && moduleName !== moduleFilter) return false;
      if (actionFilter !== "all" && !action.toLowerCase().includes(actionFilter)) return false;
      if (!query) return true;

      return [action, moduleName, details, admin, recordId].join(" ").toLowerCase().includes(query);
    });
  }, [logs, search, moduleFilter, actionFilter]);

  const riskyCount = filteredLogs.filter((row) => actionTone(getText(row, ["action", "event", "operation"], "")) === "red").length;
  const updateCount = filteredLogs.filter((row) => actionTone(getText(row, ["action", "event", "operation"], "")) === "yellow").length;
  const createCount = filteredLogs.filter((row) => actionTone(getText(row, ["action", "event", "operation"], "")) === "blue").length;

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
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض وضع التدقيق لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">وضع التدقيق مخصص لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
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
            <div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">
              Full Audit Mode
            </div>
            <h1 className="text-4xl font-black md:text-5xl">وضع التدقيق المتقدم</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              عرض فعلي لسجلات Activity Logs مع بحث وفلاتر للعمليات الإدارية.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={loadLogs} disabled={isLoading} className="rounded-full bg-gradient-to-r from-yellow-500 to-purple-600 px-6 py-3 font-black text-white disabled:opacity-60">
              {isLoading ? "جاري التحديث..." : "تحديث السجلات"}
            </button>
            <Link href="/admin/activity-logs" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              Activity Logs
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="السجلات" value={filteredLogs.length} tone="purple" />
          <StatCard label="إضافات" value={createCount} tone="blue" />
          <StatCard label="تعديلات" value={updateCount} tone="yellow" />
          <StatCard label="حساسة" value={riskyCount} tone="red" />
        </div>

        <section className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 lg:grid-cols-4">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في التدقيق..." className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 lg:col-span-2" />
          <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
            {modules.map((item) => <option key={item} value={item}>{item === "all" ? "كل الموديولات" : item}</option>)}
          </select>
          <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
            <option value="all">كل العمليات</option>
            <option value="create">إضافة</option>
            <option value="update">تعديل</option>
            <option value="delete">حذف</option>
            <option value="status">تغيير حالة</option>
            <option value="convert">تحويل</option>
          </select>
        </section>

        <section className="grid gap-4">
          {filteredLogs.length === 0 && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">لا توجد سجلات مطابقة.</div>}
          {filteredLogs.map((row, index) => {
            const action = getText(row, ["action", "event", "operation"], "عملية");
            const moduleName = getText(row, ["module", "entity_type", "section"], "غير محدد");
            const tone = actionTone(action);
            const key = `${getText(row, ["id", "record_id"], String(index))}-${index}`;

            return (
              <article key={key} className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{moduleName}</span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">{getText(row, ["record_id", "entity_id", "id"], "—")}</span>
                    </div>
                    <h2 className="text-2xl font-black">{action}</h2>
                    <p className="mt-2 leading-7 opacity-75">{getText(row, ["details", "description", "message"], "بدون تفاصيل")}</p>
                    <div className="mt-3 grid gap-2 text-sm opacity-70 md:grid-cols-2">
                      <div>{getText(row, ["admin_email", "adminEmail", "email"], "غير معروف")}</div>
                      <div>{formatDate(getDate(row))}</div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
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
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
