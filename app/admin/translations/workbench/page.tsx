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
type RevisionStatus = "draft" | "needs_review" | "reviewed" | "published" | "superseded" | "archived";
type ItemStateKind = "published" | "legacy_published" | "needs_review" | "draft" | "reviewed" | "stale" | "missing";

type SourceCount = Record<TranslationSourceType, number>;
type RawItem = { sourceType: TranslationSourceType; sourceId: string; label: string };
type RevisionRow = {
  source_type: string | null;
  source_id: string | number | null;
  language: TargetLanguage | null;
  workflow_status: RevisionStatus | null;
  is_stale: boolean | null;
  updated_at: string | null;
};
type LegacyTranslationRow = {
  source_type: string | null;
  source_id: string | number | null;
  language: TargetLanguage | null;
  status: string | null;
  reviewed: boolean | null;
  is_published: boolean | null;
};
type ItemState = {
  kind: ItemStateKind;
  label: string;
  description: string;
  canRun: boolean;
  canCreateCandidate: boolean;
  defaultSelected: boolean;
  retainedWarning: boolean;
};
type WorkbenchItem = RawItem & { state: ItemState };
type FailedSyncItem = { sourceType: string; sourceId: string; message: string };
type SyncRunResult = {
  sourceType: TranslationSourceType;
  sourceId: string;
  languages: TargetLanguage[];
  createdLanguages?: TargetLanguage[];
  retainedLanguages?: TargetLanguage[];
};
type SyncRunResponse = {
  ok: boolean;
  message?: string;
  results?: SyncRunResult[];
  errors?: FailedSyncItem[];
  summary?: TranslationSyncSummary;
};

const MAX_BATCH_ITEMS = 10;
const LANGUAGES: TargetLanguage[] = ["en", "tr"];
const languageLabels: Record<TargetLanguage, string> = { en: "English", tr: "Turkish" };
const emptyCounts = Object.fromEntries(
  TRANSLATION_SOURCE_DEFINITIONS.map((source) => [source.sourceType, 0])
) as SourceCount;
const sourceTypes = TRANSLATION_SOURCE_DEFINITIONS.map((source) => source.sourceType);
const activeRevisionStatuses: RevisionStatus[] = ["draft", "needs_review", "reviewed", "published"];

function valueOrZero(value: number | undefined) {
  return typeof value === "number" ? value : 0;
}

function sourceKey(sourceType: string | null | undefined, sourceId: string | number | null | undefined) {
  if (!sourceType || sourceId === null || sourceId === undefined) return "";
  return `${sourceType}:${String(sourceId)}`;
}

function rowText(row: Record<string, unknown>, keys: readonly string[], fallback: string) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return fallback;
}

function getItemLabel(
  source: (typeof TRANSLATION_SOURCE_DEFINITIONS)[number],
  row: Record<string, unknown>,
  index: number
) {
  return rowText(row, source.titleKeys, `${source.label} ${index + 1}`);
}

function stateMeta(kind: ItemStateKind): Omit<ItemState, "kind"> {
  if (kind === "published") {
    return {
      label: "Published",
      description: "Fresh published revision exists. No new candidate is needed.",
      canRun: false,
      canCreateCandidate: false,
      defaultSelected: false,
      retainedWarning: false,
    };
  }
  if (kind === "legacy_published") {
    return {
      label: "Legacy Published",
      description: "Legacy published translation exists. Keep it unless a new lifecycle candidate is intentionally needed later.",
      canRun: false,
      canCreateCandidate: false,
      defaultSelected: false,
      retainedWarning: false,
    };
  }
  if (kind === "needs_review") {
    return {
      label: "Needs Review",
      description: "An active candidate already exists. Running sync will retain it instead of overwriting it.",
      canRun: true,
      canCreateCandidate: false,
      defaultSelected: false,
      retainedWarning: true,
    };
  }
  if (kind === "draft") {
    return {
      label: "Draft",
      description: "A draft candidate already exists. Running sync will retain it safely.",
      canRun: true,
      canCreateCandidate: false,
      defaultSelected: false,
      retainedWarning: true,
    };
  }
  if (kind === "reviewed") {
    return {
      label: "Reviewed",
      description: "A reviewed candidate already exists. Publish from Revisions if it is acceptable.",
      canRun: true,
      canCreateCandidate: false,
      defaultSelected: false,
      retainedWarning: true,
    };
  }
  if (kind === "stale") {
    return {
      label: "Stale",
      description: "Arabic source changed after the current translation. A new candidate can be created.",
      canRun: true,
      canCreateCandidate: true,
      defaultSelected: true,
      retainedWarning: false,
    };
  }
  return {
    label: "Missing",
    description: "No current translation candidate or published lifecycle revision exists for this language.",
    canRun: true,
    canCreateCandidate: true,
    defaultSelected: true,
    retainedWarning: false,
  };
}

function createState(kind: ItemStateKind): ItemState {
  return { kind, ...stateMeta(kind) };
}

function getLanguageState(item: RawItem, language: TargetLanguage, revisions: RevisionRow[], legacyRows: LegacyTranslationRow[]): ItemState {
  const key = sourceKey(item.sourceType, item.sourceId);
  const matchingRevisions = revisions
    .filter((revision) =>
      sourceKey(revision.source_type, revision.source_id) === key &&
      revision.language === language &&
      revision.workflow_status &&
      activeRevisionStatuses.includes(revision.workflow_status)
    )
    .sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));

  const freshRevision = matchingRevisions.find((revision) => !revision.is_stale);
  if (freshRevision?.workflow_status === "published") return createState("published");
  if (freshRevision?.workflow_status === "needs_review") return createState("needs_review");
  if (freshRevision?.workflow_status === "reviewed") return createState("reviewed");
  if (freshRevision?.workflow_status === "draft") return createState("draft");
  if (matchingRevisions.some((revision) => revision.is_stale)) return createState("stale");

  const matchingLegacy = legacyRows.filter((row) => sourceKey(row.source_type, row.source_id) === key && row.language === language);
  if (matchingLegacy.some((row) => row.is_published || row.status === "published")) return createState("legacy_published");
  if (matchingLegacy.some((row) => row.status === "needs_review")) return createState("needs_review");
  if (matchingLegacy.some((row) => row.reviewed || row.status === "reviewed")) return createState("reviewed");
  if (matchingLegacy.some((row) => Boolean(row.status))) return createState("draft");

  return createState("missing");
}

function badgeClass(kind: ItemStateKind) {
  if (kind === "published" || kind === "legacy_published") return "border-green-400/30 bg-green-500/10 text-green-100";
  if (kind === "stale") return "border-yellow-400/35 bg-yellow-500/10 text-yellow-100";
  if (kind === "needs_review") return "border-orange-400/35 bg-orange-500/10 text-orange-100";
  if (kind === "reviewed") return "border-cyan-400/35 bg-cyan-500/10 text-cyan-100";
  if (kind === "draft") return "border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100";
  return "border-white/15 bg-white/[0.06] text-white/70";
}

function selectClassName() {
  return "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 font-bold text-white outline-none";
}

export default function TranslationWorkbenchPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [model, setModel] = useState("");
  const [counts, setCounts] = useState<SourceCount>(emptyCounts);
  const [items, setItems] = useState<RawItem[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [legacyRows, setLegacyRows] = useState<LegacyTranslationRow[]>([]);
  const [sourceType, setSourceType] = useState<TranslationSourceType>("programs");
  const [language, setLanguage] = useState<TargetLanguage>("en");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [lastSummary, setLastSummary] = useState<TranslationSyncSummary | null>(null);
  const [lastResults, setLastResults] = useState<SyncRunResult[]>([]);
  const [lastErrors, setLastErrors] = useState<FailedSyncItem[]>([]);

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        setCheckingAccess(false);
        return;
      }
      if (access.profile.role !== "super_admin" && access.profile.role !== "deputy_super_admin") {
        router.replace("/admin");
        setCheckingAccess(false);
        return;
      }
      setAuthorized(true);
      setCheckingAccess(false);
    }

    void checkAccess();
  }, [router]);

  useEffect(() => {
    if (authorized) void loadWorkbench();
  }, [authorized]);

  async function loadWorkbench() {
    const client = supabase;
    if (!client) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setWarning("");
    setMessage("");

    try {
      const [status, revisionResult, legacyResult, ...sourceResults] = await Promise.all([
        getTranslationAutomationStatus(),
        client
          .from("content_translation_revisions")
          .select("source_type, source_id, language, workflow_status, is_stale, updated_at")
          .in("source_type", sourceTypes)
          .in("language", LANGUAGES)
          .limit(20000),
        client
          .from("content_translations")
          .select("source_type, source_id, language, status, reviewed, is_published")
          .in("source_type", sourceTypes)
          .in("language", LANGUAGES)
          .limit(20000),
        ...TRANSLATION_SOURCE_DEFINITIONS.map((source) => client.from(source.table).select("*").limit(500)),
      ]);

      const nextItems: RawItem[] = [];
      const nextCounts: SourceCount = { ...emptyCounts };
      const sourceWarnings: string[] = [];

      sourceResults.forEach((result, index) => {
        const source = TRANSLATION_SOURCE_DEFINITIONS[index];
        if (!source) return;
        if (result.error) {
          sourceWarnings.push(`${source.sourceType}: ${result.error.message}`);
          return;
        }
        const rows = (result.data || []) as Array<Record<string, unknown>>;
        nextCounts[source.sourceType] = rows.length;
        rows.forEach((row, rowIndex) => {
          const sourceId = String(row.id || "").trim();
          if (!sourceId) return;
          nextItems.push({ sourceType: source.sourceType, sourceId, label: getItemLabel(source, row, rowIndex) });
        });
      });

      const revisionWarnings = [
        revisionResult.error ? `Revisions: ${revisionResult.error.message}` : "",
        legacyResult.error ? `Legacy translations: ${legacyResult.error.message}` : "",
        ...sourceWarnings,
      ].filter(Boolean);

      setConfigured(status.configured);
      setModel(status.model || "");
      setCounts(nextCounts);
      setItems(nextItems);
      setRevisions((revisionResult.data || []) as RevisionRow[]);
      setLegacyRows((legacyResult.data || []) as LegacyTranslationRow[]);
      setWarning(revisionWarnings.length ? `تم تحميل Workbench مع بعض التحذيرات: ${revisionWarnings.join(" | ")}` : "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تجهيز Translation Workbench.");
    } finally {
      setLoading(false);
    }
  }

  const selectedSource = useMemo(
    () => TRANSLATION_SOURCE_DEFINITIONS.find((source) => source.sourceType === sourceType) || null,
    [sourceType]
  );

  const workbenchItems = useMemo<WorkbenchItem[]>(
    () => items
      .filter((item) => item.sourceType === sourceType)
      .map((item) => ({ ...item, state: getLanguageState(item, language, revisions, legacyRows) })),
    [items, language, legacyRows, revisions, sourceType]
  );

  const stateSignature = useMemo(
    () => workbenchItems.map((item) => `${item.sourceId}:${item.state.kind}:${item.state.defaultSelected}`).join("|"),
    [workbenchItems]
  );

  useEffect(() => {
    if (loading || !sourceType || !language) return;
    setSelectedIds(
      workbenchItems
        .filter((item) => item.state.defaultSelected && item.state.canRun)
        .slice(0, MAX_BATCH_ITEMS)
        .map((item) => item.sourceId)
    );
  }, [language, loading, sourceType, stateSignature]);

  const selectedItems = useMemo(
    () => workbenchItems.filter((item) => selectedIds.includes(item.sourceId)),
    [selectedIds, workbenchItems]
  );

  const coverage = useMemo(() => {
    return {
      totalArabic: workbenchItems.length,
      published: workbenchItems.filter((item) => item.state.kind === "published" || item.state.kind === "legacy_published").length,
      needsReview: workbenchItems.filter((item) => item.state.kind === "needs_review").length,
      draftReviewed: workbenchItems.filter((item) => item.state.kind === "draft" || item.state.kind === "reviewed").length,
      stale: workbenchItems.filter((item) => item.state.kind === "stale").length,
      missing: workbenchItems.filter((item) => item.state.kind === "missing").length,
      candidates: workbenchItems.filter((item) => ["draft", "needs_review", "reviewed"].includes(item.state.kind)).length,
    };
  }, [workbenchItems]);

  const runBlockReason = useMemo(() => {
    if (!configured) return "Gemini Automation غير مفعلة أو غير مضبوطة.";
    if (!sourceType) return "اختر Source Type أولاً.";
    if (!language) return "اختر لغة واحدة فقط.";
    if (!selectedItems.length) return "اختر عنصراً واحداً على الأقل.";
    if (selectedItems.length > MAX_BATCH_ITEMS) return `الحد الأقصى هو ${MAX_BATCH_ITEMS} عناصر.`;
    if (selectedItems.some((item) => !item.state.canRun)) return "يوجد عنصر مختار لا يحتاج Candidate جديد ضمن هذه اللغة.";
    return "";
  }, [configured, language, selectedItems, sourceType]);

  function changeSource(nextSourceType: TranslationSourceType) {
    setSourceType(nextSourceType);
    setLastSummary(null);
    setLastResults([]);
    setLastErrors([]);
    setMessage("");
    setError("");
  }

  function toggleItem(item: WorkbenchItem) {
    if (selectedIds.includes(item.sourceId)) {
      setSelectedIds((current) => current.filter((id) => id !== item.sourceId));
      setError("");
      return;
    }
    if (!item.state.canRun) {
      setError("هذا العنصر لا يحتاج Candidate جديد حالياً، لذلك لم يتم اختياره.");
      return;
    }
    if (selectedIds.length >= MAX_BATCH_ITEMS) {
      setError("الحد الأقصى لكل دفعة هو 10 عناصر فقط.");
      return;
    }
    setSelectedIds((current) => [...current, item.sourceId]);
    setError("");
  }

  function selectRecommended() {
    const recommended = workbenchItems
      .filter((item) => item.state.defaultSelected && item.state.canRun)
      .slice(0, MAX_BATCH_ITEMS)
      .map((item) => item.sourceId);
    setSelectedIds(recommended);
    setMessage(recommended.length ? `تم اختيار ${recommended.length} عنصر Missing / Stale فقط.` : "لا يوجد Missing أو Stale آمن للتحديد التلقائي.");
    setError("");
  }

  async function runBatch() {
    if (runBlockReason) {
      setError(runBlockReason);
      return;
    }
    if (!selectedSource) return;

    const selectedNames = selectedItems.map((item) => `- ${item.label} (#${item.sourceId})`).join("\n");
    const retainedCount = selectedItems.filter((item) => item.state.retainedWarning).length;
    const confirmed = window.confirm([
      "Create Candidates — تأكيد نهائي",
      `source_type: ${selectedSource.sourceType}`,
      `language: ${language}`,
      `عدد العناصر: ${selectedItems.length}`,
      selectedNames ? `العناصر:\n${selectedNames}` : "",
      retainedCount ? `تنبيه: ${retainedCount} عنصر لديه Candidate نشط وسيتم Retained بأمان إن أعاده API.` : "",
      "النتائج ستكون Candidates فقط.",
      "لن يظهر أي شيء للعامة قبل Review و Publish من صفحة Revisions.",
    ].filter(Boolean).join("\n"));

    if (!confirmed) return;

    setSyncing(true);
    setError("");
    setMessage("");
    setLastSummary(null);
    setLastResults([]);
    setLastErrors([]);

    try {
      const response = await syncArabicContentTranslations(
        selectedItems.map((item) => ({ sourceType: item.sourceType, sourceId: item.sourceId })),
        { languages: [language] }
      ) as SyncRunResponse;
      const summary = response.summary || createFallbackSummary(selectedItems.length, response);
      setLastSummary(summary);
      setLastResults(response.results || []);
      setLastErrors(response.errors || []);
      setMessage(response.message || "تم إنشاء Candidates أو الاحتفاظ بالموجود بأمان. راجع Revisions قبل أي Publish يدوي.");
      await loadWorkbench();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "تعذر تشغيل Create Candidates.");
    } finally {
      setSyncing(false);
    }
  }

  if (checkingAccess || loading) {
    return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز Translation Workbench...</div></main>;
  }
  if (!authorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-32 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">Translation Workbench</div>
            <h1 className="text-4xl font-black md:text-5xl">منضدة تشغيل الترجمة</h1>
            <p className="mt-3 max-w-4xl leading-8 text-white/60">صفحة داخلية آمنة تجمع Coverage المختصر، اختيار العناصر، وتشغيل Create Candidates فقط. لا يوجد نشر تلقائي، والمراجعة والنشر يبقيان من Revisions.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations/revisions" className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-3 font-bold text-yellow-100">Revisions</Link>
            <Link href="/admin/translations/coverage" className="rounded-full border border-green-400/25 bg-green-500/10 px-5 py-3 font-bold text-green-100">Coverage</Link>
            <Link href="/admin/translations/automation" className="rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100">Automation</Link>
            <button type="button" onClick={() => void loadWorkbench()} disabled={syncing} className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 font-bold text-white/80 disabled:opacity-50">تحديث</button>
          </div>
        </div>

        <section className={`mb-6 rounded-[2rem] border p-6 ${configured ? "border-green-400/25 bg-green-500/10" : "border-yellow-400/25 bg-yellow-500/10"}`}>
          <div className="text-xl font-black">{configured ? "Gemini Automation جاهزة" : "Gemini Automation غير مفعلة"}</div>
          <p className="mt-3 leading-8 text-white/70">{configured ? `الموديل: ${model || "الافتراضي"}. التشغيل هنا يستدعي API الحالي ويُنتج Candidates فقط.` : "يمكنك فتح الصفحة ومراجعة الحالات، لكن زر Create Candidates يبقى معطلاً حتى تكون الأتمتة مضبوطة."}</p>
        </section>

        {warning ? <div className="mb-6 rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-5 text-yellow-100">{warning}</div> : null}
        {message ? <div className="mb-6 whitespace-pre-line rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div> : null}
        {error ? <div className="mb-6 whitespace-pre-line rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}
        {lastSummary ? <SummaryPanel summary={lastSummary} results={lastResults} errors={lastErrors} /> : null}

        <section className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">1. Source Type</h2>
            <p className="mt-2 text-sm leading-7 text-white/55">المصادر المدعومة فقط ضمن نظام الترجمة الحالي.</p>
            <select value={sourceType} onChange={(event) => changeSource(event.target.value as TranslationSourceType)} disabled={syncing} className={`${selectClassName()} mt-5`}>
              {TRANSLATION_SOURCE_DEFINITIONS.map((source) => <option key={source.sourceType} value={source.sourceType}>{source.sourceType} — {source.label} ({counts[source.sourceType]})</option>)}
            </select>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black">2. Language</h2>
            <p className="mt-2 text-sm leading-7 text-white/55">لغة واحدة فقط لكل تشغيل: EN أو TR.</p>
            <select value={language} onChange={(event) => setLanguage(event.target.value as TargetLanguage)} disabled={syncing} className={`${selectClassName()} mt-5`}>
              <option value="en">en — English</option>
              <option value="tr">tr — Turkish</option>
            </select>
          </div>
        </section>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black">ملخص سريع</h2>
              <p className="mt-2 text-sm text-white/55">{selectedSource?.label || sourceType} / {language.toUpperCase()}</p>
            </div>
            <div className="text-sm text-white/50">Candidates الموجودين = Draft + Needs Review + Reviewed</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
            <SummaryStat label="Total Arabic sources" value={coverage.totalArabic} />
            <SummaryStat label="Published" value={coverage.published} />
            <SummaryStat label="Needs Review" value={coverage.needsReview} />
            <SummaryStat label="Draft / Reviewed" value={coverage.draftReviewed} />
            <SummaryStat label="Stale" value={coverage.stale} />
            <SummaryStat label="Missing" value={coverage.missing} />
            <SummaryStat label="Candidates" value={coverage.candidates} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-black">العناصر القابلة للتشغيل</h2>
              <p className="mt-3 max-w-3xl leading-8 text-white/60">Missing و Stale يتم اختيارهما افتراضياً فقط. العناصر التي لديها Candidate نشط تظهر بتحذير Retained ولا يتم الكتابة فوقها.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={selectRecommended} disabled={syncing} className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-5 py-2.5 font-bold text-fuchsia-100 disabled:opacity-50">تحديد Missing / Stale</button>
              <button type="button" onClick={() => setSelectedIds([])} disabled={syncing || !selectedIds.length} className="rounded-full border border-white/15 bg-black/20 px-5 py-2.5 font-bold text-white/75 disabled:opacity-50">مسح الاختيار</button>
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4 leading-8 text-white/70">
            <div>تم اختيار <strong className="text-white">{selectedItems.length}</strong> من {MAX_BATCH_ITEMS}.</div>
            {runBlockReason ? <div className="text-yellow-100">سبب تعطيل Create Candidates: {runBlockReason}</div> : <div className="text-green-100">جاهز للتأكيد النهائي قبل تشغيل Gemini.</div>}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/[0.04] text-white/55">
                <tr>
                  <th className="px-4 py-3 text-right">اختيار</th>
                  <th className="px-4 py-3 text-right">العنصر</th>
                  <th className="px-4 py-3 text-right">source_id</th>
                  <th className="px-4 py-3 text-right">الحالة</th>
                  <th className="px-4 py-3 text-right">Candidate</th>
                  <th className="px-4 py-3 text-right">ملاحظة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {workbenchItems.map((item) => {
                  const checked = selectedIds.includes(item.sourceId);
                  return (
                    <tr key={`${item.sourceType}:${item.sourceId}`} className={checked ? "bg-fuchsia-500/10" : "bg-black/10"}>
                      <td className="px-4 py-4 align-top">
                        <input type="checkbox" checked={checked} onChange={() => toggleItem(item)} disabled={syncing || !item.state.canRun} className="h-5 w-5 accent-fuchsia-500 disabled:opacity-40" />
                      </td>
                      <td className="min-w-[220px] px-4 py-4 align-top font-bold text-white/85">{item.label}</td>
                      <td className="px-4 py-4 align-top font-mono text-xs text-white/55">{item.sourceId}</td>
                      <td className="px-4 py-4 align-top"><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${badgeClass(item.state.kind)}`}>{item.state.label}</span></td>
                      <td className="px-4 py-4 align-top text-white/70">{item.state.canCreateCandidate ? "يمكن إنشاء Candidate" : item.state.retainedWarning ? "Retained آمن" : "لا يحتاج"}</td>
                      <td className="min-w-[260px] px-4 py-4 align-top leading-7 text-white/55">{item.state.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!workbenchItems.length ? <div className="p-6 text-center text-white/60">لا توجد عناصر ضمن هذا المصدر.</div> : null}
          </div>

          <div className="mt-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-black/25 p-5 md:flex-row md:items-center md:justify-between">
            <div className="leading-8 text-white/65">
              <div>الزر يستدعي API الحالي فقط: <span className="font-mono text-white">/api/admin/translations/sync</span></div>
              <div>لا يوجد Review أو Publish داخل Workbench.</div>
            </div>
            <button type="button" onClick={() => void runBatch()} disabled={syncing || Boolean(runBlockReason)} className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-7 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{syncing ? "جاري إنشاء Candidates..." : "Create Candidates"}</button>
          </div>
        </section>
      </section>
    </main>
  );
}

function createFallbackSummary(selectedCount: number, response: SyncRunResponse): TranslationSyncSummary {
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

function SummaryPanel({ summary, results, errors }: { summary: TranslationSyncSummary; results: SyncRunResult[]; errors: FailedSyncItem[] }) {
  return (
    <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">Summary بعد التشغيل</h2>
          <p className="mt-1 text-sm text-white/55">النتائج Candidates فقط ولا تظهر للعامة قبل Review و Publish.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/translations/revisions" className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100">فتح Revisions</Link>
          <Link href="/admin/translations/coverage" className="rounded-full border border-green-400/25 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-100">فتح Coverage</Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
        <SummaryStat label="totalRequested" value={valueOrZero(summary.totalRequested)} />
        <SummaryStat label="totalAccepted" value={valueOrZero(summary.totalAccepted)} />
        <SummaryStat label="totalProcessed" value={valueOrZero(summary.totalProcessed)} />
        <SummaryStat label="createdCount" value={valueOrZero(summary.createdCount)} />
        <SummaryStat label="retainedCount" value={valueOrZero(summary.retainedCount)} />
        <SummaryStat label="failedCount" value={valueOrZero(summary.failedCount)} />
        <SummaryStat label="ignored/truncated/skipped" value={valueOrZero(summary.ignoredCount) + valueOrZero(summary.truncatedCount) + valueOrZero(summary.skippedCount)} />
        <SummaryStat label="maxItemsPerRequest" value={valueOrZero(summary.maxItemsPerRequest)} />
      </div>
      {results.length ? <div className="mt-5 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-sm leading-7 text-green-100"><div className="font-black">Results</div>{results.map((item) => <div key={`${item.sourceType}:${item.sourceId}`}>• {item.sourceType} #{item.sourceId} — Created: {(item.createdLanguages || []).join(", ") || "—"} / Retained: {(item.retainedLanguages || []).join(", ") || "—"}</div>)}</div> : null}
      {errors.length ? <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100"><div className="font-black">Failed</div>{errors.map((item) => <div key={`${item.sourceType}:${item.sourceId}`}>• {item.sourceType} #{item.sourceId}: {item.message}</div>)}</div> : null}
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs text-white/50">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>;
}
