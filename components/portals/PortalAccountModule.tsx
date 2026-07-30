"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";

type Membership = { tenant_id: string; role: PortalRole; status: string };
type Profile = { user_id: string; display_name: string | null; phone: string | null; locale: "ar" | "en" | "tr"; status: string; marketing_opt_in: boolean; ai_opt_out: boolean };
type Session = { id: string; device_label: string | null; platform: string | null; browser: string | null; last_active_at: string; suspicious: boolean; revoked_at: string | null };
type PrivacyRequest = { id: string; request_type: string; status: string; created_at: string; due_at: string | null };
type Preference = { channel: string; event_key: string; enabled: boolean };

const requestTypes = ["access", "download", "correction", "deletion", "consent_withdrawal"] as const;
const channels = ["in_app", "email", "push", "whatsapp"] as const;
const events = ["task.assigned", "request.status", "order.status", "security.alert", "incident.update"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export default function PortalAccountModule({ role, moduleKey }: { role: PortalRole; moduleKey: "profile" | "privacy" | "sessions" | "notifications" }) {
  const router = useRouter();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return setState("denied");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return router.replace(`/portal/login?next=/portal/${role}/${moduleKey}`);
    const membershipResult = await supabase.from("tenant_memberships").select("tenant_id,role,status").eq("user_id", auth.user.id).eq("role", role).eq("status", "active").limit(1).maybeSingle();
    const row = isObject(membershipResult.data) ? membershipResult.data as unknown as Membership : null;
    if (!row) return setState("denied");
    setMembership(row);
    if (moduleKey === "profile") {
      const result = await supabase.from("portal_profiles").select("user_id,display_name,phone,locale,status,marketing_opt_in,ai_opt_out").eq("user_id", auth.user.id).maybeSingle();
      if (isObject(result.data)) setProfile(result.data as unknown as Profile);
      else setProfile({ user_id: auth.user.id, display_name: auth.user.email ?? "", phone: null, locale: "ar", status: "active", marketing_opt_in: false, ai_opt_out: false });
    }
    if (moduleKey === "sessions") {
      const result = await supabase.from("user_sessions").select("id,device_label,platform,browser,last_active_at,suspicious,revoked_at").eq("tenant_id", row.tenant_id).eq("user_id", auth.user.id).order("last_active_at", { ascending: false }).limit(50);
      setSessions(Array.isArray(result.data) ? result.data.filter(isObject) as unknown as Session[] : []);
    }
    if (moduleKey === "privacy") {
      const result = await supabase.from("privacy_requests").select("id,request_type,status,created_at,due_at").eq("tenant_id", row.tenant_id).eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(50);
      setRequests(Array.isArray(result.data) ? result.data.filter(isObject) as unknown as PrivacyRequest[] : []);
    }
    if (moduleKey === "notifications") {
      const result = await supabase.from("portal_notification_preferences").select("channel,event_key,enabled").eq("tenant_id", row.tenant_id).eq("user_id", auth.user.id);
      setPreferences(Array.isArray(result.data) ? result.data.filter(isObject) as unknown as Preference[] : []);
    }
    setState("ready");
  }, [moduleKey, role, router]);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile() {
    if (!supabase || !profile) return;
    setMessage("");
    const result = await supabase.from("portal_profiles").upsert({ ...profile, updated_at: new Date().toISOString() });
    setMessage(result.error ? "تعذر حفظ الملف الشخصي." : "تم حفظ الملف الشخصي.");
  }

  async function createPrivacyRequest(type: typeof requestTypes[number]) {
    if (!supabase || !membership || !profile) return;
    setMessage("");
    const result = await supabase.from("privacy_requests").insert({ tenant_id: membership.tenant_id, user_id: profile.user_id, request_type: type, status: "submitted", details: {}, due_at: new Date(Date.now() + 30 * 86_400_000).toISOString() });
    setMessage(result.error ? "تعذر إرسال طلب الخصوصية." : "تم إرسال طلب الخصوصية وسيظهر في قائمة الإدارة.");
    if (!result.error) await load();
  }

  async function revokeSession(id: string) {
    if (!supabase) return;
    const result = await supabase.rpc("revoke_own_platform_session", { p_session: id, p_reason: "user_requested" });
    setMessage(result.error ? "تعذر إلغاء الجلسة." : "تم إلغاء الجلسة المحددة.");
    if (!result.error) await load();
  }

  async function togglePreference(channel: typeof channels[number], eventKey: typeof events[number]) {
    if (!supabase || !membership) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const current = preferences.find((item) => item.channel === channel && item.event_key === eventKey)?.enabled ?? true;
    const result = await supabase.from("portal_notification_preferences").upsert({ tenant_id: membership.tenant_id, user_id: auth.user.id, channel, event_key: eventKey, enabled: !current, updated_at: new Date().toISOString() });
    if (!result.error) setPreferences((rows) => [...rows.filter((item) => item.channel !== channel || item.event_key !== eventKey), { channel, event_key: eventKey, enabled: !current }]);
    setMessage(result.error ? "تعذر تحديث التفضيل." : "تم تحديث تفضيلات الإشعارات.");
  }

  if (state === "loading") return <main className="min-h-screen p-28 text-center text-white">جارٍ التحقق من الحساب…</main>;
  if (state === "denied") return <main className="min-h-screen p-28 text-center text-red-100">الحساب غير مصرح له بهذه البوابة.</main>;

  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir="rtl">
      <section className="mx-auto max-w-5xl rounded-3xl border border-violet-300/20 bg-white/5 p-6 shadow-2xl">
        <h1 className="text-3xl font-black">{moduleKey === "profile" ? "الملف الشخصي" : moduleKey === "privacy" ? "مركز الخصوصية" : moduleKey === "sessions" ? "الأجهزة والجلسات" : "تفضيلات الإشعارات"}</h1>
        {message && <p role="status" className="mt-4 rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}

        {moduleKey === "profile" && profile && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label>الاسم المعروض<input value={profile.display_name ?? ""} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4" /></label>
            <label>رقم التواصل<input value={profile.phone ?? ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4" /></label>
            <label>اللغة<select value={profile.locale} onChange={(event) => setProfile({ ...profile, locale: event.target.value as Profile["locale"] })} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-black/70 px-4"><option value="ar">العربية</option><option value="en">English</option><option value="tr">Türkçe</option></select></label>
            <label className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-4">عدم استخدام الذكاء الاصطناعي<input type="checkbox" checked={profile.ai_opt_out} onChange={(event) => setProfile({ ...profile, ai_opt_out: event.target.checked })} /></label>
            <label className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-4">رسائل تسويقية<input type="checkbox" checked={profile.marketing_opt_in} onChange={(event) => setProfile({ ...profile, marketing_opt_in: event.target.checked })} /></label>
            <button type="button" onClick={() => void saveProfile()} className="min-h-12 rounded-xl bg-violet-600 px-5 font-bold">حفظ الملف</button>
          </div>
        )}

        {moduleKey === "privacy" && (
          <div className="mt-6 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{requestTypes.map((type) => <button key={type} type="button" onClick={() => void createPrivacyRequest(type)} className="min-h-12 rounded-xl border border-white/10 bg-black/30 px-4">{type}</button>)}</div>
            <div className="space-y-3">{requests.map((request) => <div key={request.id} className="rounded-xl border border-white/10 p-4"><strong>{request.request_type}</strong><span className="mx-3 text-white/50">{request.status}</span><time className="text-sm text-white/50">{new Date(request.created_at).toLocaleString("ar")}</time></div>)}</div>
          </div>
        )}

        {moduleKey === "sessions" && <div className="mt-6 space-y-3">{sessions.map((session) => <article key={session.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-4"><div><strong>{session.device_label || session.platform || "جهاز"}</strong><p className="mt-1 text-sm text-white/55">{session.browser || "—"} · {new Date(session.last_active_at).toLocaleString("ar")}{session.suspicious ? " · نشاط مشبوه" : ""}</p></div><button type="button" disabled={Boolean(session.revoked_at)} onClick={() => void revokeSession(session.id)} className="min-h-11 rounded-xl border border-red-300/30 px-4 text-red-100 disabled:opacity-40">{session.revoked_at ? "ملغاة" : "إلغاء الجلسة"}</button></article>)}</div>}

        {moduleKey === "notifications" && <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px]"><thead><tr><th className="p-3 text-right">الحدث</th>{channels.map((channel) => <th key={channel} className="p-3">{channel}</th>)}</tr></thead><tbody>{events.map((eventKey) => <tr key={eventKey} className="border-t border-white/10"><td className="p-3">{eventKey}</td>{channels.map((channel) => { const enabled = preferences.find((item) => item.channel === channel && item.event_key === eventKey)?.enabled ?? true; return <td key={channel} className="p-3 text-center"><button type="button" onClick={() => void togglePreference(channel, eventKey)} className={`min-h-10 rounded-lg px-3 ${enabled ? "bg-emerald-500/20 text-emerald-200" : "bg-white/5 text-white/40"}`}>{enabled ? "مفعّل" : "معطّل"}</button></td>; })}</tr>)}</tbody></table></div>}
      </section>
    </main>
  );
}
