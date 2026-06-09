"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type PageItem = {
  id: number;
  created_at: string;
  updated_at: string | null;
  title: string | null;
  slug: string | null;
  content: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image: string | null;
  is_homepage: boolean | null;
  is_published: boolean | null;
  sort_order: number | null;
};

type PageForm = {
  title: string;
  slug: string;
  content: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_image: string;
  is_homepage: boolean;
  is_published: boolean;
  sort_order: string;
};

type PageFilter = "all" | "published" | "draft" | "homepage" | "needs_seo";

const emptyForm: PageForm = {
  title: "",
  slug: "",
  content: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  og_image: "",
  is_homepage: false,
  is_published: true,
  sort_order: "1",
};

const filterOptions: { value: PageFilter; label: string }[] = [
  { value: "all", label: "كل الصفحات" },
  { value: "published", label: "منشورة" },
  { value: "draft", label: "غير منشورة" },
  { value: "homepage", label: "الرئيسية" },
  { value: "needs_seo", label: "تحتاج SEO" },
];

const recommendedCorePages = [
  "home",
  "about",
  "services",
  "digital-services",
  "contact",
  "faq",
  "knowledge-center",
  "privacy-policy",
  "terms-and-conditions",
  "ai-policy",
];

function normalizeSlug(value: string) {
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

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getSeoScore(page: PageItem) {
  let score = 0;
  if ((page.seo_title || "").trim()) score += 1;
  if ((page.seo_description || "").trim()) score += 1;
  if ((page.seo_keywords || "").trim()) score += 1;
  if ((page.og_image || "").trim()) score += 1;
  return score;
}

function getSeoLabel(page: PageItem) {
  const score = getSeoScore(page);
  if (score >= 4) return "مكتمل";
  if (score >= 2) return "جزئي";
  return "يحتاج إعداد";
}

function getPublicPath(slug: string | null) {
  if (!slug || slug === "home" || slug === "homepage") return "/";
  return `/${slug}`;
}

export default function AdminPagesPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageItem | null>(null);
  const [form, setForm] = useState<PageForm>(emptyForm);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<PageFilter>("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function checkAdminAccess() {
      const access = await requireAdminModuleAccess("pages");

      if (!access.isAuthorized || !access.profile) {
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAdminAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadPages();
  }, [isAuthorized]);

  async function loadPages() {
    if (!supabase) {
      showError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("pages")
      .select(
        "id, created_at, updated_at, title, slug, content, seo_title, seo_description, seo_keywords, og_image, is_homepage, is_published, sort_order"
      )
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setIsLoading(false);

    if (error) {
      showError("تعذر تحميل الصفحات. تحقق من صلاحيات جدول pages.");
      return;
    }

    setPages(data || []);
  }

  const stats = useMemo(() => {
    const published = pages.filter((page) => page.is_published !== false).length;
    const draft = pages.filter((page) => page.is_published === false).length;
    const homepage = pages.filter((page) => page.is_homepage === true).length;
    const needsSeo = pages.filter((page) => getSeoScore(page) < 4).length;
    const existingSlugs = new Set(pages.map((page) => page.slug || ""));
    const missingCorePages = recommendedCorePages.filter(
      (slug) => !existingSlugs.has(slug)
    ).length;

    return {
      total: pages.length,
      published,
      draft,
      homepage,
      needsSeo,
      missingCorePages,
    };
  }, [pages]);

  const filteredPages = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return pages.filter((page) => {
      const seoScore = getSeoScore(page);
      const filterMatch =
        activeFilter === "all" ||
        (activeFilter === "published" && page.is_published !== false) ||
        (activeFilter === "draft" && page.is_published === false) ||
        (activeFilter === "homepage" && page.is_homepage === true) ||
        (activeFilter === "needs_seo" && seoScore < 4);

      const text = `${page.title || ""} ${page.slug || ""} ${
        page.content || ""
      } ${page.seo_title || ""} ${page.seo_description || ""}`.toLowerCase();

      return filterMatch && (!normalizedSearch || text.includes(normalizedSearch));
    });
  }, [pages, search, activeFilter]);

  function showSuccess(text: string) {
    setError("");
    setMessage(text);
  }

  function showError(text: string) {
    setMessage("");
    setError(text);
  }

  function updateField(key: keyof PageForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearForm() {
    setSelectedPage(null);
    setForm(emptyForm);
  }

  function resetForm() {
    clearForm();
    setMessage("");
    setError("");
  }

  function editPage(page: PageItem) {
    setSelectedPage(page);
    setMessage(`أنت الآن تعدّل الصفحة: ${page.title || "بدون عنوان"}`);
    setError("");

    setForm({
      title: page.title || "",
      slug: page.slug || "",
      content: page.content || "",
      seo_title: page.seo_title || "",
      seo_description: page.seo_description || "",
      seo_keywords: page.seo_keywords || "",
      og_image: page.og_image || "",
      is_homepage: Boolean(page.is_homepage),
      is_published: page.is_published !== false,
      sort_order: String(page.sort_order || 1),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function savePage(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!supabase) {
      showError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const normalizedSlug = normalizeSlug(form.slug);

    if (!form.title.trim()) {
      showError("يرجى كتابة عنوان الصفحة.");
      return;
    }

    if (!normalizedSlug) {
      showError("يرجى كتابة رابط صفحة صحيح باللغة الإنجليزية مثل about أو contact.");
      return;
    }

    const duplicatePage = pages.find(
      (page) => page.slug === normalizedSlug && page.id !== selectedPage?.id
    );

    if (duplicatePage) {
      showError("هذا الرابط مستخدم في صفحة أخرى. يرجى اختيار رابط مختلف.");
      return;
    }

    setIsSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: normalizedSlug,
      content: form.content.trim(),
      seo_title: form.seo_title.trim(),
      seo_description: form.seo_description.trim(),
      seo_keywords: form.seo_keywords.trim(),
      og_image: form.og_image.trim(),
      is_homepage: form.is_homepage,
      is_published: form.is_published,
      sort_order: Number(form.sort_order || 1),
      updated_at: new Date().toISOString(),
    };

    if (payload.is_homepage) {
      await supabase
        .from("pages")
        .update({ is_homepage: false, updated_at: new Date().toISOString() })
        .neq("id", selectedPage?.id || 0);
    }

    const result = selectedPage
      ? await supabase.from("pages").update(payload).eq("id", selectedPage.id)
      : await supabase.from("pages").insert(payload);

    setIsSaving(false);

    if (result.error) {
      showError("فشل حفظ الصفحة. تأكد أن slug غير مكرر وأن صلاحيات الجدول صحيحة.");
      return;
    }

    await logActivity(
      selectedPage ? "update_page" : "create_page",
      "pages",
      selectedPage?.id ? String(selectedPage.id) : payload.slug,
      selectedPage ? JSON.stringify(selectedPage) : "",
      JSON.stringify(payload)
    );

    clearForm();
    showSuccess(selectedPage ? "تم تحديث الصفحة بنجاح." : "تمت إضافة الصفحة بنجاح.");
    await loadPages();
  }

  async function togglePage(page: PageItem, field: "is_published" | "is_homepage") {
    if (!supabase) {
      showError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setMessage("");
    setError("");

    const nextValue = !Boolean(page[field]);

    if (field === "is_homepage" && nextValue) {
      await supabase
        .from("pages")
        .update({ is_homepage: false, updated_at: new Date().toISOString() })
        .neq("id", page.id);
    }

    const { error } = await supabase
      .from("pages")
      .update({
        [field]: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);

    if (error) {
      showError("فشل تحديث حالة الصفحة. تحقق من صلاحيات جدول pages.");
      return;
    }

    await logActivity(
      field === "is_published" ? "toggle_page_publish" : "toggle_homepage",
      "pages",
      String(page.id),
      JSON.stringify(page),
      JSON.stringify({ [field]: nextValue })
    );

    const successText =
      field === "is_published"
        ? nextValue
          ? "تم نشر الصفحة بنجاح."
          : "تم إخفاء الصفحة بنجاح."
        : nextValue
          ? "تم تعيين الصفحة كصفحة رئيسية بنجاح."
          : "تم إلغاء تعيين الصفحة الرئيسية بنجاح.";

    showSuccess(successText);
    await loadPages();
  }

  async function logActivity(
    action: string,
    entityType: string,
    entityId: string,
    oldData: string,
    newData: string
  ) {
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

  if (isCheckingAuth) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white"
      >
        <div className="rounded-[2rem] border border-purple-500/25 bg-black/45 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,0.18)]">
          <div className="mb-3 text-sm font-black tracking-[0.25em] text-yellow-200">
            HAMZA AGENCY
          </div>
          <div className="text-2xl font-black">جاري التحقق من صلاحية الدخول...</div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(135deg,rgba(212,175,55,0.07),transparent_30%,rgba(124,58,237,0.09)_70%,transparent)]" />

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-purple-500/20 bg-black/40 p-6 shadow-[0_0_80px_rgba(124,58,237,0.14)] backdrop-blur-xl md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-4 py-2 text-sm font-bold text-purple-100">
                  Core CMS Foundation
                </span>
                <span className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-4 py-2 text-sm font-bold text-yellow-100">
                  أساس Page Builder
                </span>
              </div>

              <h1 className="text-4xl font-black leading-tight md:text-5xl">
                إدارة الصفحات
              </h1>
              <p className="mt-4 max-w-3xl leading-8 text-white/62">
                مركز إدارة صفحات HAMZA AGENCY، حالة النشر، الصفحة الرئيسية،
                ترتيب الصفحات، ومعلومات SEO. هذه الصفحة هي الأساس الذي سنبني
                فوقه إدارة الأقسام والـ Page Builder.
              </p>
              <p className="mt-3 text-sm text-white/45">الأدمن: {adminEmail}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={loadPages}
                disabled={isLoading}
                className="rounded-2xl border border-purple-300/25 bg-purple-500/10 px-5 py-3 font-black text-purple-100 transition hover:bg-purple-500/15 disabled:opacity-60"
              >
                {isLoading ? "جاري التحديث..." : "تحديث الصفحات"}
              </button>
              <Link
                href="/admin"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center font-bold text-white/80 transition hover:bg-white/10"
              >
                العودة للوحة التحكم
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-bold text-red-100 transition hover:bg-red-500/20"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard title="كل الصفحات" value={stats.total} tone="purple" />
          <StatCard title="منشورة" value={stats.published} tone="green" />
          <StatCard title="غير منشورة" value={stats.draft} tone="yellow" />
          <StatCard title="تحتاج SEO" value={stats.needsSeo} tone="blue" />
          <StatCard title="صفحات أساسية ناقصة" value={stats.missingCorePages} tone="red" />
        </section>

        {(message || error) && (
          <section
            className={`mb-6 rounded-3xl border p-5 font-bold leading-8 ${
              error
                ? "border-red-400/25 bg-red-500/10 text-red-100"
                : "border-green-400/25 bg-green-500/10 text-green-100"
            }`}
          >
            {error || message}
          </section>
        )}

        <section className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/40 p-5 shadow-[0_0_70px_rgba(124,58,237,0.1)] backdrop-blur md:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <h2 className="text-3xl font-black">
                {selectedPage ? "تعديل صفحة" : "إضافة صفحة جديدة"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/52">
                اكتب بيانات الصفحة الأساسية. سيتم استخدام نفس السجل لاحقاً عند
                ربط الأقسام والقوالب داخل Page Builder.
              </p>
            </div>

            {selectedPage && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-bold text-white/75 transition hover:bg-white/10"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={savePage} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="عنوان الصفحة" hint="مثال: من نحن">
                <input
                  value={form.title}
                  onChange={(event) => updateField("title", event.target.value)}
                  placeholder="عنوان الصفحة"
                  className="input-control"
                />
              </Field>

              <Field
                label="رابط الصفحة"
                hint="استخدم أحرفاً إنجليزية مثل about أو contact"
              >
                <input
                  value={form.slug}
                  onChange={(event) => updateField("slug", event.target.value)}
                  placeholder="about"
                  dir="ltr"
                  className="input-control text-left"
                />
              </Field>

              <Field label="SEO Title" hint="عنوان مخصص لمحركات البحث">
                <input
                  value={form.seo_title}
                  onChange={(event) => updateField("seo_title", event.target.value)}
                  placeholder="HAMZA AGENCY | من نحن"
                  className="input-control"
                />
              </Field>

              <Field label="SEO Keywords" hint="كلمات مفصولة بفواصل">
                <input
                  value={form.seo_keywords}
                  onChange={(event) => updateField("seo_keywords", event.target.value)}
                  placeholder="وكالة حمزة, صناع المحتوى"
                  className="input-control"
                />
              </Field>
            </div>

            <Field label="SEO Description" hint="وصف قصير يظهر في نتائج البحث والمشاركة">
              <textarea
                value={form.seo_description}
                onChange={(event) => updateField("seo_description", event.target.value)}
                placeholder="اكتب وصفاً مختصراً وواضحاً للصفحة."
                rows={3}
                className="input-control leading-8"
              />
            </Field>

            <Field label="Open Graph Image URL" hint="رابط صورة المشاركة، ويمكن ربطها لاحقاً بمكتبة الوسائط">
              <input
                value={form.og_image}
                onChange={(event) => updateField("og_image", event.target.value)}
                placeholder="https://..."
                dir="ltr"
                className="input-control text-left"
              />
            </Field>

            <Field label="محتوى الصفحة الأساسي" hint="هذا المحتوى يستخدم كقاعدة قبل ربط الأقسام المتقدمة">
              <textarea
                value={form.content}
                onChange={(event) => updateField("content", event.target.value)}
                placeholder="اكتب محتوى الصفحة الأساسي هنا..."
                rows={7}
                className="input-control leading-8"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
              <Field label="الترتيب" hint="رقم أصغر يعني ظهوراً أعلى في القوائم الإدارية">
                <input
                  value={form.sort_order}
                  onChange={(event) => updateField("sort_order", event.target.value)}
                  type="number"
                  min="1"
                  className="input-control"
                />
              </Field>

              <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 sm:grid-cols-2">
                <ToggleCard
                  title="حالة النشر"
                  description="اجعل الصفحة متاحة للاستخدام العام عند الربط."
                  checked={form.is_published}
                  activeLabel="منشورة"
                  inactiveLabel="غير منشورة"
                  onChange={(value) => updateField("is_published", value)}
                />
                <ToggleCard
                  title="الصفحة الرئيسية"
                  description="يمكن اختيار صفحة واحدة فقط كصفحة رئيسية."
                  checked={form.is_homepage}
                  activeLabel="رئيسية"
                  inactiveLabel="صفحة عادية"
                  onChange={(value) => updateField("is_homepage", value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black text-white shadow-[0_0_35px_rgba(168,85,247,0.22)] transition hover:scale-[1.01] disabled:opacity-60"
              >
                {isSaving ? "جارٍ الحفظ..." : selectedPage ? "حفظ التعديل" : "إضافة الصفحة"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-white/15 bg-white/5 px-6 py-4 font-bold text-white/70 transition hover:bg-white/10"
              >
                تفريغ النموذج
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-purple-500/20 bg-black/40 p-5 shadow-[0_0_70px_rgba(124,58,237,0.1)] backdrop-blur md:p-6">
          <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <h2 className="text-3xl font-black">قائمة الصفحات</h2>
              <p className="mt-2 text-white/55">
                راقب الصفحات الأساسية، حالة النشر، جاهزية SEO، وترتيب المحتوى.
              </p>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالعنوان أو الرابط أو المحتوى..."
              className="input-control"
            />
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                  activeFilter === filter.value
                    ? "border-yellow-300/40 bg-yellow-400/15 text-yellow-100"
                    : "border-white/10 bg-white/[0.04] text-white/62 hover:border-purple-300/35 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="w-full min-w-[1040px]">
              <thead>
                <tr className="border-b border-purple-500/20 bg-white/[0.03] text-sm text-white/55">
                  <th className="p-4 text-right">الصفحة</th>
                  <th className="p-4 text-right">الرابط</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">SEO</th>
                  <th className="p-4 text-right">الترتيب</th>
                  <th className="p-4 text-right">آخر تحديث</th>
                  <th className="p-4 text-right">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-white/50">
                      لا توجد صفحات مطابقة. أضف الصفحات الأساسية أو غيّر الفلتر الحالي.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => {
                    const publicPath = getPublicPath(page.slug);
                    const seoLabel = getSeoLabel(page);

                    return (
                      <tr key={page.id} className="border-b border-white/5 align-top last:border-b-0">
                        <td className="p-4">
                          <div className="font-black text-white">{page.title || "بدون عنوان"}</div>
                          <div className="mt-2 line-clamp-2 max-w-sm text-sm leading-6 text-white/45">
                            {page.content || "لا يوجد محتوى أساسي بعد."}
                          </div>
                          {page.is_homepage && (
                            <span className="mt-3 inline-flex rounded-full border border-yellow-300/25 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-100">
                              الصفحة الرئيسية
                            </span>
                          )}
                        </td>

                        <td className="p-4 font-mono text-sm text-purple-100" dir="ltr">
                          {page.slug || "-"}
                        </td>

                        <td className="p-4">
                          <StatusBadge active={page.is_published !== false} />
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                              seoLabel === "مكتمل"
                                ? "border-green-400/25 bg-green-500/10 text-green-100"
                                : seoLabel === "جزئي"
                                  ? "border-yellow-400/25 bg-yellow-500/10 text-yellow-100"
                                  : "border-red-400/25 bg-red-500/10 text-red-100"
                            }`}
                          >
                            {seoLabel}
                          </span>
                        </td>

                        <td className="p-4 text-white/70">{page.sort_order || 1}</td>
                        <td className="p-4 text-sm text-white/45">
                          {formatDate(page.updated_at || page.created_at)}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => editPage(page)}
                              className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-sm font-bold text-purple-100 transition hover:bg-purple-500/15"
                            >
                              تعديل
                            </button>

                            <button
                              type="button"
                              onClick={() => togglePage(page, "is_published")}
                              className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-sm font-bold text-yellow-100 transition hover:bg-yellow-500/15"
                            >
                              {page.is_published !== false ? "إخفاء" : "نشر"}
                            </button>

                            <button
                              type="button"
                              onClick={() => togglePage(page, "is_homepage")}
                              className="rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm font-bold text-green-100 transition hover:bg-green-500/15"
                            >
                              {page.is_homepage ? "إلغاء الرئيسية" : "اجعلها رئيسية"}
                            </button>

                            <Link
                              href={publicPath}
                              target="_blank"
                              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white/65 transition hover:bg-white/10 hover:text-white"
                            >
                              فتح
                            </Link>
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
            transition: border-color 0.2s ease, background 0.2s ease;
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/78">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs leading-5 text-white/40">{hint}</span>}
    </label>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  activeLabel,
  inactiveLabel,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border p-4 text-right transition ${
        checked
          ? "border-purple-300/35 bg-purple-500/15 text-white"
          : "border-white/10 bg-white/[0.04] text-white/60 hover:border-purple-300/25"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-black">{title}</span>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-bold ${
            checked
              ? "border-green-400/25 bg-green-500/10 text-green-100"
              : "border-white/10 bg-black/25 text-white/45"
          }`}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 opacity-70">{description}</p>
    </button>
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
    <div className={`rounded-3xl border p-5 shadow-[0_0_50px_rgba(0,0,0,0.18)] ${toneClass}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-2 text-sm font-bold opacity-80">{title}</div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full border border-green-400/25 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-100">
      منشورة
    </span>
  ) : (
    <span className="inline-flex rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/55">
      غير منشورة
    </span>
  );
}
