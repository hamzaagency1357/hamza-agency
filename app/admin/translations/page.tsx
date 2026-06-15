"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type LanguageCode = "en" | "tr";
type SourceType = "programs" | "faqs" | "knowledge_base";

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
};

type TranslationPack = Record<string, Record<LanguageCode, TranslationFields>>;

type GenericRow = Record<string, unknown>;

type SettingRow = {
  id: number;
  setting_key: string | null;
  setting_value: string | null;
};

const STORAGE_KEY = "hamza_translation_panel_pack_v1";
const SETTINGS_KEY = "translation_panel_pack_v1";
const languages: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "tr", label: "Türkçe" },
];
const sources: { key: "all" | SourceType; label: string }[] = [
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

function itemKey(source: SourceType, id: string) {
  return `${source}:${id}`;
}

function safeParsePack(value: string | null): TranslationPack {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as TranslationPack;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function completionForItem(item: SourceItem, pack: TranslationPack, language: LanguageCode) {
  const fields = pack[item.key]?.[language] || {};
  const required = ["title", "summary", "content"] as const;
  const available = required.filter((field) => {
    const sourceValue = item[field].trim();
    if (!sourceValue) return true;
    return Boolean(fields[field]?.trim());
  }).length;
  return Math.round((available / required.length) * 100);
}

function statusLabel(value: number, reviewed?: boolean) {
  if (reviewed && value === 100) return "مكتمل ومراجع";
  if (value === 100) return "مكتمل";
  if (value > 0) return "ناقص";
  return "غير مترجم";
}

function statusClass(value: number, reviewed?: boolean) {
  if (reviewed && value === 100) return "border-green-400/20 bg-green-500/10 text-green-100";
  if (value === 100) return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  if (value > 0) return "border-yellow-400/20 bg-yellow-500/10 text-yellow-100";
  return "border-red-400/20 bg-red-500/10 text-red-100";
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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

    setError("");
    setMessage("");
    setIsLoading(true);

    const [programsResult, faqsResult, knowledgeResult, settingsResult] = await Promise.all([
      supabase.from("programs").select("id, name, title, description, summary").limit(200),
      supabase.from("faqs").select("id, question, answer, category").limit(300),
      supabase.from("knowledge_base").select("id, title, summary, content, category").limit(300),
      supabase.from("settings").select("id, setting_key, setting_value").eq("setting_key", SETTINGS_KEY).maybeSingle(),
    ]);

    setIsLoading(false);

    if (programsResult.error || faqsResult.error || knowledgeResult.error) {
      setError("تعذر تحميل المحتوى القابل للترجمة. يرجى مراجعة صلاحيات البرامج و FAQ و Knowledge Base.");
      return;
    }

    const programItems = ((programsResult.data || []) as GenericRow[]).map((row) => {
      const id = getText(row, ["id"]);
      const title = getText(row, ["name", "title"], "برنامج بدون عنوان");
      return {
        key: itemKey("programs", id),
        source: "programs" as const,
        sourceId: id,
        title,
        summary: getText(row, ["summary"], ""),
        content: getText(row, ["description"], ""),
      };
    });

    const faqItems = ((faqsResult.data || []) as GenericRow[]).map((row) => {
      const id = getText(row, ["id"]);
      return {
        key: itemKey("faqs", id),
        source: "faqs" as const,
        sourceId: id,
        title: getText(row, ["question"], "سؤال بدون عنوان"),
        summary: getText(row, ["category"], ""),
        content: getText(row, ["answer"], ""),
      };
    });

    const knowledgeItems = ((knowledgeResult.data || []) as GenericRow[]).map((row) => {
      const id = getText(row, ["id"]);
      return {
        key: itemKey("knowledge_base", id),
        source: "knowledge_base" as const,
        sourceId: id,
        title: getText(row, ["title"], "معرفة بدون عنوان"),
        summary: getText(row, ["summary", "category"], ""),
        content: getText(row, ["content"], ""),
      };
    });

    const loadedPack = safeParsePack((settingsResult.data as SettingRow | null)?.setting_value || window.localStorage.getItem(STORAGE_KEY));
    setItems([...programItems, ...faqItems, ...knowledgeItems]);
    setPack(loadedPack);
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

  async function savePack() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setMessage("");
    setIsSaving(true);

    const serialized = JSON.stringify(pack);
    window.localStorage.setItem(STORAGE_KEY, serialized);

    const existing = await supabase.from("settings").select("id").eq("setting_key", SETTINGS_KEY).maybeSingle();

    if (existing.data?.id) {
      const { error: updateError } = await supabase
        .from("settings")
        .update({ setting_value: serialized, updated_at: new Date().toISOString() } as never)
        .eq("id", existing.data.id);

      setIsSaving(false);
      if (updateError) {
        setError("تم الحفظ محلياً، لكن تعذر حفظ حزمة الترجمات في settings.");
        return;
      }
      setMessage("تم حفظ حزمة الترجمات بنجاح.");
      return;
    }

    const { error: insertError } = await supabase.from("settings").insert({
      setting_key: SETTINGS_KEY,
      setting_value: serialized,
      setting_group: "language",
      group_name: "language",
      label_ar: "حزمة ترجمات المحتوى",
      label_en: "Content translation pack",
      description: "Translation Panel JSON pack for Arabic, English and Turkish content drafts.",
      input_type: "json",
      sort_order: 999,
      is_public: false,
    } as never);

    setIsSaving(false);

    if (insertError) {
      setError("تم الحفظ محلياً، لكن تعذر إنشاء سجل الترجمات في settings.");
      return;
    }

    setMessage("تم حفظ حزمة الترجمات بنجاح.");
  }

  function exportPack() {
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hamza-translations-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importPack(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const imported = safeParsePack(text);
    setPack(imported);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    setMessage("تم استيراد حزمة الترجمات. اضغط حفظ لتثبيتها في settings.");
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
  const translatedCount = items.filter((item) => completionForItem(item, pack, language) === 100).length;
  const reviewedCount = items.filter((item) => pack[item.key]?.[language]?.reviewed && completionForItem(item, pack, language) === 100).length;
  const missingCount = items.length - translatedCount;

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
              إدارة ترجمات البرامج و FAQ و Knowledge Base للإنكليزي والتركي، مع حفظ حزمة ترجمة داخل settings.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={savePack} disabled={isSaving} className="rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-3 font-black text-white disabled:opacity-60">
              {isSaving ? "جاري الحفظ..." : "حفظ الترجمات"}
            </button>
            <button onClick={exportPack} className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              تصدير JSON
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="كل العناصر" value={items.length} tone="purple" />
          <StatCard label="مكتمل" value={translatedCount} tone="green" />
          <StatCard label="ناقص" value={missingCount} tone="yellow" />
          <StatCard label="مراجع" value={reviewedCount} tone="cyan" />
        </div>

        <section className="mb-6 grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 lg:grid-cols-5">
          <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
            {languages.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as "all" | SourceType)} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
            {sources.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في المحتوى..." className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 lg:col-span-2" />
          <label className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-center text-sm font-black text-white/70 cursor-pointer">
            استيراد JSON
            <input type="file" accept="application/json" className="hidden" onChange={(event) => importPack(event.target.files?.[0] || null)} />
          </label>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
          <section className="grid max-h-[75vh] gap-3 overflow-auto rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
            {isLoading && <div className="rounded-2xl bg-black/25 p-5 text-center text-white/55">جاري التحميل...</div>}
            {filteredItems.map((item) => {
              const completion = completionForItem(item, pack, language);
              const reviewed = Boolean(pack[item.key]?.[language]?.reviewed);
              return (
                <button key={item.key} type="button" onClick={() => setSelectedKey(item.key)} className={`rounded-2xl border p-4 text-right transition ${selectedItem?.key === item.key ? "border-cyan-300/45 bg-cyan-500/10" : "border-white/10 bg-black/25 hover:border-cyan-300/30"}`}>
                  <div className="mb-2 flex flex-wrap gap-2 text-xs font-black">
                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-purple-100">{item.source}</span>
                    <span className={`rounded-full border px-3 py-1 ${statusClass(completion, reviewed)}`}>{statusLabel(completion, reviewed)} — {completion}%</span>
                  </div>
                  <div className="font-black leading-7">{item.title}</div>
                  <div className="mt-2 text-xs text-white/45">{countWords(item.content)} كلمة تقريباً</div>
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
                  <div className="text-sm font-black text-cyan-100">النص العربي الأصلي</div>
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
  return classes[tone] || classes.purple;
}
