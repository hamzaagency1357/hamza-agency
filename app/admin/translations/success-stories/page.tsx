"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type FieldName = "title" | "person_name" | "country" | "platform" | "summary" | "content";
type Story = { id: string; title: string; personName: string; country: string; platform: string; resultSummary: string; story: string; isVisible: boolean; status: string };
type TranslationRow = { source_id: string | number | null; field_name: string | null; language: string | null; translated_value: string | null; reviewed: boolean | null; is_published: boolean | null; status: string | null };
type TranslationState = { values: Partial<Record<FieldName, string>>; reviewed: boolean; published: boolean };
type TranslationPack = Record<string, Partial<Record<LanguageCode, TranslationState>>>;
type GenericRow = Record<string, unknown>;

const languages: Array<{ code: LanguageCode; label: string }> = [{ code: "en", label: "English" }, { code: "tr", label: "Türkçe" }];
const fields: Array<{ key: FieldName; label: string; helper: string }> = [
  { key: "title", label: "عنوان القصة", helper: "العنوان الرئيسي الظاهر في بطاقة القصة." },
  { key: "person_name", label: "الشخص أو الجهة", helper: "اسم الشخص أو الفريق أو الجهة المرتبطة بالقصة." },
  { key: "country", label: "البلد", helper: "البلد أو النطاق الجغرافي الظاهر في البطاقة." },
  { key: "platform", label: "المنصة أو الخدمة", helper: "اسم المنصة أو الخدمة المرتبطة بالقصة." },
  { key: "summary", label: "ملخص النتيجة", helper: "النتيجة المنظمة التي تظهر داخل صندوق مميز." },
  { key: "content", label: "القصة التفصيلية", helper: "النص التفصيلي الظاهر تحت الملخص." },
];

function text(row: GenericRow, key: string, fallback = "") { const value = row[key]; return typeof value === "string" ? value.trim() || fallback : typeof value === "number" ? String(value) : fallback; }
function emptyState(): TranslationState { return { values: {}, reviewed: false, published: false }; }
function itemKey(id: string) { return `success_stories:${id}`; }
function isField(value: string | null): value is FieldName { return fields.some((field) => field.key === value); }
function sourceValue(story: Story, field: FieldName) { if (field === "title") return story.title; if (field === "person_name") return story.personName; if (field === "country") return story.country; if (field === "platform") return story.platform; if (field === "summary") return story.resultSummary; return story.story; }
function activeFields(story: Story) { return fields.filter((field) => Boolean(sourceValue(story, field.key).trim())); }
function complete(story: Story, state: TranslationState) { const active = activeFields(story); return active.length > 0 && active.every((field) => Boolean(state.values[field.key]?.trim())); }
function progress(story: Story, state: TranslationState) { const active = activeFields(story); return active.length ? Math.round((active.filter((field) => Boolean(state.values[field.key]?.trim())).length / active.length) * 100) : 0; }

function buildPack(stories: Story[], rows: TranslationRow[]): TranslationPack {
  const next: TranslationPack = {};
  stories.forEach((story) => {
    const key = itemKey(story.id); next[key] = {};
    languages.forEach(({ code }) => {
      const matches = rows.filter((row) => String(row.source_id ?? "") === story.id && row.language === code && isField(row.field_name));
      const values: Partial<Record<FieldName, string>> = {};
      matches.forEach((row) => { if (isField(row.field_name)) values[row.field_name] = row.translated_value || ""; });
      const active = activeFields(story);
      const reviewed = active.length > 0 && active.every((field) => Boolean(matches.find((row) => row.field_name === field.key)?.reviewed));
      const published = reviewed && active.every((field) => { const row = matches.find((item) => item.field_name === field.key); return Boolean(row?.is_published || row?.status === "published"); });
      next[key][code] = { values, reviewed, published };
    });
  });
  return next;
}

export default function SuccessStoriesTranslationsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [stories, setStories] = useState<Story[]>([]);
  const [pack, setPack] = useState<TranslationPack>({});
  const [selectedId, setSelectedId] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { async function checkAccess() { const access = await requireAdminModuleAccess("success_stories"); if (!access.isAuthorized || !access.profile) { router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login"); setChecking(false); return; } setAdminEmail(access.profile.email || access.user?.email || ""); setAuthorized(true); setChecking(false); } void checkAccess(); }, [router]);
  useEffect(() => { if (authorized) void loadContent(); }, [authorized]);

  async function loadContent() {
    const client = supabase;
    if (!client) { setError("الاتصال بقاعدة البيانات غير مفعل."); setLoading(false); return; }
    setLoading(true); setMessage(""); setError("");
    const [storiesResult, translationsResult] = await Promise.all([
      client.from("success_stories").select("id, title, person_name, country, platform, result_summary, story, is_visible, status").order("is_featured", { ascending: false }).order("sort_order", { ascending: true }).limit(300),
      client.from("content_translations").select("source_id, field_name, language, translated_value, status, reviewed, is_published").eq("source_type", "success_stories").in("field_name", fields.map((field) => field.key)).in("language", ["en", "tr"]).limit(4000),
    ]);
    setLoading(false);
    if (storiesResult.error) { setError(`تعذر تحميل قصص النجاح: ${storiesResult.error.message}`); return; }
    const loaded = ((storiesResult.data || []) as GenericRow[]).map((row, index) => ({ id: text(row, "id", `story-${index}`), title: text(row, "title", "قصة بدون عنوان"), personName: text(row, "person_name"), country: text(row, "country"), platform: text(row, "platform"), resultSummary: text(row, "result_summary"), story: text(row, "story"), isVisible: row.is_visible !== false, status: text(row, "status", "published") }));
    setStories(loaded); setPack(buildPack(loaded, (translationsResult.data || []) as TranslationRow[])); setSelectedId((current) => current || loaded[0]?.id || "");
    if (translationsResult.error) setError(`تم تحميل القصص، لكن تعذر تحميل ترجماتها: ${translationsResult.error.message}`);
  }

  const selectedStory = stories.find((story) => story.id === selectedId) || stories[0] || null;
  const selectedKey = selectedStory ? itemKey(selectedStory.id) : "";
  const state = selectedKey ? pack[selectedKey]?.[language] || emptyState() : emptyState();
  const isComplete = selectedStory ? complete(selectedStory, state) : false;
  const reviewedCount = useMemo(() => stories.filter((story) => { const item = pack[itemKey(story.id)]?.[language] || emptyState(); return item.reviewed && complete(story, item); }).length, [stories, pack, language]);
  const publishedCount = useMemo(() => stories.filter((story) => { const item = pack[itemKey(story.id)]?.[language] || emptyState(); return item.published && item.reviewed && complete(story, item); }).length, [stories, pack, language]);

  function updateValue(field: FieldName, value: string) { if (!selectedStory) return; setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { values: { ...previous.values, [field]: value }, reviewed: false, published: false } } }; }); }
  function setReviewed(reviewed: boolean) { if (!selectedStory || (reviewed && !isComplete)) return; setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { ...previous, reviewed, published: reviewed ? previous.published : false } } }; }); }
  function setPublished(published: boolean) { if (!selectedStory || !isComplete || !state.reviewed) return; setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { ...previous, published } } }; }); }

  async function saveSelected() {
    const client = supabase;
    if (!client || !selectedStory) { setError("اختر قصة نجاح أولاً."); return; }
    const active = activeFields(selectedStory);
    if (!active.some((field) => Boolean(state.values[field.key]?.trim()))) { setError("أدخل ترجمة واحدة على الأقل قبل الحفظ."); return; }
    if (state.reviewed && !isComplete) { setError("لا يمكن اعتبار الترجمة مراجعة قبل اكتمال كل الحقول العربية المتوفرة."); return; }
    const reviewed = Boolean(state.reviewed && isComplete); const published = Boolean(state.published && reviewed && isComplete); const status = published ? "published" : reviewed ? "reviewed" : "needs_review";
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = await client.from("content_translations").upsert(active.map((field) => ({ source_type: "success_stories", source_id: selectedStory.id, field_name: field.key, language, translated_value: state.values[field.key] || "", status, reviewed, is_published: published, created_by: adminEmail, updated_by: adminEmail, updated_at: new Date().toISOString() })), { onConflict: "source_type,source_id,field_name,language" });
    setSaving(false);
    if (saveError) { setError(`تعذر حفظ ترجمة القصة: ${saveError.message}`); return; }
    setMessage(published ? "تم حفظ الترجمة ونشرها يدوياً. لن تظهر للعامة إلا إذا كانت القصة مكتملة." : reviewed ? "تم حفظ الترجمة بحالة مراجع. لن تظهر للعامة قبل تفعيل النشر اليدوي." : "تم الحفظ بحالة تحتاج مراجعة. لن تظهر للعامة.");
    await loadContent();
  }

  if (checking || loading) return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز ترجمة قصص النجاح...</div></main>;
  if (!authorized) return null;

  return <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8"><section className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">Success stories translations</div><h1 className="text-4xl font-black md:text-5xl">مراجعة ونشر ترجمات قصص النجاح</h1><p className="mt-3 max-w-3xl leading-8 text-white/60">لا تظهر القصة EN/TR للعامة إلا عند اكتمال حقولها المتوفرة ومراجعتها ونشرها يدوياً.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/translations/automation" className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100">ترجمة دفعة مراقبة</Link><Link href="/admin/success-stories" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">إدارة قصص النجاح</Link></div></div>{message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 leading-8 text-green-100">{message}</div> : null}{error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 leading-8 text-red-100">{error}</div> : null}<div className="mb-6 grid gap-4 md:grid-cols-3"><Stat label="إجمالي القصص" value={stories.length} /><Stat label={`مراجعة (${language})`} value={reviewedCount} /><Stat label={`منشورة (${language})`} value={publishedCount} /></div><div className="grid gap-6 lg:grid-cols-[0.8fr_1.5fr]"><aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4"><div className="mb-4 flex gap-2">{languages.map((item) => <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${language === item.code ? "bg-yellow-500/20 text-yellow-100" : "bg-black/20 text-white/65"}`}>{item.label}</button>)}</div><div className="grid gap-2">{stories.map((story) => { const item = pack[itemKey(story.id)]?.[language] || emptyState(); const percent = progress(story, item); return <button key={story.id} type="button" onClick={() => setSelectedId(story.id)} className={`rounded-2xl border p-4 text-right ${selectedStory?.id === story.id ? "border-yellow-300/60 bg-yellow-500/10" : "border-white/10 bg-black/20"}`}><div className="font-black">{story.title}</div><div className="mt-2 flex items-center justify-between text-xs text-white/55"><span>{percent}% مكتمل</span><span>{item.published && item.reviewed && percent === 100 ? "منشور" : item.reviewed && percent === 100 ? "مراجع" : "يحتاج مراجعة"}</span></div></button>; })}{!stories.length ? <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-white/60">لا توجد قصص نجاح حالياً.</div> : null}</div></aside><section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">{selectedStory ? <><div className="mb-6"><div className="text-sm font-bold text-yellow-100">{language === "en" ? "English" : "Türkçe"}</div><h2 className="mt-2 text-3xl font-black">{selectedStory.title}</h2><p className="mt-3 text-white/60">أكمل الحقول العربية المتوفرة فقط. كل تعديل يعيد الترجمة إلى حالة تحتاج مراجعة.</p></div><div className="grid gap-5">{activeFields(selectedStory).map((field) => <label key={field.key} className="block rounded-3xl border border-white/10 bg-black/20 p-4"><div className="mb-3"><div className="font-black">{field.label}</div><div className="mt-1 text-sm text-white/55">{field.helper}</div></div><div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-7 text-white/70">{sourceValue(selectedStory, field.key)}</div><textarea value={state.values[field.key] || ""} onChange={(event) => updateValue(field.key, event.target.value)} className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-[#070009] p-4 text-white outline-none focus:border-yellow-300/60" /></label>)}</div><div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2"><label className="flex items-start gap-3"><input type="checkbox" checked={state.reviewed} disabled={!isComplete} onChange={(event) => setReviewed(event.target.checked)} className="mt-1 h-5 w-5 accent-yellow-500 disabled:opacity-50" /><span><strong className="block">تمت المراجعة</strong><span className="mt-1 block text-sm text-white/55">يتطلب اكتمال كل الحقول المتوفرة.</span></span></label><label className="flex items-start gap-3"><input type="checkbox" checked={state.published} disabled={!isComplete || !state.reviewed} onChange={(event) => setPublished(event.target.checked)} className="mt-1 h-5 w-5 accent-green-500 disabled:opacity-50" /><span><strong className="block">نشر يدوي للعامة</strong><span className="mt-1 block text-sm text-white/55">لا يوجد أي نشر تلقائي.</span></span></label></div><button type="button" onClick={() => void saveSelected()} disabled={saving} className="mt-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 px-7 py-4 font-black text-black disabled:opacity-60">{saving ? "جاري الحفظ..." : "حفظ حالة الترجمة"}</button></> : <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/60">اختر قصة نجاح لبدء المراجعة.</div>}</section></div></section></main>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
