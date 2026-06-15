"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type SourceType = "programs" | "faqs" | "knowledge_base";
type FieldName = "title" | "summary" | "content";
type Tone = "purple" | "green" | "yellow" | "red" | "cyan";

type SourceItem = {
  key: string;
  source: SourceType;
  sourceId: string;
  title: string;
  summary: string;
  content: string;
};

type TranslationFields = {
  title?: string;
  summary?: string;
  content?: string;
  reviewed?: boolean;
  published?: boolean;
};

type TranslationPack = Record<string, Partial<Record<LanguageCode, TranslationFields>>>;
type GenericRow = Record<string, unknown>;

type TranslationRow = {
  id?: string;
  source_type: SourceType;
  source_id: string;
  field_name: FieldName;
  language: LanguageCode;
  translated_value: string | null;
  status: string | null;
  reviewed: boolean | null;
  is_published: boolean | null;
};

const STORAGE_KEY = "hamza_translation_panel_pack_v1";
const translationFields: FieldName[] = ["title", "summary", "content"];

const languages: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];

const sourceOptions: { key: "all" | SourceType; label: string }[] = [
  { key: "all", label: "كل المحتوى" },
  { key: "programs", label: "البرامج" },
  { key: "faqs", label: "FAQ" },
  { key: "knowledge_base", label: "Knowledge Base" },
];

function getText(row: GenericRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }
  return fallback;
}

function makeKey(source: SourceType, id: string) {
  return `${source}:${id}`;
}

function safeParse(value: string | null): TranslationPack {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as TranslationPack;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function completion(item: SourceItem, pack: TranslationPack, language: LanguageCode) {
  const current = pack[item.key]?.[language] || {};
  const done = translationFields.filter((field) => {
    if (!item[field].trim()) return true;
    return Boolean(current[field]?.trim());
  }).length;
  return Math.round((done / translationFields.length) * 100);
}

function statusText(value: number, reviewed?: boolean, published?: boolean) {
  if (published && reviewed && value === 100) return "منشور";
  if (reviewed && value === 100) return "مكتمل ومراجع";
  if (value === 100) return "مكتمل";
  if (value > 0) return "ناقص";
  return "غير مترجم";
}

function statusTone(value: number, reviewed?: boolean, published?: boolean): Tone {
  if (published && reviewed && value === 100) return "green";
  if (reviewed && value === 100) return "green";
  if (value === 100) return "cyan";
  if (value > 0) return "yellow";
  return "red";
}

function getSaveStatus(value: number, reviewed?: boolean, published?: boolean) {
  if (published && reviewed && value === 100) return "published";
  if (reviewed && value === 100) return "reviewed";
  if (value > 0) return "needs_review";
  return "draft";
}

function getFieldValue(fields: TranslationFields | undefined, field: FieldName) {
  return fields?.[field] || "";
}

function buildPackFromRows(rows: TranslationRow[]) {
  const nextPack: TranslationPack = {};

  rows.forEach((row) => {
    const key = makeKey(row.source_type, String(row.source_id));
    const language = row.language;

    nextPack[key] = nextPack[key] || {};
    nextPack[key][language] = nextPack[key][language] || {};

    const fields = nextPack[key][language];
    if (!fields) return;

    fields[row.field_name] = row.translated_value || "";
    fields.reviewed = Boolean(fields.reviewed || row.reviewed);
    fields.published = Boolean(fields.published || row.is_published || row.status === "published");
  });

  return nextPack;
}

function mergePacks(primary: TranslationPack, secondary: TranslationPack) {
  const merged: TranslationPack = { ...secondary };

  Object.entries(primary).forEach(([key, languagesPack]) => {
    merged[key] = {
      ...(merged[key] || {}),
      ...languagesPack,
    };
  });

  return merged;
}

export default function AdminTranslationsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [items, setItems] = useState<SourceItem[]>([]);
  const [pack, setPack] = useState<TranslationPack>({});
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [sourceFilter, setSourceFilter] = useState<"all" | SourceType>("all");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [storageMode, setStorageMode] = useState<"supabase" | "backup">("supabase");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadContent();
  }, [isAuthorized]);

  async function loadContent() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    const [programsResult, faqsResult, knowledgeResult, translationsResult] = await Promise.all([
      supabase.from("programs").select("*").limit(200),
      supabase.from("faqs").select("*").limit(300),
      supabase.from("knowledge_base").select("*").limit(300),
      supabase
        .from("content_translations")
        .select("id, source_type, source_id, field_name, language, translated_value, status, reviewed, is_published")
        .in("source_type", ["programs", "faqs", "knowledge_base"])
        .in("language", ["en", "tr"])
        .limit(2000),
    ]);

    setIsLoading(false);

    if (programsResult.error || faqsResult.error || knowledgeResult.error) {
      setError("تعذر تحميل المحتوى القابل للترجمة.");
      return;
    }

    if (translationsResult.error) {
      setError("تعذر تحميل الترجمات من Supabase. تأكد أن جدول content_translations موجود وأن الصلاحيات مفعلة.");
      return;
    }

    const programItems = ((programsResult.data || []) as GenericRow[]).map((row, index) => {
      const id = getText(row, ["id"], `program-${index}`);
      return {
        key: makeKey("programs", id),
        source: "programs" as const,
        sourceId: id,
        title: getText(row, ["name", "title"], "برنامج بدون عنوان"),
        summary: getText(row, ["summary", "short_description"], ""),
        content: getText(row, ["description", "content", "body"], ""),
      };
    });

    const faqItems = ((faqsResult.data || []) as GenericRow[]).map((row, index) => {
      const id = getText(row, ["id"], `faq-${index}`);
      return {
        key: makeKey("faqs", id),
        source: "faqs" as const,
        sourceId: id,
        title: getText(row, ["question", "title"], "سؤال بدون عنوان"),
        summary: getText(row, ["category"], ""),
        content: getText(row, ["answer", "content"], ""),
      };
    });

    const knowledgeItems = ((knowledgeResult.data || []) as GenericRow[]).map((row, index) => {
      const id = getText(row, ["id"], `kb-${index}`);
      return {
        key: makeKey("knowledge_base", id),
        source: "knowledge_base" as const,
        sourceId: id,
        title: getText(row, ["title"], "معرفة بدون عنوان"),
        summary: getText(row, ["summary", "category"], ""),
        content: getText(row, ["content", "answer", "body"], ""),
      };
    });

    const loadedItems = [...programItems, ...faqItems, ...knowledgeItems];
    const remotePack = buildPackFromRows((translationsResult.data || []) as TranslationRow[]);
    const localBackup = safeParse(window.localStorage.getItem(STORAGE_KEY));

    setItems(loadedItems);
    setPack(mergePacks(remotePack, localBackup));
    setStorageMode("supabase");

    if (!selectedKey && loadedItems[0]) {
      setSelectedKey(loadedItems[0].key);
    }
  }

  function updateField(item: SourceItem, field: keyof TranslationFields, value: string | boolean) {
    setPack((current) => ({
      ...current,
      [item.key]: {
        ...(current[item.key] || {}),
        [language]: {
          ...(current[item.key]?.[language] || {}),
          [field]: value,
        },
      },
    }));
  }

  function saveLocalBackup() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
    setStorageMode("backup");
    setMessage("تم حفظ نسخة احتياطية محلية داخل المتصفح. المصدر الأساسي للترجمات هو Supabase.");
  }

  async function saveSelectedToSupabase() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const item = selectedItem;
    if (!item) {
      setError("اختر عنصراً للترجمة أولاً.");
      return;
    }

    const currentFields = pack[item.key]?.[language] || {};
    const percent = completion(item, pack, language);
    const reviewed = Boolean(currentFields.reviewed);
    const published = Boolean(currentFields.published && reviewed && percent === 100);
    const status = getSaveStatus(percent, reviewed, published);

    setIsSaving(true);
    setError("");
    setMessage("");

    const rows = translationFields.map((field) => ({
      source_type: item.source,
      source_id: item.sourceId,
      field_name: field,
      language,
      translated_value: getFieldValue(currentFields, field),
      status,
      reviewed,
      is_published: published,
      updated_by: adminEmail,
      created_by: adminEmail,
    }));

    const { error: saveError } = await supabase
      .from("content_translations")
      .upsert(rows, {
        onConflict: "source_type,source_id,field_name,language",
      });

    setIsSaving(false);

    if (saveError) {
      setError(`تعذر حفظ الترجمة في Supabase: ${saveError.message}`);
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pack));
    setStorageMode("supabase");
    setMessage("تم حفظ ترجمة العنصر المحدد في Supabase بنجاح.");
  }

  function exportPack() {
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hamza-translations-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importPack(file: File | null) {
    if (!file) return;
    const imported = safeParse(await file.text());
    setPack(imported);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    setStorageMode("backup");
    setMessage("تم استيراد حزمة الترجمات كنسخة مؤقتة. اضغط حفظ في Supabase على العناصر المطلوبة لتثبيتها دائماً.");
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      if (!query) return true;
      return [item.title, item.summary, item.content, item.source].join(" ").toLowerCase().includes(query);
    });
  }, [items, sourceFilter, search]);

  const selectedItem = filteredItems.find((item) => item.key === selectedKey) || filteredItems[0] || null;
  const selectedFields = selectedItem ? pack[selectedItem.key]?.[language] || {} : {};
  const selectedCompletion = selectedItem ? completion(selectedItem, pack, language) : 0;
  const completeCount = items.filter((item) => completion(item, pack, language) === 100).length;
  const reviewedCount = items.filter((item) => pack[item.key]?.[language]?.reviewed && completion(item, pack, language) === 100).length;
  const publishedCount = items.filter((item) => pack[item.key]?.[language]?.published && pack[item.key]?.[language]?.reviewed && completion(item, pack, language) === 100).length;
  const missingCount = Math.max(items.length - completeCount, 0);

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">
              Translation Panel
            </div>
            <h1 className="text-4xl font-black md:text-5xl">لوحة ترجمات المحتوى</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              إدارة ترجمات البرامج و FAQ و Knowledge Base للإنكليزي والتركي مع حفظ دائم في Supabase.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveSelectedToSupabase}
              disabled={isSaving || !selectedItem}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ في Supabase"}
            </button>
            <button onClick={saveLocalBackup} className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-6 py-3 font-bold text-yellow-100">
              حفظ نسخة احتياطية
            </button>
            <button onClick={exportPack} className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              تصدير JSON
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
            حساب الإدارة: <span className="break-all text-white">{adminEmail}</span>
          </div>
          <div className={`rounded-3xl border p-5 text-sm ${storageMode === "supabase" ? "border-green-400/20 bg-green-500/10 text-green-100" : "border-yellow-400/20 bg-yellow-500/10 text-yellow-100"}`}>
            مصدر الحفظ: {storageMode === "supabase" ? "Supabase دائم" : "نسخة محلية احتياطية"}
          </div>
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="كل العناصر" value={items.length} tone="purple" />
          <StatCard label="مكتمل" value={completeCount} tone="green" />
          <StatCard label="ناقص" value={missingCount} tone="yellow" />
          <StatCard label="مراجع" value={reviewedCount} tone="cyan" />
          <StatCard label="منشور" value={publishedCount} tone="green" />
        </div>

        <section className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 lg:grid-cols-5">
          <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
            {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | SourceType)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
            {sourceOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في المحتوى..." className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 lg:col-span-2" />
          <label className="cursor-pointer rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-center text-sm font-black text-white/70">
            استيراد JSON
            <input type="file" accept="application/json" className="hidden" onChange={(event) => importPack(event.target.files?.[0] || null)} />
          </label>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
          <section className="grid max-h-[75vh] gap-3 overflow-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
            {isLoading && <div className="rounded-2xl bg-black/25 p-5 text-center text-white/55">جاري التحميل...</div>}
            {filteredItems.map((item) => {
              const percent = completion(item, pack, language);
              const reviewed = Boolean(pack[item.key]?.[language]?.reviewed);
              const published = Boolean(pack[item.key]?.[language]?.published);
              return (
                <button key={item.key} type="button" onClick={() => setSelectedKey(item.key)} className={`rounded-2xl border p-4 text-right transition ${selectedItem?.key === item.key ? "border-cyan-300/45 bg-cyan-500/10" : "border-white/10 bg-black/25 hover:border-cyan-300/30"}`}>
                  <div className="mb-2 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-purple-100">{item.source}</span>
                    <span className={`rounded-full border px-3 py-1 ${toneClass(statusTone(percent, reviewed, published))}`}>{statusText(percent, reviewed, published)} — {percent}%</span>
                  </div>
                  <div className="font-black leading-7">{item.title}</div>
                </button>
              );
            })}
            {filteredItems.length === 0 && !isLoading && <div className="rounded-2xl bg-black/25 p-5 text-center text-white/55">لا يوجد محتوى مطابق.</div>}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            {!selectedItem && <div className="p-8 text-center text-white/55">اختر عنصراً للترجمة.</div>}
            {selectedItem && (
              <div className="grid gap-5">
                <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="text-sm font-black text-cyan-100">النص العربي الأصلي</div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass(statusTone(selectedCompletion, Boolean(selectedFields.reviewed), Boolean(selectedFields.published)))}`}>
                      {statusText(selectedCompletion, Boolean(selectedFields.reviewed), Boolean(selectedFields.published))} — {selectedCompletion}%
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-black">{selectedItem.title}</h2>
                  {selectedItem.summary && <p className="mt-3 text-white/60">{selectedItem.summary}</p>}
                  {selectedItem.content && <p className="mt-3 max-h-44 overflow-auto leading-8 text-white/70">{selectedItem.content}</p>}
                </div>

                <label className="grid gap-2 text-sm font-black text-white/70">
                  العنوان المترجم
                  <input value={pack[selectedItem.key]?.[language]?.title || ""} onChange={(event) => updateField(selectedItem, "title", event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
                </label>

                <label className="grid gap-2 text-sm font-black text-white/70">
                  الملخص المترجم
                  <textarea value={pack[selectedItem.key]?.[language]?.summary || ""} onChange={(event) => updateField(selectedItem, "summary", event.target.value)} className="min-h-28 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
                </label>

                <label className="grid gap-2 text-sm font-black text-white/70">
                  المحتوى المترجم
                  <textarea value={pack[selectedItem.key]?.[language]?.content || ""} onChange={(event) => updateField(selectedItem, "content", event.target.value)} className="min-h-56 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-black text-white/75">
                  <input type="checkbox" checked={Boolean(pack[selectedItem.key]?.[language]?.reviewed)} onChange={(event) => updateField(selectedItem, "reviewed", event.target.checked)} />
                  تمت مراجعة هذه الترجمة
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 text-sm font-black text-green-100">
                  <input
                    type="checkbox"
                    checked={Boolean(pack[selectedItem.key]?.[language]?.published)}
                    disabled={!Boolean(pack[selectedItem.key]?.[language]?.reviewed) || selectedCompletion !== 100}
                    onChange={(event) => updateField(selectedItem, "published", event.target.checked)}
                  />
                  نشر هذه الترجمة عند ربطها بالموقع العام لاحقاً
                </label>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/50">
                  لا تظهر الترجمات على الموقع العام في هذه المرحلة. هذه اللوحة تثبت التخزين الدائم في Supabase أولاً، ثم نربط الصفحات العامة تدريجياً بعد فحص النشر.
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}</div>
    </div>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
