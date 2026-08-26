"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type HealthStatus = "healthy" | "warning" | "error";
type Check = {
  label: string;
  status: HealthStatus;
  value: string;
  details?: string;
  technical?: boolean;
};
type ScheduleStatus = {
  available?: boolean;
  scheduled?: boolean;
  schedule?: string | null;
  last_run?: string | null;
  last_status?: string | null;
  last_success?: string | null;
};

const statusLabels: Record<HealthStatus, string> = {
  healthy: "يعمل بشكل طبيعي",
  warning: "يحتاج انتباه",
  error: "يوجد خلل",
};

function statusClasses(status: HealthStatus) {
  if (status === "healthy") return "border-green-400/20 bg-green-500/10";
  if (status === "warning") return "border-yellow-400/20 bg-yellow-500/10";
  return "border-red-400/20 bg-red-500/10";
}

export default function SystemHealthPage() {
  const router = useRouter();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState("");

  useEffect(() => {
    void (async () => {
      const access = await requireAdminModuleAccess("launch_checklist");
      if (!access.isAuthorized) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }
      await run();
    })();
  }, [router]);

  async function run() {
    setLoading(true);
    const next: Check[] = [];

    if (!isSupabaseConfigured || !supabase) {
      setChecks([
        {
          label: "خدمة البيانات",
          status: "error",
          value: "غير متاحة حاليًا",
          details: "Supabase configuration is unavailable.",
          technical: true,
        },
      ]);
      setCheckedAt(new Date().toLocaleString("ar"));
      setLoading(false);
      return;
    }

    const start = performance.now();
    const [db, backups, restore, errors, pending, versions, migrations, schedule] = await Promise.all([
      supabase.from("pages").select("id", { count: "exact", head: true }),
      supabase.from("backups").select("status,created_at,completed_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("restore_operations").select("mode,status,created_at,completed_at").order("created_at", { ascending: false }).limit(10),
      supabase
        .from("activity_logs")
        .select("id", { count: "exact", head: true })
        .eq("outcome", "failure")
        .gte("created_at", new Date(Date.now() - 604800000).toISOString()),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["new", "pending", "under_review"])
        .lt("created_at", new Date(Date.now() - 259200000).toISOString()),
      supabase.from("version_history").select("id", { count: "exact", head: true }),
      supabase.from("operations_preflight_backups").select("migration_key,created_at,checksum").order("created_at", { ascending: false }).limit(1),
      supabase.rpc("pr99_backup_schedule_status"),
    ]);

    const latency = Math.round(performance.now() - start);
    next.push({
      label: "الاتصال بخدمة البيانات",
      status: db.error ? "error" : latency > 2000 ? "warning" : "healthy",
      value: db.error ? "تعذر الاتصال" : latency > 2000 ? "متصل لكن الاستجابة بطيئة" : "متصل",
      details: db.error ? "Database connectivity check failed." : `Response time: ${latency} ms`,
    });

    const successful = (backups.data || []).find((row) =>
      ["completed", "success", "completed_with_warnings"].includes(String(row.status))
    );
    const age = successful ? Date.now() - new Date(successful.created_at).getTime() : Infinity;
    next.push({
      label: "آخر نسخة احتياطية ناجحة",
      status: age < 604800000 ? "healthy" : age < 1209600000 ? "warning" : "error",
      value: successful ? new Date(successful.created_at).toLocaleString("ar") : "لا توجد نسخة ناجحة مسجلة",
    });

    const scheduleData = (schedule.data || {}) as ScheduleStatus;
    next.push({
      label: "جدولة النسخ الاحتياطية",
      status: schedule.error ? "warning" : scheduleData.scheduled ? "healthy" : "warning",
      value: schedule.error
        ? "تعذر قراءة حالة الجدولة"
        : scheduleData.scheduled
          ? "الجدولة مفعلة"
          : scheduleData.available
            ? "متاحة ولكن غير مفعلة"
            : "غير متاحة",
      details: `Schedule: ${scheduleData.schedule || "—"} · Last run: ${scheduleData.last_run || "—"} · Last success: ${scheduleData.last_success || "—"}`,
    });

    const lastRestore = restore.data?.[0];
    next.push({
      label: "آخر تحقق من الاستعادة",
      status: lastRestore?.status === "completed" ? "healthy" : "warning",
      value: lastRestore
        ? lastRestore.status === "completed"
          ? "اكتمل بنجاح"
          : "يحتاج مراجعة"
        : "لا يوجد تحقق مسجل",
      details: lastRestore ? `Mode: ${lastRestore.mode || "—"} · Status: ${lastRestore.status || "—"}` : undefined,
    });

    next.push(
      {
        label: "أخطاء التشغيل خلال آخر 7 أيام",
        status: (errors.count || 0) > 10 ? "error" : (errors.count || 0) > 0 ? "warning" : "healthy",
        value: (errors.count || 0) === 0 ? "لا توجد أخطاء مسجلة" : `${errors.count || 0} خطأ مسجل`,
      },
      {
        label: "طلبات الخدمات المتأخرة",
        status: (pending.count || 0) > 0 ? "warning" : "healthy",
        value: (pending.count || 0) > 0 ? `${pending.count || 0} طلب يحتاج متابعة` : "لا توجد طلبات متأخرة",
      },
      {
        label: "سجل إصدارات المحتوى",
        status: versions.error ? "warning" : "healthy",
        value: versions.error ? "تعذر قراءة السجل" : `${versions.count || 0} إصدار مسجل`,
      }
    );

    const snapshot = migrations.data?.[0];
    next.push(
      {
        label: "لقطة أمان تغييرات قاعدة البيانات",
        status: snapshot ? "healthy" : "error",
        value: snapshot ? "متوفرة" : "غير متوفرة",
        details: snapshot
          ? `Migration key: ${snapshot.migration_key || "—"} · SHA-256: ${snapshot.checksum ? String(snapshot.checksum).slice(0, 16) + "…" : "—"}`
          : "No migration safety snapshot found.",
        technical: true,
      },
      {
        label: "إعداد عنوان خدمة البيانات",
        status: process.env.NEXT_PUBLIC_SUPABASE_URL ? "healthy" : "error",
        value: process.env.NEXT_PUBLIC_SUPABASE_URL ? "موجود" : "مفقود",
        details: "NEXT_PUBLIC_SUPABASE_URL",
        technical: true,
      },
      {
        label: "إعداد مفتاح الاتصال العام",
        status:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            ? "healthy"
            : "error",
        value:
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            ? "موجود"
            : "مفقود",
        details: "Public Supabase key configuration only; secret values are not displayed.",
        technical: true,
      },
      {
        label: "نسخة التطبيق المنشورة",
        status: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? "healthy" : "warning",
        value: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ? "معرّفة" : "غير متاحة محليًا",
        details: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
          ? `Commit SHA: ${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12)}`
          : "Commit SHA unavailable in this environment.",
        technical: true,
      }
    );

    setChecks(next);
    setCheckedAt(new Date().toLocaleString("ar"));
    setLoading(false);
  }

  const primaryChecks = checks.filter((check) => !check.technical);
  const technicalChecks = checks.filter((check) => check.technical);
  const overallStatus = useMemo<HealthStatus>(() => {
    const source = primaryChecks.length ? primaryChecks : checks;
    if (source.some((check) => check.status === "error")) return "error";
    if (source.some((check) => check.status === "warning")) return "warning";
    return "healthy";
  }, [checks, primaryChecks]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-36 text-white md:p-8">
      <section className="mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-black text-cyan-100">
              حالة الخدمات الأساسية
            </span>
            <h1 className="mt-4 text-4xl font-black">حالة النظام</h1>
            <p className="mt-2 text-white/50">آخر تحديث: {checkedAt || "—"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void run()}
              disabled={loading}
              className="rounded-full bg-cyan-600 px-5 py-3 font-black disabled:opacity-50"
            >
              {loading ? "جارٍ التحقق..." : "تحديث الحالة"}
            </button>
            <Link href="/admin" className="rounded-full border border-white/15 px-5 py-3 font-bold">
              لوحة التحكم
            </Link>
          </div>
        </header>

        <section className={`mb-6 rounded-3xl border p-6 ${statusClasses(overallStatus)}`} aria-live="polite">
          <p className="text-sm font-bold text-white/65">الحالة العامة</p>
          <h2 className="mt-2 text-3xl font-black">{statusLabels[overallStatus]}</h2>
          <p className="mt-2 leading-7 text-white/60">
            {overallStatus === "healthy"
              ? "الخدمات الأساسية التي تم فحصها تعمل دون مشكلة ظاهرة."
              : overallStatus === "warning"
                ? "هناك عنصر واحد أو أكثر يحتاج متابعة، لكن النظام ما زال متاحًا."
                : "يوجد خلل في خدمة أساسية ويحتاج إلى مراجعة من المسؤول التقني."}
          </p>
        </section>

        {loading && checks.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/60">
            جارٍ تحميل حالة الخدمات...
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {primaryChecks.map((check) => (
              <article key={check.label} className={`rounded-3xl border p-5 ${statusClasses(check.status)}`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-black">{check.label}</h2>
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs">
                    {statusLabels[check.status]}
                  </span>
                </div>
                <div className="mt-3 text-xl font-black">{check.value}</div>
                {check.details && (
                  <details className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/50">
                    <summary className="cursor-pointer font-bold text-white/70">تفاصيل تقنية</summary>
                    <p className="mt-2 break-all" dir="ltr">{check.details}</p>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}

        {technicalChecks.length > 0 && (
          <details className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <summary className="cursor-pointer text-lg font-black">تفاصيل تقنية للمسؤول</summary>
            <p className="mt-2 text-sm leading-7 text-white/50">
              معلومات تشخيصية مساعدة. لا يتم عرض قيم الأسرار أو مفاتيح الاتصال الخاصة.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {technicalChecks.map((check) => (
                <article key={check.label} className={`rounded-2xl border p-4 ${statusClasses(check.status)}`}>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">{check.label}</h3>
                    <span className="text-xs text-white/60">{statusLabels[check.status]}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold">{check.value}</p>
                  {check.details && <p className="mt-2 break-all text-xs text-white/45" dir="ltr">{check.details}</p>}
                </article>
              ))}
            </div>
          </details>
        )}
      </section>
    </main>
  );
}
