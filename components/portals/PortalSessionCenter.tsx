"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";
import { fetchPortalAccess, isPortalRole } from "@/lib/productExpansion/portalAccessClient";
import { portalApi } from "@/lib/productExpansion/portalApiClient";

type Locale = "ar" | "en" | "tr";
type SessionRow = { id: string; device_label: string | null; platform: string | null; browser: string | null; last_active_at: string; suspicious: boolean; revoked_at: string | null };
type AlertRow = { id: string; alert_type: string; severity: string; metadata: Record<string, unknown>; acknowledged_at: string | null; created_at: string };
const copy = {
  ar: { loading: "جارٍ تسجيل الجهاز وتحميل الجلسات…", denied: "الحساب غير مصرح له بهذه البوابة.", failed: "تعذر تنفيذ العملية.", title: "الأجهزة والجلسات", subtitle: "تُخزّن معلومات تقنية محدودة فقط، دون مراقبة خفية.", all: "إلغاء جميع الجلسات", device: "جهاز", suspicious: "نشاط يحتاج مراجعة", revoked: "ملغاة", revoke: "إلغاء", alerts: "تنبيهات الأمان", acknowledge: "تمت المراجعة", empty: "لا توجد جلسات مسجلة.", updated: "تم تحديث حالة الجلسات." },
  en: { loading: "Registering device and loading sessions…", denied: "This account is not authorized for this portal.", failed: "The operation could not be completed.", title: "Devices and sessions", subtitle: "Only limited technical data is stored, without hidden monitoring.", all: "Revoke all sessions", device: "Device", suspicious: "Activity needs review", revoked: "Revoked", revoke: "Revoke", alerts: "Security alerts", acknowledge: "Reviewed", empty: "No sessions recorded.", updated: "Session status updated." },
  tr: { loading: "Cihaz kaydediliyor ve oturumlar yükleniyor…", denied: "Bu hesap bu portal için yetkili değil.", failed: "İşlem tamamlanamadı.", title: "Cihazlar ve oturumlar", subtitle: "Gizli izleme olmadan yalnızca sınırlı teknik veriler saklanır.", all: "Tüm oturumları iptal et", device: "Cihaz", suspicious: "İncelenmesi gereken etkinlik", revoked: "İptal edildi", revoke: "İptal et", alerts: "Güvenlik uyarıları", acknowledge: "İncelendi", empty: "Kayıtlı oturum yok.", updated: "Oturum durumu güncellendi." },
} satisfies Record<Locale, Record<string, string>>;

function currentLocale(): Locale {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang === "en" || document.documentElement.lang === "tr" ? document.documentElement.lang : "ar";
}
function objectRows<T>(value: unknown): T[] { return Array.isArray(value) ? value.filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)) as T[] : []; }

export default function PortalSessionCenter({ role }: { role: PortalRole }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ar");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const strings = copy[locale];

  const load = useCallback(async () => {
    if (!supabase) return router.replace(`/portal/login?next=/portal/${role}/sessions`);
    setLocale(currentLocale());
    const access = await fetchPortalAccess(supabase);
    if (!access.ok) {
      if (access.code === "authentication_required") return router.replace(`/portal/login?next=/portal/${role}/sessions`);
      setState("denied"); return;
    }
    if (!isPortalRole(access.role)) return router.replace("/admin");
    if (access.role !== role) return router.replace(`/portal/${access.role}/sessions`);
    const result = await portalApi<{ sessions?: unknown; alerts?: unknown }>(supabase, role, "sessions");
    if (!result.ok) { setState(result.status === 403 ? "denied" : "error"); return; }
    setSessions(objectRows<SessionRow>(result.data?.sessions));
    setAlerts(objectRows<AlertRow>(result.data?.alerts));
    setState("ready");
  }, [role, router]);

  useEffect(() => { void load(); }, [load]);

  async function revokeOne(id: string) {
    if (!supabase) return;
    const result = await portalApi(supabase, role, "revoke-session", { method: "POST", body: JSON.stringify({ id }) });
    setMessage(result.ok ? strings.updated : strings.failed);
    if (result.ok) await load();
  }
  async function revokeAll() {
    if (!supabase) return;
    const result = await portalApi(supabase, role, "revoke-all-sessions", { method: "POST", body: "{}" });
    setMessage(result.ok ? strings.updated : strings.failed);
    if (result.ok) await load();
  }
  async function acknowledge(id: string) {
    if (!supabase) return;
    const result = await portalApi(supabase, role, "alert", { method: "PATCH", body: JSON.stringify({ id }) });
    setMessage(result.ok ? strings.updated : strings.failed);
    if (result.ok) await load();
  }

  if (state === "loading") return <main className="min-h-screen p-28 text-center text-white">{strings.loading}</main>;
  if (state === "denied") return <main className="min-h-screen p-28 text-center text-red-100">{strings.denied}</main>;
  if (state === "error") return <main className="min-h-screen p-28 text-center text-red-100">{strings.failed}</main>;

  return <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir={locale === "ar" ? "rtl" : "ltr"}><section className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-violet-300/20 bg-white/5 p-6 shadow-2xl"><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-black">{strings.title}</h1><p className="mt-2 text-white/60">{strings.subtitle}</p></div><button type="button" onClick={() => void revokeAll()} className="min-h-11 rounded-xl border border-red-300/30 px-4 text-red-100">{strings.all}</button></header>{message && <p role="status" className="rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}<div className="space-y-3">{sessions.map((session) => <article key={session.id} className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${session.suspicious ? "border-red-300/30 bg-red-500/8" : "border-white/10"}`}><div><strong>{session.device_label || session.platform || strings.device}</strong><p className="mt-1 text-sm text-white/55">{session.browser || "—"} · {new Date(session.last_active_at).toLocaleString(locale)}{session.suspicious ? ` · ${strings.suspicious}` : ""}</p></div><button type="button" disabled={Boolean(session.revoked_at)} onClick={() => void revokeOne(session.id)} className="min-h-11 rounded-xl border border-red-300/30 px-4 disabled:opacity-40">{session.revoked_at ? strings.revoked : strings.revoke}</button></article>)}{sessions.length === 0 && <p className="py-8 text-center text-white/50">{strings.empty}</p>}</div><section><h2 className="text-2xl font-bold">{strings.alerts}</h2><div className="mt-3 space-y-2">{alerts.map((alert) => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><strong>{alert.alert_type}</strong><p className="text-sm text-white/50">{alert.severity} · {new Date(alert.created_at).toLocaleString(locale)}</p></div>{!alert.acknowledged_at && <button type="button" onClick={() => void acknowledge(alert.id)} className="min-h-10 rounded-xl border border-white/10 px-4">{strings.acknowledge}</button>}</div>)}</div></section></section></main>;
}
