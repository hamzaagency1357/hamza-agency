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
  getTranslationFieldText,
  TRANSLATION_SOURCE_DEFINITIONS,
  type TranslationSourceType,
} from "@/lib/i18n/translationSources";
import { supabase } from "@/lib/supabase";

type SyncItem = {
  sourceType: TranslationSourceType;
  sourceId: string;
  label: string;
};

type SourceCount = Record<TranslationSourceType, number>;
type TargetLanguage = "en" | "tr";

const emptyCounts: SourceCount = {
  programs: 0,
  pages: 0,
  faqs: 0,
  knowledge_base: 0,
};

const targetLanguageLabels: Record<TargetLanguage, string> = {
  en: "الإنجليزية",
  tr: "التركية",
};

function buildItemLabel(
  source: (typeof TRANSLATION_SOURCE_DEFINITIONS)[number],
  row: Record<string, unknown>,
  sourceId: string
) {
  const text = getTranslationFieldText(row, source.titleKeys).replace(/\s+/g, " ").trim();
  if (!text) return `عنصر #${sourceId}`;
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
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
  const [selectedSourceType, setSelectedSourceType] = useState<TranslationSourceType | "">("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguage | "">("");
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

    void checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    void loadAutomationData();
  }, [isAuthorized]);

  async function loadAutomationData() {
    const client = supabase;
    if (!client) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [automationStatus, ...sourceResults] = await Promise.all([
        getTranslationAutomationStatus(),
        ...TRANSLATION_SOURCE_DEFINITIONS.map((source) => client.from(source.table).select("*").limit(300)),
      ]);

      const nextItems: SyncItem[] = [];
      const nextCounts: SourceCount = { ...emptyCounts };

      sourceResults.forEach((result, index) => {
        const source = TRANSLATION_SOURCE_DEFINITIONS[index];
        if (!source || result.error) return;

        const rows = (result.data || []) as Array<Record<string, unknown>>;
        rows.forEach((row) => {
          const rawId = row.id;
          if (rawId === null || rawId === undefined) return;

          const sourceId = String(rawId);
          nextItems.push({
            sourceType: source.sourceType,
            sourceId,
            label: buildItemLabel(source, row, sourceId),
          });
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

  const availableItems = useMemo(
    () => sourceItems.filter((item) => item.sourceType === selectedSourceType),
    [selectedSourceType, sourceItems]
  );

  const selectedItem = useMemo(
    () => availableItems.find((item) => item.sourceId === selectedSourceId) || null,
    [availableItems, selectedSourceId]
  );

  function selectSourceType(sourceType: TranslationSourceType) {
    setSelectedSourceType(sourceType);
    setSelectedSourceId("");
    setError("");
  }

  async function syncSelectedContent() {
    if (!isConfigured) {
      setError("أضف OPENAI_API_KEY في Vercel أولاً، ثم أعد فتح هذه الصفحة.");
      return;
    }

    if (!selectedItem) {
      setError("اختر مصدراً ثم عنصراً واحداً فقط للترجمة.");
      return;
    }

    if (!targetLanguage) {
      setError("اختر لغة هدف واحدة: الإنجليزية أو التركية.");
      return;
    }

    setIsSyncing(true);
    setMessage("");
    setError("");
    setProgress(`تتم ترجمة عنصر واحد إلى ${targetLanguageLabels[targetLanguage]} وحفظه للمراجعة...`);

    try {
      await syncArabicContentTranslations(
        [{ sourceType: selectedItem.sourceType, sourceId: selectedItem.sourceId }],
        { languages: [targetLanguage] }
      );

      setMessage(
        `تمت ترجمة العنصر المحدد إلى ${targetLanguageLabels[targetLanguage]} وحفظه بحالة تحتاج مراجعة. لن يظهر للعامة قبل المراجعة والنشر اليدوي من لوحة المحتوى المناسبة.`
      );
      setProgress("");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "تعذرت مزامنة الترجمة التلقائية.");
      setProgress("");
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
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">
              Translation Automation
            </div>
            <h1 className="text-4xl font-black md:text-5xl">اختبار الترجمة المراقب</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              اختر مصدراً واحداً وعنصراً واحداً ولغة هدف واحدة. تحفظ النتيجة للمراجعة فقط ولا تظهر للعامة قبل النشر اليدوي.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations/cms" className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-6 py-3 font-bold text-cyan-50">
              ترجمة صفحات CMS
            </Link>
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
              ? `الموديل المحدد: ${model || "الافتراضي"}. يتطلب هذا المسار اختيار عنصر واحد ولغة واحدة صراحةً، ثم يحفظ النتيجة بحالة تحتاج مراجعة.`
              : "يلزم إضافة المتغير السري OPENAI_API_KEY في إعدادات Vercel للإنتاج والمعاينة. لن يُحفظ المفتاح في GitHub أو يظهر في الموقع."}
          </p>
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}
        {progress && <div className="mb-6 rounded-3xl border border-cyan-400/25 bg-cyan-500/10 p-5 text-cyan-100">{progress}</div>}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {TRANSLATION_SOURCE_DEFINITIONS.map((source) => {
            const active = selectedSourceType === source.sourceType;

            return (
              <button
                key={source.sourceType}
                type="button"
                onClick={() => selectSourceType(source.sourceType)}
                className={`rounded-[2rem] border p-6 text-right transition ${active ? "border-fuchsia-300/70 bg-fuchsia-500/15" : "border-white/10 bg-white/[0.04] hover:border-fuchsia-300/35 hover:bg-fuchsia-500/10"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm font-black text-white/70">
                    {counts[source.sourceType]}
                  </span>
                  <span className={`h-5 w-5 rounded-full border-2 ${active ? "border-fuchsia-200 bg-fuchsia-500" : "border-white/35"}`} aria-hidden="true" />
                </div>
                <div className="mt-6 text-xl font-black">{source.label}</div>
                <p className="mt-3 text-sm leading-7 text-white/55">اختر هذا المصدر أولاً، ثم اختر عنصراً واحداً فقط منه.</p>
              </button>
            );
          })}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">1. اختر عنصراً واحداً</h2>
          <p className="mt-3 leading-8 text-white/60">لا يتم تحديد أي عنصر تلقائياً. هذا الاختيار يقيّد الاختبار الحالي بعنصر واحد فقط.</p>
          <select
            value={selectedSourceId}
            onChange={(event) => setSelectedSourceId(event.target.value)}
            disabled={!selectedSourceType}
            className="mt-5 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-white outline-none disabled:cursor-not-allowed disabled:opacity-45"
          >
            <option value="">{selectedSourceType ? "اختر عنصراً واحداً..." : "اختر مصدر المحتوى أولاً..."}</option>
            {availableItems.map((item) => (
              <option key={`${item.sourceType}:${item.sourceId}`} value={item.sourceId}>
                {item.label}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">2. اختر لغة الهدف</h2>
          <p className="mt-3 leading-8 text-white/60">لا توجد لغة افتراضية. يجب اختيار الإنجليزية أو التركية صراحةً قبل الإرسال.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {(["en", "tr"] as TargetLanguage[]).map((language) => {
              const active = targetLanguage === language;

              return (
                <button
                  key={language}
                  type="button"
                  onClick={() => setTargetLanguage(language)}
                  className={`rounded-full border px-6 py-3 font-bold transition ${active ? "border-fuchsia-300/70 bg-fuchsia-500/20 text-white" : "border-white/10 bg-black/20 text-white/70 hover:border-fuchsia-300/35"}`}
                >
                  {targetLanguageLabels[language]}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">3. تشغيل اختبار مراقب</h2>
          <p className="mt-3 max-w-3xl leading-8 text-white/60">يرسل هذا المسار عنصراً واحداً ولغة واحدة فقط. الخادم يرفض طلباً لا يحدد لغة صراحةً، ويبقى الحد الأعلى في API عشرة عناصر للاستخدامات المستقبلية المعتمدة.</p>

          <button
            type="button"
            onClick={() => void syncSelectedContent()}
            disabled={isSyncing || !isConfigured || !selectedItem || !targetLanguage}
            className="mt-6 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-7 py-4 font-black text-white shadow-[0_0_35px_rgba(217,70,239,0.3)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? "جاري الترجمة والحفظ للمراجعة..." : "ترجمة العنصر المحدد وحفظه للمراجعة"}
          </button>
        </section>

        <section className="mt-6 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-6 text-sm leading-8 text-cyan-50/85">
          الترجمة الناتجة تحفظ دائماً بحالة <strong>needs_review</strong> مع <strong>reviewed=false</strong> و<strong>is_published=false</strong>. لا تنشر هذه الصفحة أي محتوى تلقائياً.
        </section>
      </section>
    </main>
  );
}
