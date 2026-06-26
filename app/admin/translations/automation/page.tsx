"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import {
  getTranslationAutomationStatus,
  syncArabicContentTranslations,
} from "@/lib/i18n/adminTranslationSync";
import {
  TRANSLATION_SOURCE_DEFINITIONS,
  type TranslationSourceType,
} from "@/lib/i18n/translationSources";
import { supabase } from "@/lib/supabase";

type SyncItem = {
  sourceType: TranslationSourceType;
  sourceId: string;
};

type SourceCount = Record<TranslationSourceType, number>;

const emptyCounts: SourceCount = {
  programs: 0,
  faqs: 0,
  knowledge_base: 0,
};

function splitIntoChunks<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export default function TranslationAutomationPage() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [model, setModel] = useState("");
  const [sourceItems, setSourceItems] = useState<SyncItem[]>([]);
  const [counts, setCounts] = useState<SourceCount>(emptyCounts);
  const [selectedSources, setSelectedSources] = useState<Record<TranslationSourceType, boolean>>({
    programs: true,
    faqs: true,
    knowledge_base: true,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        setIsCheckingAccess(false);
        return;
      }

      setIsAuthorized(true);
      setIsCheckingAccess(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadAutomationData();
  }, [isAuthorized]);

  async function loadAutomationData() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [automationStatus, ...sourceResults] = await Promise.all([
        getTranslationAutomationStatus(),
        ...TRANSLATION_SOURCE_DEFINITIONS.map((source) =>
          supabase.from(source.table).select("id").limit(300)
        ),
      ]);

      const nextItems: SyncItem[] = [];
      const nextCounts: SourceCount = { ...emptyCounts };

      sourceResults.forEach((result, index) => {
        const source = TRANSLATION_SOURCE_DEFINITIONS[index];
        if (!source || result.error) return;

        const rows = (result.data || []) as Array<{ id?: string | number | null }>;
        rows.forEach((row) => {
          if (row.id === null || row.id === undefined) return;
          nextItems.push({ sourceType: source.sourceType, sourceId: String(row.id) });
        });
        nextCounts[source.sourceType] = rows.length;
      });

      setIsConfigured(automationStatus.configured);
      setModel(automationStatus.model);
      setSourceItems(nextItems);
      setCounts(nextCounts);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل مركز الترجمة التلقائية.");
    } finally {
      setIsLoading(false);
    }
  }

  const selectedItems = useMemo(
    () => sourceItems.filter((item) => selectedSources[item.sourceType]),
    [selectedSources, sourceItems]
  );

  function toggleSource(sourceType: TranslationSourceType) {
    setSelectedSources((current) => ({
      ...current,
      [sourceType]: !current[sourceType],
    }));
  }

  async function syncSelectedContent() {
    if (!isConfigured) {
      setError("أضف OPENAI_API_KEY في Vercel أولاً، ثم أعد فتح هذه الصفحة.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("اختر نوع محتوى واحداً على الأقل.");
      return;
    }

    setIsSyncing(true);
    setMessage("");
    setError("");
    setProgress("");

    try {
      const chunks = splitIntoChunks(selectedItems, 10);
      let completed = 0;

      for (const chunk of chunks) {
        setProgress(`تتم ترجمة ${completed + 1} إلى ${Math.min(completed + chunk.length, selectedItems.length)} من ${selectedItems.length}...`);
        const result = await syncArabicContentTranslations(chunk, {
          languages: ["en", "tr"],
          publish: true,
        });
        completed += result.results?.length || chunk.length;
      }

      setMessage(`تمت ترجمة ونشر ${selectedItems.length} عنصر إلى الإنجليزية والتركية. ستظهر الترجمات في الصفحات التي تم ربطها بالمحرك.`);
      setProgress("");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "تعذرت مزامنة الترجمات التلقائية.");
    } finally {
      setIsSyncing(false);
    }
  }

  if (isCheckingAccess || isLoading) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">
          جاري تجهيز مركز الترجمة التلقائية...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-36 text-white md:p-8">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">
              Translation Automation
            </div>
            <h1 className="text-4xl font-black md:text-5xl">مركز الترجمة التلقائية</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              يترجم النص العربي الأصلي إلى الإنجليزية والتركية من الخادم، ويحفظ النتيجة في Supabase من دون إظهار مفتاح الترجمة داخل المتصفح.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الترجمات اليدوية
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className={`mb-6 rounded-[2rem] border p-6 ${isConfigured ? "border-green-400/25 bg-green-500/10" : "border-yellow-400/25 bg-yellow-500/10"}`}>
          <div className="text-xl font-black">{isConfigured ? "الترجمة التلقائية جاهزة" : "الترجمة التلقائية غير مفعلة بعد"}</div>
          <p className="mt-3 leading-8 text-white/70">
            {isConfigured
              ? `الموديل المحدد: ${model || "الافتراضي"}. يمكن الآن ترجمة المحتوى الحالي ومزامنة التعديلات العربية من لوحة الإدارة.`
              : "يلزم إضافة المتغير السري OPENAI_API_KEY في إعدادات Vercel للإنتاج والمعاينة. لن يُحفظ المفتاح في GitHub أو يظهر في الموقع."}
          </p>
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}
        {progress && <div className="mb-6 rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-5 text-cyan-100">{progress}</div>}

        <section className="grid gap-4 md:grid-cols-3">
          {TRANSLATION_SOURCE_DEFINITIONS.map((source) => (
            <label key={source.sourceType} className="cursor-pointer rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-fuchsia-300/35 hover:bg-fuchsia-500/10">
              <div className="flex items-start justify-between gap-4">
                <input
                  type="checkbox"
                  checked={selectedSources[source.sourceType]}
                  onChange={() => toggleSource(source.sourceType)}
                  className="mt-1 h-5 w-5 accent-fuchsia-500"
                />
                <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm font-black text-white/70">
                  {counts[source.sourceType]}
                </span>
              </div>
              <div className="mt-6 text-xl font-black">{source.label}</div>
              <p className="mt-3 text-sm leading-7 text-white/55">
                ترجمة العنوان والملخص والمحتوى إلى الإنجليزية والتركية.
              </p>
            </label>
          ))}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">المزامنة الأولى للمحتوى الحالي</h2>
          <p className="mt-3 max-w-3xl leading-8 text-white/60">
            ينفذ النظام الترجمة على دفعات آمنة من عشرة عناصر. الترجمة الناتجة تُنشر تلقائياً كي تظهر فور ربط الصفحة العامة بها، ويمكن تعديلها يدوياً من لوحة الترجمات عند الحاجة.
          </p>

          <button
            type="button"
            onClick={syncSelectedContent}
            disabled={isSyncing || !isConfigured || selectedItems.length === 0}
            className="mt-6 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-7 py-4 font-black text-white shadow-[0_0_35px_rgba(217,70,239,0.3)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? "جاري الترجمة والمزامنة..." : `ترجمة ${selectedItems.length} عنصر الآن`}
          </button>
        </section>

        <section className="mt-6 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-6 text-sm leading-8 text-cyan-50/85">
          الخطوة التالية من المرحلة نفسها تربط هذا المحرك بحفظ المحتوى العربي في كل لوحة إدارة. عندها أي تعديل عربي سيستدعي المزامنة التلقائية للعنصر المتغير فقط، بدلاً من إعادة ترجمة الموقع كله.
        </section>
      </section>
    </main>
  );
}
