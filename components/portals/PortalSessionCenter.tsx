"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";

type SessionRow = { id: string; device_label: string | null; platform: string | null; browser: string | null; last_active_at: string; suspicious: boolean; revoked_at: string | null };
type AlertRow = { id: string; alert_type: string; severity: string; metadata: Record<string, unknown>; acknowledged_at: string | null; created_at: string };

function objectRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)) as T[] : [];
}

export default function PortalSessionCenter({ role }: { role: PortalRole }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.replace(`/portal/login?next=/portal/${role}/sessions`);
    const membership = await supabase.from("tenant_memberships").select("tenant_id").eq("user_id", auth.user.id).eq("role", role).eq("status", "active").limit(1).maybeSingle();
    const nextTenantId = membership.data && typeof membership.data === "object" && !Array.isArray(membership.data) && typeof (membership.data as Record<string, unknown>).tenant_id === "string" ? String((membership.data as Record<string, unknown>).tenant_id) : "";
    if (!nextTenantId) { setMessage("الحساب غير مصرح له بهذه البوابة."); setLoading(false); return; }
    setTenantId(nextTenantId);
    const session = (await supabase.auth.getSession()).data.session;
    if (session) {
      await fetch("/api/product-expansion/sessions/register", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } }).catch(() => undefined);
    }
    const [sessionResult, alertResult] = await Promise.all([
      supabase.from("user_sessions").select("id,device_label,platform,browser,last_active_at,suspicious,revoked_at").eq("tenant_id", nextTenantId).eq("user_id", auth.user.id).order("last_active_at", { ascending: false }).limit(100),
      supabase.from("security_alerts").select("id,alert_type,severity,metadata,acknowledged_at,created_at").eq("tenant_id", nextTenantId).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50),
    ]);
    setSessions(objectRows<SessionRow>(sessionResult.data));
    setAlerts(objectRows<AlertRow>(alertResult.data));
    setLoading(false);
  }, [role, router]);

  useEffect(() => { void load(); }, [load]);

  async function revokeOne(id: string) {
    if (!supabase) return;
    const result = await supabase.rpc("revoke_own_platform_session", { p_session: id, p_reason: "user_requested" });
    setMessage(result.error ? "تعذر إلغاء الجلسة." : "تم إلغاء الجلسة المحددة.");
    if (!result.error) await load();
  }

  async function revokeAll() {
    if (!supabase || !tenantId) return;
    const result = await supabase.rpc("revoke_all_own_platform_sessions", { p_tenant: tenantId, p_reason: "user_requested_all" });
    setMessage(result.error ? "تعذر إلغاء الجلسات." : `تم إلغاء ${Number(result.data ?? 0)} جلسة.`);
    if (!result.error) await load();
  }

  async function acknowledge(id: string) {
    if (!supabase) return;
    const result = await supabase.from("security_alerts").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
    if (!result.error) await load();
  }

  if (loading) return <main className="min-h-screen p-28 text-center text-white">جارٍ تسجيل الجهاز وتحميل الجلسات…</main>;
  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir="rtl">
      <section className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-violet-300/20 bg-white/5 p-6 shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-black">الأجهزة والجلسات</h1><p className="mt-2 text-white/60">تُخزّن معلومات تقنية محدودة فقط، دون مراقبة خفية أو تتبع محتوى الجهاز.</p></div><button type="button" onClick={() => void revokeAll()} className="min-h-11 rounded-xl border border-red-300/30 px-4 text-red-100">إلغاء جميع الجلسات</button></header>
        {message && <p role="status" className="rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}
        <div className="space-y-3">{sessions.map((session) => <article key={session.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${session.suspicious ? "border-red-300/30 bg-red-500/8" : "border-white/10"}`}><div><strong>{session.device_label || session.platform || "جهاز"}</strong><p className="mt-1 text-sm text-white/55">{session.browser || "—"} · {new Date(session.last_active_at).toLocaleString("ar")}{session.suspicious ? " · نشاط يحتاج مراجعة" : ""}</p></div><button type="button" disabled={Boolean(session.revoked_at)} onClick={() => void revokeOne(session.id)} className="min-h-11 rounded-xl border border-red-300/30 px-4 disabled:opacity-40">{session.revoked_at ? "ملغاة" : "إلغاء"}</button></article>)}</div>
        <section><h2 className="text-2xl font-bold">تنبيهات الأمان</h2><div className="mt-3 space-y-2">{alerts.map((alert) => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><strong>{alert.alert_type}</strong><p className="text-sm text-white/50">{alert.severity} · {new Date(alert.created_at).toLocaleString("ar")}</p></div>{!alert.acknowledged_at && <button type="button" onClick={() => void acknowledge(alert.id)} className="min-h-10 rounded-xl border border-white/10 px-4">تمت المراجعة</button>}</div>)}</div></section>
      </section>
    </main>
  );
}
