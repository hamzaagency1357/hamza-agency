"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Language = "en" | "tr";
type RevisionStatus = "draft" | "needs_review" | "reviewed" | "published" | "superseded" | "archived";
type LegacyStatus = string | null;

type RevisionRow = {
  source_type: string | null;
  source_id: string | number | null;
  language: Language | null;
  workflow_status: RevisionStatus | null;
  is_stale: boolean | null;
};

type LegacyTranslationRow = {
  source_type: string | null;
  source_id: string | number | null;
  language: Language | null;
  status: LegacyStatus;
  reviewed: boolean | null;
  is_published: boolean | null;
};

type CoverageByLanguage = {
  published: number;
  needsReview: number;
  draftReviewed: number;
  stale: number;
  missing: number;
};

type CoverageRow = {
  key: SourceType;
  label: string;
  href: string;
  totalArabic: number;
  en: CoverageByLanguage;
  tr: CoverageByLanguage;
};

const SOURCE_TYPES = [
  { key: "programs", label: "Programs", table: "programs", href: "/admin/programs" },
  { key: "pages", label: "Pages", table: "pages", href: "/admin/pages" },
  { key: "sections", label: "Sections", table: "sections", href: "/admin/sections" },
  { key: "faqs", label: "FAQ", table: "faqs", href: "/admin/faqs" },
  { key: "knowledge_base", label: "Knowledge Base", table: "knowledge_base", href: "/admin/knowledge-base" },
  { key: "partners", label: "Partners", table: "partners", href: "/admin/partners" },
  { key: "jobs", label: "Jobs", table: "jobs", href: "/admin/jobs" },
  { key: "reviews", label: "Reviews", table: "reviews", href: "/admin/reviews" },
  { key: "success_stories", label: "Success Stories", table: "success_stories", href: "/admin/success-stories" },
  { key: "gallery_items", label: "Gallery", table: "gallery_items", href: "/admin/gallery" },
  { key: "announcements", label: "Announcements", table: "announcements", href: "/admin/announcements" },
] as const;

const LANGUAGES: Language[] = ["en", "tr"];
type SourceType = (typeof SOURCE_TYPES)[number]["key"];

type SourceConfig = (typeof SOURCE_TYPES)[number];

const SOURCE_KEYS = SOURCE_TYPES.map((source) => source.key);

function keyOf(sourceType: string | null | undefined, sourceId: string | number | null | undefined) {
  if (!sourceType || sourceId === null || sourceId === undefined) return "";
  return `${sourceType}:${String(sourceId)}`;
}

function uniqueCount(values: Set<string>) {
  return values.size;
}

function clampMissing(total: number, translated: Set<string>) {
  return Math.max(total - uniqueCount(translated), 0);
}

function createLanguageCoverage(totalArabic: number, sourceType: SourceType, language: Language, revisions: RevisionRow[], legacyRows: LegacyTranslationRow[]): CoverageByLanguage {
  const published = new Set<string>();
  const needsReview = new Set<string>();
  const draftReviewed = new Set<string>();
  const stale = new Set<string>();
  const translated = new Set<string>();

  revisions.forEach((revision) => {
    if (revision.source_type !== sourceType || revision.language !== language) return;
    const key = keyOf(revision.source_type, revision.source_id);
    if (!key) return;
    translated.add(key);
    if (revision.workflow_status === "published") published.add(key);
    if (revision.workflow_status === "needs_review") needsReview.add(key);
    if (revision.workflow_status === "draft" || revision.workflow_status === "reviewed") draftReviewed.add(key);
    if (revision.is_stale) stale.add(key);
  });

  legacyRows.forEach((row) => {
    if (row.source_type !== sourceType || row.language !== language) return;
    const key = keyOf(row.source_type, row.source_id);
    if (!key) return;
    translated.add(key);
    if (row.is_published || row.status === "published") published.add(key);
    if (row.reviewed || row.status === "reviewed") draftReviewed.add(key);
    if (!row.is_published && row.status === "needs_review") needsReview.add(key);
  });

  return {
    published: uniqueCount(published),
    needsReview: uniqueCount(needsReview),
    draftReviewed: uniqueCount(draftReviewed),
    stale: uniqueCount(stale),
    missing: clampMissing(totalArabic, translated),
  };
}

function buildCoverage(totals: Record<SourceType, number>, revisions: RevisionRow[], legacyRows: LegacyTranslationRow[]): CoverageRow[] {
  return SOURCE_TYPES.map((source) => {
    const totalArabic = totals[source.key] || 0;
    return {
      key: source.key,
      label: source.label,
      href: source.href,
      totalArabic,
      en: createLanguageCoverage(totalArabic, source.key, "en", revisions, legacyRows),
      tr: createLanguageCoverage(totalArabic, source.key, "tr", revisions, legacyRows),
    };
  });
}

function sum(rows: CoverageRow[], picker: (row: CoverageRow) => number) {
  return rows.reduce((total, row) => total + picker(row), 0);
}

async function getSourceCount(source: SourceConfig) {
  if (!supabase) return 0;
  const { count } = await supabase.from(source.table).select("id", { count: "exact", head: true });
  return count || 0;
}

export default function TranslationCoveragePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  useEffect(() => {
    void (async () => {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }
      setReady(true);
    })();
  }, [router]);

  const loadCoverage = useCallback(async () => {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setWarning("");

    const [sourceCounts, revisionsResult, legacyResult] = await Promise.all([
      Promise.all(SOURCE_TYPES.map(async (source) => [source.key, await getSourceCount(source)] as const)),
      supabase
        .from("content_translation_revisions")
        .select("source_type, source_id, language, workflow_status, is_stale")
        .in("source_type", SOURCE_KEYS)
        .in("language", LANGUAGES)
        .limit(20000),
      supabase
        .from("content_translations")
        .select("source_type, source_id, language, status, reviewed, is_published")
        .in("source_type", SOURCE_KEYS)
        .in("language", LANGUAGES)
        .limit(20000),
    ]);

    setLoading(false);

    const totals = Object.fromEntries(sourceCounts) as Record<SourceType, number>;
    const warnings = [
      revisionsResult.error ? `Revisions: ${revisionsResult.error.message}` : "",
      legacyResult.error ? `Legacy translations: ${legacyResult.error.message}` : "",
    ].filter(Boolean);

    if (warnings.length) {
      setWarning(`تم تحميل أرقام المصادر، لكن بعض بيانات الترجمة لم تُقرأ بالكامل: ${warnings.join(" | ")}`);
    }

    setRows(buildCoverage(totals, (revisionsResult.data || []) as RevisionRow[], (legacyResult.data || []) as LegacyTranslationRow[]));
  }, []);

  useEffect(() => {
    if (ready) void loadCoverage();
  }, [loadCoverage, ready]);

  const totals = useMemo(() => ({
    arabic: sum(rows, (row) => row.totalArabic),
    publishedEn: sum(rows, (row) => row.en.published),
    publishedTr: sum(rows, (row) => row.tr.published),
    needsReview: sum(rows, (row) => row.en.needsReview + row.tr.needsReview),
    stale: sum(rows, (row) => row.en.stale + row.tr.stale),
    missing: sum(rows, (row) => row.en.missing + row.tr.missing),
  }), [rows]);

  if (!ready || loading) {
    return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري حساب تغطية الترجمة...</div></main>;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">Translation Coverage</div>
            <h1 className="text-4xl font-black md:text-5xl">لوحة تغطية الترجمة</h1>
            <p className="mt-3 max-w-4xl leading-8 text-white/60">قراءة فقط لمعرفة ما نُشر وما يحتاج مراجعة وما بقي مفقوداً قبل بدء الترجمة الفعلية. Missing = إجمالي المصادر العربية ناقص المصادر التي لديها ترجمة Legacy أو Revision لنفس اللغة.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations/revisions" className="rounded-full border border-yellow-300/25 bg-yellow-500/10 px-5 py-3 font-bold text-yellow-100">Revisions</Link>
            <Link href="/admin/translations/automation" className="rounded-full border border-purple-300/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100">Automation</Link>
            <button type="button" onClick={() => void loadCoverage()} className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 font-bold text-white/80">تحديث</button>
          </div>
        </div>

        {error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}
        {warning ? <div className="mb-5 rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-5 text-yellow-100">{warning}</div> : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <Stat label="إجمالي المصادر العربية" value={totals.arabic} />
          <Stat label="Published EN" value={totals.publishedEn} />
          <Stat label="Published TR" value={totals.publishedTr} />
          <Stat label="Needs Review" value={totals.needsReview} />
          <Stat label="Stale" value={totals.stale} />
          <Stat label="Missing" value={totals.missing} />
        </div>

        <section className="mb-6 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-5 text-cyan-50">
          <h2 className="text-xl font-black">طريقة الحساب المختصرة</h2>
          <p className="mt-3 leading-8 text-white/70">Published وNeeds Review تُحسب من Revisions الجديدة ومعها Legacy `content_translations` عند وجودها. Stale يُحسب من Revisions فقط. Draft / Reviewed تظهر داخل عمود ملاحظات مستقل لأنها Candidates غير منشورة. Missing رقم عملي تقريبي حسب المصدر واللغة.</p>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-right text-sm">
              <thead className="bg-white/[0.06] text-xs uppercase tracking-wide text-white/50">
                <tr>
                  <th className="px-4 py-4">Source Type</th>
                  <th className="px-4 py-4">Total Arabic</th>
                  <th className="px-4 py-4">EN Published</th>
                  <th className="px-4 py-4">EN Needs Review</th>
                  <th className="px-4 py-4">EN Stale</th>
                  <th className="px-4 py-4">EN Missing</th>
                  <th className="px-4 py-4">TR Published</th>
                  <th className="px-4 py-4">TR Needs Review</th>
                  <th className="px-4 py-4">TR Stale</th>
                  <th className="px-4 py-4">TR Missing</th>
                  <th className="px-4 py-4">Draft / Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.map((row) => (
                  <tr key={row.key} className="bg-black/15 align-top">
                    <td className="px-4 py-4 font-black text-white">
                      <Link href={row.href} className="text-cyan-100 underline-offset-4 hover:underline">{row.label}</Link>
                      <div className="mt-1 text-xs font-normal text-white/40">{row.key}</div>
                    </td>
                    <Cell value={row.totalArabic} />
                    <Cell value={row.en.published} tone="green" />
                    <Cell value={row.en.needsReview} tone="yellow" />
                    <Cell value={row.en.stale} tone="orange" />
                    <Cell value={row.en.missing} tone={row.en.missing ? "red" : "green"} />
                    <Cell value={row.tr.published} tone="green" />
                    <Cell value={row.tr.needsReview} tone="yellow" />
                    <Cell value={row.tr.stale} tone="orange" />
                    <Cell value={row.tr.missing} tone={row.tr.missing ? "red" : "green"} />
                    <td className="px-4 py-4 text-white/70">
                      <div>EN: {row.en.draftReviewed}</div>
                      <div>TR: {row.tr.draftReviewed}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {!rows.length ? <section className="mt-6 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.03] p-10 text-center"><h2 className="text-2xl font-black">لا توجد بيانات تغطية بعد</h2><p className="mx-auto mt-3 max-w-2xl leading-8 text-white/60">تأكد من اتصال Supabase وصلاحيات الإدارة ثم أعد التحديث.</p></section> : null}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>;
}

function Cell({ value, tone = "white" }: { value: number; tone?: "white" | "green" | "yellow" | "orange" | "red" }) {
  const tones = {
    white: "text-white/80",
    green: "text-green-100",
    yellow: "text-yellow-100",
    orange: "text-orange-100",
    red: "text-red-100",
  };
  return <td className={`px-4 py-4 font-black ${tones[tone]}`}>{value}</td>;
}
