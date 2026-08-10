"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireTenantAdmin } from "@/lib/productExpansion/tenantAccess";

type Row = Record<string, unknown>;
type Tenant = { id: string; slug: string; name: string; status: string; default_locale: "ar" | "en" | "tr"; supported_locales: string[]; is_primary: boolean };
type Branding = { tenant_id: string; primary_color: string | null; secondary_color: string | null; accent_color: string | null; contact_email: string | null; contact_phone: string | null; social_links: Record<string, string>; legal_overrides: Record<string, unknown> };
type Domain = { id: string; hostname: string; status: string; is_primary: boolean };
type Flag = { feature_key: string; enabled: boolean };
type Setting = { key: string; value: unknown };
type Membership = { id: string; user_id: string; role: string; status: string };

const emptyBranding: Branding = { tenant_id: "", primary_color: "#7C3AED", secondary_color: "#180826", accent_color: "#D4AF37", contact_email: "", contact_phone: "", social_links: {}, legal_overrides: {} };
function isRow(value: unknown): value is Row { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function cleanHostname(value: string) { return value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0]; }
function validHostname(value: string) { return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value); }
function safeJson(value: string) { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } }

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
      supabase.from("tenant_branding").select("tenant_id,primary_color,secondary_color,accent_color,contact_email,contact_phone,social_links,legal_overrides").eq("tenant_id", tenantId).maybeSingle(),
      supabase.from("tenant_domains").select("id,hostname,status,is_primary").eq("tenant_id", tenantId).order("is_primary", { ascending: false }),
      supabase.from("tenant_feature_flags").select("feature_key,enabled").eq("tenant_id", tenantId).order("feature_key"),
      supabase.from("tenant_settings").select("key,value").eq("tenant_id", tenantId).eq("is_secret", false).order("key"),
      supabase.from("tenant_memberships").select("id,user_id,role,status").eq("tenant_id", tenantId).order("role"),
      supabase.from("tenant_admin_audit").select("id,action,entity_type,entity_id,actor_id,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(100),
    ]);
    if (isRow(tenantResult.data)) setTenant(tenantResult.data as unknown as Tenant);
    const nextBranding = isRow(brandingResult.data) ? brandingResult.data as unknown as Branding : { ...emptyBranding, tenant_id: tenantId };
    setBranding(nextBranding); setSocialJson(JSON.stringify(nextBranding.social_links ?? {}, null, 2)); setLegalJson(JSON.stringify(nextBranding.legal_overrides ?? {}, null, 2));
    setDomains((domainResult.data ?? []) as Domain[]); setFlags((flagResult.data ?? []) as Flag[]); setSettings((settingResult.data ?? []) as Setting[]); setMemberships((memberResult.data ?? []) as Membership[]); setAuditRows((auditResult.data ?? []) as Row[]);
    const error = [tenantResult, brandingResult, domainResult, flagResult, settingResult, memberResult, auditResult].find((item) => item.error)?.error;
    setMessage(error?.message ?? ""); setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);
  async function audit(action: string, entityType: string, entityId: string | null, afterData: Row) { if (supabase && tenant && actorId) await adminBoundaryMutation("pr116_component_tenantgovernanceconsole_entity_tenant_admin_audit_insert", { values: { tenant_id: tenant.id, actor_id: actorId, action, entity_type: entityType, entity_id: entityId, after_data: afterData }, filters: [], select: undefined, returnMode: "many", options: undefined }); }
  async function saveTenant() { if (!supabase || !tenant) return; const result = await adminBoundaryMutation("pr116_component_tenantgovernanceconsole_entity_tenants_update", { values: { name: tenant.name.trim(), default_locale: tenant.default_locale, supported_locales: tenant.supported_locales, updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "id", value: tenant.id }], select: undefined, returnMode: "many", options: undefined }); if (result.error) return setMessage(result.error.message); await audit("tenant.updated", "tenant", tenant.id, { name: tenant.name }); setMessage("تم حفظ إعدادات المستأجر."); }
  async function saveBranding() { if (!supabase || !tenant) return; const payload = { ...branding, tenant_id: tenant.id, social_links: safeJson(socialJson), legal_overrides: safeJson(legalJson), updated_at: new Date().toISOString() }; const result = await adminBoundaryMutation("pr116_component_tenantgovernanceconsole_entity_tenant_branding_upsert", { values: payload, filters: [], select: undefined, returnMode: "many", options: undefined }); if (result.error) return setMessage(result.error.message); await audit("tenant.branding_updated", "tenant_branding", tenant.id, { primary_color: payload.primary_color }); setMessage("تم حفظ الهوية."); }
  async function addDomain() { if (!supabase || !tenant) return; const hostname = cleanHostname(domainDraft); if (!validHostname(hostname)) return setMessage("اسم النطاق غير صالح."); const result = await adminBoundaryMutation("pr116_component_tenantgovernanceconsole_entity_tenant_domains_insert", { values: { tenant_id: tenant.id, hostname, status: "pending", is_primary: domains.length === 0 }, filters: [], select: undefined, returnMode: "many", options: undefined }); if (result.error) return setMessage(result.error.message); await audit("tenant.domain_added", "tenant_domain", hostname, { hostname }); setDomainDraft(""); await load(); }
  async function toggleFlag(flag: Flag) { if (!supabase || !tenant) return; const result = await adminBoundaryMutation("pr116_component_tenantgovernanceconsole_entity_tenant_feature_flags_update", { values: { enabled: !flag.enabled, updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "tenant_id", value: tenant.id }, { op: "eq", field: "feature_key", value: flag.feature_key }], select: undefined, returnMode: "many", options: undefined }); if (result.error) return setMessage(result.error.message); await load(); }
  async function saveSetting() { if (!supabase || !tenant || !settingDraft.key.trim()) return; const key = settingDraft.key.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_").slice(0, 100); let value: unknown = settingDraft.value; try { value = JSON.parse(settingDraft.value); } catch {} const result = await adminBoundaryMutation("pr116_component_tenantgovernanceconsole_entity_tenant_settings_upsert", { values: { tenant_id: tenant.id, key, value, is_secret: false, updated_at: new Date().toISOString() }, filters: [], select: undefined, returnMode: "many", options: undefined }); if (result.error) return setMessage(result.error.message); await audit("tenant.setting_updated", "tenant_setting", key, { key }); setSettingDraft({ key: "", value: "" }); await load(); }

  const localeSet = useMemo(() => new Set(tenant?.supported_locales ?? []), [tenant]);
  if (loading) return <div className="p-8 text-white">جارٍ تحميل إدارة المستأجر…</div>;
  if (!tenant) return <div className="p-8 text-red-100">{message || "تعذر تحميل المستأجر."}</div>;

  return <main className="min-h-screen bg-[#09050f] px-4 py-10 text-white" dir="rtl"><div className="mx-auto max-w-7xl space-y-6">
    <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-6"><p className="text-sm text-violet-200">Tenant Governance</p><h1 className="mt-2 text-3xl font-black">المستأجر والهوية والنطاقات</h1>{message && <p role="status" className="mt-4 rounded-xl bg-violet-500/10 p-3">{message}</p>}</header>
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-4"><label>الاسم<input value={tenant.name} onChange={(e) => setTenant({ ...tenant, name: e.target.value })} className="mt-1 min-h-11 w-full rounded-xl bg-black/40 px-3"/></label><label>اللغة<select value={tenant.default_locale} onChange={(e) => setTenant({ ...tenant, default_locale: e.target.value as Tenant["default_locale"] })} className="mt-1 min-h-11 w-full rounded-xl bg-black/60 px-3"><option value="ar">العربية</option><option value="en">English</option><option value="tr">Türkçe</option></select></label><div>{["ar","en","tr"].map((locale) => <label key={locale} className="ml-3"><input type="checkbox" checked={localeSet.has(locale)} onChange={(e) => setTenant({ ...tenant, supported_locales: e.target.checked ? [...new Set([...tenant.supported_locales, locale])] : tenant.supported_locales.filter((item) => item !== locale) })}/> {locale}</label>)}</div><button onClick={() => void saveTenant()} className="rounded-xl bg-violet-600 px-4">حفظ</button></section>
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-3"><h2 className="md:col-span-3 text-2xl font-bold">الهوية</h2>{(["primary_color","secondary_color","accent_color"] as const).map((key) => <label key={key}>{key}<input type="color" value={branding[key] ?? "#000000"} onChange={(e) => setBranding({ ...branding, [key]: e.target.value })} className="mt-1 h-11 w-full"/></label>)}<input value={branding.contact_email ?? ""} onChange={(e) => setBranding({ ...branding, contact_email: e.target.value })} placeholder="البريد" className="min-h-11 rounded-xl bg-black/40 px-3"/><input value={branding.contact_phone ?? ""} onChange={(e) => setBranding({ ...branding, contact_phone: e.target.value })} placeholder="الهاتف" className="min-h-11 rounded-xl bg-black/40 px-3"/><button onClick={() => void saveBranding()} className="rounded-xl bg-violet-600 px-4">حفظ الهوية</button><textarea value={socialJson} onChange={(e) => setSocialJson(e.target.value)} className="min-h-28 rounded-xl bg-black/40 p-3"/><textarea value={legalJson} onChange={(e) => setLegalJson(e.target.value)} className="min-h-28 rounded-xl bg-black/40 p-3"/></section>
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">النطاقات</h2><div className="mt-3 flex gap-2"><input value={domainDraft} onChange={(e) => setDomainDraft(e.target.value)} className="min-h-11 flex-1 rounded-xl bg-black/40 px-3"/><button onClick={() => void addDomain()} className="rounded-xl bg-violet-600 px-4">إضافة</button></div>{domains.map((domain) => <p key={domain.id} className="mt-3 rounded-xl border border-white/10 p-3" dir="ltr">{domain.hostname} · {domain.status}</p>)}</section>
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">خيارات الميزات</h2><div className="mt-3 grid gap-2 md:grid-cols-3">{flags.map((flag) => <button key={flag.feature_key} onClick={() => void toggleFlag(flag)} className="rounded-xl border border-white/10 p-3 text-right">{flag.feature_key} · {flag.enabled ? "enabled" : "disabled"}</button>)}</div></section>
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">إعدادات المستأجر</h2><div className="mt-3 flex gap-2"><input value={settingDraft.key} onChange={(e) => setSettingDraft({ ...settingDraft, key: e.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input value={settingDraft.value} onChange={(e) => setSettingDraft({ ...settingDraft, value: e.target.value })} className="min-h-11 flex-1 rounded-xl bg-black/40 px-3"/><button onClick={() => void saveSetting()} className="rounded-xl bg-violet-600 px-4">حفظ</button></div>{settings.map((setting) => <pre key={setting.key} className="mt-2 overflow-auto rounded-xl border border-white/10 p-3 text-xs">{setting.key}: {JSON.stringify(setting.value)}</pre>)}</section>
    <section className="rounded-3xl border border-violet-300/20 bg-violet-500/10 p-6"><h2 className="text-2xl font-bold">الدعوات والعضويات</h2><p className="mt-2 text-white/70">تم إلغاء إدخال UUID والتعديل المباشر نهائياً. كل إنشاء أو تعديل عضوية يمر عبر Server Route وRPC المحميين.</p><p className="mt-2 text-sm text-white/60">العضويات الحالية: {memberships.length}. حسابات Super Admin محمية وتظهر للقراءة فقط في الواجهة التشغيلية.</p><Link href="/admin/product-expansion/invitations" className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-violet-600 px-5 font-bold">فتح إدارة الدعوات والعضويات</Link></section>
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="text-2xl font-bold">سجل الإدارة</h2><div className="mt-3 space-y-2">{auditRows.map((row) => <p key={String(row.id)} className="rounded-xl border border-white/10 p-3 text-sm">{String(row.action)} · {String(row.entity_type)} · {String(row.created_at)}</p>)}</div></section>
  </div></main>;
}
