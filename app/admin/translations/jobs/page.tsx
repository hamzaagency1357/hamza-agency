"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type FieldName = "title" | "department" | "location" | "job_type" | "summary" | "content" | "requirements";
type GenericRow = Record<string, unknown>;
type Job = { id: string; title: string; department: string; location: string; job_type: string; summary: string; content: string; requirements: string; status: string; isVisible: boolean };
type TranslationRow = { source_id: string | number | null; field_name: string | null; language: string | null; translated_value: string | null; reviewed: boolean | null; is_published: boolean | null; status: string | null };
type TranslationState = { values: Partial<Record<FieldName, string>>; reviewed: boolean; published: boolean };
type TranslationPack = Record<string, Partial<Record<LanguageCode, TranslationState>>>;

const languages: Array<{ code: LanguageCode; label: string }> = [{ code: "en", label: "English" }, { code: "tr", label: "Türkçe" }];
const fields: Array<{ key: FieldName; label: string; helper: string }> = [
  { key: "title", label: "عنوان الوظيفة", helper: "العنوان الظاهر في البطاقة ونافذة التقديم." },
  { key: "department", label: "القسم", helper: "وسم القسم الظاهر في البطاقة." },
  { key: "location", label: "الموقع", helper: "وسم الموقع الظاهر في البطاقة." },
  { key: "job_type", label: "نوع الوظيفة", helper: "وسم نوع الدوام الظاهر في البطاقة." },
  { key: "summary", label: "الملخص", helper: "الوصف القصير الظاهر في البطاقة." },
  { key: "content", label: "الوصف", helper: "الوصف التفصيلي المخزن للوظيفة." },
  { key: "requirements", label: "المتطلبات", helper: "المتطلبات الظاهرة للمتقدم." },
];

function emptyState(): TranslationState { return { values: {}, reviewed: false, published: false }; }
function makeKey(id: string) { return `jobs:${id}`; }
function text(row: GenericRow, key: string, fallback = "") { const value = row[key]; return typeof value === "string" ? value.trim() || fallback : typeof value === "number" ? String(value) : fallback; }
function isField(value: string | null): value is FieldName { return fields.some((field) => field.key === value); }
function sourceValue(job: Job, field: FieldName) { if (field === "title") return job.title; if (field === "department") return job.department; if (field === "location") return job.location; if (field === "job_type") return job.job_type; if (field === "summary") return job.summary; if (field === "content") return job.content; return job.requirements; }
function activeFields(job: Job) { return fields.filter((field) => Boolean(sourceValue(job, field.key).trim())); }
function isComplete(job: Job, state: TranslationState) { const active = activeFields(job); return active.length > 0 && active.every((field) => Boolean(state.values[field.key]?.trim())); }
function completion(job: Job, state: TranslationState) { const active = activeFields(job); return active.length ? Math.round((active.filter((field) => Boolean(state.values[field.key]?.trim())).length / active.length) * 100) : 0; }

function buildPack(jobs: Job[], rows: TranslationRow[]): TranslationPack {
  const next: TranslationPack = {};
  jobs.forEach((job) => {
    const key = makeKey(job.id);
    next[key] = {};
    languages.forEach(({ code }) => {
      const jobRows = rows.filter((row) => String(row.source_id ?? "") === job.id && row.language === code && isField(row.field_name));
      const values: Partial<Record<FieldName, string>> = {};
      jobRows.forEach((row) => { if (isField(row.field_name)) values[row.field_name] = row.translated_value || ""; });
      const active = activeFields(job);
      const reviewed = active.length > 0 && active.every((field) => Boolean(jobRows.find((row) => row.field_name === field.key)?.reviewed));
      const published = reviewed && active.every((field) => { const row = jobRows.find((candidate) => candidate.field_name === field.key); return Boolean(row?.is_published || row?.status === "published"); });
      next[key][code] = { values, reviewed, published };
    });
  });
  return next;
}

export default function JobsTranslationsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pack, setPack] = useState<TranslationPack>({});
  const [selectedId, setSelectedId] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        setCheckingAccess(false);
        return;
      }
      setAdminEmail(access.profile.email || access.user?.email || "");
      setAuthorized(true);
      setCheckingAccess(false);
    }
    void checkAccess();
  }, [router]);

  useEffect(() => { if (authorized) void loadContent(); }, [authorized]);

  async function loadContent() {
    const client = supabase;
    if (!client) { setError("الاتصال بقاعدة البيانات غير مفعل."); setLoading(false); return; }
    setLoading(true); setError(""); setMessage("");
    const [jobsResult, translationsResult] = await Promise.all([
      client.from("jobs").select("id, title, department, location, job_type, short_description, description, requirements, status, is_visible").order("sort_order", { ascending: true }).limit(300),
      client.from("content_translations").select("source_id, field_name, language, translated_value, status, reviewed, is_published").eq("source_type", "jobs").in("field_name", fields.map((field) => field.key)).in("language", ["en", "tr"]).limit(4000),
    ]);
    setLoading(false);
    if (jobsResult.error) { setError(`تعذر تحميل الوظائف: ${jobsResult.error.message}`); return; }
    const loadedJobs = ((jobsResult.data || []) as GenericRow[]).map((row, index) => ({ id: text(row, "id", `job-${index}`), title: text(row, "title", "وظيفة بدون عنوان"), department: text(row, "department"), location: text(row, "location"), job_type: text(row, "job_type"), summary: text(row, "short_description"), content: text(row, "description"), requirements: text(row, "requirements"), status: text(row, "status", "open"), isVisible: row.is_visible !== false }));
    setJobs(loadedJobs);
    setPack(buildPack(loadedJobs, (translationsResult.data || []) as TranslationRow[]));
    setSelectedId((current) => current || loadedJobs[0]?.id || "");
    if (translationsResult.error) setError(`تم تحميل الوظائف، لكن تعذر تحميل ترجماتها: ${translationsResult.error.message}`);
  }

  const selectedJob = jobs.find((job) => job.id === selectedId) || jobs[0] || null;
  const selectedKey = selectedJob ? makeKey(selectedJob.id) : "";
  const selectedState = selectedKey ? pack[selectedKey]?.[language] || emptyState() : emptyState();
  const selectedComplete = selectedJob ? isComplete(selectedJob, selectedState) : false;
  const reviewedCount = jobs.filter((job) => { const state = pack[makeKey(job.id)]?.[language] || emptyState(); return state.reviewed && isComplete(job, state); }).length;
  const publishedCount = jobs.filter((job) => { const state = pack[makeKey(job.id)]?.[language] || emptyState(); return state.published && state.reviewed && isComplete(job, state); }).length;

  function updateValue(field: FieldName, value: string) {
    if (!selectedJob) return;
    setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { values: { ...previous.values, [field]: value }, reviewed: false, published: false } } }; });
  }
  function setReviewed(reviewed: boolean) {
    if (!selectedJob || (reviewed && !selectedComplete)) return;
    setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { ...previous, reviewed, published: reviewed ? previous.published : false } } }; });
  }
  function setPublished(published: boolean) {
    if (!selectedJob || !selectedComplete || !selectedState.reviewed) return;
    setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { ...previous, published } } }; });
  }

  async function saveSelected() {
    const client = supabase;
    if (!client || !selectedJob) { setError("اختر وظيفة أولاً."); return; }
    const active = activeFields(selectedJob);
    if (!active.some((field) => Boolean(selectedState.values[field.key]?.trim()))) { setError("أدخل ترجمة واحدة على الأقل قبل الحفظ."); return; }
    if (selectedState.reviewed && !selectedComplete) { setError("لا يمكن اعتبار الترجمة مراجعة قبل اكتمال كل الحقول العربية المتوفرة وترجمتها."); return; }
    const reviewed = Boolean(selectedState.reviewed && selectedComplete);
    const published = Boolean(selectedState.published && reviewed && selectedComplete);
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";
    setSaving(true); setError(""); setMessage("");
    const now = new Date().toISOString();
    const { error: saveError } = await client.from("content_translations").upsert(active.map((field) => ({ source_type: "jobs", source_id: selectedJob.id, field_name: field.key, language, translated_value: selectedState.values[field.key] || "", status, reviewed, is_published: published, created_by: adminEmail, updated_by: adminEmail, updated_at: now })), { onConflict: "source_type,source_id,field_name,language" });
    setSaving(false);
    if (saveError) { setError(`تعذر حفظ ترجمة الوظيفة: ${saveError.message}`); return; }
    setMessage(published ? "تم حفظ الترجمة ونشرها يدوياً. ستظهر للعامة فقط عندما تكون جميع الحقول المنشورة مكتملة." : reviewed ? "تم حفظ الترجمة بحالة مراجع. لن تظهر للعامة قبل تفعيل النشر اليدوي." : "تم حفظ الترجمة بحالة تحتاج مراجعة. لن تظهر للعامة.");
    await loadContent();
  }

  if (checkingAccess || loading) return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز ترجمة الوظائف...</div></main>;
  if (!authorized) return null;

  return <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8"><section className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">Jobs translations</div><h1 className="text-4xl font-black md:text-5xl">مراجعة ونشر ترجمات الوظائف</h1><p className="mt-3 max-w-3xl leading-8 text-white/60">لا يظهر أي نص EN/TR للعامة قبل اكتمال الحقول المتوفرة، مراجعتها، ثم نشرها يدوياً.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/translations/automation" className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100">ترجمة دفعة مراقبة</Link><Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">لوحة الإدارة</Link></div></div>{message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 leading-8 text-green-100">{message}</div> : null}{error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 leading-8 text-red-100">{error}</div> : null}<div className="mb-6 grid gap-4 md:grid-cols-3"><Stat label="إجمالي الوظائف" value={jobs.length} /><Stat label={`مكتملة ومراجعة (${language})`} value={reviewedCount} /><Stat label={`منشورة (${language})`} value={publishedCount} /></div><div className="grid gap-6 lg:grid-cols-[0.8fr_1.5fr]"><aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4"><div className="mb-4 flex gap-2">{languages.map((item) => <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${language === item.code ? "bg-cyan-500/20 text-cyan-100" : "bg-black/20 text-white/65"}`}>{item.label}</button>)}</div><div className="grid gap-2">{jobs.map((job) => { const state = pack[makeKey(job.id)]?.[language] || emptyState(); const done = completion(job, state); return <button key={job.id} type="button" onClick={() => setSelectedId(job.id)} className={`rounded-2xl border p-4 text-right ${selectedJob?.id === job.id ? "border-cyan-300/60 bg-cyan-500/10" : "border-white/10 bg-black/20"}`}><div className="font-black">{job.title}</div><div className="mt-2 flex items-center justify-between text-xs text-white/55"><span>{done}% مكتمل</span><span>{state.published && state.reviewed && done === 100 ? "منشور" : state.reviewed && done === 100 ? "مراجع" : "يحتاج مراجعة"}</span></div></button>; })}{!jobs.length ? <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-white/60">لا توجد وظائف حالياً.</div> : null}</div></aside><section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">{selectedJob ? <><div className="mb-6"><div className="text-sm font-bold text-cyan-100">{language === "en" ? "English" : "Türkçe"}</div><h2 className="mt-2 text-3xl font-black">{selectedJob.title}</h2><p className="mt-3 text-white/60">أكمل الحقول العربية المتوفرة فقط. الحقول الفارغة في الأصل لا تطلب ترجمة.</p></div><div className="grid gap-5">{activeFields(selectedJob).map((field) => <label key={field.key} className="block rounded-3xl border border-white/10 bg-black/20 p-4"><div className="mb-3"><div className="font-black">{field.label}</div><div className="mt-1 text-sm text-white/55">{field.helper}</div></div><div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-7 text-white/70">{sourceValue(selectedJob, field.key)}</div><textarea value={selectedState.values[field.key] || ""} onChange={(event) => updateValue(field.key, event.target.value)} className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-[#070009] p-4 text-white outline-none focus:border-cyan-300/60" /></label>)}</div><div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2"><label className="flex items-start gap-3"><input type="checkbox" checked={selectedState.reviewed} disabled={!selectedComplete} onChange={(event) => setReviewed(event.target.checked)} className="mt-1 h-5 w-5 accent-cyan-500 disabled:opacity-50" /><span><strong className="block">تمت المراجعة</strong><span className="mt-1 block text-sm text-white/55">يتطلب اكتمال كل الحقول المتوفرة.</span></span></label><label className="flex items-start gap-3"><input type="checkbox" checked={selectedState.published} disabled={!selectedComplete || !selectedState.reviewed} onChange={(event) => setPublished(event.target.checked)} className="mt-1 h-5 w-5 accent-green-500 disabled:opacity-50" /><span><strong className="block">نشر يدوي للعامة</strong><span className="mt-1 block text-sm text-white/55">لن يظهر إلا بعد الحفظ، وبدون نشر تلقائي.</span></span></label></div><button type="button" onClick={() => void saveSelected()} disabled={saving} className="mt-6 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-7 py-4 font-black text-white disabled:opacity-60">{saving ? "جاري الحفظ..." : "حفظ حالة الترجمة"}</button></> : <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/60">اختر وظيفة لبدء المراجعة.</div>}</section></div></section></main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
