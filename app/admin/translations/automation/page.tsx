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
  sections: 0,
  faqs: 0,
  knowledge_base: 0,
};

const targetLanguageLabels: Record<TargetLanguage, string> = {
  en: "الإنجليزية",
  tr: "التركية",
};

const MAX_BATCH_ITEMS = 10;

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
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
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

  const selectedItems = useMemo(
    () => availableItems.filter((item) => selectedSourceIds.includes(item.sourceId)),
    [availableItems, selectedSourceIds]
  );

  function selectSourceType(sourceType: TranslationSourceType) {
    setSelectedSourceType(sourceType);
    setSelectedSourceIds([]);
    setError("");
  }

  function toggleSelectedItem(sourceId: string) {
    if (selectedSourceIds.includes(sourceId)) {
      setSelectedSourceIds((current) => current.filter((id) => id !== sourceId));
      setError("");
      return;
    }

    if (selectedSourceIds.length >= MAX_BATCH_ITEMS) {
      setError("الحد الأقصى لكل دفعة هو 10 عناصر. أرسل الدفعة الحالية ثم تابع بالدفعة التالية.");
      return;
    }

    setSelectedSourceIds((current) => [...current, sourceId]);
    setError("");
  }

  function selectFirstBatch() {
    if (!selectedSourceType) {
      setError("اختر مصدر المحتوى أولاً.");
      return;
    }

    const firstBatch = availableItems.slice(0, MAX_BATCH_ITEMS).map((item) => item.sourceId);
    setSelectedSourceIds(firstBatch);
    setError("");

    if (availableItems.length > MAX_BATCH_ITEMS) {
      setMessage("تم تحديد أول 10 عناصر فقط. أرسل هذه الدفعة أولاً ثم اختر الدفعة التالية.");
    } else {
      setMessage("");
    }
  }

  function clearSelectedItems() {
    setSelectedSourceIds([]);
  }

  async function syncSelectedContent() {
    if (!isConfigured) {
      setError("أضف OPENAI_API_KEY في Vercel أولاً، ثم أعد فتح هذه الصفحة.");
      return;
    }

    if (selectedItems.length === 0) {
      setError("اختر مصدراً ثم عنصراً واحداً على الأقل للترجمة.");
      return;
    }

    if (!targetLanguage) {
      setError("اختر لغة هدف واحدة: الإنجليزية أو التركية.");
      return;
    }

    setIsSyncing(true);
    setMessage("");
    setError("");
    setProgress(`تتم ترجمة ${selectedItems.length} عنصر إلى ${targetLanguageLabels[targetLanguage]} وحفظها للمراجعة...`);

    try {
      const response = await syncArabicContentTranslations(
        selectedItems.map((item) => ({
          sourceType: item.sourceType,
          sourceId: item.sourceId,
        })),
        { languages: [targetLanguage] }
      );

      const failedItems = response.errors || [];
      const successfulCount = response.results?.length ?? Math.max(0, selectedItems.length - failedItems.length);
      const failedDetails = failedItems
        .map((item) => `• ${item.sourceType} #${item.sourceId}: ${item.message}`)
        .join("\n");

      if (failedItems.length === 0) {
        setMessage(
          `تمت ترجمة ${successfulCount} عنصر إلى ${targetLanguageLabels[targetLanguage]} وحفظها بحالة تحتاج مراجعة. لن يظهر أي محتوى للعامة قبل المراجعة والنشر اليدوي من لوحة المحتوى المناسبة.`
        );
      } else if (successfulCount > 0) {
        setMessage(
          `اكتملت الدفعة جزئياً: نجحت ترجمة ${successfulCount} عنصر وفشلت ${failedItems.length} عنصر.\n${failedDetails}`
        );
      } else {
        setError(`تعذرت ترجمة العناصر المحددة.\n${failedDetails || response.message || "تعذرت مزامنة الترجمة التلقائية."}`);
      }
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "تعذرت مزامنة الترجمة التلقائية.");
    } finally {
      setProgress("");
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
            <h1 className="text-4xl font-black md:text-5xl">ترجمة دفعة مراقبة</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              اختر مصدراً واحداً وحتى 10 عناصر ولغة هدف واحدة. تحفظ النتائج للمراجعة فقط ولا تظهر للعامة قبل النشر اليدوي.
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
              ? `الموديل المحدد: ${model || "الافتراضي"}. يتطلب هذا المسار اختيار مصدر واحد وحتى 10 عناصر ولغة واحدة صراحةً، ثم يحفظ النتائج بحالة تحتاج مراجعة.`
              : "يلزم إضافة المتغير السري OPENAI_API_KEY في إعدادات Vercel للإنتاج والمعاينة. لن يُحفظ المفتاح في GitHub أو يظهر في الموقع."}
          </p>
        </div>

        {message && <div className="mb-6 whitespace-pre-line rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 whitespace-pre-line rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}
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
                <p className="mt-3 text-sm leading-7 text-white/55">اختر هذا المصدر أولاً، ثم اختر حتى 10 عناصر منه.</p>
              </button>
            );
          })}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-2xl font-black">1. اختر عناصر الدفعة</h2>
          <p className="mt-3 leading-8 text-white/60">يمكن اختيار حتى 10 عناصر من نفس المصدر في كل تشغيل.</p>

          {!selectedSourceType ? (
            <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-white/60">
              اختر مصدر المحتوى أولاً لعرض العناصر المتاحة للدفعة.
            </div>
          ) : (
            <>
              <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                <div className="font-bold text-white/80">تم اختيار {selectedSourceIds.length} من {MAX_BATCH_ITEMS}</div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={selectFirstBatch}
                    disabled={isSyncing || availableItems.length === 0}
                    className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-5 py-2.5 font-bold text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    تحديد أول 10
                  </button>
                  <button
                    type="button"
                    onClick={clearSelectedItems}
                    disabled={isSyncing || selectedSourceIds.length === 0}
                    className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 font-bold text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    مسح الاختيار
                  </button>
                </div>
              </div>

              {availableItems.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-black/20 p-5 text-white/60">
                  لا توجد عناصر متاحة لهذا المصدر حالياً.
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {availableItems.map((item) => {
                    const isSelected = selectedSourceIds.includes(item.sourceId);

                    return (
                      <label
                        key={`${item.sourceType}:${item.sourceId}`}
                        className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${isSelected ? "border-fuchsia-300/60 bg-fuchsia-500/10" : "border-white/10 bg-black/20 hover:border-fuchsia-300/35"}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedItem(item.sourceId)}
                          disabled={isSyncing}
                          className="mt-1 h-5 w-5 accent-fuchsia-500 disabled:cursor-not-allowed"
                        />
                        <span className="leading-7 text-white/80">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}
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
          <h2 className="text-2xl font-black">3. تشغيل دفعة مراقبة</h2>
          <p className="mt-3 max-w-3xl leading-8 text-white/60">ترسل هذه الدفعة حتى 10 عناصر ولغة هدف واحدة. لا يتم النشر تلقائياً، وتبقى كل نتيجة بحالة تحتاج مراجعة.</p>

          <button
            type="button"
            onClick={() => void syncSelectedContent()}
            disabled={isSyncing || !isConfigured || selectedItems.length === 0 || !targetLanguage}
            className="mt-6 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-7 py-4 font-black text-white shadow-[0_0_35px_rgba(217,70,239,0.3)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSyncing ? "جاري الترجمة والحفظ للمراجعة..." : "ترجمة العناصر المحددة وحفظها للمراجعة"}
          </button>
        </section>

        <section className="mt-6 rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-6 text-sm leading-8 text-cyan-50/85">
          الترجمة الناتجة تحفظ دائماً بحالة <strong>needs_review</strong> مع <strong>reviewed=false</strong> و<strong>is_published=false</strong>. لا تنشر هذه الصفحة أي محتوى تلقائياً.
        </section>
      </section>
    </main>
  );
}
