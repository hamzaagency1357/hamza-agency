"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";

type Preference = { channel: string; event_key: string; enabled: boolean };
type Consent = { channel: string; opted_in: boolean; recorded_at: string; withdrawn_at: string | null };
const channels = ["in_app", "email", "push", "whatsapp"] as const;
const events = ["task.assigned", "request.status", "order.status", "security.alert", "incident.update"] as const;
const communicationChannels = ["email", "push", "whatsapp", "marketing"] as const;

function objectRows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function PortalNotificationCenter({ role }: { role: PortalRole }) {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [userId, setUserId] = useState("");
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [pushState, setPushState] = useState<"unsupported" | "disabled" | "available" | "active">("disabled");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.replace(`/portal/login?next=/portal/${role}/notifications`);
    const membership = await supabase.from("tenant_memberships").select("tenant_id").eq("user_id", auth.user.id).eq("role", role).eq("status", "active").limit(1).maybeSingle();
    const membershipRow = membership.data && typeof membership.data === "object" && !Array.isArray(membership.data) ? membership.data as Record<string, unknown> : null;
    const nextTenantId = typeof membershipRow?.tenant_id === "string" ? membershipRow.tenant_id : "";
    if (!nextTenantId) { setMessage("الحساب غير مصرح له بهذه البوابة."); setLoading(false); return; }
    setTenantId(nextTenantId); setUserId(auth.user.id);
    const [preferenceResult, consentResult] = await Promise.all([
      supabase.from("portal_notification_preferences").select("channel,event_key,enabled").eq("tenant_id", nextTenantId).eq("user_id", auth.user.id),
      supabase.from("communication_consents").select("channel,opted_in,recorded_at,withdrawn_at").eq("tenant_id", nextTenantId).eq("user_id", auth.user.id),
    ]);
    setPreferences(objectRows(preferenceResult.data) as unknown as Preference[]);
    setConsents(objectRows(consentResult.data) as unknown as Consent[]);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) setPushState("unsupported");
    else {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const subscription = await registration?.pushManager.getSubscription().catch(() => null);
      setPushState(subscription ? "active" : process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ? "available" : "disabled");
    }
    setLoading(false);
  }, [role, router]);

  useEffect(() => { void load(); }, [load]);

  const matrix = useMemo(() => new Map(preferences.map((item) => [`${item.channel}:${item.event_key}`, item.enabled])), [preferences]);
  const consentMap = useMemo(() => new Map(consents.map((item) => [item.channel, item.opted_in && !item.withdrawn_at])), [consents]);

  async function togglePreference(channel: typeof channels[number], eventKey: typeof events[number]) {
    if (!supabase || !tenantId || !userId) return;
    const next = !(matrix.get(`${channel}:${eventKey}`) ?? true);
    const result = await supabase.from("portal_notification_preferences").upsert({ tenant_id: tenantId, user_id: userId, channel, event_key: eventKey, enabled: next, updated_at: new Date().toISOString() });
    if (result.error) return setMessage("تعذر تحديث التفضيل.");
    setPreferences((rows) => [...rows.filter((item) => item.channel !== channel || item.event_key !== eventKey), { channel, event_key: eventKey, enabled: next }]);
    setMessage("تم تحديث تفضيلات الإشعارات.");
  }

  async function toggleConsent(channel: typeof communicationChannels[number]) {
    if (!supabase || !tenantId || !userId) return;
    const next = !(consentMap.get(channel) ?? false);
    const now = new Date().toISOString();
    const result = await supabase.from("communication_consents").upsert({ tenant_id: tenantId, user_id: userId, channel, opted_in: next, source: "portal_privacy_controls", recorded_at: now, withdrawn_at: next ? null : now });
    if (result.error) return setMessage("تعذر تحديث موافقة التواصل.");
    setConsents((rows) => [...rows.filter((item) => item.channel !== channel), { channel, opted_in: next, recorded_at: now, withdrawn_at: next ? null : now }]);
    setMessage(next ? "تم تسجيل الموافقة." : "تم سحب الموافقة.");
  }

  async function enablePush() {
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || "";
    if (!supabase || !publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return setMessage("إرسال Web Push غير مفعّل حسابياً بعد.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setMessage("لم يتم منح إذن الإشعارات.");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(publicKey) });
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return setMessage("انتهت الجلسة.");
    const response = await fetch("/api/product-expansion/push/subscription", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action: "subscribe", subscription: subscription.toJSON() }) });
    const body = await response.json() as { ok?: boolean; code?: string };
    if (!response.ok || !body.ok) { await subscription.unsubscribe().catch(() => false); return setMessage(body.code === "push_subscription_storage_disabled" ? "تخزين اشتراكات Push غير مفعّل حسابياً بعد." : "تعذر تفعيل Push."); }
    setPushState("active"); setMessage("تم تفعيل Web Push لهذا الجهاز.");
  }

  async function disablePush() {
    if (!supabase || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) { setPushState("available"); return; }
    const session = (await supabase.auth.getSession()).data.session;
    if (session) await fetch("/api/product-expansion/push/subscription", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action: "unsubscribe", subscription: subscription.toJSON() }) }).catch(() => undefined);
    await subscription.unsubscribe(); setPushState(process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ? "available" : "disabled"); setMessage("تم إلغاء اشتراك Push على هذا الجهاز.");
  }

  if (loading) return <main className="min-h-screen p-28 text-center text-white">جارٍ تحميل تفضيلات التواصل…</main>;
  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir="rtl">
      <section className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-violet-300/20 bg-white/5 p-6 shadow-2xl">
        <header><h1 className="text-3xl font-black">الإشعارات وموافقات التواصل</h1><p className="mt-2 text-white/60">لا تُرسل رسائل WhatsApp أو تسويق دون موافقة صريحة. يمكنك سحب الموافقة في أي وقت.</p></header>
        {message && <p role="status" className="rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{communicationChannels.map((channel) => { const enabled = consentMap.get(channel) ?? false; return <button key={channel} type="button" onClick={() => void toggleConsent(channel)} className={`min-h-16 rounded-2xl border p-4 text-right ${enabled ? "border-emerald-300/30 bg-emerald-500/10" : "border-white/10 bg-black/25"}`}><strong>{channel}</strong><span className="block text-xs text-white/50">{enabled ? "موافقة فعالة" : "غير موافق"}</span></button>; })}</div>
        <div className="rounded-2xl border border-white/10 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Web Push</h2><p className="text-sm text-white/55">لا يظهر محتوى حساس على شاشة القفل افتراضياً.</p></div>{pushState === "active" ? <button type="button" onClick={() => void disablePush()} className="min-h-11 rounded-xl border border-red-300/30 px-4">إلغاء Push</button> : <button type="button" disabled={pushState === "unsupported"} onClick={() => void enablePush()} className="min-h-11 rounded-xl bg-violet-600 px-4 disabled:opacity-40">تفعيل Push</button>}</div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr><th className="p-3 text-right">الحدث</th>{channels.map((channel) => <th key={channel} className="p-3">{channel}</th>)}</tr></thead><tbody>{events.map((eventKey) => <tr key={eventKey} className="border-t border-white/10"><td className="p-3">{eventKey}</td>{channels.map((channel) => { const enabled = matrix.get(`${channel}:${eventKey}`) ?? true; return <td key={channel} className="p-3 text-center"><button type="button" onClick={() => void togglePreference(channel, eventKey)} className={`min-h-10 rounded-lg px-3 ${enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/40"}`}>{enabled ? "مفعّل" : "معطّل"}</button></td>; })}</tr>)}</tbody></table></div>
      </section>
    </main>
  );
}
