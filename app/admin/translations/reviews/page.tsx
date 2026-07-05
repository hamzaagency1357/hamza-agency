"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type FieldName = "title" | "summary" | "content" | "country";
type Review = { id: string; reviewerName: string; country: string; platform: string; content: string; rating: number; isVisible: boolean; status: string };
type TranslationRow = { source_id: string | number | null; field_name: string | null; language: string | null; translated_value: string | null; reviewed: boolean | null; is_published: boolean | null; status: string | null };
type TranslationState = { values: Partial<Record<FieldName, string>>; reviewed: boolean; published: boolean };
type TranslationPack = Record<string, Partial<Record<LanguageCode, TranslationState>>>;
type GenericRow = Record<string, unknown>;

const languages: Array<{ code: LanguageCode; label: string }> = [{ code: "en", label: "English" }, { code: "tr", label: "Türkçe" }];
const fields: Array<{ key: FieldName; label: string; helper: string }> = [
  { key: "title", label: "اسم صاحب التقييم", helper: "يُحفظ كما هو عند كونه اسماً شخصياً أو اسماً مستعاراً." },
  { key: "country", label: "البلد", helper: "البلد الظاهر أسفل الاسم." },
  { key: "summary", label: "المنصة", helper: "المنصة أو الخدمة المرتبطة بالتجربة." },
  { key: "content", label: "نص التقييم", helper: "النص الرئيسي الظاهر في البطاقة." },
];

function text(row: GenericRow, key: string, fallback = "") { const value = row[key]; return typeof value === "string" ? value.trim() || fallback : typeof value === "number" ? String(value) : fallback; }
function emptyState(): TranslationState { return { values: {}, reviewed: false, published: false }; }
function keyFor(id: string) { return `reviews:${id}`; }
function isField(value: string | null): value is FieldName { return fields.some((field) => field.key === value); }
function sourceValue(review: Review, field: FieldName) { if (field === "title") return review.reviewerName; if (field === "country") return review.country; if (field === "summary") return review.platform; return review.content; }
function activeFields(review: Review) { return fields.filter((field) => Boolean(sourceValue(review, field.key).trim())); }
function complete(review: Review, state: TranslationState) { const active = activeFields(review); return active.length > 0 && active.every((field) => Boolean(state.values[field.key]?.trim())); }
function progress(review: Review, state: TranslationState) { const active = activeFields(review); return active.length ? Math.round((active.filter((field) => Boolean(state.values[field.key]?.trim())).length / active.length) * 100) : 0; }

function buildPack(reviews: Review[], rows: TranslationRow[]): TranslationPack {
  const next: TranslationPack = {};
  reviews.forEach((review) => {
    const reviewKey = keyFor(review.id);
    next[reviewKey] = {};
    languages.forEach(({ code }) => {
      const matches = rows.filter((row) => String(row.source_id ?? "") === review.id && row.language === code && isField(row.field_name));
      const values: Partial<Record<FieldName, string>> = {};
      matches.forEach((row) => { if (isField(row.field_name)) values[row.field_name] = row.translated_value || ""; });
      const active = activeFields(review);
      const reviewed = active.length > 0 && active.every((field) => Boolean(matches.find((row) => row.field_name === field.key)?.reviewed));
      const published = reviewed && active.every((field) => { const row = matches.find((item) => item.field_name === field.key); return Boolean(row?.is_published || row?.status === "published"); });
      next[reviewKey][code] = { values, reviewed, published };
    });
  });
  return next;
}

export default function ReviewsTranslationsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [pack, setPack] = useState<TranslationPack>({});
  const [selectedId, setSelectedId] = useState("");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("reviews");
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        setChecking(false);
        return;
      }
      setAdminEmail(access.profile.email || access.user?.email || "");
      setAuthorized(true);
      setChecking(false);
    }
    void checkAccess();
  }, [router]);

  useEffect(() => { if (authorized) void loadContent(); }, [authorized]);

  async function loadContent() {
    const client = supabase;
    if (!client) { setError("الاتصال بقاعدة البيانات غير مفعل."); setLoading(false); return; }
    setLoading(true); setMessage(""); setError("");
    const [reviewsResult, translationsResult] = await Promise.all([
      client.from("reviews").select("id, reviewer_name, country, platform, content, rating, is_visible, status").order("is_featured", { ascending: false }).order("sort_order", { ascending: true }).limit(300),
      client.from("content_translations").select("source_id, field_name, language, translated_value, status, reviewed, is_published").eq("source_type", "reviews").in("field_name", fields.map((field) => field.key)).in("language", ["en", "tr"]).limit(3000),
    ]);
    setLoading(false);
    if (reviewsResult.error) { setError(`تعذر تحميل التقييمات: ${reviewsResult.error.message}`); return; }
    const loaded = ((reviewsResult.data || []) as GenericRow[]).map((row, index) => ({ id: text(row, "id", `review-${index}`), reviewerName: text(row, "reviewer_name", "تقييم بدون اسم"), country: text(row, "country"), platform: text(row, "platform"), content: text(row, "content"), rating: Number(row.rating || 5), isVisible: row.is_visible !== false, status: text(row, "status", "published") }));
    setReviews(loaded);
    setPack(buildPack(loaded, (translationsResult.data || []) as TranslationRow[]));
    setSelectedId((current) => current || loaded[0]?.id || "");
    if (translationsResult.error) setError(`تم تحميل التقييمات، لكن تعذر تحميل ترجماتها: ${translationsResult.error.message}`);
  }

  const selectedReview = reviews.find((review) => review.id === selectedId) || reviews[0] || null;
  const selectedKey = selectedReview ? keyFor(selectedReview.id) : "";
  const state = selectedKey ? pack[selectedKey]?.[language] || emptyState() : emptyState();
  const isComplete = selectedReview ? complete(selectedReview, state) : false;
  const reviewedCount = useMemo(() => reviews.filter((review) => { const item = pack[keyFor(review.id)]?.[language] || emptyState(); return item.reviewed && complete(review, item); }).length, [reviews, pack, language]);
  const publishedCount = useMemo(() => reviews.filter((review) => { const item = pack[keyFor(review.id)]?.[language] || emptyState(); return item.published && item.reviewed && complete(review, item); }).length, [reviews, pack, language]);

  function updateValue(field: FieldName, value: string) {
    if (!selectedReview) return;
    setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { values: { ...previous.values, [field]: value }, reviewed: false, published: false } } }; });
  }
  function setReviewed(reviewed: boolean) {
    if (!selectedReview || (reviewed && !isComplete)) return;
    setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { ...previous, reviewed, published: reviewed ? previous.published : false } } }; });
  }
  function setPublished(published: boolean) {
    if (!selectedReview || !isComplete || !state.reviewed) return;
    setPack((current) => { const previous = current[selectedKey]?.[language] || emptyState(); return { ...current, [selectedKey]: { ...(current[selectedKey] || {}), [language]: { ...previous, published } } }; });
  }

  async function saveSelected() {
    const client = supabase;
    if (!client || !selectedReview) { setError("اختر تقييماً أولاً."); return; }
    const active = activeFields(selectedReview);
    if (!active.some((field) => Boolean(state.values[field.key]?.trim()))) { setError("أدخل ترجمة واحدة على الأقل قبل الحفظ."); return; }
    if (state.reviewed && !isComplete) { setError("لا يمكن اعتبار الترجمة مراجعة قبل اكتمال كل الحقول العربية المتوفرة."); return; }
    const reviewed = Boolean(state.reviewed && isComplete);
    const published = Boolean(state.published && reviewed && isComplete);
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";
    setSaving(true); setError(""); setMessage("");
    const { error: saveError } = await client.from("content_translations").upsert(active.map((field) => ({ source_type: "reviews", source_id: selectedReview.id, field_name: field.key, language, translated_value: state.values[field.key] || "", status, reviewed, is_published: published, created_by: adminEmail, updated_by: adminEmail, updated_at: new Date().toISOString() })), { onConflict: "source_type,source_id,field_name,language" });
    setSaving(false);
    if (saveError) { setError(`تعذر حفظ ترجمة التقييم: ${saveError.message}`); return; }
    setMessage(published ? "تم حفظ الترجمة ونشرها يدوياً. لن تظهر للعامة إلا إذا كانت البطاقة مكتملة." : reviewed ? "تم حفظ الترجمة بحالة مراجع. لن تظهر للعامة قبل تفعيل النشر اليدوي." : "تم الحفظ بحالة تحتاج مراجعة. لن تظهر للعامة.");
    await loadContent();
  }

  if (checking || loading) return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز ترجمة التقييمات...</div></main>;
  if (!authorized) return null;

  return <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8"><section className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-2 text-sm font-bold text-yellow-100">Reviews translations</div><h1 className="text-4xl font-black md:text-5xl">مراجعة ونشر ترجمات التقييمات</h1><p className="mt-3 max-w-3xl leading-8 text-white/60">لا يظهر أي تقييم EN/TR للعامة إلا عند اكتمال حقوله المتوفرة ومراجعته ونشره يدوياً.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/translations/automation" className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100">ترجمة دفعة مراقبة</Link><Link href="/admin/reviews" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">إدارة التقييمات</Link></div></div>{message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 leading-8 text-green-100">{message}</div> : null}{error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 leading-8 text-red-100">{error}</div> : null}<div className="mb-6 grid gap-4 md:grid-cols-3"><Stat label="إجمالي التقييمات" value={reviews.length} /><Stat label={`مراجعة (${language})`} value={reviewedCount} /><Stat label={`منشورة (${language})`} value={publishedCount} /></div><div className="grid gap-6 lg:grid-cols-[0.8fr_1.5fr]"><aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4"><div className="mb-4 flex gap-2">{languages.map((item) => <button key={item.code} type="button" onClick={() => setLanguage(item.code)} className={`flex-1 rounded-2xl px-4 py-3 font-bold ${language === item.code ? "bg-yellow-500/20 text-yellow-100" : "bg-black/20 text-white/65"}`}>{item.label}</button>)}</div><div className="grid gap-2">{reviews.map((review) => { const item = pack[keyFor(review.id)]?.[language] || emptyState(); const percent = progress(review, item); return <button key={review.id} type="button" onClick={() => setSelectedId(review.id)} className={`rounded-2xl border p-4 text-right ${selectedReview?.id === review.id ? "border-yellow-300/60 bg-yellow-500/10" : "border-white/10 bg-black/20"}`}><div className="font-black">{review.reviewerName}</div><div className="mt-2 flex items-center justify-between text-xs text-white/55"><span>{percent}% مكتمل</span><span>{item.published && item.reviewed && percent === 100 ? "منشور" : item.reviewed && percent === 100 ? "مراجع" : "يحتاج مراجعة"}</span></div></button>; })}{!reviews.length ? <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-white/60">لا توجد تقييمات حالياً.</div> : null}</div></aside><section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">{selectedReview ? <><div className="mb-6"><div className="text-sm font-bold text-yellow-100">{language === "en" ? "English" : "Türkçe"}</div><h2 className="mt-2 text-3xl font-black">{selectedReview.reviewerName}</h2><p className="mt-3 text-white/60">أكمل الحقول العربية المتوفرة فقط. كل تعديل يعيد الترجمة إلى حالة تحتاج مراجعة.</p></div><div className="grid gap-5">{activeFields(selectedReview).map((field) => <label key={field.key} className="block rounded-3xl border border-white/10 bg-black/20 p-4"><div className="mb-3"><div className="font-black">{field.label}</div><div className="mt-1 text-sm text-white/55">{field.helper}</div></div><div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-7 text-white/70">{sourceValue(selectedReview, field.key)}</div><textarea value={state.values[field.key] || ""} onChange={(event) => updateValue(field.key, event.target.value)} className="min-h-28 w-full resize-y rounded-2xl border border-white/10 bg-[#070009] p-4 text-white outline-none focus:border-yellow-300/60" /></label>)}</div><div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2"><label className="flex items-start gap-3"><input type="checkbox" checked={state.reviewed} disabled={!isComplete} onChange={(event) => setReviewed(event.target.checked)} className="mt-1 h-5 w-5 accent-yellow-500 disabled:opacity-50" /><span><strong className="block">تمت المراجعة</strong><span className="mt-1 block text-sm text-white/55">يتطلب اكتمال كل الحقول المتوفرة.</span></span></label><label className="flex items-start gap-3"><input type="checkbox" checked={state.published} disabled={!isComplete || !state.reviewed} onChange={(event) => setPublished(event.target.checked)} className="mt-1 h-5 w-5 accent-green-500 disabled:opacity-50" /><span><strong className="block">نشر يدوي للعامة</strong><span className="mt-1 block text-sm text-white/55">لا يوجد أي نشر تلقائي.</span></span></label></div><button type="button" onClick={() => void saveSelected()} disabled={saving} className="mt-6 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 px-7 py-4 font-black text-black disabled:opacity-60">{saving ? "جاري الحفظ..." : "حفظ حالة الترجمة"}</button></> : <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-white/60">اختر تقييماً لبدء المراجعة.</div>}</section></div></section></main>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
