"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type Language = "en" | "tr";
type SourceType = "faqs" | "knowledge_base";
type Field = "title" | "summary" | "content";
type GenericRow = Record<string, unknown>;

type ContentItem = {
  key: string;
  sourceType: SourceType;
  sourceId: string;
  title: string;
  summary: string;
  content: string;
};

type TranslationRow = {
  source_type: SourceType;
  source_id: string | number | null;
  field_name: Field | null;
  language: Language | null;
  translated_value: string | null;
  status: string | null;
  reviewed: boolean | null;
  is_published: boolean | null;
};

type TranslationState = {
  values: Partial<Record<Field, string>>;
  reviewed: boolean;
  published: boolean;
};

type TranslationPack = Record<string, Partial<Record<Language, TranslationState>>>;
type LegacyPack = Record<string, Partial<Record<Language, Partial<Record<Field | "reviewed" | "published", string | boolean>>>>>;

const LEGACY_STORAGE_KEY = "hamza_translation_panel_pack_v1";
const fields: Array<{ key: Field; label: string }> = [
  { key: "title", label: "العنوان المترجم" },
  { key: "summary", label: "الملخص أو التصنيف المترجم" },
  { key: "content", label: "المحتوى المترجم" },
];
const languages: Array<{ code: Language; label: string }> = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];
const sourceLabels: Record<SourceType, string> = {
  faqs: "FAQ",
  knowledge_base: "Knowledge Base",
};

function emptyState(): TranslationState {
  return { values: {}, reviewed: false, published: false };
}

function text(row: GenericRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function itemKey(sourceType: SourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function complete(state: TranslationState) {
  return fields.every((field) => Boolean(state.values[field.key]?.trim()));
}

function safeLegacyParse(value: string | null): LegacyPack {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as LegacyPack;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function buildRemotePack(items: ContentItem[], rows: TranslationRow[]): TranslationPack {
  const next: TranslationPack = {};

  items.forEach((item) => {
    next[item.key] = {};

    languages.forEach(({ code }) => {
      const matches = rows.filter(
        (row) =>
          row.source_type === item.sourceType &&
          String(row.source_id ?? "") === item.sourceId &&
          row.language === code &&
          fields.some((field) => field.key === row.field_name)
      );

      const values: Partial<Record<Field, string>> = {};
      matches.forEach((row) => {
        if (row.field_name === "title" || row.field_name === "summary" || row.field_name === "content") {
          values[row.field_name] = row.translated_value || "";
        }
      });

      const ready = complete({ values, reviewed: false, published: false });
      const reviewed = ready && fields.every((field) => Boolean(matches.find((row) => row.field_name === field.key)?.reviewed));
      const published = reviewed && fields.every((field) => {
        const row = matches.find((candidate) => candidate.field_name === field.key);
        return Boolean(row?.is_published || row?.status === "published");
      });

      next[item.key][code] = { values, reviewed, published };
    });
  });

  return next;
}

function mergeLegacyDrafts(items: ContentItem[], remote: TranslationPack, legacy: LegacyPack): TranslationPack {
  const merged: TranslationPack = { ...remote };

  items.forEach((item) => {
    languages.forEach(({ code }) => {
      const remoteState = remote[item.key]?.[code] || emptyState();
      const legacyState = legacy[item.key]?.[code];
      const remoteHasValues = fields.some((field) => Boolean(remoteState.values[field.key]?.trim()));

      if (!legacyState || remoteHasValues) return;

      const values: Partial<Record<Field, string>> = {};
      fields.forEach((field) => {
        const value = legacyState[field.key];
        if (typeof value === "string") values[field.key] = value;
      });

      if (!fields.some((field) => Boolean(values[field.key]?.trim()))) return;

      merged[item.key] = {
        ...(merged[item.key] || {}),
        [code]: { values, reviewed: false, published: false },
      };
    });
  });

  return merged;
}

function stateLabel(state: TranslationState) {
  if (state.published && state.reviewed && complete(state)) return "منشور";
  if (state.reviewed && complete(state)) return "مراجع";
  if (complete(state)) return "جاهز للمراجعة";
  if (fields.some((field) => Boolean(state.values[field.key]?.trim()))) return "مسودة ناقصة";
  return "غير مترجم";
}

export default function AdminTranslationsPage() {
  const router = useRouter();
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [pack, setPack] = useState<TranslationPack>({});
  const [sourceFilter, setSourceFilter] = useState<SourceType | "all">("all");
  const [language, setLanguage] = useState<Language>("en");
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [legacyDraftCount, setLegacyDraftCount] = useState(0);

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        setCheckingAccess(false);
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setAuthorized(true);
      setCheckingAccess(false);
    }

    void checkAccess();
  }, [router]);

  useEffect(() => {
    if (authorized) void loadContent();
  }, [authorized]);

  async function loadContent() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const [faqsResult, knowledgeResult, translationsResult] = await Promise.all([
      supabase.from("faqs").select("*").limit(300),
      supabase.from("knowledge_base").select("*").limit(300),
      supabase
        .from("content_translations")
        .select("source_type, source_id, field_name, language, translated_value, status, reviewed, is_published")
        .in("source_type", ["faqs", "knowledge_base"])
        .in("field_name", ["title", "summary", "content"])
        .in("language", ["en", "tr"])
        .limit(3000),
    ]);

    setLoading(false);

    if (faqsResult.error || knowledgeResult.error) {
      const details = [
        faqsResult.error ? `FAQ: ${faqsResult.error.message}` : "",
        knowledgeResult.error ? `Knowledge Base: ${knowledgeResult.error.message}` : "",
      ].filter(Boolean).join(" | ");
      setError(`تعذر تحميل المحتوى القابل للترجمة. ${details}`);
      return;
    }

    const faqItems = ((faqsResult.data || []) as GenericRow[]).map((row, index): ContentItem => {
      const sourceId = text(row, ["id"], `faq-${index}`);
      return {
        key: itemKey("faqs", sourceId),
        sourceType: "faqs",
        sourceId,
        title: text(row, ["question", "title"], "سؤال بدون عنوان"),
        summary: text(row, ["category"], "أسئلة عامة"),
        content: text(row, ["answer", "content"], ""),
      };
    });

    const knowledgeItems = ((knowledgeResult.data || []) as GenericRow[]).map((row, index): ContentItem => {
      const sourceId = text(row, ["id"], `knowledge-${index}`);
      return {
        key: itemKey("knowledge_base", sourceId),
        sourceType: "knowledge_base",
        sourceId,
        title: text(row, ["title"], "مقال من مركز المعرفة"),
        summary: text(row, ["summary", "category"], ""),
        content: text(row, ["content", "answer", "body"], ""),
      };
    });

    const loadedItems = [...faqItems, ...knowledgeItems];
    const remote = translationsResult.error ? {} : buildRemotePack(loadedItems, (translationsResult.data || []) as TranslationRow[]);
    const legacy = safeLegacyParse(window.localStorage.getItem(LEGACY_STORAGE_KEY));
    const merged = mergeLegacyDrafts(loadedItems, remote, legacy);
    const migrated = loadedItems.filter((item) =>
      languages.some(({ code }) => {
        const local = legacy[item.key]?.[code];
        const state = merged[item.key]?.[code] || emptyState();
        return Boolean(local && fields.some((field) => typeof local[field.key] === "string" && String(local[field.key]).trim()) && !state.reviewed && !state.published);
      })
    ).length;

    setItems(loadedItems);
    setPack(merged);
    setLegacyDraftCount(migrated);
    setSelectedKey((current) => loadedItems.some((item) => item.key === current) ? current : loadedItems[0]?.key || "");

    if (translationsResult.error) {
      setError(`تم تحميل المحتوى، لكن تعذر تحميل الترجمات: ${translationsResult.error.message}`);
    }
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (sourceFilter !== "all" && item.sourceType !== sourceFilter) return false;
      if (!query) return true;
      return `${item.title} ${item.summary} ${item.content}`.toLowerCase().includes(query);
    });
  }, [items, search, sourceFilter]);

  const selectedItem = filteredItems.find((item) => item.key === selectedKey) || filteredItems[0] || null;
  const selectedState = selectedItem ? pack[selectedItem.key]?.[language] || emptyState() : emptyState();
  const selectedComplete = complete(selectedState);
  const reviewedCount = items.filter((item) => {
    const state = pack[item.key]?.[language] || emptyState();
    return state.reviewed && complete(state);
  }).length;
  const publishedCount = items.filter((item) => {
    const state = pack[item.key]?.[language] || emptyState();
    return state.published && state.reviewed && complete(state);
  }).length;

  function updateField(field: Field, value: string) {
    if (!selectedItem) return;
    setPack((current) => {
      const previous = current[selectedItem.key]?.[language] || emptyState();
      return {
        ...current,
        [selectedItem.key]: {
          ...(current[selectedItem.key] || {}),
          [language]: {
            values: { ...previous.values, [field]: value },
            reviewed: false,
            published: false,
          },
        },
      };
    });
  }

  function updateReviewed(next: boolean) {
    if (!selectedItem || (next && !selectedComplete)) return;
    setPack((current) => {
      const previous = current[selectedItem.key]?.[language] || emptyState();
      return {
        ...current,
        [selectedItem.key]: {
          ...(current[selectedItem.key] || {}),
          [language]: { ...previous, reviewed: next, published: next ? previous.published : false },
        },
      };
    });
  }

  function updatePublished(next: boolean) {
    if (!selectedItem || !selectedComplete || !selectedState.reviewed) return;
    setPack((current) => {
      const previous = current[selectedItem.key]?.[language] || emptyState();
      return {
        ...current,
        [selectedItem.key]: {
          ...(current[selectedItem.key] || {}),
          [language]: { ...previous, published: next },
        },
      };
    });
  }

  async function saveSelected() {
    if (!supabase || !selectedItem) return;

    const hasAnyValue = fields.some((field) => Boolean(selectedState.values[field.key]?.trim()));
    if (!hasAnyValue) {
      setError("أدخل ترجمة واحدة على الأقل قبل الحفظ.");
      return;
    }
    if (selectedState.reviewed && !selectedComplete) {
      setError("لا يمكن اعتماد المراجعة قبل اكتمال العنوان والملخص والمحتوى.");
      return;
    }

    const reviewed = Boolean(selectedState.reviewed && selectedComplete);
    const published = Boolean(selectedState.published && reviewed && selectedComplete);
    const status = published ? "published" : reviewed ? "reviewed" : "needs_review";

    setSaving(true);
    setMessage("");
    setError("");

    const { error: saveError } = await supabase.from("content_translations").upsert(
      fields.map((field) => ({
        source_type: selectedItem.sourceType,
        source_id: selectedItem.sourceId,
        field_name: field.key,
        language,
        translated_value: selectedState.values[field.key] || "",
        status,
        reviewed,
        is_published: published,
        created_by: adminEmail,
        updated_by: adminEmail,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "source_type,source_id,field_name,language" }
    );

    setSaving(false);

    if (saveError) {
      setError(`تعذر حفظ الترجمة: ${saveError.message}`);
      return;
    }

    setMessage(published ? "تم حفظ الترجمة ونشرها يدوياً." : reviewed ? "تم الحفظ بحالة مراجع. لن تظهر للعامة قبل النشر اليدوي." : "تم الحفظ بحالة تحتاج مراجعة.");
    await loadContent();
  }

  if (checkingAccess || loading) {
    return <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white"><div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">جاري تجهيز مراجعة ترجمات FAQ وKnowledge Base...</div></main>;
  }
  if (!authorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-24 text-white md:p-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-100">FAQ & Knowledge Base</div>
            <h1 className="text-4xl font-black md:text-5xl">مراجعة ونشر ترجمات المحتوى</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">أي تعديل يعيد الترجمة إلى تحتاج مراجعة ويلغي نشرها. لا يظهر FAQ أو Knowledge Base بلغة ثانية إلا بعد اكتمال الحقول ومراجعتها ونشرها يدوياً.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/translations/automation" className="rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-3 font-bold text-fuchsia-100">ترجمة دفعة مراقبة</Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 font-bold text-white/75">لوحة الإدارة</Link>
          </div>
        </div>

        {legacyDraftCount > 0 ? <div className="mb-5 rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-5 text-yellow-100">تم العثور على {legacyDraftCount} مسودات محلية قديمة. ظهرت كمراجعات غير منشورة حفاظاً على عملك، ويجب حفظها في Supabase قبل اعتمادها.</div> : null}
        {message ? <div className="mb-5 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div> : null}
        {error ? <div className="mb-5 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div> : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Stat label="كل العناصر" value={items.length} />
          <Stat label={`مراجع (${language})`} value={reviewedCount} />
          <Stat label={`منشور (${language})`} value={publishedCount} />
        </div>

        <div className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:grid-cols-4">
          <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none">
            {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceType | "all")} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none">
            <option value="all">كل المحتوى</option>
            <option value="faqs">FAQ</option>
            <option value="knowledge_base">Knowledge Base</option>
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ابحث في المحتوى..." className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 md:col-span-2" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,380px)_1fr]">
          <section className="grid max-h-[72vh] gap-3 overflow-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
            {filteredItems.map((item) => {
              const state = pack[item.key]?.[language] || emptyState();
              return <button key={item.key} type="button" onClick={() => setSelectedKey(item.key)} className={`rounded-2xl border p-4 text-right transition ${selectedItem?.key === item.key ? "border-cyan-300/50 bg-cyan-500/10" : "border-white/10 bg-black/20 hover:border-cyan-300/30"}`}><div className="mb-2 flex items-center justify-between gap-3"><span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-black text-purple-100">{sourceLabels[item.sourceType]}</span><span className="text-xs text-white/55">{stateLabel(state)}</span></div><div className="font-black leading-7">{item.title}</div></button>;
            })}
            {!filteredItems.length ? <div className="rounded-2xl bg-black/20 p-6 text-center text-white/60">لا يوجد محتوى مطابق.</div> : null}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
            {!selectedItem ? <div className="p-8 text-center text-white/60">اختر عنصراً للترجمة.</div> : <div className="grid gap-5">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-5"><div className="text-sm font-black text-cyan-100">النص العربي الأصلي — {sourceLabels[selectedItem.sourceType]}</div><h2 className="mt-3 text-2xl font-black">{selectedItem.title}</h2><p className="mt-3 text-white/60">{selectedItem.summary}</p><p className="mt-3 whitespace-pre-wrap leading-8 text-white/70">{selectedItem.content}</p></div>
              {fields.map((field) => <label key={field.key} className="grid gap-2 text-sm font-black text-white/75"><span>{field.label}</span>{field.key === "title" ? <input dir="ltr" value={selectedState.values[field.key] || ""} onChange={(event) => updateField(field.key, event.target.value)} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60" /> : <textarea dir="ltr" value={selectedState.values[field.key] || ""} onChange={(event) => updateField(field.key, event.target.value)} className={`w-full resize-y rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-cyan-300/60 ${field.key === "content" ? "min-h-52" : "min-h-28"}`} />}</label>)}
              <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/20 p-5 md:grid-cols-2"><label className="flex gap-3"><input type="checkbox" checked={selectedState.reviewed} disabled={!selectedComplete} onChange={(event) => updateReviewed(event.target.checked)} className="mt-1 h-5 w-5 accent-cyan-500" /><span><strong className="block">تمت المراجعة</strong><span className="mt-1 block text-sm text-white/55">يتطلب اكتمال الحقول الثلاثة.</span></span></label><label className="flex gap-3"><input type="checkbox" checked={selectedState.published} disabled={!selectedComplete || !selectedState.reviewed} onChange={(event) => updatePublished(event.target.checked)} className="mt-1 h-5 w-5 accent-green-500" /><span><strong className="block">نشر يدوي للعامة</strong><span className="mt-1 block text-sm text-white/55">لا يوجد نشر تلقائي.</span></span></label></div>
              <button type="button" onClick={() => void saveSelected()} disabled={saving} className="w-fit rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-7 py-4 font-black text-white disabled:opacity-60">{saving ? "جاري الحفظ..." : "حفظ حالة الترجمة"}</button>
            </div>}
          </section>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="text-sm text-white/55">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>;
}
