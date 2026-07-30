import { headers } from "next/headers";
import { getServerTenantRuntime } from "@/lib/productExpansion/serverTenantRuntime";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Platform Status | HAMZA AGENCY",
  description: "Current HAMZA AGENCY platform and service incident status.",
};

type IncidentUpdate = {
  status: string;
  message: string;
  createdAt: string;
};

type Incident = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  updates: IncidentUpdate[];
};

type PublicStatus = { status: "operational" | "degraded" | "unknown"; incidents: Incident[] };

function isIncident(value: unknown): value is Incident {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.title === "string" && typeof row.status === "string" && typeof row.startedAt === "string";
}

async function loadIncidents(hostname: string): Promise<PublicStatus> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { status: "unknown", incidents: [] };
  try {
    const response = await fetch(`${url}/rest/v1/rpc/get_public_incident_status`, {
      method: "POST",
      cache: "no-store",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_hostname: hostname }),
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return { status: "unknown", incidents: [] };
    const value = await response.json() as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "unknown", incidents: [] };
    const row = value as Record<string, unknown>;
    return {
      status: row.status === "degraded" || row.status === "operational" ? row.status : "unknown",
      incidents: Array.isArray(row.incidents) ? row.incidents.filter(isIncident).slice(0, 20) : [],
    };
  } catch {
    return { status: "unknown", incidents: [] };
  }
}

const labels = {
  investigating: "قيد التحقيق",
  identified: "تم تحديد السبب",
  monitoring: "تحت المراقبة",
  resolved: "تم الحل",
} as const;

export default async function StatusPage() {
  const requestHeaders = await headers();
  const hostname = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "hamza-agency.com").split(",")[0].trim().toLowerCase();
  const [tenant, publicStatus] = await Promise.all([getServerTenantRuntime(), loadIncidents(hostname)]);
  const active = publicStatus.incidents.filter((incident) => incident.status !== "resolved");
  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-28 text-white" dir="rtl">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-7 shadow-2xl">
          <p className="text-sm text-violet-200">{tenant.name}</p>
          <h1 className="mt-2 text-4xl font-black">حالة المنصة والخدمات</h1>
          <div className={`mt-5 rounded-2xl border p-5 ${active.length ? "border-amber-300/30 bg-amber-500/10" : "border-emerald-300/30 bg-emerald-500/10"}`}>
            <p className="text-xl font-bold">{active.length ? "توجد متابعة تشغيلية نشطة" : publicStatus.status === "unknown" ? "تعذر تحميل سجل الحوادث حالياً" : "جميع الأنظمة تعمل بصورة طبيعية"}</p>
            <p className="mt-1 text-sm text-white/65">لا تعرض هذه الصفحة أي بيانات حسابات أو تفاصيل داخلية أو معلومات شخصية.</p>
          </div>
        </header>
        <div className="space-y-4">
          {publicStatus.incidents.map((incident) => (
            <article key={incident.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{incident.title}</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{labels[incident.status]}</span>
              </div>
              <p className="mt-3 text-sm text-white/60">الخطورة: {incident.severity} · بدأ: {new Date(incident.startedAt).toLocaleString("ar")}</p>
              {incident.updates?.length > 0 && <ol className="mt-4 space-y-2 border-t border-white/10 pt-4">{incident.updates.slice(0, 10).map((update) => <li key={`${update.createdAt}-${update.status}`} className="rounded-xl bg-black/20 p-3"><p>{update.message}</p><time className="mt-1 block text-xs text-white/45">{new Date(update.createdAt).toLocaleString("ar")}</time></li>)}</ol>}
            </article>
          ))}
          {!publicStatus.incidents.length && <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">لا توجد حوادث تشغيلية منشورة.</div>}
        </div>
      </section>
    </main>
  );
}
