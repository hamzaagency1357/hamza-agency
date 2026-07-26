"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Status = "draft" | "needs_review" | "reviewed" | "published" | "superseded" | "archived";
type LanguageFilter = "all" | "en" | "tr";
type StaleFilter = "all" | "stale" | "fresh";
type Source = { id: string; source_snapshot: Record<string, string> | null };
type Revision = { id: string; source_revision_id: string; source_type: string; source_id: string; language: "en" | "tr"; workflow_status: Status; is_stale: boolean; stale_reason: string | null; supersedes_translation_revision_id: string | null; updated_at: string | null; review_notes: string | null };
type Field = { id: string; translation_revision_id: string; field_name: string; translated_value: string };

const labels: Record<string, string> = { programs: "البرامج", pages: "صفحات CMS", sections: "أقسام CMS", faqs: "FAQ", knowledge_base: "مركز المعرفة", partners: "الشركاء", jobs: "الوظائف", reviews: "التقييمات", success_stories: "قصص النجاح", gallery_items: "المعرض", announcements: "الإعلانات", services: "الخدمات", legal_pages: "الصفحات القانونية", title: "العنوان", summary: "الملخص", content: "المحتوى", requirements: "الشروط", benefits: "المزايا", updates: "التحديثات", faq: "الأسئلة الشائعة", department: "القسم", location: "الموقع", job_type: "نوع الوظيفة", country: "الدولة", person_name: "الاسم", platform: "المنصة", button_label: "نص الزر", meta_title: "عنوان SEO", meta_description: "وصف SEO", question: "السؤال", answer: "الإجابة" };
const statusLabels: Record<Status, string> = { draft: "Draft / مسودة", needs_review: "Needs Review / تحتاج مراجعة", reviewed: "Reviewed / جاهزة للنشر", published: "Published / منشورة", superseded: "Superseded / مستبدلة", archived: "Archived / مؤرشفة" };
const statusHelp: Record<Status, string> = {
  draft: "نسخة مرشحة قابلة للحفظ والتعديل، ولا تظهر للعامة.",
  needs_review: "نسخة تحتاج مراجعة قبل اعتمادها، ولا تظهر للعامة.",
  reviewed: "نسخة راجعها المدير ويمكن نشرها يدوياً إذا لم تكن Stale.",
  published: "النسخة المنشورة هي التي يقرأها الموقع العام حالياً، حتى لو أصبحت Stale.",
  superseded: "نسخة قديمة تم استبدالها بعد نشر نسخة أحدث.",
  archived: "نسخة مؤرشفة لا تستخدم للنشر العام.",
};
const editableStatuses: Status[] = ["draft", "needs_review", "reviewed"];
const statusOptions: Status[] = ["draft", "needs_review", "reviewed", "published", "superseded", "archived"];

function entries(snapshot: Record<string, string> | null | undefined) { return Object.entries(snapshot || {}).filter(([, value]) => typeof value === "string" && value.trim()); }
function revisionTitle(source: Source | undefined, revision: Revision) { const snapshot = source?.source_snapshot || {}; return snapshot.title || snapshot.question || snapshot.person_name || `${labels[revision.source_type] || revision.source_type} #${revision.source_id}`; }
function date(value: string | null) { return value ? new Date(value).toLocaleString("ar") : "—"; }
function visibleStatusLabel(revision: Revision) { if (revision.workflow_status === "published" && revision.is_stale) return "Published but Stale / منشورة لكنها قديمة"; return statusLabels[revision.workflow_status]; }
function badge(status: Status, stale: boolean) {
  if (status === "published" && stale) return "border-yellow-400/35 bg-yellow-500/10 text-yellow-100";
  if (status === "published") return "border-green-400/30 bg-green-500/10 text-green-100";
  if (status === "reviewed") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
  if (status === "needs_review") return "border-orange-400/30 bg-orange-500/10 text-orange-100";
  if (status === "superseded") return "border-white/15 bg-white/[0.06] text-white/55";
  return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100";
}
function selectClassName() { return "rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none"; }

export default function TranslationRevisionsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [staleFilter, setStaleFilter] = useState<StaleFilter>("all");

  useEffect(() => { void (async () => { const access = await requireAdminModuleAccess("settings"); if (!access.isAuthorized) { router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login"); return; } setReady(true); })(); }, [router]);

  const load = useCallback(async (preferredId?: string) => {
    if (!supabase) { setError("الاتصال بقاعدة البيانات غير مفعل."); setLoading(false); return; }
    setLoading(true); setError("");
    const [revisionResult, sourceResult, fieldResult] = await Promise.all([
      supabase.from("content_translation_revisions").select("id, source_revision_id, source_type, source_id, language, workflow_status, is_stale, stale_reason, supersedes_translation_revision_id, updated_at, review_notes").order("updated_at", { ascending: false }).limit(1000),
      supabase.from("translation_source_revisions").select("id, source_snapshot").limit(1000),
      supabase.from("content_translation_revision_fields").select("id, translation_revision_id, field_name, translated_value").limit(12000),
    ]);
    setLoading(false);
    const failures = [revisionResult.error, sourceResult.error, fieldResult.error].filter(Boolean);
    if (failures.length) { setError(`تعذر تحميل مساحة Revisions. هذه المساحة متاحة للإدارة العليا فقط. ${failures.map((item) => item?.message).join(" | ")}`); return; }
    const next = (revisionResult.data || []) as Revision[];
    setRevisions(next); setSources((sourceResult.data || []) as Source[]); setFields((fieldResult.data || []) as Field[]);
    setSelectedId((currentId) => {
      const target = preferredId || currentId;
      return next.some((item) => item.id === target) ? target : next[0]?.id || "";
    });
  }, []);

  useEffect(() => { if (ready) void load(); }, [load, ready]);

  const sourceMap = useMemo(() => new Map(sources.map((item) => [item.id, item])), [sources]);
  const fieldMap = useMemo(() => { const map = new Map<string, Field[]>(); fields.forEach((field) => map.set(field.translation_revision_id, [...(map.get(field.translation_revision_id) || []), field])); return map; }, [fields]);
  const sourceTypeOptions = useMemo(() => Array.from(new Set(revisions.map((revision) => revision.source_type))).sort(), [revisions]);
  const filteredRevisions = useMemo(() => revisions.filter((revision) => {
    if (sourceTypeFilter !== "all" && revision.source_type !== sourceTypeFilter) return false;
    if (languageFilter !== "all" && revision.language !== languageFilter) return false;
    if (statusFilter !== "all" && revision.workflow_status !== statusFilter) return false;
    if (staleFilter === "stale" && !revision.is_stale) return false;
    if (staleFilter === "fresh" && revision.is_stale) return false;
    return true;
  }), [revisions, sourceTypeFilter, languageFilter, statusFilter, staleFilter]);
  const selected = useMemo(
    () => filteredRevisions.find((item) => item.id === selectedId) || filteredRevisions[0] || null,
    [filteredRevisions, selectedId]
  );
  const source = useMemo(
    () => selected ? sourceMap.get(selected.source_revision_id) : undefined,
    [selected, sourceMap]
  );
  const sourceEntries = useMemo(() => entries(source?.source_snapshot), [source]);
  const selectedFields = useMemo(
    () => selected ? fieldMap.get(selected.id) || [] : [],
    [fieldMap, selected]
  );
  const previous = selected?.supersedes_translation_revision_id ? revisions.find((item) => item.id === selected.supersedes_translation_revision_id) || null : null;
  const previousFields = previous ? fieldMap.get(previous.id) || [] : [];
  const editable = Boolean(selected && !selected.is_stale && editableStatuses.includes(selected.workflow_status));
  const visibleOnPublic = Boolean(selected && selected.workflow_status === "published");
  const missing = sourceEntries.filter(([name]) => !values[name]?.trim()).map(([name]) => name);
  const stats = {
    active: revisions.filter((row) => editableStatuses.includes(row.workflow_status) && !row.is_stale).length,
    reviewed: revisions.filter((row) => row.workflow_status === "reviewed" && !row.is_stale).length,
    stale: revisions.filter((row) => row.is_stale).length,
    published: revisions.filter((row) => row.workflow_status === "published").length,
    filtered: filteredRevisions.length,
  };

  useEffect(() => { if (!selected) return; const next: Record<string, string> = {}; sourceEntries.forEach(([name]) => { next[name] = selectedFields.find((field) => field.field_name === name)?.translated_value || ""; }); setValues(next); setNotes(selected.review_notes || ""); }, [selected, selectedFields, sourceEntries]);

  async function invoke(kind: "save" | "review" | "publish") {
    if (!supabase || !selected) return;
    if (kind === "review" && missing.length) { setError(`أكمل الحقول التالية أولاً: ${missing.map((name) => labels[name] || name).join("، ")}`); return; }
    if (kind === "publish" && (!window.confirm("سيتم نشر هذه النسخة يدوياً واستبدال النسخة السابقة فقط. متابعة؟"))) return;
    setBusy(true); setError(""); setMessage("");
    const result = kind === "save"
      ? await supabase.rpc("save_translation_candidate_fields", { p_translation_revision_id: selected.id, p_translated_fields: values })
      : kind === "review"
        ? await supabase.rpc("review_translation_candidate", { p_translation_revision_id: selected.id, p_review_notes: notes.trim() || null })
        : await supabase.rpc("publish_translation_candidate", { p_translation_revision_id: selected.id });
    setBusy(false);
    if (result.error) { setError(`تعذرت العملية: ${result.error.message}`); return; }
    setMessage(kind === "save" ? "تم حفظ Draft بحالة تحتاج مراجعة. لم يتغير أي محتوى ظاهر للعامة." : kind === "review" ? "تم اعتماد المراجعة. لا تزال الترجمة غير منشورة للعامة." : "تم النشر الذري. أصبحت هذه النسخة هي النسخة العامة المعتمدة.");
    await load(selected.id);
  }

  if (!ready || loading) return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز مساحة مراجعة إصدارات الترجمة...</div></main>;

  return <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8"><section className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">Revision Lifecycle</div><h1 className="text-4xl font-black md:text-5xl">مراجعة إصدارات الترجمة</h1><p className="mt-3 max-w-4xl leading-8 text-white/60">Draft الجديد منفصل عن النسخة المنشورة. عند تغير العربي تبقى النسخة العامة ظاهرة، ولا يظهر البديل قبل المراجعة والنشر اليدوي.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/translations/automation" className="w-fit rounded-full border border-purple-300/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100">فتح Automation</Link><button type="button" onClick={() => void load(selected?.id)} className="w-fit rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 font-bold text-white/80">تحديث البيانات</button></div></div>
    <section className="mb-6 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-5 text-cyan-50"><h2 className="text-xl font-black">ما يظهر للعامة الآن؟</h2><div className="mt-3 grid gap-3 leading-8 text-white/72 md:grid-cols-3"><p>الترجمة المنشورة Published تبقى ظاهرة للعامة حتى لو أصبحت Stale بعد تعديل العربي.</p><p>أي Candidate جديد بحالة Draft أو Needs Review أو Reviewed لا يظهر للعامة قبل Review و Publish.</p><p>عند النشر اليدوي تصبح النسخة الجديدة هي الظاهرة للعامة، والنسخة السابقة تصبح Superseded.</p></div></section>
    {message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div> : null}{error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Stat label="مسودات حالية" value={stats.active} /><Stat label="جاهزة للنشر" value={stats.reviewed} /><Stat label="نسخ Stale" value={stats.stale} /><Stat label="نسخ منشورة" value={stats.published} /><Stat label="نتائج الفلتر" value={stats.filtered} /></div>
    <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">فلاتر المراجعة</h2><button type="button" onClick={() => { setSourceTypeFilter("all"); setLanguageFilter("all"); setStatusFilter("all"); setStaleFilter("all"); }} className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm font-bold text-white/70">إلغاء الفلاتر</button></div><div className="grid gap-4 md:grid-cols-4"><label className="grid gap-2 text-sm font-black text-white/70"><span>source_type</span><select value={sourceTypeFilter} onChange={(event) => setSourceTypeFilter(event.target.value)} className={selectClassName()}><option value="all">كل المصادر</option>{sourceTypeOptions.map((sourceType) => <option key={sourceType} value={sourceType}>{labels[sourceType] || sourceType}</option>)}</select></label><label className="grid gap-2 text-sm font-black text-white/70"><span>language</span><select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value as LanguageFilter)} className={selectClassName()}><option value="all">كل اللغات</option><option value="en">English</option><option value="tr">Türkçe</option></select></label><label className="grid gap-2 text-sm font-black text-white/70"><span>workflow_status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | Status)} className={selectClassName()}><option value="all">كل الحالات</option>{statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label><label className="grid gap-2 text-sm font-black text-white/70"><span>Stale</span><select value={staleFilter} onChange={(event) => setStaleFilter(event.target.value as StaleFilter)} className={selectClassName()}><option value="all">كل النسخ</option><option value="stale">Stale فقط</option><option value="fresh">Not Stale فقط</option></select></label></div></section>
    <section className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{statusOptions.filter((status) => status !== "archived").map((status) => <div key={status} className={`rounded-2xl border p-4 ${badge(status, false)}`}><div className="text-sm font-black">{statusLabels[status]}</div><p className="mt-2 text-xs leading-6 text-white/65">{statusHelp[status]}</p></div>)}<div className={`rounded-2xl border p-4 ${badge("published", true)}`}><div className="text-sm font-black">Published but Stale</div><p className="mt-2 text-xs leading-6 text-white/65">منشورة وقديمة لكنها تبقى ظاهرة للعامة حتى نشر نسخة أحدث.</p></div></section>
    {!revisions.length ? <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center"><h2 className="text-2xl font-black">لا توجد Revisions جديدة بعد</h2><p className="mx-auto mt-3 max-w-2xl leading-8 text-white/60">هذا طبيعي إذا لم يتم إنشاء Candidates بعد. الترجمات المنشورة أو Legacy fallback تبقى كما هي.</p></section> : !filteredRevisions.length ? <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center"><h2 className="text-2xl font-black">لا توجد نتائج مطابقة للفلاتر</h2><p className="mx-auto mt-3 max-w-2xl leading-8 text-white/60">خفف الفلاتر أو اضغط إلغاء الفلاتر للعودة إلى كل Revisions.</p></section> : <div className="grid gap-6 xl:grid-cols-[minmax(0,390px)_1fr]"><section className="grid max-h-[74vh] gap-3 overflow-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">{filteredRevisions.map((revision) => <button key={revision.id} type="button" onClick={() => setSelectedId(revision.id)} className={`rounded-2xl border p-4 text-right ${selected?.id === revision.id ? "border-yellow-300/50 bg-yellow-500/10" : "border-white/10 bg-black/20"}`}><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-black text-purple-100">{labels[revision.source_type] || revision.source_type}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${badge(revision.workflow_status, revision.is_stale)}`}>{visibleStatusLabel(revision)}</span></div><div className="font-black leading-7">{revisionTitle(sourceMap.get(revision.source_revision_id), revision)}</div><div className="mt-2 flex justify-between text-xs text-white/50"><span>{revision.language === "en" ? "English" : "Türkçe"}</span><span>{date(revision.updated_at)}</span></div>{revision.workflow_status === "published" ? <div className="mt-3 inline-flex rounded-full border border-green-300/20 bg-green-500/10 px-3 py-1 text-xs font-black text-green-100">ظاهر للعامة الآن</div> : null}</button>)}</section><section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">{!selected ? null : <div className="grid gap-6"><div className="rounded-3xl border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-black text-yellow-100">{labels[selected.source_type] || selected.source_type} · {selected.language === "en" ? "English" : "Türkçe"}</div><h2 className="mt-2 text-2xl font-black">{revisionTitle(source, selected)}</h2><p className="mt-2 text-sm text-white/55">آخر تعديل: {date(selected.updated_at)}</p><p className="mt-2 text-sm leading-7 text-white/55">{selected.is_stale && selected.workflow_status === "published" ? "هذه النسخة منشورة لكنها Stale. تبقى ظاهرة للعامة حتى نشر نسخة أحدث." : statusHelp[selected.workflow_status]}</p></div><div className="flex flex-col items-start gap-2"><span className={`rounded-full border px-4 py-2 text-sm font-black ${badge(selected.workflow_status, selected.is_stale)}`}>{visibleStatusLabel(selected)}</span>{visibleOnPublic ? <span className="rounded-full border border-green-300/20 bg-green-500/10 px-4 py-2 text-xs font-black text-green-100">ظاهر للعامة الآن</span> : null}</div></div></div>{selected.is_stale ? <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-5 text-yellow-100"><strong>هذا الإصدار غير صالح للنشر إذا كان Candidate.</strong><span className="mt-2 block text-sm leading-7">تبقى النسخة المنشورة ظاهرة للعامة حتى نشر Draft أحدث. {selected.stale_reason ? `السبب: ${selected.stale_reason}` : ""}</span></div> : null}<Panel title="النص العربي المعتمد لهذا الإصدار" entries={sourceEntries} tone="cyan" />{previous ? <Panel title="النسخة المنشورة السابقة" entries={previousFields.map((field) => [field.field_name, field.translated_value] as [string, string])} tone="green" /> : <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">لا توجد نسخة منشورة سابقة مرتبطة بهذا Draft بعد.</div>}<section className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/[0.05] p-5"><h3 className="text-xl font-black">الترجمة المرشحة</h3><p className="mt-2 text-sm leading-7 text-white/55">لا تظهر للعامة قبل المراجعة والنشر اليدوي الذرّي.</p><div className="mt-5 grid gap-5">{sourceEntries.map(([name, arabic]) => <label key={name} className="grid gap-2 text-sm font-black text-white/80"><span>{labels[name] || name}</span><div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-normal leading-6 text-white/45">العربي: {arabic}</div>{["title", "summary", "country", "platform", "department", "location", "job_type", "person_name", "button_label"].includes(name) ? <input dir="auto" value={values[name] || ""} disabled={!editable || busy} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" /> : <textarea dir="auto" value={values[name] || ""} disabled={!editable || busy} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" />}</label>)}</div>{missing.length ? <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm text-yellow-100">الحقول الناقصة: {missing.map((name) => labels[name] || name).join("، ")}</div> : null}</section><label className="grid gap-2 text-sm font-black text-white/80"><span>ملاحظات المراجعة الداخلية</span><textarea value={notes} disabled={!editable || busy} onChange={(event) => setNotes(event.target.value)} placeholder="اختياري — لا تظهر للعامة" className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" /></label><div className="flex flex-wrap gap-3"><button type="button" onClick={() => void invoke("save")} disabled={!editable || busy} className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-3 font-black disabled:opacity-50">{busy ? "جاري الحفظ..." : "حفظ Draft"}</button><button type="button" onClick={() => void invoke("review")} disabled={!editable || busy || missing.length > 0} className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-6 py-3 font-black text-cyan-100 disabled:opacity-50">اعتماد المراجعة</button><button type="button" onClick={() => void invoke("publish")} disabled={selected.workflow_status !== "reviewed" || selected.is_stale || busy} className="rounded-full border border-green-400/35 bg-green-500/10 px-6 py-3 font-black text-green-100 disabled:opacity-50">نشر يدوي للعامة</button></div></div>}</section></div>}
  </section></main>;
}

function Panel({ title, entries, tone }: { title: string; entries: Array<[string, string]>; tone: "cyan" | "green" }) { return <section className={`rounded-3xl border p-5 ${tone === "cyan" ? "border-cyan-400/20 bg-cyan-500/[0.05]" : "border-green-400/20 bg-green-500/[0.05]"}`}><h3 className="text-xl font-black">{title}</h3><div className="mt-4 grid gap-3">{entries.map(([name, value]) => <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className={`text-xs font-black ${tone === "cyan" ? "text-cyan-100" : "text-green-100"}`}>{labels[name] || name}</div><div className="mt-2 whitespace-pre-wrap leading-7 text-white/75">{value || "—"}</div></div>)}</div></section>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
