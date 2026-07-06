"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Status = "draft" | "needs_review" | "reviewed" | "published" | "superseded" | "archived";
type Snapshot = Record<string, string>;
type SourceRevision = { id: string; source_type: string; source_id: string; source_snapshot: Snapshot | null; created_at: string | null };
type Revision = { id: string; source_revision_id: string; source_type: string; source_id: string; language: "en" | "tr"; workflow_status: Status; is_stale: boolean; stale_reason: string | null; supersedes_translation_revision_id: string | null; created_at: string | null; updated_at: string | null; reviewed_at: string | null; published_at: string | null; review_notes: string | null };
type RevisionField = { id: string; translation_revision_id: string; field_name: string; source_value_snapshot: string; translated_value: string };

const sourceLabels: Record<string, string> = { programs: "البرامج", pages: "صفحات CMS", sections: "أقسام CMS", faqs: "FAQ", knowledge_base: "مركز المعرفة", partners: "الشركاء", jobs: "الوظائف", reviews: "التقييمات", success_stories: "قصص النجاح", gallery_items: "المعرض", announcements: "الإعلانات", services: "الخدمات", legal_pages: "الصفحات القانونية" };
const fieldLabels: Record<string, string> = { title: "العنوان", summary: "الملخص", content: "المحتوى", requirements: "الشروط", benefits: "المزايا", updates: "التحديثات", faq: "الأسئلة الشائعة", department: "القسم", location: "الموقع", job_type: "نوع الوظيفة", country: "الدولة", person_name: "الاسم", platform: "المنصة", button_label: "نص الزر", meta_title: "عنوان SEO", meta_description: "وصف SEO", question: "السؤال", answer: "الإجابة" };
const statusLabels: Record<Status, string> = { draft: "مسودة", needs_review: "تحتاج مراجعة", reviewed: "مراجعة وجاهزة للنشر", published: "منشورة", superseded: "مستبدلة", archived: "مؤرشفة" };

function snapshotEntries(snapshot: Snapshot | null | undefined) { return Object.entries(snapshot || {}).filter(([, value]) => typeof value === "string" && value.trim()); }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString("ar") : "—"; }
function titleOf(source: SourceRevision | undefined, revision: Revision) { const snapshot = source?.source_snapshot || {}; return snapshot.title || snapshot.question || snapshot.person_name || `${sourceLabels[revision.source_type] || revision.source_type} #${revision.source_id}`; }
function tone(status: Status, stale: boolean) { if (stale) return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100"; if (status === "published") return "border-green-400/30 bg-green-500/10 text-green-100"; if (status === "reviewed") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"; if (status === "needs_review") return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"; return "border-white/15 bg-white/[0.06] text-white/70"; }

export default function TranslationRevisionsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [sources, setSources] = useState<SourceRevision[]>([]);
  const [fields, setFields] = useState<RevisionField[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized) { router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login"); return; }
      setAuthorized(true);
    })();
  }, [router]);

  useEffect(() => { if (authorized) void load(); }, [authorized]);

  async function load(preferredId?: string) {
    if (!supabase) { setError("الاتصال بقاعدة البيانات غير مفعل."); setLoading(false); return; }
    setLoading(true); setError("");
    const [revisionResult, sourceResult, fieldResult] = await Promise.all([
      supabase.from("content_translation_revisions").select("id, source_revision_id, source_type, source_id, language, workflow_status, is_stale, stale_reason, supersedes_translation_revision_id, created_at, updated_at, reviewed_at, published_at, review_notes").order("updated_at", { ascending: false }).limit(1000),
      supabase.from("translation_source_revisions").select("id, source_type, source_id, source_snapshot, created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("content_translation_revision_fields").select("id, translation_revision_id, field_name, source_value_snapshot, translated_value").limit(12000),
    ]);
    setLoading(false);
    const failures = [revisionResult.error, sourceResult.error, fieldResult.error].filter(Boolean);
    if (failures.length) { setError(`تعذر تحميل مساحة Revisions. هذه المساحة متاحة للإدارة العليا فقط. ${failures.map((item) => item?.message).join(" | ")}`); return; }
    const nextRevisions = (revisionResult.data || []) as Revision[];
    setRevisions(nextRevisions); setSources((sourceResult.data || []) as SourceRevision[]); setFields((fieldResult.data || []) as RevisionField[]);
    const target = preferredId || selectedId;
    setSelectedId(nextRevisions.some((row) => row.id === target) ? target : nextRevisions[0]?.id || "");
  }

  const sourceById = useMemo(() => new Map(sources.map((item) => [item.id, item])), [sources]);
  const fieldsByRevision = useMemo(() => { const map = new Map<string, RevisionField[]>(); fields.forEach((field) => map.set(field.translation_revision_id, [...(map.get(field.translation_revision_id) || []), field])); return map; }, [fields]);
  const selected = revisions.find((item) => item.id === selectedId) || null;
  const source = selected ? sourceById.get(selected.source_revision_id) : undefined;
  const entries = snapshotEntries(source?.source_snapshot);
  const selectedFields = selected ? fieldsByRevision.get(selected.id) || [] : [];
  const previous = selected?.supersedes_translation_revision_id ? revisions.find((item) => item.id === selected.supersedes_translation_revision_id) || null : null;
  const previousFields = previous ? fieldsByRevision.get(previous.id) || [] : [];
  const editable = Boolean(selected && !selected.is_stale && ["draft", "needs_review", "reviewed"].includes(selected.workflow_status));
  const missing = entries.filter(([key]) => !values[key]?.trim()).map(([key]) => key);
  const stats = useMemo(() => ({ active: revisions.filter((row) => ["draft", "needs_review", "reviewed"].includes(row.workflow_status) && !row.is_stale).length, reviewed: revisions.filter((row) => row.workflow_status === "reviewed" && !row.is_stale).length, stale: revisions.filter((row) => row.is_stale).length, published: revisions.filter((row) => row.workflow_status === "published").length }), [revisions]);

  useEffect(() => {
    if (!selected) { setValues({}); setNotes(""); return; }
    const next: Record<string, string> = {};
    entries.forEach(([key]) => { next[key] = selectedFields.find((field) => field.field_name === key)?.translated_value || ""; });
    setValues(next); setNotes(selected.review_notes || "");
  }, [selected?.id, entries.map(([key]) => key).join("|"), selectedFields.map((field) => `${field.field_name}:${field.translated_value}`).join("|")]);

  async function save() {
    if (!supabase || !selected || !editable) return;
    setBusy(true); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("save_translation_candidate_fields", { p_translation_revision_id: selected.id, p_translated_fields: values });
    setBusy(false);
    if (rpcError) { setError(`تعذر حفظ Draft: ${rpcError.message}`); return; }
    setMessage("تم حفظ Draft بحالة تحتاج مراجعة. لم يتغير أي محتوى ظاهر للعامة."); await load(selected.id);
  }

  async function review() {
    if (!supabase || !selected || !editable) return;
    if (missing.length) { setError(`أكمل الحقول التالية أولاً: ${missing.map((key) => fieldLabels[key] || key).join("، ")}`); return; }
    setBusy(true); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("review_translation_candidate", { p_translation_revision_id: selected.id, p_review_notes: notes.trim() || null });
    setBusy(false);
    if (rpcError) { setError(`تعذر اعتماد المراجعة: ${rpcError.message}`); return; }
    setMessage("تم اعتماد المراجعة. لا تزال الترجمة غير منشورة للعامة."); await load(selected.id);
  }

  async function publish() {
    if (!supabase || !selected || selected.workflow_status !== "reviewed" || selected.is_stale) return;
    if (!window.confirm("سيتم استبدال النسخة المنشورة السابقة بهذه النسخة فقط بعد النشر اليدوي. متابعة؟")) return;
    setBusy(true); setError(""); setMessage("");
    const { error: rpcError } = await supabase.rpc("publish_translation_candidate", { p_translation_revision_id: selected.id });
    setBusy(false);
    if (rpcError) { setError(`تعذر النشر اليدوي: ${rpcError.message}`); return; }
    setMessage("تم النشر الذري. أصبحت هذه النسخة هي النسخة العامة المعتمدة."); await load(selected.id);
  }

  if (!authorized || loading) return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز مساحة مراجعة إصدارات الترجمة...</div></main>;

  return <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8"><section className="mx-auto max-w-7xl">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">Revision Lifecycle</div><h1 className="text-4xl font-black md:text-5xl">مراجعة إصدارات الترجمة</h1><p className="mt-3 max-w-4xl leading-8 text-white/60">Draft الجديد منفصل دائماً عن النسخة المنشورة. عند تعديل العربي تبقى النسخة العامة ظاهرة، وتظهر هنا كنسخة قديمة تحتاج تحديثاً حتى يُنشر بديل مراجَع يدوياً.</p></div><button type="button" onClick={() => void load(selected?.id)} className="w-fit rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 font-bold text-white/80">تحديث البيانات</button></div>
    {message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div> : null}{error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="مسودات حالية" value={stats.active} /><Stat label="جاهزة للنشر" value={stats.reviewed} /><Stat label="نسخ Stale" value={stats.stale} /><Stat label="نسخ منشورة" value={stats.published} /></div>
    {!revisions.length ? <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center"><h2 className="text-2xl font-black">لا توجد Revisions جديدة بعد</h2><p className="mx-auto mt-3 max-w-2xl leading-8 text-white/60">هذا طبيعي قبل تحويل Gemini Automation في F6-B2.2B. الترجمات الحالية تبقى على النظام القديم إلى مرحلة Backfill.</p></section> : <div className="grid gap-6 xl:grid-cols-[minmax(0,390px)_1fr]">
      <section className="grid max-h-[74vh] gap-3 overflow-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">{revisions.map((revision) => <button key={revision.id} type="button" onClick={() => setSelectedId(revision.id)} className={`rounded-2xl border p-4 text-right ${selected?.id === revision.id ? "border-yellow-300/50 bg-yellow-500/10" : "border-white/10 bg-black/20"}`}><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-black text-purple-100">{sourceLabels[revision.source_type] || revision.source_type}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${tone(revision.workflow_status, revision.is_stale)}`}>{revision.is_stale ? "Stale / يحتاج تحديث" : statusLabels[revision.workflow_status]}</span></div><div className="font-black leading-7">{titleOf(sourceById.get(revision.source_revision_id), revision)}</div><div className="mt-2 flex justify-between text-xs text-white/50"><span>{revision.language === "en" ? "English" : "Türkçe"}</span><span>{formatDate(revision.updated_at)}</span></div></button>)}</section>
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">{!selected ? null : <div className="grid gap-6"><div className="rounded-3xl border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-black text-yellow-100">{sourceLabels[selected.source_type] || selected.source_type} · {selected.language === "en" ? "English" : "Türkçe"}</div><h2 className="mt-2 text-2xl font-black">{titleOf(source, selected)}</h2><p className="mt-2 text-sm text-white/55">آخر تعديل: {formatDate(selected.updated_at)}</p></div><span className={`rounded-full border px-4 py-2 text-sm font-black ${tone(selected.workflow_status, selected.is_stale)}`}>{selected.is_stale ? "Stale / يحتاج تحديث" : statusLabels[selected.workflow_status]}</span></div></div>
        {selected.is_stale ? <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-5 text-yellow-100"><strong className="block">هذا الإصدار غير صالح للنشر.</strong><span className="mt-2 block text-sm leading-7">تبقى النسخة المنشورة القديمة ظاهرة للعامة حتى مراجعة ونشر Draft أحدث. {selected.stale_reason ? `السبب: ${selected.stale_reason}` : ""}</span></div> : null}
        <Panel title="النص العربي المعتمد لهذا الإصدار" entries={entries} accent="cyan" />
        {previous ? <Panel title="النسخة المنشورة السابقة" entries={previousFields.map((field) => [field.field_name, field.translated_value] as [string, string])} accent="green" /> : <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">لا توجد نسخة منشورة سابقة مرتبطة بهذا Draft بعد.</div>}
        <section className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/[0.05] p-5"><h3 className="text-xl font-black">الترجمة المرشحة</h3><p className="mt-2 text-sm leading-7 text-white/55">لا تظهر للعامة قبل المراجعة والنشر اليدوي الذرّي.</p><div className="mt-5 grid gap-5">{entries.map(([key, arabic]) => <label key={key} className="grid gap-2 text-sm font-black text-white/80"><span>{fieldLabels[key] || key}</span><div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-normal leading-6 text-white/45">العربي: {arabic}</div>{["title", "summary", "country", "platform", "department", "location", "job_type", "person_name", "button_label"].includes(key) ? <input dir="auto" value={values[key] || ""} disabled={!editable || busy} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" /> : <textarea dir="auto" value={values[key] || ""} disabled={!editable || busy} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" />}</label>)}</div>{missing.length ? <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm text-yellow-100">الحقول الناقصة: {missing.map((key) => fieldLabels[key] || key).join("، ")}</div> : null}</section>
        <label className="grid gap-2 text-sm font-black text-white/80"><span>ملاحظات المراجعة الداخلية</span><textarea value={notes} disabled={!editable || busy} onChange={(event) => setNotes(event.target.value)} placeholder="اختياري — لا تظهر للعامة" className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" /></label>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => void save()} disabled={!editable || busy} className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-3 font-black disabled:opacity-50">{busy ? "جاري الحفظ..." : "حفظ Draft"}</button><button type="button" onClick={() => void review()} disabled={!editable || busy || missing.length > 0} className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-6 py-3 font-black text-cyan-100 disabled:opacity-50">اعتماد المراجعة</button><button type="button" onClick={() => void publish()} disabled={selected.workflow_status !== "reviewed" || selected.is_stale || busy} className="rounded-full border border-green-400/35 bg-green-500/10 px-6 py-3 font-black text-green-100 disabled:opacity-50">نشر يدوي للعامة</button></div>
      </div>}</section>
    </div>}
  </section></main>;
}

function Panel({ title, entries, accent }: { title: string; entries: Array<[string, string]>; accent: "cyan" | "green" }) { const color = accent === "cyan" ? "border-cyan-400/20 bg-cyan-500/[0.05] text-cyan-100" : "border-green-400/20 bg-green-500/[0.05] text-green-100"; return <section className={`rounded-3xl border p-5 ${color}`}><h3 className="text-xl font-black">{title}</h3><div className="mt-4 grid gap-3">{entries.map(([key, value]) => <div key={key} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs font-black">{fieldLabels[key] || key}</div><div className="mt-2 whitespace-pre-wrap leading-7 text-white/75">{value || "—"}</div></div>)}</div></section>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
