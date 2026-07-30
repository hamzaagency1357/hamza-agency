import { getServerTenantRuntime } from "@/lib/productExpansion/serverTenantRuntime";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Platform Status | HAMZA AGENCY",
  description: "Current HAMZA AGENCY platform and service incident status.",
};

type Incident = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  started_at: string;
  resolved_at: string | null;
};

async function loadIncidents(tenantId: string | null): Promise<Incident[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !tenantId) return [];
  try {
    const query = new URLSearchParams({
      select: "id,title,severity,status,started_at,resolved_at",
      tenant_id: `eq.${tenantId}`,
      order: "started_at.desc",
      limit: "20",
    });
    const response = await fetch(`${url}/rest/v1/incidents?${query}`, {
      cache: "no-store",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return [];
    const data = await response.json() as unknown;
    return Array.isArray(data) ? data.filter((row): row is Incident => Boolean(row) && typeof row === "object" && typeof (row as Incident).id === "string") : [];
  } catch {
    return [];
  }
}

const labels = {
  investigating: "قيد التحقيق",
  identified: "تم تحديد السبب",
  monitoring: "تحت المراقبة",
  resolved: "تم الحل",
} as const;

export default async function StatusPage() {
  const tenant = await getServerTenantRuntime();
  const incidents = await loadIncidents(tenant.id);
  const active = incidents.filter((incident) => incident.status !== "resolved");
  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-28 text-white" dir="rtl">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-7 shadow-2xl">
          <p className="text-sm text-violet-200">{tenant.name}</p>
          <h1 className="mt-2 text-4xl font-black">حالة المنصة والخدمات</h1>
          <div className={`mt-5 rounded-2xl border p-5 ${active.length ? "border-amber-300/30 bg-amber-500/10" : "border-emerald-300/30 bg-emerald-500/10"}`}>
            <p className="text-xl font-bold">{active.length ? "توجد متابعة تشغيلية نشطة" : "جميع الأنظمة تعمل بصورة طبيعية"}</p>
            <p className="mt-1 text-sm text-white/65">لا تعرض هذه الصفحة أي بيانات حسابات أو تفاصيل داخلية أو معلومات شخصية.</p>
          </div>
        </header>
        <div className="space-y-4">
          {incidents.map((incident) => (
            <article key={incident.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{incident.title}</h2>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{labels[incident.status]}</span>
              </div>
              <p className="mt-3 text-sm text-white/60">الخطورة: {incident.severity} · بدأ: {new Date(incident.started_at).toLocaleString("ar")}</p>
            </article>
          ))}
          {!incidents.length && <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/60">لا توجد حوادث تشغيلية منشورة.</div>}
        </div>
      </section>
    </main>
  );
}
