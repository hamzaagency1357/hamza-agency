"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import {
  getTranslationAutomationStatus,
  syncArabicContentTranslations,
  type TranslationSyncSummary,
} from "@/lib/i18n/adminTranslationSync";
import {
  TRANSLATION_SOURCE_DEFINITIONS,
  type TranslationSourceType,
} from "@/lib/i18n/translationSources";
import { supabase } from "@/lib/supabase";

type TargetLanguage = "en" | "tr";
type SourceCount = Record<TranslationSourceType, number>;
type SyncItem = { sourceType: TranslationSourceType; sourceId: string; label: string };
type FailedSyncItem = { sourceType: TranslationSourceType; sourceId: string; message: string };

const MAX_BATCH_ITEMS = 10;
const emptyCounts = Object.fromEntries(
  TRANSLATION_SOURCE_DEFINITIONS.map((source) => [source.sourceType, 0])
) as SourceCount;
const languageLabels: Record<TargetLanguage, string> = { en: "الإنجليزية", tr: "التركية" };

function getItemLabel(
  source: (typeof TRANSLATION_SOURCE_DEFINITIONS)[number],
  row: Record<string, unknown>,
  index: number
) {
  const title = source.titleKeys
    .map((key) => row[key])
    .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  return title?.trim() || `${source.label} ${index + 1}`;
}

function createFallbackSummary(selectedCount: number, response: { results?: Array<{ createdLanguages?: string[]; retainedLanguages?: string[] }>; errors?: unknown[] }): TranslationSyncSummary {
  const createdCount = response.results?.reduce((count, item) => count + (item.createdLanguages?.length || 0), 0) || 0;
  const retainedCount = response.results?.reduce((count, item) => count + (item.retainedLanguages?.length || 0), 0) || 0;
  const failedCount = response.errors?.length || 0;
  return {
    totalRequested: selectedCount,
    totalAccepted: selectedCount,
    totalProcessed: (response.results?.length || 0) + failedCount,
    createdCount,
    retainedCount,
    failedCount,
    ignoredCount: 0,
    truncatedCount: 0,
    skippedCount: 0,
    maxItemsPerRequest: MAX_BATCH_ITEMS,
  };
}

function valueOrZero(value: number | undefined) {
  return typeof value === "number" ? value : 0;
}

export default function TranslationAutomationPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [model, setModel] = useState("");
  const [items, setItems] = useState<SyncItem[]>([]);
  const [counts, setCounts] = useState<SourceCount>(emptyCounts);
  const [sourceType, setSourceType] = useState<TranslationSourceType | "">("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [language, setLanguage] = useState<TargetLanguage | "">("");
  const [failedItems, setFailedItems] = useState<FailedSyncItem[]>([]);
  const [lastSummary, setLastSummary] = useState<TranslationSyncSummary | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        setCheckingAccess(false);
        return;
      }
      setAuthorized(true);
      setCheckingAccess(false);
    }
    void checkAccess();
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    async function loadData() {
      const client = supabase;
      if (!client) {
        setError("الاتصال بقاعدة البيانات غير مفعل.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const [status, ...results] = await Promise.all([
          getTranslationAutomationStatus(),
          ...TRANSLATION_SOURCE_DEFINITIONS.map((source) =>
            client.from(source.table).select("*").limit(300)
          ),
        ]);
        const nextItems: SyncItem[] = [];
        const nextCounts: SourceCount = { ...emptyCounts };
        results.forEach((result, index) => {
          const source = TRANSLATION_SOURCE_DEFINITIONS[index];
          if (!source || result.error) return;
          const rows = (result.data || []) as Array<Record<string, unknown>>;
          nextCounts[source.sourceType] = rows.length;
          rows.forEach((row, rowIndex) => {
            const sourceId = String(row.id || "").trim();
            if (!sourceId) return;
            nextItems.push({
              sourceType: source.sourceType,
              sourceId,
              label: getItemLabel(source, row, rowIndex),
            });
          });
        });
        setConfigured(status.configured);
        setModel(status.model);
        setCounts(nextCounts);
        setItems(nextItems);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "تعذر تحميل مركز الترجمة التلقائية.");
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, [authorized]);

  const selectedSource = useMemo(
    () => TRANSLATION_SOURCE_DEFINITIONS.find((source) => source.sourceType === sourceType) || null,
    [sourceType]
  );
  const availableItems = useMemo(
    () => items.filter((item) => item.sourceType === sourceType),
    [items, sourceType]
  );
  const selectedItems = useMemo(
    () => availableItems.filter((item) => selectedIds.includes(item.sourceId)),
    [availableItems, selectedIds]
  );
  const retryableFailedItems = useMemo(
    () => failedItems.filter((failed) =>
      failed.sourceType === sourceType && availableItems.some((item) => item.sourceId === failed.sourceId)
    ),
    [availableItems, failedItems, sourceType]
  );
  const runBlockReason = useMemo(() => {
    if (!configured) return "الترجمة التلقائية غير مفعلة بعد.";
    if (!sourceType) return "اختر source_type أولاً.";
    if (!language) return "اختر لغة واحدة: EN أو TR.";
    if (!selectedItems.length) return "اختر عنصراً واحداً على الأقل من نفس المصدر.";
    if (selectedItems.length > MAX_BATCH_ITEMS) return `الحد الأقصى هو ${MAX_BATCH_ITEMS} عناصر.`;
    return "";
  }, [configured, language, selectedItems.length, sourceType]);

  function chooseSource(nextSourceType: TranslationSourceType) {
    setSourceType(nextSourceType);
    setSelectedIds([]);
    setLastSummary(null);
    setMessage("");
    setError("");
  }

  function toggleItem(sourceId: string) {
    if (selectedIds.includes(sourceId)) {
      setSelectedIds((current) => current.filter((id) => id !== sourceId));
      setError("");
      return;
    }
    if (selectedIds.length >= MAX_BATCH_ITEMS) {
      setError("الحد الأقصى لكل دفعة هو 10 عناصر. أرسل الدفعة الحالية ثم تابع بالدفعة التالية.");
      return;
    }
    setSelectedIds((current) => [...current, sourceId]);
    setError("");
  }

  function selectFirstBatch() {
    if (!sourceType) {
      setError("اختر مصدر المحتوى أولاً.");
      return;
    }
    setSelectedIds(availableItems.slice(0, MAX_BATCH_ITEMS).map((item) => item.sourceId));
    setMessage(
      availableItems.length > MAX_BATCH_ITEMS
        ? "تم تحديد أول 10 عناصر فقط. أرسل هذه الدفعة أولاً ثم اختر الدفعة التالية."
        : ""
    );
    setError("");
  }

  function selectFailedItemsOnly() {
    if (!sourceType || !retryableFailedItems.length) return;
    const retryIds = retryableFailedItems.slice(0, MAX_BATCH_ITEMS).map((item) => item.sourceId);
    setSelectedIds(retryIds);
    setMessage(
      retryableFailedItems.length > MAX_BATCH_ITEMS
        ? `تم تحديد أول ${MAX_BATCH_ITEMS} عناصر فاشلة فقط. أعد تشغيلها ثم كرر العملية للباقي.`
        : `تم تحديد ${retryIds.length} عنصر فاشل فقط لإعادة المحاولة.`
    );
    setError("");
  }

  async function runBatch() {
    if (runBlockReason) {
      setError(runBlockReason);
      return;
    }
    if (!language || !selectedSource) return;

    const confirmed = window.confirm([
      "تأكيد تشغيل Gemini Batch",
      `المصدر: ${selectedSource.label} (${selectedSource.sourceType})`,
      `اللغة: ${language.toUpperCase()} — ${languageLabels[language]}`,
      `عدد العناصر: ${selectedItems.length}`,
      "النتائج ستكون Candidates فقط.",
      "لن يظهر أي محتوى للعامة قبل Review و Publish.",
    ].join("\n"));

    if (!confirmed) return;

    setSyncing(true);
    setMessage("");
    setError("");
    setLastSummary(null);
    setProgress(`تتم ترجمة ${selectedItems.length} عنصر إلى ${languageLabels[language]} وحفظها كـ Candidates للمراجعة...`);
    try {
      const response = await syncArabicContentTranslations(
        selectedItems.map((item) => ({ sourceType: item.sourceType, sourceId: item.sourceId })),
        { languages: [language] }
      );
      const failed = response.errors || [];
      const nextFailures = failed.reduce<FailedSyncItem[]>((result, item) => {
        const source = TRANSLATION_SOURCE_DEFINITIONS.find((definition) => definition.sourceType === item.sourceType);
        if (source) result.push({ sourceType: source.sourceType, sourceId: item.sourceId, message: item.message });
        return result;
      }, []);
      const attemptedKeys = new Set(selectedItems.map((item) => `${item.sourceType}:${item.sourceId}`));
      setFailedItems((current) => [
        ...current.filter((item) => !attemptedKeys.has(`${item.sourceType}:${item.sourceId}`)),
        ...nextFailures,
      ]);

      const summary = response.summary || createFallbackSummary(selectedItems.length, response);
      setLastSummary(summary);
      const details = failed.map((item) => `• ${item.sourceType} #${item.sourceId}: ${item.message}`).join("\n");
      const baseMessage = response.message || "انتهى تشغيل الدفعة. النتائج محفوظة كـ Candidates فقط ولا تظهر للعامة قبل Review و Publish.";
      if (!failed.length) {
        setMessage(`${baseMessage}\nراجع Revisions لنشر النتائج يدوياً بعد المراجعة.`);
      } else if (valueOrZero(summary.createdCount) || valueOrZero(summary.retainedCount)) {
        setMessage(`${baseMessage}\n${details}`);
      } else {
        setError(`${baseMessage}\n${details || "تعذرت مزامنة الترجمة التلقائية."}`);
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "تعذرت مزامنة الترجمة التلقائية.");
    } finally {
      setProgress("");
      setSyncing(false);
    }
  }

  if (checkingAccess || loading) {
    return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز مركز الترجمة التلقائية...</div></main>;
  }
  if (!authorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-36 text-white md:p-8">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">Translation Automation</div>
            <h1 className="text-4xl font-black md:text-5xl">ترجمة دفعة مراقبة</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">اختر مصدراً واحداً وحتى 10 عناصر ولغة هدف واحدة. تحفظ النتائج كـ Candidates للمراجعة فقط ولا تظهر للعامة قبل Review و Publish.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations/revisions" className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-6 py-3 font-bold text-yellow-100">Revisions</Link>
            <Link href="/admin/translations/coverage" className="rounded-full border border-green-400/25 bg-green-500/10 px-6 py-3 font-bold text-green-100">Coverage</Link>
            <Link href="/admin/translations" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">لوحة الترجمات اليدوية</Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">لوحة الإدارة</Link>
          </div>
        </div>

        <section className="mb-6 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-6 text-cyan-50">
          <h2 className="text-xl font-black">حدود التشغيل الآمن</h2>
          <div className="mt-3 grid gap-3 leading-8 text-white/72 md:grid-cols-2">
            <p>الحد الأقصى 10 عناصر في الدفعة الواحدة، ومن مصدر واحد فقط.</p>
            <p>لغة واحدة فقط في كل تشغيل: EN أو TR. لا توجد لغة افتراضية.</p>
            <p>لا يوجد نشر تلقائي. النتائج Candidates فقط وتحتاج Review ثم Publish.</p>
            <p>سيظهر تأكيد نهائي قبل إرسال الطلب إلى Gemini.</p>
          </div>
        </section>

        <div className={`mb-6 rounded-[2rem] border p-6 ${configured ? "border-green-400/25 bg-green-500/10" : "border-yellow-400/25 bg-yellow-500/10"}`}>
          <div className="text-xl font-black">{configured ? "الترجمة التلقائية جاهزة" : "الترجمة التلقائية غير مفعلة بعد"}</div>
          <p className="mt-3 leading-8 text-white/70">{configured ? `الموديل المحدد: ${model || "الافتراضي"}. يتطلب هذا المسار اختيار مصدر واحد وحتى 10 عناصر ولغة واحدة صراحةً، ثم يحفظ النتائج كـ Candidates بحالة تحتاج مراجعة.` : "يلزم إعداد مزود الترجمة في Vercel قبل التشغيل."}</p>
        </div>

        {message ? <div className="mb-6 whitespace-pre-line rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div> : null}
        {error ? <div className="mb-6 whitespace-pre-line rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}
        {progress ? <div className="mb-6 rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-5 text-cyan-100">{progress}</div> : null}
        {lastSummary ? <SummaryPanel summary={lastSummary} /> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TRANSLATION_SOURCE_DEFINITIONS.map((source) => {
            const active = sourceType === source.sourceType;
            return <button key={source.sourceType} type="button" onClick={() => chooseSource(source.sourceType)} disabled={syncing} className={`rounded-[2rem] border p-6 text-right transition disabled:opacity-50 ${active ? "border-fuchsia-300/70 bg-fuchsia-500/15" : "border-white/10 bg-white/[0.04] hover:border-fuchsia-300/35"}`}><div className="flex items-start justify-between gap-4"><span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm font-black text-white/70">{counts[source.sourceType]}</span><span className={`h-5 w-5 rounded-full border-2 ${active ? "border-fuchsia-200 bg-fuchsia-500" : "border-white/35"}`} /></div><div className="mt-6 text-xl font-black">{source.label}</div><p className="mt-3 text-sm leading-7 text-white/55">اختر هذا المصدر أولاً، ثم اختر حتى 10 عناصر منه.</p></button>;
          })}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">1. اختر عناصر الدفعة</h2>
          <p className="mt-3 leading-8 text-white/60">يمكن اختيار حتى 10 عناصر من نفس المصدر في كل تشغيل.</p>
          {!sourceType ? <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-white/60">اختر مصدر المحتوى أولاً لعرض العناصر المتاحة للدفعة.</div> : <>
            <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
              <div className="font-bold text-white/80">تم اختيار {selectedIds.length} من {MAX_BATCH_ITEMS}</div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={selectFirstBatch} disabled={syncing || !availableItems.length} className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-5 py-2.5 font-bold text-fuchsia-100 disabled:opacity-50">تحديد أول 10</button>
                {retryableFailedItems.length ? <button type="button" onClick={selectFailedItemsOnly} disabled={syncing} className="rounded-full border border-red-400/30 bg-red-500/10 px-5 py-2.5 font-bold text-red-100 disabled:opacity-50">إعادة العناصر الفاشلة فقط ({Math.min(retryableFailedItems.length, MAX_BATCH_ITEMS)})</button> : null}
                <button type="button" onClick={() => setSelectedIds([])} disabled={syncing || !selectedIds.length} className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 font-bold text-white/75 disabled:opacity-50">مسح الاختيار</button>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {availableItems.map((item) => {
                const checked = selectedIds.includes(item.sourceId);
                return <label key={`${item.sourceType}:${item.sourceId}`} className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 ${checked ? "border-fuchsia-300/60 bg-fuchsia-500/10" : "border-white/10 bg-black/20"}`}><input type="checkbox" checked={checked} onChange={() => toggleItem(item.sourceId)} disabled={syncing} className="mt-1 h-5 w-5 accent-fuchsia-500" /><span className="leading-7 text-white/80">{item.label}</span></label>;
              })}
              {!availableItems.length ? <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-white/60">لا توجد عناصر متاحة ضمن هذا المصدر.</div> : null}
            </div>
          </>}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">2. اختر لغة الهدف</h2>
          <p className="mt-3 leading-8 text-white/60">لا توجد لغة افتراضية. يجب اختيار الإنجليزية أو التركية صراحةً قبل الإرسال.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {(Object.keys(languageLabels) as TargetLanguage[]).map((target) => <button key={target} type="button" onClick={() => setLanguage(target)} disabled={syncing} className={`rounded-full border px-6 py-3 font-bold ${language === target ? "border-fuchsia-300/70 bg-fuchsia-500/20 text-white" : "border-white/10 bg-black/20 text-white/70"}`}>{target.toUpperCase()} — {languageLabels[target]}</button>)}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">3. تشغيل دفعة مراقبة</h2>
          <p className="mt-3 max-w-3xl leading-8 text-white/60">ترسل هذه الدفعة حتى 10 عناصر من مصدر واحد ولغة هدف واحدة. لا يتم النشر تلقائياً، وتبقى كل نتيجة Candidate للمراجعة.</p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/65">
            <div>المصدر المختار: <strong className="text-white">{selectedSource?.label || "لم يتم الاختيار"}</strong></div>
            <div>اللغة المختارة: <strong className="text-white">{language ? `${language.toUpperCase()} — ${languageLabels[language]}` : "لم يتم الاختيار"}</strong></div>
            <div>العناصر المختارة: <strong className="text-white">{selectedItems.length}</strong></div>
            {runBlockReason ? <div className="mt-2 text-yellow-100">سبب التعطيل: {runBlockReason}</div> : <div className="mt-2 text-green-100">جاهز للتأكيد النهائي قبل تشغيل Gemini.</div>}
          </div>
          <button type="button" onClick={() => void runBatch()} disabled={syncing || Boolean(runBlockReason)} className="mt-6 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-7 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{syncing ? "جاري الترجمة والحفظ للمراجعة..." : "تأكيد وتشغيل الدفعة كـ Candidates"}</button>
        </section>
      </section>
    </main>
  );
}

function SummaryPanel({ summary }: { summary: TranslationSyncSummary }) {
  return (
    <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">Summary بعد التشغيل</h2>
          <p className="mt-1 text-sm text-white/55">النتائج Candidates فقط ولا تظهر للعامة قبل Review و Publish.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/translations/revisions" className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100">فتح Revisions</Link>
          <Link href="/admin/translations/coverage" className="rounded-full border border-green-400/25 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-100">فتح Coverage</Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryStat label="Created" value={valueOrZero(summary.createdCount)} />
        <SummaryStat label="Retained" value={valueOrZero(summary.retainedCount)} />
        <SummaryStat label="Failed" value={valueOrZero(summary.failedCount)} />
        <SummaryStat label="Skipped / Ignored" value={valueOrZero(summary.skippedCount) || valueOrZero(summary.ignoredCount) + valueOrZero(summary.truncatedCount)} />
        <SummaryStat label="Total requested" value={valueOrZero(summary.totalRequested)} />
        <SummaryStat label="Total processed" value={valueOrZero(summary.totalProcessed)} />
      </div>
      {valueOrZero(summary.truncatedCount) ? <div className="mt-4 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm text-yellow-100">تم تجاهل {summary.truncatedCount} عنصر بسبب حد {summary.maxItemsPerRequest || MAX_BATCH_ITEMS} عناصر لكل دفعة.</div> : null}
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs text-white/50">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>;
}
