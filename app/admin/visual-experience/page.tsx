"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Tone = "purple" | "green" | "yellow" | "cyan" | "red";
type BackgroundKey = "royal" | "hepta" | "gold" | "nebula";
type MotionLevel = "low" | "medium" | "high";
type VisualStatus = "draft" | "review" | "approved" | "archived";

type VisualCard = { id: string; title: string; subtitle: string; tone: Exclude<Tone, "red"> };

type VisualDraft = {
  presetName: string;
  background: BackgroundKey;
  motion: MotionLevel;
  glow: boolean;
  glass: boolean;
  animatedCards: boolean;
  cardsScope: string[];
  cards: VisualCard[];
  notes: string;
  status: VisualStatus;
};

type VisualExperienceRow = {
  id: string;
  preset_name: string | null;
  background: string | null;
  motion: string | null;
  glow: boolean | null;
  glass: boolean | null;
  animated_cards: boolean | null;
  cards_scope: string[] | null;
  cards: VisualCard[] | null;
  notes: string | null;
  status: string | null;
  apply_to_public: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const STORAGE_KEY = "hamza_visual_experience_v1";

const backgrounds: { key: BackgroundKey; label: string; description: string }[] = [
  { key: "royal", label: "Royal Black Purple", description: "أسود فاخر مع موف ملكي ولمعة ذهبية خفيفة." },
  { key: "hepta", label: "Hepta Universe", description: "طبقات كونية داكنة، هالات موف، وشعور فضائي فاخر." },
  { key: "gold", label: "Golden Agency", description: "تدرجات ذهبية ناعمة فوق خلفية سوداء فخمة." },
  { key: "nebula", label: "Purple Nebula", description: "سديم موف متحرك مناسب للصفحات التعريفية." },
];

const scopeOptions = ["الخدمات", "الإحصائيات", "مميزات الوكالة", "خطوات الانضمام", "لوحة التحكم", "الخلفيات"];

const defaultDraft: VisualDraft = {
  presetName: "HAMZA AGENCY Visual Draft",
  background: "hepta",
  motion: "medium",
  glow: true,
  glass: true,
  animatedCards: true,
  cardsScope: ["الخدمات", "الإحصائيات", "مميزات الوكالة"],
  cards: [
    { id: "services", title: "خدمات متحركة", subtitle: "كروت فاخرة للخدمات الرئيسية", tone: "purple" },
    { id: "stats", title: "إحصائيات مضيئة", subtitle: "أرقام الوكالة بحركة ناعمة", tone: "yellow" },
    { id: "features", title: "مميزات الوكالة", subtitle: "عرض احترافي للنقاط القوية", tone: "cyan" },
  ],
  notes: "هذه اللوحة للتجهيز والمراجعة فقط. لا تطبق على الموقع العام قبل الاعتماد النهائي.",
  status: "draft",
};

function normalizeBackground(value: string | null | undefined): BackgroundKey {
  return value === "royal" || value === "gold" || value === "nebula" ? value : "hepta";
}

function normalizeMotion(value: string | null | undefined): MotionLevel {
  return value === "low" || value === "high" ? value : "medium";
}

function normalizeStatus(value: string | null | undefined): VisualStatus {
  if (value === "review" || value === "approved" || value === "archived") return value;
  return "draft";
}

function normalizeCards(value: unknown): VisualCard[] {
  if (!Array.isArray(value) || value.length === 0) return defaultDraft.cards;

  return value.map((card, index) => {
    const item = card as Partial<VisualCard>;
    const tone = item.tone === "green" || item.tone === "yellow" || item.tone === "cyan" ? item.tone : "purple";

    return {
      id: item.id || `card-${index + 1}`,
      title: item.title || "كرت بصري",
      subtitle: item.subtitle || "وصف مختصر",
      tone,
    };
  });
}

function normalizeDraft(value: Partial<VisualDraft>): VisualDraft {
  return {
    ...defaultDraft,
    ...value,
    background: normalizeBackground(value.background),
    motion: normalizeMotion(value.motion),
    status: normalizeStatus(value.status),
    cardsScope: Array.isArray(value.cardsScope) && value.cardsScope.length > 0 ? value.cardsScope : defaultDraft.cardsScope,
    cards: normalizeCards(value.cards),
  };
}

function safeParse(value: string | null): VisualDraft {
  if (!value) return defaultDraft;

  try {
    return normalizeDraft(JSON.parse(value) as Partial<VisualDraft>);
  } catch {
    return defaultDraft;
  }
}

function rowToDraft(row: VisualExperienceRow): VisualDraft {
  return normalizeDraft({
    presetName: row.preset_name || defaultDraft.presetName,
    background: normalizeBackground(row.background),
    motion: normalizeMotion(row.motion),
    glow: row.glow !== false,
    glass: row.glass !== false,
    animatedCards: row.animated_cards !== false,
    cardsScope: row.cards_scope || defaultDraft.cardsScope,
    cards: row.cards || defaultDraft.cards,
    notes: row.notes || defaultDraft.notes,
    status: normalizeStatus(row.status),
  });
}

function draftToPayload(draft: VisualDraft, adminEmail: string) {
  return {
    preset_name: draft.presetName.trim() || defaultDraft.presetName,
    background: draft.background,
    motion: draft.motion,
    glow: draft.glow,
    glass: draft.glass,
    animated_cards: draft.animatedCards,
    cards_scope: draft.cardsScope,
    cards: draft.cards,
    notes: draft.notes.trim(),
    status: draft.status,
    apply_to_public: false,
    approved_by: null,
    approved_at: null,
    updated_by: adminEmail || null,
  };
}

function backgroundClass(key: BackgroundKey) {
  const classes: Record<BackgroundKey, string> = {
    royal: "from-black via-purple-950 to-black",
    hepta: "from-[#050008] via-[#25003d] to-[#09000f]",
    gold: "from-black via-[#2b1b00] to-[#070009]",
    nebula: "from-[#080011] via-[#32115d] to-[#050008]",
  };
  return classes[key];
}

export default function AdminVisualExperiencePage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoadingPreset, setIsLoadingPreset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState("احتياطي محلي");
  const [draft, setDraft] = useState<VisualDraft>(defaultDraft);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace(access.reason === "forbidden" ? "/admin" : "/admin/login");
        return;
      }

      const email = access.profile.email || access.user?.email || "";
      const localDraft = safeParse(window.localStorage.getItem(STORAGE_KEY));

      setAdminEmail(email);
      setDraft(localDraft);
      setIsAuthorized(true);
      setIsCheckingAuth(false);

      if (!isSupabaseConfigured || !supabase) {
        setStorageMode("احتياطي محلي — Supabase غير مهيأ");
        return;
      }

      setIsLoadingPreset(true);
      const { data, error: loadError } = await supabase
        .from("visual_experience_settings")
        .select("id, preset_name, background, motion, glow, glass, animated_cards, cards_scope, cards, notes, status, apply_to_public, approved_by, approved_at, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setIsLoadingPreset(false);

      if (loadError) {
        setStorageMode("احتياطي محلي — تعذر قراءة Supabase");
        setError(`تعذر تحميل Visual Experience من Supabase: ${loadError.message}`);
        return;
      }

      if (data) {
        const row = data as VisualExperienceRow;
        const remoteDraft = rowToDraft(row);
        setPresetId(row.id);
        setDraft(remoteDraft);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteDraft));
        setStorageMode(row.apply_to_public ? "Supabase دائم — يوجد إعداد عام معتمد" : "Supabase دائم");
      } else {
        setStorageMode("Supabase دائم — لا يوجد preset محفوظ بعد");
      }
    }

    checkAccess();
  }, [router]);

  const readiness = useMemo(() => {
    const points = [draft.background, draft.motion, draft.cards.length > 0, draft.cardsScope.length > 0, draft.notes.trim()].filter(Boolean).length;
    return Math.round((points / 5) * 100);
  }, [draft]);

  function updateDraft(nextDraft: VisualDraft) {
    setDraft(nextDraft);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
    setMessage("");
    setError("");
  }

  async function saveDraft() {
    setMessage("");
    setError("");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    if (!isSupabaseConfigured || !supabase) {
      setStorageMode("احتياطي محلي — Supabase غير مهيأ");
      setMessage("تم حفظ نسخة احتياطية محلية فقط لأن Supabase غير مهيأ.");
      return;
    }

    setIsSaving(true);

    const payload = draftToPayload(draft, adminEmail);
    const result = presetId
      ? await supabase
          .from("visual_experience_settings")
          .update(payload)
          .eq("id", presetId)
          .select("id, preset_name, background, motion, glow, glass, animated_cards, cards_scope, cards, notes, status, apply_to_public, approved_by, approved_at, created_at, updated_at")
          .maybeSingle()
      : await supabase
          .from("visual_experience_settings")
          .insert({ ...payload, created_by: adminEmail || null })
          .select("id, preset_name, background, motion, glow, glass, animated_cards, cards_scope, cards, notes, status, apply_to_public, approved_by, approved_at, created_at, updated_at")
          .maybeSingle();

    setIsSaving(false);

    if (result.error || !result.data) {
      setStorageMode("احتياطي محلي — فشل حفظ Supabase");
      setError(`تم حفظ نسخة احتياطية محلية، لكن فشل حفظ Supabase: ${result.error?.message || "لا توجد بيانات راجعة"}`);
      return;
    }

    const savedRow = result.data as VisualExperienceRow;
    const savedDraft = rowToDraft(savedRow);
    setPresetId(savedRow.id);
    setDraft(savedDraft);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedDraft));
    setStorageMode("Supabase دائم");
    setMessage("تم حفظ إعدادات Visual Experience في Supabase مع إبقاء التطبيق العام مقفلاً.");
  }

  function exportDraft() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hamza-visual-experience.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleScope(scope: string) {
    const exists = draft.cardsScope.includes(scope);
    updateDraft({ ...draft, cardsScope: exists ? draft.cardsScope.filter((item) => item !== scope) : [...draft.cardsScope, scope] });
  }

  function updateCard(id: string, key: keyof VisualCard, value: string) {
    updateDraft({ ...draft, cards: draft.cards.map((card) => (card.id === id ? { ...card, [key]: value } : card)) });
  }

  function addCard() {
    updateDraft({ ...draft, cards: [...draft.cards, { id: `card-${Date.now()}`, title: "كرت جديد", subtitle: "وصف مختصر", tone: "purple" }] });
  }

  function removeCard(id: string) {
    updateDraft({ ...draft, cards: draft.cards.filter((card) => card.id !== id) });
  }

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">جاري التحقق من صلاحيات الإدارة...</div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">Visual Experience</div>
            <h1 className="text-4xl font-black md:text-5xl">الخلفيات والكروت المتحركة</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              تجهيز ستايل Hepta Universe وخيارات الخلفيات والكروت المتحركة. الحفظ دائم في Supabase، والتطبيق العام مقفل حتى موافقة بصرية صريحة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={saveDraft} disabled={isSaving || isLoadingPreset} className="rounded-full bg-gradient-to-r from-purple-600 to-yellow-500 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60">
              {isSaving ? "جارٍ الحفظ..." : "حفظ دائم"}
            </button>
            <button onClick={exportDraft} className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">تصدير JSON</button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">لوحة الإدارة</Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">حساب الإدارة: <span className="text-white">{adminEmail}</span></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">مصدر الحفظ: <span className="text-white">{storageMode}</span></div>
        </div>

        {isLoadingPreset && <div className="mb-6 rounded-3xl border border-purple-400/25 bg-purple-500/10 p-5 text-purple-100">جاري تحميل إعدادات Visual Experience من Supabase...</div>}
        {(message || error) && (
          <div className={`mb-6 rounded-3xl border p-5 ${error ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-green-400/25 bg-green-500/10 text-green-100"}`}>
            {error || message}
          </div>
        )}

        <div className="mb-8 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 text-sm leading-7 text-yellow-100">
          هذه الصفحة تحفظ إعدادات Visual Experience فقط. لا تغير خلفية الموقع العام أو الألوان أو الحركة. التطبيق العام سيحتاج خطوة مستقلة وموافقة بصرية صريحة منك.
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="جاهزية الستايل" value={readiness} suffix="%" tone="green" />
          <StatCard label="الخلفية" value={backgrounds.findIndex((item) => item.key === draft.background) + 1} tone="purple" />
          <StatCard label="الكروت" value={draft.cards.length} tone="cyan" />
          <StatCard label="نطاقات التطبيق" value={draft.cardsScope.length} tone="yellow" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <Field label="اسم preset" value={draft.presetName} onChange={(value) => updateDraft({ ...draft, presetName: value })} />

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-black text-white/70">
                الخلفية
                <select value={draft.background} onChange={(event) => updateDraft({ ...draft, background: event.target.value as BackgroundKey })} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  {backgrounds.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black text-white/70">
                مستوى الحركة
                <select value={draft.motion} onChange={(event) => updateDraft({ ...draft, motion: event.target.value as MotionLevel })} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="low">خفيف</option>
                  <option value="medium">متوسط</option>
                  <option value="high">قوي</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black text-white/70">
                حالة الإعداد
                <select value={draft.status} onChange={(event) => updateDraft({ ...draft, status: event.target.value as VisualStatus })} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="draft">مسودة</option>
                  <option value="review">مراجعة</option>
                  <option value="approved">معتمد داخلياً</option>
                  <option value="archived">مؤرشف</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Toggle label="Glow" checked={draft.glow} onChange={(checked) => updateDraft({ ...draft, glow: checked })} />
              <Toggle label="Glass Cards" checked={draft.glass} onChange={(checked) => updateDraft({ ...draft, glass: checked })} />
              <Toggle label="Animated Cards" checked={draft.animatedCards} onChange={(checked) => updateDraft({ ...draft, animatedCards: checked })} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 text-sm font-black text-white/70">أماكن تطبيق الكروت المتحركة</div>
              <div className="flex flex-wrap gap-3">
                {scopeOptions.map((scope) => (
                  <button key={scope} type="button" onClick={() => toggleScope(scope)} className={`rounded-full border px-5 py-2 text-sm font-black ${draft.cardsScope.includes(scope) ? "border-green-400/30 bg-green-500/10 text-green-100" : "border-white/10 bg-white/[0.04] text-white/45"}`}>{scope}</button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm font-black text-white/70">الكروت المتحركة</div>
                <button type="button" onClick={addCard} className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/75">إضافة كرت</button>
              </div>
              <div className="grid gap-4">
                {draft.cards.map((card) => (
                  <div key={card.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="العنوان" value={card.title} onChange={(value) => updateCard(card.id, "title", value)} />
                      <Field label="الوصف" value={card.subtitle} onChange={(value) => updateCard(card.id, "subtitle", value)} />
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button type="button" onClick={() => removeCard(card.id)} className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-100">حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <label className="grid gap-2 text-sm font-black text-white/70">
              ملاحظات قبل التطبيق
              <textarea value={draft.notes} onChange={(event) => updateDraft({ ...draft, notes: event.target.value })} className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
            </label>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 xl:sticky xl:top-6 xl:self-start">
            <h2 className="text-2xl font-black">معاينة بصرية</h2>
            <div className={`mt-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${backgroundClass(draft.background)} p-5`}>
              <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                <div className="text-xs font-black text-yellow-100">HAMZA AGENCY</div>
                <h3 className="mt-3 text-2xl font-black">{draft.presetName || "Hepta Universe Style"}</h3>
                <p className="mt-3 leading-7 text-white/65">أسود فاخر، موف ملكي، ذهب ناعم، وكروت متحركة خفيفة.</p>
              </div>
              <div className="mt-4 grid gap-3">
                {draft.cards.map((card) => (
                  <div key={card.id} className={`rounded-2xl border p-4 ${toneClass(card.tone)}`}>
                    <div className="font-black">{card.title}</div>
                    <div className="mt-1 text-sm opacity-75">{card.subtitle}</div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-black text-white/70">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-white outline-none" />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm font-black text-white/75">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function StatCard({ label, value, tone, suffix = "" }: { label: string; value: number; tone: Tone; suffix?: string }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">{value}{suffix}</div>
    </div>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
  };
  return classes[tone];
}
