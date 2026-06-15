"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type Tone = "purple" | "green" | "yellow" | "cyan";
type BackgroundKey = "royal" | "hepta" | "gold" | "nebula";
type MotionLevel = "low" | "medium" | "high";

type VisualCard = { id: string; title: string; subtitle: string; tone: Tone };

type VisualDraft = {
  background: BackgroundKey;
  motion: MotionLevel;
  glow: boolean;
  glass: boolean;
  animatedCards: boolean;
  cardsScope: string[];
  cards: VisualCard[];
  notes: string;
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
};

function safeParse(value: string | null): VisualDraft {
  if (!value) return defaultDraft;
  try {
    const parsed = JSON.parse(value) as Partial<VisualDraft>;
    return { ...defaultDraft, ...parsed, cards: parsed.cards || defaultDraft.cards };
  } catch {
    return defaultDraft;
  }
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
  const [adminEmail, setAdminEmail] = useState("");
  const [draft, setDraft] = useState<VisualDraft>(defaultDraft);
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
      setDraft(safeParse(window.localStorage.getItem(STORAGE_KEY)));
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  const readiness = useMemo(() => {
    const points = [draft.background, draft.motion, draft.cards.length > 0, draft.cardsScope.length > 0, draft.notes.trim()].filter(Boolean).length;
    return Math.round((points / 5) * 100);
  }, [draft]);

  function saveDraft() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setMessage("تم حفظ إعدادات التجربة البصرية محلياً.");
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
    setDraft((current) => {
      const exists = current.cardsScope.includes(scope);
      return { ...current, cardsScope: exists ? current.cardsScope.filter((item) => item !== scope) : [...current.cardsScope, scope] };
    });
  }

  function updateCard(id: string, key: keyof VisualCard, value: string) {
    setDraft((current) => ({ ...current, cards: current.cards.map((card) => (card.id === id ? { ...card, [key]: value } : card)) }));
  }

  function addCard() {
    setDraft((current) => ({ ...current, cards: [...current.cards, { id: `card-${Date.now()}`, title: "كرت جديد", subtitle: "وصف مختصر", tone: "purple" }] }));
  }

  function removeCard(id: string) {
    setDraft((current) => ({ ...current, cards: current.cards.filter((card) => card.id !== id) }));
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
            <p className="mt-3 max-w-3xl leading-8 text-white/55">تجهيز ستايل Hepta Universe وخيارات الخلفيات والكروت المتحركة قبل تطبيقها على الموقع العام.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={saveDraft} className="rounded-full bg-gradient-to-r from-purple-600 to-yellow-500 px-6 py-3 font-black text-white">حفظ محلي</button>
            <button onClick={exportDraft} className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">تصدير JSON</button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">لوحة الإدارة</Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">حساب الإدارة: <span className="text-white">{adminEmail}</span></div>
        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="جاهزية الستايل" value={readiness} suffix="%" tone="green" />
          <StatCard label="الخلفية" value={backgrounds.findIndex((item) => item.key === draft.background) + 1} tone="purple" />
          <StatCard label="الكروت" value={draft.cards.length} tone="cyan" />
          <StatCard label="نطاقات التطبيق" value={draft.cardsScope.length} tone="yellow" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-white/70">
                الخلفية
                <select value={draft.background} onChange={(event) => setDraft((current) => ({ ...current, background: event.target.value as BackgroundKey }))} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  {backgrounds.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-black text-white/70">
                مستوى الحركة
                <select value={draft.motion} onChange={(event) => setDraft((current) => ({ ...current, motion: event.target.value as MotionLevel }))} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="low">خفيف</option>
                  <option value="medium">متوسط</option>
                  <option value="high">قوي</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Toggle label="Glow" checked={draft.glow} onChange={(checked) => setDraft((current) => ({ ...current, glow: checked }))} />
              <Toggle label="Glass Cards" checked={draft.glass} onChange={(checked) => setDraft((current) => ({ ...current, glass: checked }))} />
              <Toggle label="Animated Cards" checked={draft.animatedCards} onChange={(checked) => setDraft((current) => ({ ...current, animatedCards: checked }))} />
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
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
            </label>
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 xl:sticky xl:top-6 xl:self-start">
            <h2 className="text-2xl font-black">معاينة بصرية</h2>
            <div className={`mt-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${backgroundClass(draft.background)} p-5`}>
              <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
                <div className="text-xs font-black text-yellow-100">HAMZA AGENCY</div>
                <h3 className="mt-3 text-2xl font-black">Hepta Universe Style</h3>
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
  };
  return classes[tone];
}
