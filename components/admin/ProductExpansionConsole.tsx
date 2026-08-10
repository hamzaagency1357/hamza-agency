"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireTenantAdmin } from "@/lib/productExpansion/tenantAccess";

type Tenant = { id: string; name: string; slug: string; status: string; default_locale: string; supported_locales: string[] };
type FeatureFlag = { tenant_id: string; feature_key: string; enabled: boolean; configuration: Record<string, unknown> };
type Domain = { id: string; tenant_id: string; hostname: string; status: string; is_primary: boolean };
type Branding = { tenant_id: string; primary_color: string | null; secondary_color: string | null; accent_color: string | null; contact_email: string | null; contact_phone: string | null };

export default function ProductExpansionConsole() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState("");
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [branding, setBranding] = useState<Branding | null>(null);

  const selected = useMemo(() => tenants.find((tenant) => tenant.id === activeTenant) ?? null, [tenants, activeTenant]);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const access = await requireTenantAdmin();
    if (!access.authorized) {
      setError("لا تملك صلاحية إدارة المستأجرين.");
      setLoading(false);
      return;
    }
    setAuthorized(true);
    const { data: tenantRows, error: tenantError } = await supabase.from("tenants").select("id,name,slug,status,default_locale,supported_locales").order("is_primary", { ascending: false });
    if (tenantError) {
      setError(tenantError.message);
      setLoading(false);
      return;
    }
    const rows = (tenantRows ?? []) as Tenant[];
    setTenants(rows);
    setActiveTenant((current) => current || rows[0]?.id || "");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!supabase || !activeTenant) return;
    void (async () => {
      const [flagResult, domainResult, brandingResult] = await Promise.all([
        supabase.from("tenant_feature_flags").select("tenant_id,feature_key,enabled,configuration").eq("tenant_id", activeTenant).order("feature_key"),
        supabase.from("tenant_domains").select("id,tenant_id,hostname,status,is_primary").eq("tenant_id", activeTenant).order("is_primary", { ascending: false }),
        supabase.from("tenant_branding").select("tenant_id,primary_color,secondary_color,accent_color,contact_email,contact_phone").eq("tenant_id", activeTenant).maybeSingle(),
      ]);
      setFlags((flagResult.data ?? []) as FeatureFlag[]);
      setDomains((domainResult.data ?? []) as Domain[]);
      setBranding((brandingResult.data as Branding | null) ?? null);
    })();
  }, [activeTenant]);

  async function toggleFlag(flag: FeatureFlag) {
    if (!supabase) return;
    const { error: updateError } = await adminBoundaryMutation("pr116_component_productexpansionconsole_entity_tenant_feature_flags_update", { values: { enabled: !flag.enabled, updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "tenant_id", value: flag.tenant_id }, { op: "eq", field: "feature_key", value: flag.feature_key }], select: undefined, returnMode: "many", options: undefined });
    if (updateError) return setError(updateError.message);
    await adminBoundaryMutation("pr116_component_productexpansionconsole_entity_tenant_admin_audit_insert", { values: { tenant_id: flag.tenant_id, action: "feature_flag.updated", entity_type: "tenant_feature_flag", entity_id: flag.feature_key, before_data: { enabled: flag.enabled }, after_data: { enabled: !flag.enabled } }, filters: [], select: undefined, returnMode: "many", options: undefined });
    setFlags((current) => current.map((item) => item.feature_key === flag.feature_key ? { ...item, enabled: !item.enabled } : item));
  }

  async function saveBranding() {
    if (!supabase || !branding) return;
    const { error: saveError } = await adminBoundaryMutation("pr116_component_productexpansionconsole_entity_tenant_branding_upsert", { values: { ...branding, updated_at: new Date().toISOString() }, filters: [], select: undefined, returnMode: "many", options: undefined });
    if (saveError) return setError(saveError.message);
    await adminBoundaryMutation("pr116_component_productexpansionconsole_entity_tenant_admin_audit_insert", { values: { tenant_id: branding.tenant_id, action: "branding.updated", entity_type: "tenant_branding", entity_id: branding.tenant_id, after_data: branding }, filters: [], select: undefined, returnMode: "many", options: undefined });
  }

  if (loading) return <div className="p-6 text-white">جارٍ تحميل إدارة المنصة…</div>;
  if (!authorized) return <div className="p-6 text-red-200">{error || "غير مصرح."}</div>;

  return (
    <main className="min-h-screen bg-[#09050f] p-4 text-white md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-violet-400/20 bg-white/5 p-6">
          <p className="text-sm text-violet-200">PR101 Product Expansion</p>
          <h1 className="mt-2 text-3xl font-black">إدارة المستأجرين والهوية والميزات</h1>
          <select value={activeTenant} onChange={(event) => setActiveTenant(event.target.value)} className="mt-4 min-h-12 rounded-xl border border-white/15 bg-black/50 px-4">
            {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </header>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-red-100">{error}</div>}

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
            <h2 className="text-xl font-bold">هوية {selected?.name}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(["primary_color","secondary_color","accent_color","contact_email","contact_phone"] as const).map((key) => (
                <label key={key} className="text-sm text-white/70">{key}
                  <input value={branding?.[key] ?? ""} onChange={(event) => setBranding((current) => ({ tenant_id: activeTenant, primary_color: null, secondary_color: null, accent_color: null, contact_email: null, contact_phone: null, ...current, [key]: event.target.value }))} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-white" />
                </label>
              ))}
            </div>
            <button onClick={() => void saveBranding()} className="mt-4 min-h-11 rounded-xl bg-violet-600 px-5 font-bold">حفظ الهوية</button>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-bold">النطاقات</h2>
            <div className="mt-4 space-y-3">
              {domains.length ? domains.map((domain) => <div key={domain.id} className="rounded-xl bg-black/30 p-3"><div className="font-semibold">{domain.hostname}</div><div className="text-xs text-white/60">{domain.status}{domain.is_primary ? " · أساسي" : ""}</div></div>) : <p className="text-sm text-white/50">لا توجد نطاقات مضافة.</p>}
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-xl font-bold">Feature flags</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {flags.map((flag) => <button key={flag.feature_key} onClick={() => void toggleFlag(flag)} className="flex min-h-14 items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 text-right"><span>{flag.feature_key}</span><span className={flag.enabled ? "text-emerald-300" : "text-white/40"}>{flag.enabled ? "مفعّل" : "معطّل"}</span></button>)}
          </div>
        </section>
      </div>
    </main>
  );
}
