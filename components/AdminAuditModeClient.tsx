"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Row = Record<string, unknown>;
type FilterKey = "all" | "high" | "create" | "update" | "delete" | "auth" | "system";

type Tone = "red" | "green" | "blue" | "yellow" | "purple" | "cyan" | "slate";

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "high", label: "عالي الحساسية" },
  { key: "create", label: "إضافة" },
  { key: "update", label: "تعديل" },
  { key: "delete", label: "حذف" },
  { key: "auth", label: "صلاحيات" },
  { key: "system", label: "النظام" },
];

function pick(row: Row, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return fallback;
}

function nested(source: unknown, keys: string[]) {
  if (!source || typeof source !== "object") return undefined;
  const record = source as Row;
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return undefined;
}

function raw(value: unknown) {
  if (value === null || value === undefined || value === "") return "غير متوفر";
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "غير قابل للعرض";
  }
}

function toObj(value: unknown): Row | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value as Row;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Row;
    } catch {
      return null;
    }
  }
  return null;
}

function timeValue(row: Row) {
  return pick(row, ["created_at", "createdAt", "timestamp", "date"]);
}

function formatDate(value: string) {
  if (!value) return "غير متوفر";
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return "غير متوفر";
  }
}

function action(row: Row) {
  return pick(row, ["action", "event", "activity", "operation", "type"], "system");
}

function moduleName(row: Row) {
  return pick(row, ["module", "table_name", "table", "entity", "entity_type", "resource"], "النظام");
}

function actor(row: Row) {
  return pick(row, ["admin_email", "user_email", "email", "actor_email", "created_by", "admin", "user_id"], "غير محدد");
}

function recordId(row: Row) {
  return pick(row, ["record_id", "entity_id", "target_id", "item_id", "backup_code", "code"], "غير متوفر");
}

function details(row: Row) {
  return String(
    row.details ??
      row.description ??
      row.notes ??
      nested(row.metadata, ["details", "description", "notes"]) ??
      nested(row.payload, ["details", "description", "notes"]) ??
      ""
  );
}

function oldData(row: Row) {
  return row.old_data ?? row.old_values ?? row.oldData ?? row.oldValues ?? nested(row.metadata, ["oldData", "old_data", "oldValues", "old_values"]);
}

function newData(row: Row) {
  return row.new_data ?? row.new_values ?? row.newData ?? row.newValues ?? nested(row.metadata, ["newData", "new_data", "newValues", "new_values"]);
}

function category(row: Row): Exclude<FilterKey, "all" | "high"> {
  const a = action(row).toLowerCase();
  const m = moduleName(row).toLowerCase();
  if (["login", "logout", "auth", "permission", "role", "access"].some((w) => a.includes(w) || m.includes(w))) return "auth";
  if (["delete", "remove", "trash"].some((w) => a.includes(w))) return "delete";
  if (["backup", "export", "import", "system"].some((w) => a.includes(w) || m.includes(w))) return "system";
  if (["create", "insert", "add", "publish", "restore"].some((w) => a.includes(w))) return "create";
  return "update";
}

function actionLabel(row: Row) {
  const a = action(row).toLowerCase();
  if (a.includes("backup")) return "نسخة احتياطية";
  if (a.includes("export")) return "تصدير";
  if (a.includes("create") || a.includes("insert") || a.includes("add")) return "إضافة";
  if (a.includes("delete") || a.includes("remove") || a.includes("trash")) return "حذف";
  if (a.includes("login")) return "دخول";
  if (a.includes("status")) return "تغيير حالة";
  return "تعديل";
}

function changes(row: Row) {
  const before = toObj(oldData(row));
  const after = toObj(newData(row));
  if (!before || !after) return [] as { key: string; before: unknown; after: unknown }[];
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();
  return keys
    .filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null))
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

function risk(row: Row) {
  const c = category(row);
  const m = moduleName(row).toLowerCase();
  if (c === "delete") return "high";
  if (["settings", "permissions", "admin_users", "backups", "activity_logs", "trash"].some((w) => m.includes(w))) return "high";
  if (changes(row).length >= 4) return "medium";
  if (c === "update") return "medium";
  return "low";
}

function riskLabel(value: string) {
  if (value === "high") return "عالي";
  if (value === "medium") return "متوسط";
  return "منخفض";
}

function tone(value: string): Tone {
  if (value === "delete" || value === "high") return "red";
  if (value === "create") return "green";
  if (value === "update") return "blue";
  if (value === "auth") return "purple";
  if (value === "system") return "cyan";
  return "slate";
}

export default function AdminAuditModeClient() {
  const [logs, setLogs] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  async function loadLogs() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }
    setError("");
    setLoading(true);
    const { data, error: logError } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(160);
    setLoading(false);
    if (logError) {
      setError("تعذر تحميل سجلات التدقيق.");
      return;
    }
    setLogs((data || []) as Row[]);
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const c = category(log);
      const r = risk(log);
      const matchFilter = filter === "all" || c === filter || (filter === "high" && r === "high");
      if (!matchFilter) return false;
      if (!q) return true;
      return [action(log), actionLabel(log), moduleName(log), actor(log), recordId(log), details(log), riskLabel(r)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [logs, filter, search]);

  const highRisk = logs.filter((log) => risk(log) === "high").length;
  const withChanges = logs.filter((log) => changes(log).length > 0).length;
  const deleteCount = logs.filter((log) => category(log) === "delete").length;

  return (
    <section className="grid gap-6">
      {error && <div className="rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="كل السجلات" value={logs.length} color="purple" />
        <Stat label="عالي الحساسية" value={highRisk} color="red" />
        <Stat label="فيها قبل/بعد" value={withChanges} color="cyan" />
        <Stat label="عمليات حذف" value={deleteCount} color="yellow" />
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
        <div className="flex flex-wrap gap-3">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={filter === item.key ? "rounded-full bg-yellow-600 px-5 py-3 text-sm font-black text-white" : "rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/65"}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="بحث في التدقيق..."
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35"
          />
          <button type="button" onClick={loadLogs} className="rounded-2xl bg-yellow-600 px-5 py-4 font-black text-white">
            {loading ? "جاري التحديث..." : "تحديث"}
          </button>
        </div>
      </div>

      <div className="grid gap-5">
        {filteredLogs.map((log, index) => {
          const c = category(log);
          const r = risk(log);
          const logChanges = changes(log);
          return (
            <article key={`${recordId(log)}-${timeValue(log)}-${index}`} className={`rounded-[2rem] border p-5 ${toneClass(tone(c))}`}>
              <div className="flex flex-wrap gap-2">
                <Badge color={tone(c)}>{actionLabel(log)}</Badge>
                <Badge color={r === "high" ? "red" : r === "medium" ? "yellow" : "green"}>حساسية {riskLabel(r)}</Badge>
                <Badge color="slate">{moduleName(log)}</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-black">{details(log) || action(log)}</h2>
              <div className="mt-3 grid gap-2 text-sm opacity-75 md:grid-cols-4">
                <div>الأدمن: {actor(log)}</div>
                <div>السجل: <span dir="ltr">{recordId(log)}</span></div>
                <div>التاريخ: {formatDate(timeValue(log))}</div>
                <div>تغييرات: {logChanges.length}</div>
              </div>

              {logChanges.length > 0 && (
                <div className="mt-5 grid gap-3">
                  {logChanges.slice(0, 6).map((change) => (
                    <div key={change.key} className="grid gap-2 rounded-2xl border border-white/10 bg-black/25 p-3 md:grid-cols-[160px_1fr_1fr]">
                      <div className="font-black text-yellow-100">{change.key}</div>
                      <pre className="whitespace-pre-wrap text-xs text-red-100">قبل: {raw(change.before)}</pre>
                      <pre className="whitespace-pre-wrap text-xs text-green-100">بعد: {raw(change.after)}</pre>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {filteredLogs.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
          لا توجد سجلات مطابقة.
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(color)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function Badge({ children, color }: { children: React.ReactNode; color: Tone }) {
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(color)}`}>{children}</span>;
}

function toneClass(color: Tone) {
  const classes: Record<Tone, string> = {
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    slate: "border-white/10 bg-white/[0.04] text-white/75",
  };
  return classes[color];
}
