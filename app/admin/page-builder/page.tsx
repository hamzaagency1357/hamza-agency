"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type SectionType = "hero" | "text" | "cards" | "cta" | "faq";
type PageStatus = "draft" | "review" | "ready";
type Tone = "purple" | "green" | "yellow" | "cyan";

type BuilderSection = {
  id: string;
  type: SectionType;
  title: string;
  body: string;
};

type BuilderDraft = {
  pageTitle: string;
  slug: string;
  status: PageStatus;
  language: string;
  seoTitle: string;
  seoDescription: string;
  sections: BuilderSection[];
};

const STORAGE_KEY = "hamza_page_builder_draft_v1";

const defaultDraft: BuilderDraft = {
  pageTitle: "صفحة جديدة",
  slug: "new-page",
  status: "draft",
  language: "ar",
  seoTitle: "",
  seoDescription: "",
  sections: [
    { id: "hero-1", type: "hero", title: "عنوان الصفحة", body: "وصف قصير يظهر في بداية الصفحة." },
    { id: "text-1", type: "text", title: "قسم نصي", body: "اكتب محتوى القسم هنا." },
  ],
};

const sectionTypes: { type: SectionType; label: string }[] = [
  { type: "hero", label: "Hero" },
  { type: "text", label: "Text Section" },
  { type: "cards", label: "Cards" },
  { type: "cta", label: "CTA" },
  { type: "faq", label: "FAQ" },
];

function safeParse(value: string | null): BuilderDraft {
  if (!value) return defaultDraft;
  try {
    const parsed = JSON.parse(value) as Partial<BuilderDraft>;
    return { ...defaultDraft, ...parsed, sections: parsed.sections || defaultDraft.sections };
  } catch {
    return defaultDraft;
  }
}

function newSection(type: SectionType): BuilderSection {
  return {
    id: `${type}-${Date.now()}`,
    type,
    title: sectionTypes.find((item) => item.type === type)?.label || "Section",
    body: "اكتب محتوى هذا القسم هنا.",
  };
}

export default function AdminPageBuilderPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [draft, setDraft] = useState<BuilderDraft>(defaultDraft);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("pages");

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

  const completion = useMemo(() => {
    const required = [draft.pageTitle, draft.slug, draft.seoTitle, draft.seoDescription, ...draft.sections.map((section) => section.title + section.body)];
    const done = required.filter((value) => value.trim()).length;
    return Math.round((done / Math.max(required.length, 1)) * 100);
  }, [draft]);

  function updateSection(id: string, key: keyof BuilderSection, value: string) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => (section.id === id ? { ...section, [key]: value } : section)),
    }));
  }

  function moveSection(id: string, direction: "up" | "down") {
    setDraft((current) => {
      const sections = [...current.sections];
      const index = sections.findIndex((section) => section.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= sections.length) return current;
      const [item] = sections.splice(index, 1);
      sections.splice(targetIndex, 0, item);
      return { ...current, sections };
    });
  }

  function removeSection(id: string) {
    setDraft((current) => ({ ...current, sections: current.sections.filter((section) => section.id !== id) }));
  }

  function addSection(type: SectionType) {
    setDraft((current) => ({ ...current, sections: [...current.sections, newSection(type)] }));
  }

  function saveDraft() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setMessage("تم حفظ مسودة Page Builder محلياً.");
  }

  function exportDraft() {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `page-builder-${draft.slug || "draft"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

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
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
              Advanced Page Builder
            </div>
            <h1 className="text-4xl font-black md:text-5xl">منشئ الصفحات المتقدم</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              مساحة آمنة لتجهيز صفحات مرنة بأقسام جاهزة وحفظها كمسودة JSON قبل ربطها بالنشر العام.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={saveDraft} className="rounded-full bg-gradient-to-r from-purple-600 to-yellow-500 px-6 py-3 font-black text-white">
              حفظ محلي
            </button>
            <button onClick={exportDraft} className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
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

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard label="نسبة الجاهزية" value={completion} suffix="%" tone="green" />
          <StatCard label="عدد الأقسام" value={draft.sections.length} tone="purple" />
          <StatCard label="حالة الصفحة" value={draft.status === "ready" ? 100 : draft.status === "review" ? 70 : 30} suffix="%" tone="yellow" />
          <StatCard label="اللغة" value={draft.language === "ar" ? 1 : draft.language === "en" ? 2 : 3} tone="cyan" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="grid gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="عنوان الصفحة" value={draft.pageTitle} onChange={(value) => setDraft((current) => ({ ...current, pageTitle: value }))} />
              <Field label="رابط الصفحة / Slug" value={draft.slug} onChange={(value) => setDraft((current) => ({ ...current, slug: value }))} />
              <Field label="SEO Title" value={draft.seoTitle} onChange={(value) => setDraft((current) => ({ ...current, seoTitle: value }))} />
              <Field label="SEO Description" value={draft.seoDescription} onChange={(value) => setDraft((current) => ({ ...current, seoDescription: value }))} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-white/70">
                حالة الصفحة
                <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as PageStatus }))} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="draft">مسودة</option>
                  <option value="review">مراجعة</option>
                  <option value="ready">جاهزة</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black text-white/70">
                اللغة
                <select value={draft.language} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                  <option value="tr">Türkçe</option>
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="mb-3 text-sm font-black text-white/70">إضافة قسم جاهز</div>
              <div className="flex flex-wrap gap-3">
                {sectionTypes.map((item) => (
                  <button key={item.type} type="button" onClick={() => addSection(item.type)} className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-black text-white/75 hover:border-yellow-300/35">
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {draft.sections.map((section, index) => (
              <article key={section.id} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
                      {index + 1} / {section.type}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => moveSection(section.id, "up")} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/70">أعلى</button>
                    <button type="button" onClick={() => moveSection(section.id, "down")} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-white/70">أسفل</button>
                    <button type="button" onClick={() => removeSection(section.id)} className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-xs font-bold text-red-100">حذف</button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <Field label="عنوان القسم" value={section.title} onChange={(value) => updateSection(section.id, "title", value)} />
                  <label className="grid gap-2 text-sm font-black text-white/70">
                    محتوى القسم
                    <textarea value={section.body} onChange={(event) => updateSection(section.id, "body", event.target.value)} className="min-h-32 rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none" />
                  </label>
                </div>
              </article>
            ))}
          </section>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 xl:sticky xl:top-6 xl:self-start">
            <h2 className="text-2xl font-black">معاينة مختصرة</h2>
            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-5">
              <div className="text-xs font-black text-yellow-100">/{draft.slug}</div>
              <h3 className="mt-3 text-2xl font-black">{draft.pageTitle}</h3>
              <p className="mt-3 leading-7 text-white/55">{draft.seoDescription || "وصف SEO غير مكتمل."}</p>
            </div>
            <div className="mt-5 grid gap-3">
              {draft.sections.map((section) => (
                <div key={section.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="text-xs font-black text-purple-100">{section.type}</div>
                  <div className="mt-2 font-black">{section.title}</div>
                </div>
              ))}
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
      <input value={value} onChange={(event) => onChange(event.target.value)} className="h-14 rounded-2xl border border-white/10 bg-black/30 px-5 text-white outline-none" />
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
