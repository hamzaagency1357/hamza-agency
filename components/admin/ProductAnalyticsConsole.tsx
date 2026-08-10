"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireTenantAdmin } from "@/lib/productExpansion/tenantAccess";

type Kpi = { metric_date: string; metric_key: string; metric_value: number; dimensions: Record<string, unknown>; updated_at: string };
type EventSummary = { provider_type: string; status: string; count: number };

function objectRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)) as T[] : [];
}

export default function ProductAnalyticsConsole() {
  const [tenantId, setTenantId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [providerEvents, setProviderEvents] = useState<EventSummary[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (metricDate = date) => {
    if (!supabase) return;
    setLoading(true);
    const access = await requireTenantAdmin();
    if (!access.authorized || !access.membership) { setMessage("لا تملك صلاحية تحليلات المنتج."); setLoading(false); return; }
    const id = String(access.membership.tenant_id);
    setTenantId(id);
    await adminBoundaryMutation("pr116_component_productanalyticsconsole_rpc_refresh_product_kpis_call", { args: { p_tenant: id, p_metric_date: metricDate } });
    const [kpiResult, eventResult] = await Promise.all([
      supabase.from("product_kpi_daily").select("metric_date,metric_key,metric_value,dimensions,updated_at").eq("tenant_id", id).eq("metric_date", metricDate).order("metric_key"),
      supabase.from("provider_message_events").select("provider_type,status").eq("tenant_id", id).gte("created_at", `${metricDate}T00:00:00.000Z`).lt("created_at", `${metricDate}T23:59:59.999Z`).limit(1000),
    ]);
    setKpis(objectRows<Kpi>(kpiResult.data));
    const counts = new Map<string, number>();
    for (const row of objectRows<{ provider_type: string; status: string }>(eventResult.data)) {
      const key = `${row.provider_type}:${row.status}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    setProviderEvents([...counts].map(([key, count]) => { const [provider_type, status] = key.split(":"); return { provider_type, status, count }; }));
    const firstError = kpiResult.error || eventResult.error;
    if (firstError) setMessage(firstError.message);
    setLoading(false);
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => new Map(kpis.map((item) => [item.metric_key, Number(item.metric_value)])), [kpis]);
  const cards = [
    ["portal.users.active", "مستخدمو البوابات"],
    ["tasks.open", "المهام المفتوحة"],
    ["sla.breached", "تجاوزات SLA"],
    ["marketplace.orders", "طلبات السوق"],
    ["marketplace.order_value", "قيمة الطلبات"],
    ["privacy.open", "طلبات الخصوصية المفتوحة"],
    ["incidents.active", "الحوادث النشطة"],
    ["sessions.suspicious", "جلسات مشبوهة"],
  ] as const;

  function exportCsv() {
    const header = "metric_date,metric_key,metric_value,dimensions,updated_at";
    const body = kpis.map((row) => [row.metric_date, row.metric_key, row.metric_value, JSON.stringify(row.dimensions), row.updated_at].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `hamza-product-kpi-${tenantId}-${date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-10 text-white" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-violet-200">Product Expansion Analytics</p><h1 className="mt-2 text-3xl font-black">مؤشرات التشغيل المتقدمة</h1></div><div className="flex gap-2"><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-black/40 px-3"/><button type="button" onClick={() => void load(date)} className="rounded-xl bg-violet-600 px-4">تحديث</button><button type="button" onClick={exportCsv} className="rounded-xl border border-white/10 px-4">CSV</button></div></div>{message && <p role="status" className="mt-4 rounded-xl bg-red-500/10 p-3 text-red-100">{message}</p>}</header>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([key, label]) => <article key={key} className="rounded-2xl border border-white/10 bg-white/5 p-5"><p className="text-sm text-white/55">{label}</p><strong className="mt-2 block text-3xl">{loading ? "…" : totals.get(key) ?? 0}</strong><span className="mt-2 block text-xs text-violet-200">{key}</span></article>)}</section>
        <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">كل المؤشرات</h2><div className="mt-4 space-y-2">{kpis.map((row) => <div key={`${row.metric_key}-${JSON.stringify(row.dimensions)}`} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><div><strong>{row.metric_key}</strong><p className="text-xs text-white/40">{JSON.stringify(row.dimensions)}</p></div><span className="text-xl font-bold">{row.metric_value}</span></div>)}</div></div><div className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">حالة قنوات المزودين</h2><div className="mt-4 space-y-2">{providerEvents.map((row) => <div key={`${row.provider_type}-${row.status}`} className="flex items-center justify-between rounded-xl border border-white/10 p-3"><span>{row.provider_type} · {row.status}</span><strong>{row.count}</strong></div>)}{!providerEvents.length && <p className="py-8 text-center text-white/45">لا توجد أحداث مزودين لهذا اليوم.</p>}</div></div></section>
      </div>
    </main>
  );
}
