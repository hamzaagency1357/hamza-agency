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

const emptyForm = {
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

export default function AdminPagesPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
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
    if (!supabase) return;

    const { data, error } = await supabase
      .from("pages")
      .select(
        "id, created_at, updated_at, title, slug, content, seo_title, seo_description, seo_keywords, og_image, is_homepage, is_published, sort_order"
      )
      .order("sort_order", { ascending: true });

    if (error) {
      setError("تعذر تحميل الصفحات. تحقق من صلاحيات جدول pages.");
      return;
    }

    setPages(data || []);
  }

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const text = `${page.title || ""} ${page.slug || ""} ${
        page.content || ""
      }`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [pages, search]);

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setSelectedPage(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function editPage(page: PageItem) {
    setSelectedPage(page);

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

  function normalizeSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  }

  async function savePage(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!supabase) return;

    if (!form.title.trim()) {
      setError("يرجى كتابة عنوان الصفحة.");
      return;
    }

    if (!form.slug.trim()) {
      setError("يرجى كتابة رابط الصفحة slug.");
      return;
    }

    setIsSaving(true);

    const payload = {
      title: form.title.trim(),
      slug: normalizeSlug(form.slug),
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
        .update({ is_homepage: false })
        .neq("id", selectedPage?.id || 0);
    }

    const result = selectedPage
      ? await supabase.from("pages").update(payload).eq("id", selectedPage.id)
      : await supabase.from("pages").insert(payload);

    setIsSaving(false);

    if (result.error) {
      setError("فشل حفظ الصفحة. تأكد أن slug غير مكرر وأن الجدول صحيح.");
      return;
    }

    await logActivity(
      selectedPage ? "update_page" : "create_page",
      "pages",
      selectedPage?.id ? String(selectedPage.id) : payload.slug,
      selectedPage ? JSON.stringify(selectedPage) : "",
      JSON.stringify(payload)
    );

    setMessage(selectedPage ? "تم تحديث الصفحة بنجاح." : "تمت إضافة الصفحة بنجاح.");
    resetForm();
    await loadPages();
  }

  async function togglePage(page: PageItem, field: "is_published" | "is_homepage") {
    if (!supabase) return;

    const nextValue = !Boolean(page[field]);

    if (field === "is_homepage" && nextValue) {
      await supabase.from("pages").update({ is_homepage: false }).neq("id", page.id);
    }

    const { error } = await supabase
      .from("pages")
      .update({
        [field]: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", page.id);

    if (error) {
      alert("فشل تحديث حالة الصفحة.");
      return;
    }

    await logActivity(
      field === "is_published" ? "toggle_page_publish" : "toggle_homepage",
      "pages",
      String(page.id),
      JSON.stringify(page),
      JSON.stringify({ [field]: nextValue })
    );

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
        className="flex min-h-screen items-center justify-center bg-[#070009] text-white"
      >
        جاري التحقق من صلاحية الدخول...
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#4c0a77_0%,#09000d_45%,#000_100%)]" />

      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-6 flex flex-col justify-between gap-4 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm text-purple-200">Core CMS Foundation</p>
            <h1 className="text-4xl font-black">إدارة الصفحات</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              من هنا تستطيع إنشاء وتعديل صفحات الموقع وربطها لاحقاً بالواجهة
              العامة، مع إدارة SEO وحالة النشر والترتيب والصفحة الرئيسية.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="rounded-2xl border border-white/15 px-4 py-3 text-white/80"
            >
              العودة للوحة التحكم
            </Link>
            <button
              onClick={logout}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        <form
          onSubmit={savePage}
          className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              {selectedPage ? "تعديل صفحة" : "إضافة صفحة جديدة"}
            </h2>

            {selectedPage && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/15 px-4 py-2 text-white/70"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          {message && (
            <div className="mb-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="عنوان الصفحة مثال: من نحن"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <input
              value={form.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="slug مثال: about"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <input
              value={form.seo_title}
              onChange={(e) => updateField("seo_title", e.target.value)}
              placeholder="SEO Title"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <input
              value={form.seo_keywords}
              onChange={(e) => updateField("seo_keywords", e.target.value)}
              placeholder="SEO Keywords"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <textarea
              value={form.seo_description}
              onChange={(e) => updateField("seo_description", e.target.value)}
              placeholder="SEO Description"
              className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2"
            />

            <input
              value={form.og_image}
              onChange={(e) => updateField("og_image", e.target.value)}
              placeholder="OG Image URL"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2"
            />

            <textarea
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              placeholder="محتوى الصفحة..."
              className="min-h-44 rounded-2xl border border-white/10 bg-black/35 p-4 leading-8 outline-none focus:border-purple-400 md:col-span-2"
            />

            <input
              value={form.sort_order}
              onChange={(e) => updateField("sort_order", e.target.value)}
              placeholder="الترتيب"
              type="number"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => updateField("is_published", e.target.checked)}
                />
                منشورة
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_homepage}
                  onChange={(e) => updateField("is_homepage", e.target.checked)}
                />
                الصفحة الرئيسية
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="mt-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black disabled:opacity-60"
          >
            {isSaving ? "جارٍ الحفظ..." : selectedPage ? "حفظ التعديل" : "إضافة الصفحة"}
          </button>
        </form>

        <div className="rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">قائمة الصفحات</h2>
              <p className="mt-2 text-white/55">
                الصفحات التي ستغذي الموقع العام والـ Page Builder لاحقاً.
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-purple-500/20 text-white/50">
                  <th className="p-3 text-right">العنوان</th>
                  <th className="p-3 text-right">Slug</th>
                  <th className="p-3 text-right">منشورة</th>
                  <th className="p-3 text-right">رئيسية</th>
                  <th className="p-3 text-right">الترتيب</th>
                  <th className="p-3 text-right">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-white/50">
                      لا توجد صفحات حالياً. أضف الصفحة الرئيسية وصفحات الموقع الأساسية.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((page) => (
                    <tr key={page.id} className="border-b border-white/5">
                      <td className="p-3">{page.title}</td>
                      <td className="p-3">{page.slug}</td>
                      <td className="p-3">{page.is_published ? "نعم" : "لا"}</td>
                      <td className="p-3">{page.is_homepage ? "نعم" : "لا"}</td>
                      <td className="p-3">{page.sort_order || 1}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editPage(page)}
                            className="rounded-xl border border-purple-500/30 px-3 py-2 text-sm"
                          >
                            تعديل
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePage(page, "is_published")}
                            className="rounded-xl border border-yellow-500/30 px-3 py-2 text-sm text-yellow-100"
                          >
                            {page.is_published ? "إخفاء" : "نشر"}
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePage(page, "is_homepage")}
                            className="rounded-xl border border-green-500/30 px-3 py-2 text-sm text-green-100"
                          >
                            {page.is_homepage ? "إلغاء الرئيسية" : "اجعلها رئيسية"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
