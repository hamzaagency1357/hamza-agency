"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Language = "en" | "tr";
type Field = "title" | "summary" | "content";
type Partner = { id: string; title: string; summary: string; content: string; visible: boolean };
type TranslationRow = { source_id: string | number | null; field_name: string | null; language: string | null; translated_value: string | null; reviewed: boolean | null; is_published: boolean | null; status: string | null };
type State = { values: Partial<Record<Field, string>>; reviewed: boolean; published: boolean };
type Pack = Record<string, Partial<Record<Language, State>>>;

const fields: Array<{ key: Field; label: string }> = [
  { key: "title", label: "اسم الشريك" },
  { key: "summary", label: "التصنيف" },
  { key: "content", label: "الوصف" },
];
const languages: Array<{ code: Language; label: string }> = [{ code: "en", label: "English" }, { code: "tr", label: "Türkçe" }];
const blank = (): State => ({ values: {}, reviewed: false, published: false });
const complete = (state: State) => fields.every((field) => Boolean(state.values[field.key]?.trim()));
const value = (row: Record<string, unknown>, keys: string[], fallback = "") => { for (const key of keys) { const item = row[key]; if (typeof item === "string" && item.trim()) return item.trim(); if (typeof item === "number") return String(item); } return fallback; };

function buildPack(partners: Partner[], rows: TranslationRow[]): Pack {
  const next: Pack = {};
  partners.forEach((partner) => {
    next[partner.id] = {};
    languages.forEach(({ code }) => {
      const matches = rows.filter((row) => String(row.source_id ?? "") === partner.id && row.language === code && fields.some((field) => field.key === row.field_name));
      const values: Partial<Record<Field, string>> = {};
      matches.forEach((row) => { if (row.field_name === "title" || row.field_name === "summary" || row.field_name === "content") values[row.field_name] = row.translated_value || ""; });
      const ready = complete({ values, reviewed: false, published: false });
      const reviewed = ready && fields.every((field) => Boolean(matches.find((row) => row.field_name === field.key)?.reviewed));
      const published = reviewed && fields.every((field) => { const row = matches.find((item) => item.field_name === field.key); return Boolean(row?.is_published || row?.status === "published"); });
      next[partner.id][code] = { values, reviewed, published };
    });
  });
  return next;
}

export default function PartnerTranslationsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pack, setPack] = useState<Pack>({});
  const [selectedId, setSelectedId] = useState("");
  const [language, setLanguage] = useState<Language>("en");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { async function access() { const result = await requireAdminModuleAccess("partners"); if (!result.isAuthorized || !result.profile) { router.replace(result.reason === "forbidden" ? "/admin" : "/admin/login"); setChecking(false); return; } setAdminEmail(result.profile.email || result.user?.email || ""); setAuthorized(true); setChecking(false); } void access(); }, [router]);
  useEffect(() => { if (authorized) void load(); }, [authorized]);

  async function load() {
    if (!supabase) { setError("الاتصال بقاعدة البيانات غير مفعل."); setLoading(false); return; }
    setLoading(true); setError(""); setMessage("");
    const [partnersResult, translationsResult] = await Promise.all([
      supabase.from("partners").select("*").order("sort_order", { ascending: true }).limit(300),
      supabase.from("content_translations").select("source_id, field_name, language, translated_value, status, reviewed, is_published").eq("source_type", "partners").in("field_name", ["title", "summary", "content"]).in("language", ["en", "tr"]).limit(3000),
    ]);
    setLoading(false);
    if (partnersResult.error) { setError(`تعذر تحميل الشركاء: ${partnersResult.error.message}`); return; }
    const loaded = ((partnersResult.data || []) as Record<string, unknown>[]).map((row, index) => ({
      id: value(row, ["id"], `partner-${index}`),
      title: value(row, ["name", "title"], "شريك وكالة حمزة"),
      summary: value(row, ["category", "type"], "برنامج تعاون"),
      content: value(row, ["description", "summary"], "شريك ضمن اتفاقات التعاون الخاصة بوكالة حمزة لدعم وتنظيم مسارات صناع المحتوى."),
      visible: row.is_visible !== false && row.status !== "hidden",
    }));
    setPartners(loaded); setPack(buildPack(loaded, (translationsResult.data || []) as TranslationRow[])); setSelectedId((current) => current || loaded[0]?.id || "");
    if (translationsResult.error) setError(`تم تحميل الشركاء، لكن تعذر تحميل ترجماتهم: ${translationsResult.error.message}`);
  }

  const selected = partners.find((partner) => partner.id === selectedId) || partners[0] || null;
  const state = selected ? pack[selected.id]?.[language] || blank() : blank();
  const reviewedCount = useMemo(() => partners.filter((partner) => { const item = pack[partner.id]?.[language] || blank(); return item.reviewed && complete(item); }).length, [partners, pack, language]);
  const publishedCount = useMemo(() => partners.filter((partner) => { const item = pack[partner.id]?.[language] || blank(); return item.published && item.reviewed && complete(item); }).length, [partners, pack, language]);

  function update(field: Field, text: string) { if (!selected) return; setPack((current) => { const previous = current[selected.id]?.[language] || blank(); return { ...current, [selected.id]: { ...(current[selected.id] || {}), [language]: { values: { ...previous.values, [field]: text }, reviewed: false, published: false } } }; }); }
  function review(next: boolean) { if (!selected || (next && !complete(state))) return; setPack((current) => { const previous = current[selected.id]?.[language] || blank(); return { ...current, [selected.id]: { ...(current[selected.id] || {}), [language]: { ...previous, reviewed: next, published: next ? previous.published : false } } }; }); }
  function publish(next: boolean) { if (!selected || !state.reviewed || !complete(state)) return; setPack((current) => { const previous = current[selected.id]?.[language] || blank(); return { ...current, [selected.id]: { ...(current[selected.id] || {}), [language]: { ...previous, published: next } } }; }); }

  async function save() {
    if (!supabase || !selected) return;
    if (!state.values.title?.trim() && !state.values.summary?.trim() && !state.values.content?.trim()) { setError("أدخل ترجمة واحدة على الأقل قبل الحفظ."); return; }
    if (state.reviewed && !complete(state)) { setError("لا يمكن اعتماد المراجعة قبل اكتمال اسم الشريك والتصنيف والوصف."); return; }
    const reviewed = Boolean(state.reviewed && complete(state)); const published = Boolean(state.published && reviewed && complete(state)); const status = published ? "published" : reviewed ? "reviewed" : "needs_review";
    setSaving(true); setMessage(""); setError("");
    const { error: saveError } = await supabase.from("content_translations").upsert(fields.map((field) => ({ source_type: "partners", source_id: selected.id, field_name: field.key, language, translated_value: state.values[field.key] || "", status, reviewed, is_published: published, created_by: adminEmail, updated_by: adminEmail, updated_at: new Date().toISOString() })), { onConflict: "source_type,source_id,field_name,language" });
    setSaving(false);
    if (saveError) { setError(`تعذر حفظ الترجمة: ${saveError.message}`); return; }
    setMessage(published ? "تم حفظ الترجمة ونشرها يدوياً." : reviewed ? "تم الحفظ بحالة مراجع. لن تظهر للعامة قبل النشر اليدوي." : "تم الحفظ بحالة تحتاج مراجعة.");
    await load();
  }

  if (checking || loading) return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز مراجعة ترجمات الشركاء...</div></main>;
  if (!authorized) return null;

  return <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8"><section className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">Partners translations</div><h1 className="text-4xl font-black md:text-5xl">مراجعة ونشر ترجمات الشركاء</h1><p className="mt-3 max-w-3xl leading-8 text-white/60">لا تظهر بطاقة الشريك بلغة ثانية إلا بعد اكتمال الاسم والتصنيف والوصف، ثم مراجعتها ونشرها يدوياً.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/translations/automation" className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100">ترجمة دفعة مراقبة</Link><Link href="/admin/partners" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">إدارة الشركاء</Link></div></div>{message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div> : null}{error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}<div className="mb-6 grid gap-4 md:grid-cols-3"><Stat label="إجمالي الشركاء" value={partners.length} /><Stat label={`مراجعة (${language})`} value={reviewedCount} /><Stat label={`منشورة (${language})`} value={publishedCount} /></div><div className="grid gap-6 lg:grid-cols-[0.82fr_1.55fr]"><aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4"><div className="mb-4 flex gap-2">{languages.map((item) => <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${language === item.code ? "bg-yellow-500/20 text-yellow-100" : "bg-black/20 text-white/65"}`}>{item.label}</button>)}</div><div className="grid gap-2">{partners.map((partner) => { const item = pack[partner.id]?.[language] || blank(); const label = item.published && item.reviewed && complete(item) ? "منشور" : item.reviewed && complete(item) ? "مراجع" : complete(item) ? "جاهز" : "يحتاج ترجمة"; return <button key={partner.id} type="button" onClick={() => setSelectedId(partner.id)} className={`rounded-2xl border p-4 text-right ${selected?.id === partner.id ? "border-yellow-300/60 bg-yellow-500/10" : "border-white/10 bg-black/20"}`}><div className="flex items-start justify-between gap-3"><span className="font-black">{partner.title}</span><span className={`rounded-full px-2 py-1 text-[11px] ${partner.visible ? "bg-green-500/10 text-green-100" : "bg-white/10 text-white/55"}`}>{partner.visible ? "ظاهر" : "مخفي"}</span></div><div className="mt-2 flex justify-between gap-3 text-xs text-white/55"><span>{partner.summary}</span><span>{label}</span></div></button>; })}</div></aside><section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">{selected ? <><div className="mb-6"><div className="text-sm font-bold text-yellow-100">{language === "en" ? "English" : "Türkçe"}</div><h2 className="mt-2 text-3xl font-black">{selected.title}</h2><p className="mt-3 text-white/60">أي تعديل يعيد الترجمة إلى تحتاج مراجعة، ولا يوجد نشر تلقائي.</p></div><div className="grid gap-5">{fields.map((field) => { const source = field.key === "title" ? selected.title : field.key === "summary" ? selected.summary : selected.content; return <label key={field.key} className="block rounded-3xl border border-white/10 bg-black/20 p-4"><div className="mb-3 font-black">{field.label}</div><div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-7 text-white/70">{source}</div><textarea value={state.values[field.key] || ""} onChange={(event) => update(field.key, event.target.value)} className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-[#070009] p-4 text-white outline-none focus:border-yellow-300/60" /></label>; })}</div><div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2"><label className="flex gap-3"><input type="checkbox" checked={state.reviewed} disabled={!complete(state)} onChange={(event) => review(event.target.checked)} className="mt-1 h-5 w-5 accent-yellow-500" /><span><strong className="block">تمت المراجعة</strong><span className="mt-1 block text-sm text-white/55">يتطلب اكتمال الحقول الثلاثة.</span></span></label><label className="flex gap-3"><input type="checkbox" checked={state.published} disabled={!complete(state) || !state.reviewed} onChange={(event) => publish(event.target.checked)} className="mt-1 h-5 w-5 accent-green-500" /><span><strong className="block">نشر يدوي للعامة</strong><span className="mt-1 block text-sm text-white/55">لا يوجد نشر تلقائي.</span></span></label></div><button type="button" onClick={() => void save()} disabled={saving} className="mt-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 px-7 py-4 font-black text-black disabled:opacity-60">{saving ? "جاري الحفظ..." : "حفظ حالة الترجمة"}</button></> : <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/60">لا توجد عناصر حالياً.</div>}</section></div></section></main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
