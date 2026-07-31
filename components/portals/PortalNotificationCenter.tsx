"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";
import { fetchPortalAccess, isPortalRole } from "@/lib/productExpansion/portalAccessClient";
import { portalApi } from "@/lib/productExpansion/portalApiClient";

type Locale = "ar" | "en" | "tr";
type Preference = { channel: string; event_key: string; enabled: boolean };
type Consent = { channel: string; opted_in: boolean; recorded_at: string; withdrawn_at: string | null };
const channels = ["in_app", "email", "push", "whatsapp"] as const;
const events = ["task.assigned", "request.status", "order.status", "security.alert", "incident.update"] as const;
const communicationChannels = ["email", "push", "whatsapp", "marketing"] as const;

const copy = {
  ar: { loading: "جارٍ تحميل تفضيلات التواصل…", denied: "الحساب غير مصرح له بهذه البوابة.", title: "الإشعارات وموافقات التواصل", subtitle: "لا تُرسل رسائل WhatsApp أو تسويق دون موافقة صريحة.", event: "الحدث", enabled: "مفعّل", disabled: "معطّل", active: "موافقة فعالة", inactive: "غير موافق", updated: "تم تحديث الإعداد.", failed: "تعذر تحديث الإعداد.", push: "Web Push", pushNote: "لا يظهر محتوى حساس على شاشة القفل افتراضياً.", enablePush: "تفعيل Push", disablePush: "إلغاء Push" },
  en: { loading: "Loading communication preferences…", denied: "This account is not authorized for this portal.", title: "Notifications and communication consent", subtitle: "WhatsApp and marketing messages require explicit consent.", event: "Event", enabled: "Enabled", disabled: "Disabled", active: "Consent active", inactive: "No consent", updated: "Setting updated.", failed: "Setting could not be updated.", push: "Web Push", pushNote: "Sensitive content is hidden from lock screens by default.", enablePush: "Enable Push", disablePush: "Disable Push" },
  tr: { loading: "İletişim tercihleri yükleniyor…", denied: "Bu hesap bu portal için yetkili değil.", title: "Bildirimler ve iletişim onayı", subtitle: "WhatsApp ve pazarlama mesajları açık onay gerektirir.", event: "Olay", enabled: "Açık", disabled: "Kapalı", active: "Onay etkin", inactive: "Onay yok", updated: "Ayar güncellendi.", failed: "Ayar güncellenemedi.", push: "Web Push", pushNote: "Hassas içerik varsayılan olarak kilit ekranında gösterilmez.", enablePush: "Push'ı aç", disablePush: "Push'ı kapat" },
} satisfies Record<Locale, Record<string, string>>;

function currentLocale(): Locale {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang === "en" || document.documentElement.lang === "tr" ? document.documentElement.lang : "ar";
}

function objectRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? value.filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)) as T[] : [];
}

function base64UrlToUint8Array(base64Url: string) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export default function PortalNotificationCenter({ role }: { role: PortalRole }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ar");
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [pushState, setPushState] = useState<"unsupported" | "disabled" | "available" | "active">("disabled");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const strings = copy[locale];

  const load = useCallback(async () => {
    if (!supabase) return router.replace(`/portal/login?next=/portal/${role}/notifications`);
    setLocale(currentLocale());
    const access = await fetchPortalAccess(supabase);
    if (!access.ok) {
      if (access.code === "authentication_required") return router.replace(`/portal/login?next=/portal/${role}/notifications`);
      setState("denied"); return;
    }
    if (!isPortalRole(access.role)) return router.replace("/admin");
    if (access.role !== role) return router.replace(`/portal/${access.role}/notifications`);
    const result = await portalApi<{ preferences?: unknown; consents?: unknown }>(supabase, role, "notifications");
    if (!result.ok) { setState(result.status === 403 ? "denied" : "error"); return; }
    setPreferences(objectRows<Preference>(result.data?.preferences));
    setConsents(objectRows<Consent>(result.data?.consents));
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) setPushState("unsupported");
    else {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      const subscription = await registration?.pushManager.getSubscription().catch(() => null);
      setPushState(subscription ? "active" : process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ? "available" : "disabled");
    }
    setState("ready");
  }, [role, router]);

  useEffect(() => { void load(); }, [load]);
  const matrix = useMemo(() => new Map(preferences.map((item) => [`${item.channel}:${item.event_key}`, item.enabled])), [preferences]);
  const consentMap = useMemo(() => new Map(consents.map((item) => [item.channel, item.opted_in && !item.withdrawn_at])), [consents]);

  async function togglePreference(channel: typeof channels[number], eventKey: typeof events[number]) {
    if (!supabase) return;
    const enabled = !(matrix.get(`${channel}:${eventKey}`) ?? true);
    const result = await portalApi(supabase, role, "preference", { method: "PATCH", body: JSON.stringify({ channel, event_key: eventKey, enabled }) });
    if (!result.ok) return setMessage(strings.failed);
    setPreferences((rows) => [...rows.filter((item) => item.channel !== channel || item.event_key !== eventKey), { channel, event_key: eventKey, enabled }]);
    setMessage(strings.updated);
  }

  async function toggleConsent(channel: typeof communicationChannels[number]) {
    if (!supabase) return;
    const optedIn = !(consentMap.get(channel) ?? false);
    const result = await portalApi(supabase, role, "consent", { method: "PATCH", body: JSON.stringify({ channel, opted_in: optedIn }) });
    if (!result.ok) return setMessage(strings.failed);
    const now = new Date().toISOString();
    setConsents((rows) => [...rows.filter((item) => item.channel !== channel), { channel, opted_in: optedIn, recorded_at: now, withdrawn_at: optedIn ? null : now }]);
    setMessage(strings.updated);
  }

  async function enablePush() {
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || "";
    if (!supabase || !publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) return setMessage(strings.failed);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setMessage(strings.failed);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToUint8Array(publicKey) });
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return setMessage(strings.failed);
    const response = await fetch("/api/product-expansion/push/subscription", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action: "subscribe", subscription: subscription.toJSON() }) });
    if (!response.ok) { await subscription.unsubscribe().catch(() => false); return setMessage(strings.failed); }
    setPushState("active"); setMessage(strings.updated);
  }

  async function disablePush() {
    if (!supabase || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return setPushState("available");
    const session = (await supabase.auth.getSession()).data.session;
    if (session) await fetch("/api/product-expansion/push/subscription", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ action: "unsubscribe", subscription: subscription.toJSON() }) }).catch(() => undefined);
    await subscription.unsubscribe(); setPushState(process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ? "available" : "disabled"); setMessage(strings.updated);
  }

  if (state === "loading") return <main className="min-h-screen p-28 text-center text-white">{strings.loading}</main>;
  if (state === "denied") return <main className="min-h-screen p-28 text-center text-red-100">{strings.denied}</main>;
  if (state === "error") return <main className="min-h-screen p-28 text-center text-red-100">{strings.failed}</main>;

  return <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir={locale === "ar" ? "rtl" : "ltr"}><section className="mx-auto max-w-6xl space-y-6 rounded-3xl border border-violet-300/20 bg-white/5 p-6 shadow-2xl"><header><h1 className="text-3xl font-black">{strings.title}</h1><p className="mt-2 text-white/60">{strings.subtitle}</p></header>{message && <p role="status" className="rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{communicationChannels.map((channel) => { const enabled = consentMap.get(channel) ?? false; return <button key={channel} type="button" onClick={() => void toggleConsent(channel)} className={`min-h-16 rounded-2xl border p-4 text-start ${enabled ? "border-emerald-300/30 bg-emerald-500/10" : "border-white/10 bg-black/25"}`}><strong>{channel}</strong><span className="block text-xs text-white/50">{enabled ? strings.active : strings.inactive}</span></button>; })}</div><div className="rounded-2xl border border-white/10 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{strings.push}</h2><p className="text-sm text-white/55">{strings.pushNote}</p></div>{pushState === "active" ? <button type="button" onClick={() => void disablePush()} className="min-h-11 rounded-xl border border-red-300/30 px-4">{strings.disablePush}</button> : <button type="button" disabled={pushState === "unsupported"} onClick={() => void enablePush()} className="min-h-11 rounded-xl bg-violet-600 px-4 disabled:opacity-40">{strings.enablePush}</button>}</div></div><div className="overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr><th className="p-3 text-start">{strings.event}</th>{channels.map((channel) => <th key={channel} className="p-3">{channel}</th>)}</tr></thead><tbody>{events.map((eventKey) => <tr key={eventKey} className="border-t border-white/10"><td className="p-3">{eventKey}</td>{channels.map((channel) => { const enabled = matrix.get(`${channel}:${eventKey}`) ?? true; return <td key={channel} className="p-3 text-center"><button type="button" onClick={() => void togglePreference(channel, eventKey)} className={`min-h-10 rounded-lg px-3 ${enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/40"}`}>{enabled ? strings.enabled : strings.disabled}</button></td>; })}</tr>)}</tbody></table></div></section></main>;
}
