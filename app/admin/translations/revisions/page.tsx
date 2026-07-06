"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Status = "draft" | "needs_review" | "reviewed" | "published" | "superseded" | "archived";
type Source = { id: string; source_snapshot: Record<string, string> | null };
type Revision = { id: string; source_revision_id: string; source_type: string; source_id: string; language: "en" | "tr"; workflow_status: Status; is_stale: boolean; stale_reason: string | null; supersedes_translation_revision_id: string | null; updated_at: string | null; review_notes: string | null };
type Field = { id: string; translation_revision_id: string; field_name: string; translated_value: string };

const labels: Record<string, string> = { programs: "البرامج", pages: "صفحات CMS", sections: "أقسام CMS", faqs: "FAQ", knowledge_base: "مركز المعرفة", partners: "الشركاء", jobs: "الوظائف", reviews: "التقييمات", success_stories: "قصص النجاح", gallery_items: "المعرض", announcements: "الإعلانات", services: "الخدمات", legal_pages: "الصفحات القانونية", title: "العنوان", summary: "الملخص", content: "المحتوى", requirements: "الشروط", benefits: "المزايا", updates: "التحديثات", faq: "الأسئلة الشائعة", department: "القسم", location: "الموقع", job_type: "نوع الوظيفة", country: "الدولة", person_name: "الاسم", platform: "المنصة", button_label: "نص الزر", meta_title: "عنوان SEO", meta_description: "وصف SEO", question: "السؤال", answer: "الإجابة" };
const statusLabels: Record<Status, string> = { draft: "مسودة", needs_review: "تحتاج مراجعة", reviewed: "مراجعة وجاهزة للنشر", published: "منشورة", superseded: "مستبدلة", archived: "مؤرشفة" };
const editableStatuses: Status[] = ["draft", "needs_review", "reviewed"];

function entries(snapshot: Record<string, string> | null | undefined) { return Object.entries(snapshot || {}).filter(([, value]) => typeof value === "string" && value.trim()); }
function revisionTitle(source: Source | undefined, revision: Revision) { const snapshot = source?.source_snapshot || {}; return snapshot.title || snapshot.question || snapshot.person_name || `${labels[revision.source_type] || revision.source_type} #${revision.source_id}`; }
function date(value: string | null) { return value ? new Date(value).toLocaleString("ar") : "—"; }
function badge(status: Status, stale: boolean) { if (stale) return "border-yellow-400/30 bg-yellow-500/10 text-yellow-100"; if (status === "published") return "border-green-400/30 bg-green-500/10 text-green-100"; if (status === "reviewed") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"; return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"; }

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

  useEffect(() => { void (async () => { const access = await requireAdminModuleAccess("settings"); if (!access.isAuthorized) { router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login"); return; } setReady(true); })(); }, [router]);
  useEffect(() => { if (ready) void load(); }, [ready]);

  async function load(preferredId?: string) {
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
    const target = preferredId || selectedId;
    setSelectedId(next.some((item) => item.id === target) ? target : next[0]?.id || "");
  }

  const sourceMap = useMemo(() => new Map(sources.map((item) => [item.id, item])), [sources]);
  const fieldMap = useMemo(() => { const map = new Map<string, Field[]>(); fields.forEach((field) => map.set(field.translation_revision_id, [...(map.get(field.translation_revision_id) || []), field])); return map; }, [fields]);
  const selected = revisions.find((item) => item.id === selectedId) || null;
  const source = selected ? sourceMap.get(selected.source_revision_id) : undefined;
  const sourceEntries = entries(source?.source_snapshot);
  const selectedFields = selected ? fieldMap.get(selected.id) || [] : [];
  const previous = selected?.supersedes_translation_revision_id ? revisions.find((item) => item.id === selected.supersedes_translation_revision_id) || null : null;
  const previousFields = previous ? fieldMap.get(previous.id) || [] : [];
  const editable = Boolean(selected && !selected.is_stale && editableStatuses.includes(selected.workflow_status));
  const missing = sourceEntries.filter(([name]) => !values[name]?.trim()).map(([name]) => name);
  const stats = { active: revisions.filter((row) => editableStatuses.includes(row.workflow_status) && !row.is_stale).length, reviewed: revisions.filter((row) => row.workflow_status === "reviewed" && !row.is_stale).length, stale: revisions.filter((row) => row.is_stale).length, published: revisions.filter((row) => row.workflow_status === "published").length };

  useEffect(() => { if (!selected) return; const next: Record<string, string> = {}; sourceEntries.forEach(([name]) => { next[name] = selectedFields.find((field) => field.field_name === name)?.translated_value || ""; }); setValues(next); setNotes(selected.review_notes || ""); }, [selected?.id, sourceEntries.map(([name]) => name).join("|"), selectedFields.map((field) => `${field.field_name}:${field.translated_value}`).join("|")]);

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
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">Revision Lifecycle</div><h1 className="text-4xl font-black md:text-5xl">مراجعة إصدارات الترجمة</h1><p className="mt-3 max-w-4xl leading-8 text-white/60">Draft الجديد منفصل عن النسخة المنشورة. عند تغير العربي تبقى النسخة العامة ظاهرة، ولا يظهر البديل قبل المراجعة والنشر اليدوي.</p></div><button type="button" onClick={() => void load(selected?.id)} className="w-fit rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 font-bold text-white/80">تحديث البيانات</button></div>
    {message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div> : null}{error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="مسودات حالية" value={stats.active} /><Stat label="جاهزة للنشر" value={stats.reviewed} /><Stat label="نسخ Stale" value={stats.stale} /><Stat label="نسخ منشورة" value={stats.published} /></div>
    {!revisions.length ? <section className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center"><h2 className="text-2xl font-black">لا توجد Revisions جديدة بعد</h2><p className="mx-auto mt-3 max-w-2xl leading-8 text-white/60">هذا طبيعي قبل تحويل Gemini Automation في F6-B2.2B. الترجمات الحالية تبقى على النظام القديم إلى مرحلة Backfill.</p></section> : <div className="grid gap-6 xl:grid-cols-[minmax(0,390px)_1fr]"><section className="grid max-h-[74vh] gap-3 overflow-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">{revisions.map((revision) => <button key={revision.id} type="button" onClick={() => setSelectedId(revision.id)} className={`rounded-2xl border p-4 text-right ${selected?.id === revision.id ? "border-yellow-300/50 bg-yellow-500/10" : "border-white/10 bg-black/20"}`}><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-black text-purple-100">{labels[revision.source_type] || revision.source_type}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${badge(revision.workflow_status, revision.is_stale)}`}>{revision.is_stale ? "Stale / يحتاج تحديث" : statusLabels[revision.workflow_status]}</span></div><div className="font-black leading-7">{revisionTitle(sourceMap.get(revision.source_revision_id), revision)}</div><div className="mt-2 flex justify-between text-xs text-white/50"><span>{revision.language === "en" ? "English" : "Türkçe"}</span><span>{date(revision.updated_at)}</span></div></button>)}</section><section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">{!selected ? null : <div className="grid gap-6"><div className="rounded-3xl border border-white/10 bg-black/20 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-black text-yellow-100">{labels[selected.source_type] || selected.source_type} · {selected.language === "en" ? "English" : "Türkçe"}</div><h2 className="mt-2 text-2xl font-black">{revisionTitle(source, selected)}</h2><p className="mt-2 text-sm text-white/55">آخر تعديل: {date(selected.updated_at)}</p></div><span className={`rounded-full border px-4 py-2 text-sm font-black ${badge(selected.workflow_status, selected.is_stale)}`}>{selected.is_stale ? "Stale / يحتاج تحديث" : statusLabels[selected.workflow_status]}</span></div></div>{selected.is_stale ? <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-5 text-yellow-100"><strong>هذا الإصدار غير صالح للنشر.</strong><span className="mt-2 block text-sm leading-7">تبقى النسخة المنشورة ظاهرة للعامة حتى نشر Draft أحدث. {selected.stale_reason ? `السبب: ${selected.stale_reason}` : ""}</span></div> : null}<Panel title="النص العربي المعتمد لهذا الإصدار" entries={sourceEntries} tone="cyan" />{previous ? <Panel title="النسخة المنشورة السابقة" entries={previousFields.map((field) => [field.field_name, field.translated_value] as [string, string])} tone="green" /> : <div className="rounded-3xl border border-white/10 bg-black/20 p-5 text-sm text-white/55">لا توجد نسخة منشورة سابقة مرتبطة بهذا Draft بعد.</div>}<section className="rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/[0.05] p-5"><h3 className="text-xl font-black">الترجمة المرشحة</h3><p className="mt-2 text-sm leading-7 text-white/55">لا تظهر للعامة قبل المراجعة والنشر اليدوي الذرّي.</p><div className="mt-5 grid gap-5">{sourceEntries.map(([name, arabic]) => <label key={name} className="grid gap-2 text-sm font-black text-white/80"><span>{labels[name] || name}</span><div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-xs font-normal leading-6 text-white/45">العربي: {arabic}</div>{["title", "summary", "country", "platform", "department", "location", "job_type", "person_name", "button_label"].includes(name) ? <input dir="auto" value={values[name] || ""} disabled={!editable || busy} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" /> : <textarea dir="auto" value={values[name] || ""} disabled={!editable || busy} onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))} className="min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" />}</label>)}</div>{missing.length ? <div className="mt-5 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm text-yellow-100">الحقول الناقصة: {missing.map((name) => labels[name] || name).join("، ")}</div> : null}</section><label className="grid gap-2 text-sm font-black text-white/80"><span>ملاحظات المراجعة الداخلية</span><textarea value={notes} disabled={!editable || busy} onChange={(event) => setNotes(event.target.value)} placeholder="اختياري — لا تظهر للعامة" className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white disabled:opacity-60" /></label><div className="flex flex-wrap gap-3"><button type="button" onClick={() => void invoke("save")} disabled={!editable || busy} className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-3 font-black disabled:opacity-50">{busy ? "جاري الحفظ..." : "حفظ Draft"}</button><button type="button" onClick={() => void invoke("review")} disabled={!editable || busy || missing.length > 0} className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-6 py-3 font-black text-cyan-100 disabled:opacity-50">اعتماد المراجعة</button><button type="button" onClick={() => void invoke("publish")} disabled={selected.workflow_status !== "reviewed" || selected.is_stale || busy} className="rounded-full border border-green-400/35 bg-green-500/10 px-6 py-3 font-black text-green-100 disabled:opacity-50">نشر يدوي للعامة</button></div></div>}</section></div>}
  </section></main>;
}

function Panel({ title, entries, tone }: { title: string; entries: Array<[string, string]>; tone: "cyan" | "green" }) { return <section className={`rounded-3xl border p-5 ${tone === "cyan" ? "border-cyan-400/20 bg-cyan-500/[0.05]" : "border-green-400/20 bg-green-500/[0.05]"}`}><h3 className="text-xl font-black">{title}</h3><div className="mt-4 grid gap-3">{entries.map(([name, value]) => <div key={name} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className={`text-xs font-black ${tone === "cyan" ? "text-cyan-100" : "text-green-100"}`}>{labels[name] || name}</div><div className="mt-2 whitespace-pre-wrap leading-7 text-white/75">{value || "—"}</div></div>)}</div></section>; }
function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
