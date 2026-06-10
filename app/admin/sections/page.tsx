"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type PageRow = {
  id: number;
  title: string | null;
  slug: string | null;
};

type SectionRow = {
  id: number;
  page_id: number | null;
  section_key: string | null;
  section_type: string | null;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  sort_order: number | null;
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type SectionForm = {
  page_id: string;
  section_key: string;
  section_type: string;
  title: string;
  subtitle: string;
  content: string;
  sort_order: string;
  is_visible: boolean;
};

const emptyForm: SectionForm = {
  page_id: "",
  section_key: "",
  section_type: "content",
  title: "",
  subtitle: "",
  content: "",
  sort_order: "1",
  is_visible: true,
};

const sectionTypes = [
  { value: "hero", label: "Hero" },
  { value: "content", label: "محتوى" },
  { value: "cards", label: "بطاقات" },
  { value: "steps", label: "خطوات" },
  { value: "faq", label: "FAQ" },
  { value: "cta", label: "CTA" },
  { value: "media", label: "وسائط" },
  { value: "custom", label: "مخصص" },
];

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value: string | null) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getPageTitle(pages: PageRow[], pageId: number | null) {
  const page = pages.find((item) => item.id === pageId);
  return page?.title || page?.slug || "غير مرتبطة بصفحة";
}

function isArchivedSection(section: SectionRow) {
  return Boolean(section.section_key?.startsWith("archived-") || section.title?.startsWith("محذوف -"));
}

export default function AdminSectionsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [pages, setPages] = useState<PageRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [editingSection, setEditingSection] = useState<SectionRow | null>(null);
  const [form, setForm] = useState<SectionForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [pageFilter, setPageFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("pages");
      if (!access.isAuthorized || !access.profile) {
        router.replace("/admin/login");
        return;
      }
      setAdminEmail(access.profile.email || access.user?.email || "");
      setAuthorized(true);
      setChecking(false);
    }
    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    loadData();
  }, [authorized]);

  async function loadData() {
    if (!supabase) return;
    setLoading(true);
    setError("");

    const [pagesResult, sectionsResult] = await Promise.all([
      supabase.from("pages").select("id, title, slug").order("sort_order", { ascending: true }),
      supabase
        .from("sections")
        .select("id, page_id, section_key, section_type, title, subtitle, content, sort_order, is_visible, created_at, updated_at")
        .order("page_id", { ascending: true })
        .order("sort_order", { ascending: true }),
    ]);

    setLoading(false);

    if (pagesResult.error) {
      setError("تعذر تحميل الصفحات. تحقق من صلاحيات جدول pages.");
      return;
    }

    if (sectionsResult.error) {
      setPages((pagesResult.data || []) as PageRow[]);
      setError("تعذر تحميل الأقسام. تحقق من جدول sections وصلاحياته في Supabase.");
      return;
    }

    setPages((pagesResult.data || []) as PageRow[]);
    setSections((sectionsResult.data || []) as SectionRow[]);
  }

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sections.filter((section) => {
      const pageMatch = pageFilter === "all" || String(section.page_id || "") === pageFilter;
      const text = `${section.title || ""} ${section.subtitle || ""} ${section.content || ""} ${section.section_key || ""} ${getPageTitle(pages, section.page_id)}`.toLowerCase();
      return pageMatch && (!query || text.includes(query));
    });
  }, [sections, pages, search, pageFilter]);

  const visibleCount = sections.filter((section) => section.is_visible !== false && !isArchivedSection(section)).length;
  const hiddenCount = sections.filter((section) => section.is_visible === false && !isArchivedSection(section)).length;
  const archivedCount = sections.filter((section) => isArchivedSection(section)).length;

  function updateField(key: keyof SectionForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function clearForm() {
    setEditingSection(null);
    setForm(emptyForm);
  }

  function editSection(section: SectionRow) {
    setEditingSection(section);
    setMessage(`أنت الآن تعدّل القسم: ${section.title || "بدون عنوان"}`);
    setError("");
    setForm({
      page_id: section.page_id ? String(section.page_id) : "",
      section_key: section.section_key || "",
      section_type: section.section_type || "content",
      title: section.title || "",
      subtitle: section.subtitle || "",
      content: section.content || "",
      sort_order: String(section.sort_order || 1),
      is_visible: section.is_visible !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSection(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;

    setMessage("");
    setError("");

    const pageId = form.page_id ? Number(form.page_id) : null;
    const sectionKey = normalizeKey(form.section_key || form.title);

    if (!form.title.trim()) {
      setError("يرجى كتابة عنوان القسم.");
      return;
    }

    if (!sectionKey) {
      setError("يرجى كتابة مفتاح صحيح للقسم باللغة الإنجليزية.");
      return;
    }

    const duplicate = sections.find(
      (section) => section.page_id === pageId && section.section_key === sectionKey && section.id !== editingSection?.id
    );

    if (duplicate) {
      setError("يوجد قسم بنفس المفتاح داخل هذه الصفحة.");
      return;
    }

    setSaving(true);

    const payload = {
      page_id: pageId,
      section_key: sectionKey,
      section_type: form.section_type,
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      content: form.content.trim(),
      sort_order: Number(form.sort_order || 1),
      is_visible: form.is_visible,
      updated_at: new Date().toISOString(),
    };

    const result = editingSection
      ? await supabase.from("sections").update(payload).eq("id", editingSection.id)
      : await supabase.from("sections").insert(payload);

    setSaving(false);

    if (result.error) {
      setError("فشل حفظ القسم. تحقق من جدول sections وصلاحياته في Supabase.");
      return;
    }

    await logActivity(
      editingSection ? "update_section" : "create_section",
      "sections",
      editingSection?.id ? String(editingSection.id) : sectionKey,
      editingSection ? JSON.stringify(editingSection) : "",
      JSON.stringify(payload)
    );

    clearForm();
    setMessage(editingSection ? "تم تحديث القسم بنجاح." : "تمت إضافة القسم بنجاح.");
    await loadData();
  }

  async function toggleSection(section: SectionRow) {
    if (!supabase) return;
    setMessage("");
    setError("");

    const nextValue = section.is_visible === false;
    const { error } = await supabase
      .from("sections")
      .update({ is_visible: nextValue, updated_at: new Date().toISOString() })
      .eq("id", section.id);

    if (error) {
      setError("فشل تحديث حالة القسم.");
      return;
    }

    await logActivity(
      "toggle_section_visibility",
      "sections",
      String(section.id),
      JSON.stringify(section),
      JSON.stringify({ is_visible: nextValue })
    );

    setMessage(nextValue ? "تم إظهار القسم بنجاح." : "تم إخفاء القسم بنجاح.");
    await loadData();
  }

  async function archiveSection(section: SectionRow) {
    if (!supabase) return;

    const sectionTitle = section.title || section.section_key || `قسم رقم ${section.id}`;
    const confirmed = window.confirm(
      `هل تريد حذف القسم "${sectionTitle}" من الصفحة؟\n\nسيتم إخفاؤه وأرشفته بدون مسح بياناته من قاعدة البيانات.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const payload = {
      title: `محذوف - ${sectionTitle}`,
      section_key: `archived-${section.id}-${section.section_key || "section"}`,
      is_visible: false,
      sort_order: 9999,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("sections").update(payload).eq("id", section.id);

    if (error) {
      setError("فشل حذف القسم بشكل آمن. تحقق من صلاحيات جدول sections.");
      return;
    }

    await logActivity(
      "archive_section",
      "sections",
      String(section.id),
      JSON.stringify(section),
      JSON.stringify(payload)
    );

    if (editingSection?.id === section.id) {
      clearForm();
    }

    setMessage("تم حذف القسم من الواجهة وأرشفته بأمان.");
    await loadData();
  }

  async function logActivity(action: string, entityType: string, entityId: string, oldData: string, newData: string) {
    if (!supabase) return;
    await supabase.from("activity_logs").insert({
      admin_email: adminEmail,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
      ip_address: "",
    });
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (checking) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white">
        <div className="rounded-[2rem] border border-purple-500/25 bg-black/45 p-8 text-center">
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-yellow-200">HAMZA AGENCY</div>
          <div className="text-2xl font-black">جاري التحقق من صلاحية الدخول...</div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <section className="mb-6 rounded-[2rem] border border-purple-500/20 bg-black/40 p-6 shadow-[0_0_80px_rgba(124,58,237,0.14)] backdrop-blur-xl md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-4 py-2 text-sm font-bold text-purple-100">Core CMS Foundation</span>
                <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100">Sections CMS</span>
              </div>
              <h1 className="text-4xl font-black leading-tight md:text-5xl">إدارة أقسام الصفحات</h1>
              <p className="mt-4 max-w-3xl leading-8 text-white/62">
                هذه الصفحة تنظّم أقسام كل صفحة، مثل الواجهة الرئيسية، البطاقات، الخطوات، الأسئلة، والدعوات، وهي الأساس العملي للـ Page Builder.
              </p>
              <p className="mt-3 text-sm text-white/45">الأدمن: {adminEmail}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button type="button" onClick={loadData} disabled={loading} className="rounded-2xl border border-purple-300/25 bg-purple-500/10 px-5 py-3 font-black text-purple-100 disabled:opacity-60">
                {loading ? "جاري التحديث..." : "تحديث الأقسام"}
              </button>
              <Link href="/admin/pages" className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 px-5 py-3 text-center font-bold text-cyan-100">إدارة الصفحات</Link>
              <Link href="/admin" className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center font-bold text-white/80">لوحة التحكم</Link>
              <button type="button" onClick={logout} className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-bold text-red-100">تسجيل الخروج</button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="كل الأقسام" value={sections.length} tone="purple" />
          <StatCard title="ظاهرة" value={visibleCount} tone="green" />
          <StatCard title="مخفية" value={hiddenCount} tone="yellow" />
          <StatCard title="محذوفة بأمان" value={archivedCount} tone="red" />
          <StatCard title="الصفحات" value={pages.length} tone="blue" />
        </section>

        {(message || error) && (
          <section className={`mb-6 rounded-3xl border p-5 font-bold leading-8 ${error ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-green-400/25 bg-green-500/10 text-green-100"}`}>
            {error || message}
          </section>
        )}

        <section className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/40 p-5 shadow-[0_0_70px_rgba(124,58,237,0.1)] backdrop-blur md:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h2 className="text-3xl font-black">{editingSection ? "تعديل قسم" : "إضافة قسم جديد"}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/52">اختر الصفحة، نوع القسم، عنوانه، محتواه، وترتيبه.</p>
            </div>
            {editingSection && (
              <button type="button" onClick={clearForm} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-bold text-white/75">إلغاء التعديل</button>
            )}
          </div>

          <form onSubmit={saveSection} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="الصفحة المرتبطة">
                <select value={form.page_id} onChange={(event) => updateField("page_id", event.target.value)} className="input-control">
                  <option value="">بدون صفحة</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>{page.title || page.slug || `Page ${page.id}`}</option>
                  ))}
                </select>
              </Field>

              <Field label="نوع القسم">
                <select value={form.section_type} onChange={(event) => updateField("section_type", event.target.value)} className="input-control">
                  {sectionTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </Field>

              <Field label="عنوان القسم">
                <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="عنوان القسم" className="input-control" />
              </Field>

              <Field label="مفتاح القسم">
                <input value={form.section_key} onChange={(event) => updateField("section_key", event.target.value)} placeholder="hero" dir="ltr" className="input-control text-left" />
              </Field>
            </div>

            <Field label="العنوان الفرعي">
              <input value={form.subtitle} onChange={(event) => updateField("subtitle", event.target.value)} placeholder="وصف قصير للقسم" className="input-control" />
            </Field>

            <Field label="محتوى القسم">
              <textarea value={form.content} onChange={(event) => updateField("content", event.target.value)} placeholder="محتوى القسم..." rows={7} className="input-control leading-8" />
            </Field>

            <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
              <Field label="الترتيب">
                <input value={form.sort_order} onChange={(event) => updateField("sort_order", event.target.value)} type="number" min="1" className="input-control" />
              </Field>

              <button type="button" onClick={() => updateField("is_visible", !form.is_visible)} className={`rounded-3xl border p-4 text-right ${form.is_visible ? "border-green-400/25 bg-green-500/10 text-green-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black">حالة الظهور</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold">{form.is_visible ? "ظاهر" : "مخفي"}</span>
                </div>
                <p className="mt-2 text-sm leading-6 opacity-75">يمكن إخفاء القسم من الواجهة بدون إزالة بياناته.</p>
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black text-white disabled:opacity-60">
                {saving ? "جارٍ الحفظ..." : editingSection ? "حفظ التعديل" : "إضافة القسم"}
              </button>
              <button type="button" onClick={clearForm} className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white/70">تفريغ النموذج</button>
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-purple-500/20 bg-black/40 p-5 shadow-[0_0_70px_rgba(124,58,237,0.1)] backdrop-blur md:p-6">
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_300px_300px] lg:items-end">
            <div>
              <h2 className="text-3xl font-black">قائمة الأقسام</h2>
              <p className="mt-2 text-white/55">استعرض الأقسام حسب الصفحة، حالة الظهور، نوع القسم، والترتيب.</p>
            </div>
            <select value={pageFilter} onChange={(event) => setPageFilter(event.target.value)} className="input-control">
              <option value="all">كل الصفحات</option>
              {pages.map((page) => <option key={page.id} value={page.id}>{page.title || page.slug || `Page ${page.id}`}</option>)}
            </select>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في الأقسام..." className="input-control" />
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-purple-500/20 bg-white/[0.03] text-sm text-white/55">
                  <th className="p-4 text-right">القسم</th>
                  <th className="p-4 text-right">الصفحة</th>
                  <th className="p-4 text-right">النوع</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">الترتيب</th>
                  <th className="p-4 text-right">آخر تحديث</th>
                  <th className="p-4 text-right">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSections.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-white/50">لا توجد أقسام مطابقة.</td></tr>
                ) : (
                  filteredSections.map((section) => {
                    const archived = isArchivedSection(section);

                    return (
                      <tr key={section.id} className="border-b border-white/5 align-top last:border-b-0">
                        <td className="p-4">
                          <div className="font-black text-white">{section.title || "بدون عنوان"}</div>
                          <div className="mt-1 font-mono text-xs text-purple-200" dir="ltr">{section.section_key || "-"}</div>
                          <div className="mt-2 max-w-sm text-sm leading-6 text-white/45">{section.subtitle || section.content || "لا يوجد محتوى بعد."}</div>
                        </td>
                        <td className="p-4 text-white/70">{getPageTitle(pages, section.page_id)}</td>
                        <td className="p-4 text-sm text-white/60">{section.section_type || "content"}</td>
                        <td className="p-4">{archived ? <ArchivedBadge /> : <StatusBadge active={section.is_visible !== false} />}</td>
                        <td className="p-4 text-white/70">{section.sort_order || 1}</td>
                        <td className="p-4 text-sm text-white/45">{formatDate(section.updated_at || section.created_at)}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => editSection(section)} className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-100">تعديل</button>
                            {!archived && (
                              <>
                                <button type="button" onClick={() => toggleSection(section)} className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm font-bold text-yellow-100">{section.is_visible !== false ? "إخفاء" : "إظهار"}</button>
                                <button type="button" onClick={() => archiveSection(section)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-100">حذف آمن</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <style jsx>{`
          .input-control {
            width: 100%;
            border-radius: 1.25rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(0, 0, 0, 0.32);
            padding: 1rem;
            color: white;
            outline: none;
          }
          .input-control:focus {
            border-color: rgba(192, 132, 252, 0.85);
            background: rgba(0, 0, 0, 0.46);
          }
          .input-control::placeholder {
            color: rgba(255, 255, 255, 0.32);
          }
        `}</style>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/78">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ title, value, tone }: { title: string; value: number; tone: string }) {
  const toneClass =
    tone === "green"
      ? "border-green-400/20 bg-green-500/10 text-green-100"
      : tone === "yellow"
        ? "border-yellow-400/20 bg-yellow-500/10 text-yellow-100"
        : tone === "blue"
          ? "border-blue-400/20 bg-blue-500/10 text-blue-100"
          : tone === "red"
            ? "border-red-400/20 bg-red-500/10 text-red-100"
            : "border-purple-400/20 bg-purple-500/10 text-purple-100";

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-2 text-sm font-bold opacity-80">{title}</div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full border border-green-400/25 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-100">ظاهر</span>
  ) : (
    <span className="inline-flex rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/55">مخفي</span>
  );
}

function ArchivedBadge() {
  return (
    <span className="inline-flex rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-100">محذوف بأمان</span>
  );
}
