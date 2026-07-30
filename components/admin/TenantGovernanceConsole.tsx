"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireTenantAdmin } from "@/lib/productExpansion/tenantAccess";

type Row = Record<string, unknown>;
type Tenant = { id: string; slug: string; name: string; status: string; default_locale: "ar" | "en" | "tr"; supported_locales: string[]; is_primary: boolean };
type Branding = { tenant_id: string; logo_media_id: number | null; favicon_media_id: number | null; primary_color: string | null; secondary_color: string | null; accent_color: string | null; contact_email: string | null; contact_phone: string | null; social_links: Record<string, string>; legal_overrides: Record<string, unknown>; email_sender_name: string | null; email_sender_address: string | null };
type Domain = { id: string; hostname: string; status: string; is_primary: boolean; verified_at: string | null };
type Flag = { feature_key: string; enabled: boolean; configuration: Record<string, unknown> };
type Setting = { key: string; value: unknown; is_secret: boolean };
type Membership = { id: string; user_id: string; role: string; status: string; mfa_required: boolean; permissions: Record<string, unknown> };

const emptyBranding: Branding = { tenant_id: "", logo_media_id: null, favicon_media_id: null, primary_color: "#7C3AED", secondary_color: "#180826", accent_color: "#D4AF37", contact_email: "", contact_phone: "", social_links: {}, legal_overrides: {}, email_sender_name: "", email_sender_address: "" };

function isRow(value: unknown): value is Row { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function cleanHostname(value: string) { return value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0]; }
function validHostname(value: string) { return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value); }
function safeJson(value: string, fallback: Record<string, unknown>) { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : fallback; } catch { return fallback; } }

export default function TenantGovernanceConsole() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [actorId, setActorId] = useState("");
  const [branding, setBranding] = useState<Branding>(emptyBranding);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [auditRows, setAuditRows] = useState<Row[]>([]);
  const [domainDraft, setDomainDraft] = useState("");
  const [settingDraft, setSettingDraft] = useState({ key: "", value: "" });
  const [memberDraft, setMemberDraft] = useState({ user_id: "", role: "creator", mfa_required: false });
  const [socialJson, setSocialJson] = useState("{}");
  const [legalJson, setLegalJson] = useState("{}");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const access = await requireTenantAdmin();
    if (!access.authorized || !access.membership || !access.user) { setMessage("لا تملك صلاحية إدارة المستأجر."); setLoading(false); return; }
    const tenantId = String(access.membership.tenant_id);
    setActorId(access.user.id);
    const [tenantResult, brandingResult, domainResult, flagResult, settingResult, memberResult, auditResult] = await Promise.all([
      supabase.from("tenants").select("id,slug,name,status,default_locale,supported_locales,is_primary").eq("id", tenantId).single(),
      supabase.from("tenant_branding").select("tenant_id,logo_media_id,favicon_media_id,primary_color,secondary_color,accent_color,contact_email,contact_phone,social_links,legal_overrides,email_sender_name,email_sender_address").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_domains").select("id,hostname,status,is_primary,verified_at").eq("tenant_id", tenantId).order("is_primary", { ascending: false }),
      supabase.from("tenant_feature_flags").select("feature_key,enabled,configuration").eq("tenant_id", tenantId).order("feature_key"),
      supabase.from("tenant_settings").select("key,value,is_secret").eq("tenant_id", tenantId).eq("is_secret", false).order("key"),
      supabase.from("tenant_memberships").select("id,user_id,role,status,mfa_required,permissions").eq("tenant_id", tenantId).order("role"),
      supabase.from("tenant_admin_audit").select("id,action,entity_type,entity_id,actor_id,after_data,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100),
    ]);
    if (isRow(tenantResult.data)) setTenant(tenantResult.data as unknown as Tenant);
    const nextBranding = isRow(brandingResult.data) ? brandingResult.data as unknown as Branding : { ...emptyBranding, tenant_id: tenantId };
    setBranding(nextBranding);
    setSocialJson(JSON.stringify(nextBranding.social_links ?? {}, null, 2));
    setLegalJson(JSON.stringify(nextBranding.legal_overrides ?? {}, null, 2));
    setDomains(Array.isArray(domainResult.data) ? domainResult.data.filter(isRow) as unknown as Domain[] : []);
    setFlags(Array.isArray(flagResult.data) ? flagResult.data.filter(isRow) as unknown as Flag[] : []);
    setSettings(Array.isArray(settingResult.data) ? settingResult.data.filter(isRow) as unknown as Setting[] : []);
    setMemberships(Array.isArray(memberResult.data) ? memberResult.data.filter(isRow) as unknown as Membership[] : []);
    setAuditRows(Array.isArray(auditResult.data) ? auditResult.data.filter(isRow) : []);
    const firstError = [tenantResult, brandingResult, domainResult, flagResult, settingResult, memberResult, auditResult].find((result) => result.error)?.error;
    if (firstError) setMessage(firstError.message);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function audit(action: string, entityType: string, entityId: string | null, afterData: Row) {
    if (!supabase || !tenant || !actorId) return;
    await supabase.from("tenant_admin_audit").insert({ tenant_id: tenant.id, actor_id: actorId, action, entity_type: entityType, entity_id: entityId, after_data: afterData });
  }

  async function saveTenant() {
    if (!supabase || !tenant) return;
    const result = await supabase.from("tenants").update({ name: tenant.name.trim(), default_locale: tenant.default_locale, supported_locales: tenant.supported_locales, updated_at: new Date().toISOString() }).eq("id", tenant.id);
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.updated", "tenant", tenant.id, { name: tenant.name, default_locale: tenant.default_locale, supported_locales: tenant.supported_locales }); setMessage("تم حفظ إعدادات المستأجر."); await load();
  }

  async function saveBranding() {
    if (!supabase || !tenant) return;
    const payload = { ...branding, tenant_id: tenant.id, social_links: safeJson(socialJson, {}), legal_overrides: safeJson(legalJson, {}), updated_at: new Date().toISOString() };
    const result = await supabase.from("tenant_branding").upsert(payload);
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.branding_updated", "tenant_branding", tenant.id, { primary_color: payload.primary_color, secondary_color: payload.secondary_color, accent_color: payload.accent_color }); setMessage("تم حفظ الهوية البصرية."); await load();
  }

  async function addDomain() {
    if (!supabase || !tenant) return;
    const hostname = cleanHostname(domainDraft);
    if (!validHostname(hostname)) return setMessage("اسم النطاق غير صالح.");
    const result = await supabase.from("tenant_domains").insert({ tenant_id: tenant.id, hostname, status: "pending", is_primary: domains.length === 0 });
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.domain_added", "tenant_domain", hostname, { hostname, status: "pending" }); setDomainDraft(""); setMessage("تمت إضافة النطاق بحالة انتظار التحقق."); await load();
  }

  async function setDomainStatus(domain: Domain, status: string) {
    if (!supabase || !tenant) return;
    const result = await supabase.from("tenant_domains").update({ status, verified_at: status === "verified" || status === "active" ? new Date().toISOString() : null }).eq("tenant_id", tenant.id).eq("id", domain.id);
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.domain_status", "tenant_domain", domain.id, { hostname: domain.hostname, status }); await load();
  }

  async function toggleFlag(flag: Flag) {
    if (!supabase || !tenant) return;
    const result = await supabase.from("tenant_feature_flags").update({ enabled: !flag.enabled, updated_at: new Date().toISOString() }).eq("tenant_id", tenant.id).eq("feature_key", flag.feature_key);
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.feature_flag_updated", "tenant_feature_flag", flag.feature_key, { enabled: !flag.enabled }); await load();
  }

  async function saveSetting() {
    if (!supabase || !tenant || !settingDraft.key.trim()) return;
    const key = settingDraft.key.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_").slice(0, 100);
    let value: unknown = settingDraft.value;
    try { value = JSON.parse(settingDraft.value); } catch {}
    const result = await supabase.from("tenant_settings").upsert({ tenant_id: tenant.id, key, value, is_secret: false, updated_at: new Date().toISOString() });
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.setting_updated", "tenant_setting", key, { key }); setSettingDraft({ key: "", value: "" }); await load();
  }

  async function addMember() {
    if (!supabase || !tenant || !/^[0-9a-f-]{36}$/i.test(memberDraft.user_id)) return setMessage("معرّف المستخدم غير صالح.");
    const result = await supabase.from("tenant_memberships").insert({ tenant_id: tenant.id, user_id: memberDraft.user_id, role: memberDraft.role, status: "active", permissions: {}, mfa_required: memberDraft.mfa_required });
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.member_added", "tenant_membership", memberDraft.user_id, { role: memberDraft.role, mfa_required: memberDraft.mfa_required }); setMemberDraft({ user_id: "", role: "creator", mfa_required: false }); await load();
  }

  async function updateMember(member: Membership, status: string) {
    if (!supabase || !tenant) return;
    const result = await supabase.from("tenant_memberships").update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", tenant.id).eq("id", member.id);
    if (result.error) return setMessage(result.error.message);
    await audit("tenant.member_status", "tenant_membership", member.id, { status, role: member.role }); await load();
  }

  const localeSet = useMemo(() => new Set(tenant?.supported_locales ?? []), [tenant]);
  if (loading) return <div className="p-8 text-white">جارٍ تحميل إدارة المستأجر…</div>;
  if (!tenant) return <div className="p-8 text-red-100">{message || "تعذر تحميل المستأجر."}</div>;

  return (
    <main className="min-h-screen bg-[#09050f] px-4 py-10 text-white" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-6"><p className="text-sm text-violet-200">Tenant Governance</p><h1 className="mt-2 text-3xl font-black">المستأجر والهوية والنطاقات والصلاحيات</h1>{message && <p role="status" className="mt-4 rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}</header>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:grid-cols-2 lg:grid-cols-4"><label>الاسم<input value={tenant.name} onChange={(event) => setTenant({ ...tenant, name: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl bg-black/40 px-3"/></label><label>اللغة الافتراضية<select value={tenant.default_locale} onChange={(event) => setTenant({ ...tenant, default_locale: event.target.value as Tenant["default_locale"] })} className="mt-1 min-h-11 w-full rounded-xl bg-black/60 px-3"><option value="ar">العربية</option><option value="en">English</option><option value="tr">Türkçe</option></select></label><div className="space-y-2"><span>اللغات المدعومة</span><div className="flex gap-3">{["ar","en","tr"].map((locale) => <label key={locale}><input type="checkbox" checked={localeSet.has(locale)} onChange={(event) => setTenant({ ...tenant, supported_locales: event.target.checked ? [...new Set([...tenant.supported_locales, locale])] : tenant.supported_locales.filter((item) => item !== locale) })}/> {locale}</label>)}</div></div><button type="button" onClick={() => void saveTenant()} className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold">حفظ المستأجر</button></section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:grid-cols-2 lg:grid-cols-3"><h2 className="sm:col-span-2 lg:col-span-3 text-2xl font-bold">Branding</h2>{(["primary_color","secondary_color","accent_color"] as const).map((key) => <label key={key}>{key}<input type="color" value={branding[key] ?? "#000000"} onChange={(event) => setBranding({ ...branding, [key]: event.target.value })} className="mt-1 h-11 w-full rounded-xl bg-black/40"/></label>)}<label>Logo media ID<input type="number" value={branding.logo_media_id ?? ""} onChange={(event) => setBranding({ ...branding, logo_media_id: event.target.value ? Number(event.target.value) : null })} className="mt-1 min-h-11 w-full rounded-xl bg-black/40 px-3"/></label><label>Favicon media ID<input type="number" value={branding.favicon_media_id ?? ""} onChange={(event) => setBranding({ ...branding, favicon_media_id: event.target.value ? Number(event.target.value) : null })} className="mt-1 min-h-11 w-full rounded-xl bg-black/40 px-3"/></label><label>البريد<input value={branding.contact_email ?? ""} onChange={(event) => setBranding({ ...branding, contact_email: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl bg-black/40 px-3"/></label><label>الهاتف<input value={branding.contact_phone ?? ""} onChange={(event) => setBranding({ ...branding, contact_phone: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl bg-black/40 px-3"/></label><label className="sm:col-span-2">Social links JSON<textarea value={socialJson} onChange={(event) => setSocialJson(event.target.value)} className="mt-1 min-h-32 w-full rounded-xl bg-black/40 p-3 font-mono text-xs"/></label><label className="sm:col-span-2">Legal overrides JSON<textarea value={legalJson} onChange={(event) => setLegalJson(event.target.value)} className="mt-1 min-h-32 w-full rounded-xl bg-black/40 p-3 font-mono text-xs"/></label><button type="button" onClick={() => void saveBranding()} className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold">حفظ الهوية</button></section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">Custom Domains</h2><div className="mt-4 flex gap-2"><input value={domainDraft} onChange={(event) => setDomainDraft(event.target.value)} placeholder="tenant.example.com" className="min-h-11 flex-1 rounded-xl bg-black/40 px-3"/><button type="button" onClick={() => void addDomain()} className="rounded-xl bg-violet-600 px-4">إضافة</button></div><div className="mt-4 space-y-2">{domains.map((domain) => <div key={domain.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"><div><strong dir="ltr">{domain.hostname}</strong><p className="text-sm text-white/50">{domain.status}{domain.is_primary ? " · primary" : ""}</p></div><select value={domain.status} onChange={(event) => void setDomainStatus(domain, event.target.value)} className="min-h-10 rounded-xl bg-black/60 px-3"><option value="pending">pending</option><option value="verified">verified</option><option value="active">active</option><option value="failed">failed</option><option value="disabled">disabled</option></select></div>)}</div></section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">Feature Flags</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{flags.map((flag) => <button type="button" key={flag.feature_key} onClick={() => void toggleFlag(flag)} className={`min-h-12 rounded-xl border px-4 text-right ${flag.enabled ? "border-emerald-300/30 bg-emerald-500/10" : "border-white/10 bg-black/30"}`}><strong>{flag.feature_key}</strong><span className="block text-xs text-white/50">{flag.enabled ? "enabled" : "disabled"}</span></button>)}</div></section>

        <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 lg:grid-cols-2"><div><h2 className="text-2xl font-bold">Tenant Settings</h2><div className="mt-4 flex gap-2"><input value={settingDraft.key} onChange={(event) => setSettingDraft({ ...settingDraft, key: event.target.value })} placeholder="setting.key" className="min-h-11 w-1/3 rounded-xl bg-black/40 px-3"/><input value={settingDraft.value} onChange={(event) => setSettingDraft({ ...settingDraft, value: event.target.value })} placeholder='JSON or text' className="min-h-11 flex-1 rounded-xl bg-black/40 px-3"/><button type="button" onClick={() => void saveSetting()} className="rounded-xl bg-violet-600 px-4">حفظ</button></div><div className="mt-4 space-y-2">{settings.map((setting) => <div key={setting.key} className="rounded-xl border border-white/10 p-3"><strong>{setting.key}</strong><pre className="mt-1 overflow-x-auto text-xs text-white/50">{JSON.stringify(setting.value)}</pre></div>)}</div></div><div><h2 className="text-2xl font-bold">Members</h2><div className="mt-4 grid gap-2 sm:grid-cols-2"><input value={memberDraft.user_id} onChange={(event) => setMemberDraft({ ...memberDraft, user_id: event.target.value })} placeholder="Auth user UUID" className="min-h-11 rounded-xl bg-black/40 px-3"/><select value={memberDraft.role} onChange={(event) => setMemberDraft({ ...memberDraft, role: event.target.value })} className="min-h-11 rounded-xl bg-black/60 px-3"><option value="creator">creator</option><option value="client">client</option><option value="employee">employee</option><option value="partner">partner</option><option value="tenant_admin">tenant_admin</option></select><label className="flex items-center gap-2"><input type="checkbox" checked={memberDraft.mfa_required} onChange={(event) => setMemberDraft({ ...memberDraft, mfa_required: event.target.checked })}/> MFA required</label><button type="button" onClick={() => void addMember()} className="rounded-xl bg-violet-600 px-4">إضافة عضو</button></div><div className="mt-4 space-y-2">{memberships.map((member) => <div key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3"><div><strong>{member.role}</strong><p className="text-xs text-white/50" dir="ltr">{member.user_id}</p></div><select value={member.status} onChange={(event) => void updateMember(member, event.target.value)} className="min-h-10 rounded-xl bg-black/60 px-3"><option value="invited">invited</option><option value="active">active</option><option value="suspended">suspended</option><option value="revoked">revoked</option></select></div>)}</div></div></section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">Tenant Audit</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr><th className="p-3 text-right">الوقت</th><th className="p-3 text-right">العملية</th><th className="p-3 text-right">الكيان</th><th className="p-3 text-right">الفاعل</th></tr></thead><tbody>{auditRows.map((row) => <tr key={String(row.id)} className="border-t border-white/10"><td className="p-3">{new Date(String(row.created_at)).toLocaleString("ar")}</td><td className="p-3">{String(row.action)}</td><td className="p-3">{String(row.entity_type)} · {String(row.entity_id ?? "")}</td><td className="p-3" dir="ltr">{String(row.actor_id ?? "")}</td></tr>)}</tbody></table></div></section>
      </div>
    </main>
  );
}
