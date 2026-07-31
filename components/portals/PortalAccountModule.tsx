"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";
import { fetchPortalAccess, isPortalRole } from "@/lib/productExpansion/portalAccessClient";
import { portalApi } from "@/lib/productExpansion/portalApiClient";

type Locale = "ar" | "en" | "tr";
type Profile = { user_id: string; display_name: string | null; phone: string | null; locale: Locale; status: string; marketing_opt_in: boolean; ai_opt_out: boolean };
type PrivacyRequest = { id: string; request_type: string; status: string; created_at: string; due_at: string | null };
const requestTypes = ["access", "download", "correction", "deletion", "consent_withdrawal"] as const;

const text = {
  ar: { loading: "جارٍ التحقق من الحساب…", denied: "الحساب غير مصرح له بهذه البوابة.", profile: "الملف الشخصي", privacy: "مركز الخصوصية", name: "الاسم المعروض", phone: "رقم التواصل", language: "اللغة", ai: "عدم استخدام الذكاء الاصطناعي", marketing: "رسائل تسويقية", save: "حفظ الملف", saved: "تم حفظ الملف الشخصي.", failed: "تعذر تنفيذ العملية.", empty: "لا توجد طلبات خصوصية.", submitted: "تم إرسال طلب الخصوصية." },
  en: { loading: "Verifying your account…", denied: "This account is not authorized for this portal.", profile: "Profile", privacy: "Privacy center", name: "Display name", phone: "Contact number", language: "Language", ai: "Opt out of AI use", marketing: "Marketing messages", save: "Save profile", saved: "Profile saved.", failed: "The operation could not be completed.", empty: "No privacy requests.", submitted: "Privacy request submitted." },
  tr: { loading: "Hesabınız doğrulanıyor…", denied: "Bu hesap bu portal için yetkili değil.", profile: "Profil", privacy: "Gizlilik merkezi", name: "Görünen ad", phone: "İletişim numarası", language: "Dil", ai: "Yapay zekâ kullanımını kapat", marketing: "Pazarlama mesajları", save: "Profili kaydet", saved: "Profil kaydedildi.", failed: "İşlem tamamlanamadı.", empty: "Gizlilik talebi yok.", submitted: "Gizlilik talebi gönderildi." },
} satisfies Record<Locale, Record<string, string>>;

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function currentLocale(): Locale {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang === "en" || document.documentElement.lang === "tr" ? document.documentElement.lang : "ar";
}

export default function PortalAccountModule({ role, moduleKey }: { role: PortalRole; moduleKey: "profile" | "privacy" }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ar");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<PrivacyRequest[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "error">("loading");
  const [message, setMessage] = useState("");
  const copy = text[locale];

  const load = useCallback(async () => {
    const next = `/portal/${role}/${moduleKey}`;
    if (!supabase) return router.replace(`/portal/login?next=${encodeURIComponent(next)}`);
    setLocale(currentLocale());
    const access = await fetchPortalAccess(supabase);
    if (!access.ok) {
      if (access.code === "authentication_required") return router.replace(`/portal/login?next=${encodeURIComponent(next)}`);
      setState("denied");
      return;
    }
    if (!isPortalRole(access.role)) return router.replace("/admin");
    if (access.role !== role) return router.replace(`/portal/${access.role}/${moduleKey}`);
    const result = await portalApi<{ rows?: unknown }>(supabase, role, moduleKey);
    if (!result.ok) { setState(result.status === 403 ? "denied" : "error"); return; }
    const dataRows = rows(result.data?.rows);
    if (moduleKey === "profile") {
      const row = dataRows[0];
      setProfile(row ? row as unknown as Profile : { user_id: "", display_name: access.email, phone: null, locale: currentLocale(), status: "active", marketing_opt_in: false, ai_opt_out: false });
    } else setRequests(dataRows as unknown as PrivacyRequest[]);
    setState("ready");
  }, [moduleKey, role, router]);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile() {
    if (!supabase || !profile) return;
    setMessage("");
    const result = await portalApi(supabase, role, "profile", { method: "PATCH", body: JSON.stringify(profile) });
    setMessage(result.ok ? copy.saved : copy.failed);
  }

  async function createPrivacyRequest(requestType: typeof requestTypes[number]) {
    if (!supabase) return;
    setMessage("");
    const result = await portalApi(supabase, role, "privacy", { method: "POST", body: JSON.stringify({ request_type: requestType }) });
    setMessage(result.ok ? copy.submitted : copy.failed);
    if (result.ok) await load();
  }

  if (state === "loading") return <main className="min-h-screen p-28 text-center text-white">{copy.loading}</main>;
  if (state === "denied") return <main className="min-h-screen p-28 text-center text-red-100">{copy.denied}</main>;
  if (state === "error") return <main className="min-h-screen p-28 text-center text-red-100">{copy.failed}</main>;

  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className="mx-auto max-w-5xl rounded-3xl border border-violet-300/20 bg-white/5 p-6 shadow-2xl">
        <h1 className="text-3xl font-black">{moduleKey === "profile" ? copy.profile : copy.privacy}</h1>
        {message && <p role="status" className="mt-4 rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}
        {moduleKey === "profile" && profile && <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label>{copy.name}<input value={profile.display_name ?? ""} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4" /></label>
          <label>{copy.phone}<input value={profile.phone ?? ""} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-black/40 px-4" /></label>
          <label>{copy.language}<select value={profile.locale} onChange={(event) => setProfile({ ...profile, locale: event.target.value as Locale })} className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-black/70 px-4"><option value="ar">العربية</option><option value="en">English</option><option value="tr">Türkçe</option></select></label>
          <label className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-4">{copy.ai}<input type="checkbox" checked={profile.ai_opt_out} onChange={(event) => setProfile({ ...profile, ai_opt_out: event.target.checked })} /></label>
          <label className="flex min-h-12 items-center justify-between rounded-xl border border-white/10 px-4">{copy.marketing}<input type="checkbox" checked={profile.marketing_opt_in} onChange={(event) => setProfile({ ...profile, marketing_opt_in: event.target.checked })} /></label>
          <button type="button" onClick={() => void saveProfile()} className="min-h-12 rounded-xl bg-violet-600 px-5 font-bold">{copy.save}</button>
        </div>}
        {moduleKey === "privacy" && <div className="mt-6 space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{requestTypes.map((requestType) => <button key={requestType} type="button" onClick={() => void createPrivacyRequest(requestType)} className="min-h-12 rounded-xl border border-white/10 bg-black/30 px-4">{requestType}</button>)}</div><div className="space-y-3">{requests.map((request) => <div key={request.id} className="rounded-xl border border-white/10 p-4"><strong>{request.request_type}</strong><span className="mx-3 text-white/50">{request.status}</span><time className="text-sm text-white/50">{new Date(request.created_at).toLocaleString(locale)}</time></div>)}{requests.length === 0 && <p className="py-8 text-center text-white/50">{copy.empty}</p>}</div></div>}
      </section>
    </main>
  );
}
