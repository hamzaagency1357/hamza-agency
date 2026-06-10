"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type GalleryItem = {
  id: number;
  title: string | null;
  slug: string | null;
  category: string | null;
  media_type: string | null;
  description: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  effect_type: string | null;
  external_url: string | null;
  alt_text: string | null;
  button_label: string | null;
  button_url: string | null;
  status: string | null;
  is_visible: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type MediaOption = {
  id: number;
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  alt_text: string | null;
  page_slug: string | null;
  is_active: boolean | null;
};

type AdminProfile = {
  email: string;
  role: string;
  is_active: boolean;
};

type GalleryForm = {
  title: string;
  slug: string;
  category: string;
  media_type: string;
  description: string;
  media_url: string;
  thumbnail_url: string;
  effect_type: string;
  external_url: string;
  alt_text: string;
  button_label: string;
  button_url: string;
  status: string;
  is_visible: boolean;
  is_featured: boolean;
  sort_order: string;
};

const emptyForm: GalleryForm = {
  title: "",
  slug: "",
  category: "معرض الوكالة",
  media_type: "effect",
  description: "",
  media_url: "",
  thumbnail_url: "",
  effect_type: "luxury_waves",
  external_url: "",
  alt_text: "",
  button_label: "معرفة المزيد",
  button_url: "/programs",
  status: "published",
  is_visible: true,
  is_featured: false,
  sort_order: "10",
};

const statusOptions = [
  { value: "published", label: "منشور" },
  { value: "draft", label: "مسودة" },
  { value: "hidden", label: "مخفي" },
];

const mediaTypeOptions = [
  { value: "effect", label: "مؤثر بصري" },
  { value: "image", label: "صورة" },
  { value: "video", label: "فيديو" },
  { value: "external_video", label: "رابط فيديو خارجي" },
];

const effectOptions = [
  { value: "luxury_waves", label: "Luxury Agency Waves" },
  { value: "creator_spotlight", label: "Creator Spotlight Motion" },
  { value: "live_pulse", label: "Live Streaming Pulse" },
  { value: "program_network", label: "Golden Program Network" },
  { value: "digital_glow", label: "Digital Services Glow" },
];

const inputClassName =
  "w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-white outline-none transition placeholder:text-white/30 focus:border-purple-300/50";

function isMediaPickerOption(item: MediaOption) {
  const url = item.file_url || "";
  const fileType = (item.file_type || "").toLowerCase();
  const isRealUrl = url.startsWith("http") || url.startsWith("/");
  const isAllowedType = ["image", "logo", "video", "background_video"].includes(fileType);
  return item.is_active !== false && isRealUrl && isAllowedType;
}

function isVideoMedia(item: MediaOption) {
  return item.file_type === "video" || item.file_type === "background_video";
}

export default function AdminGalleryPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [mediaOptions, setMediaOptions] = useState<MediaOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mediaFilter, setMediaFilter] = useState("all");

  const [form, setForm] = useState<GalleryForm>(emptyForm);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  useEffect(() => {
    initializeAdminPage();
  }, []);

  async function initializeAdminPage() {
    setChecking(true);
    setMessage("");

    try {
      if (!supabase) {
        setAuthorized(false);
        setMessageType("error");
        setMessage("تعذر الاتصال بقاعدة البيانات. يرجى مراجعة إعدادات Supabase.");
        return;
      }

      const access = await requireAdminModuleAccess("gallery");

      if (!access.isAuthorized || !access.profile) {
        if (access.reason === "not_signed_in" || access.reason === "not_admin") {
          window.location.href = "/admin/login";
          return;
        }

        setAuthorized(false);
        setMessageType("error");
        setMessage("هذا الحساب غير مخول للوصول إلى لوحة الإدارة.");
        return;
      }

      setAdminProfile({
        email: access.profile.email,
        role: access.profile.role,
        is_active: access.profile.is_active,
      });
      setAuthorized(true);
      await Promise.all([loadItems(), loadMediaOptions()]);
    } catch {
      setAuthorized(false);
      setMessageType("error");
      setMessage("حدث خطأ أثناء التحقق من صلاحيات الدخول.");
    } finally {
      setChecking(false);
    }
  }

  async function loadItems() {
    if (!supabase) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        setMessageType("error");
        setMessage("تعذر تحميل عناصر المعرض حالياً.");
        return;
      }

      setItems((data || []) as GalleryItem[]);
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء تحميل عناصر المعرض.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMediaOptions() {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("media")
        .select("id, name, file_url, file_type, category, alt_text, page_slug, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error || !data) {
        setMediaOptions([]);
        return;
      }

      setMediaOptions((data as MediaOption[]).filter(isMediaPickerOption));
    } catch {
      setMediaOptions([]);
    }
  }

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.title?.toLowerCase().includes(normalizedSearch) ||
        item.slug?.toLowerCase().includes(normalizedSearch) ||
        item.category?.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesMedia = mediaFilter === "all" || item.media_type === mediaFilter;

      return matchesSearch && matchesStatus && matchesMedia;
    });
  }, [items, search, statusFilter, mediaFilter]);

  const stats = useMemo(() => {
    const total = items.length;
    const visible = items.filter(
      (item) => item.is_visible !== false && item.status === "published"
    ).length;
    const featured = items.filter((item) => item.is_featured).length;
    const hidden = items.filter(
      (item) => item.is_visible === false || item.status === "hidden"
    ).length;

    return { total, visible, featured, hidden };
  }, [items]);

  function updateForm<K extends keyof GalleryForm>(key: K, value: GalleryForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function generateSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function handleTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: editingItem || current.slug.trim() ? current.slug : generateSlug(value),
    }));
  }

  function chooseMediaOption(item: MediaOption, target: "media" | "thumbnail") {
    const url = item.file_url || "";
    if (!url) return;

    if (target === "thumbnail") {
      setForm((current) => ({
        ...current,
        thumbnail_url: url,
        alt_text: current.alt_text || item.alt_text || item.name || "",
      }));
      return;
    }

    const nextMediaType = isVideoMedia(item) ? "video" : "image";

    setForm((current) => ({
      ...current,
      media_type: nextMediaType,
      media_url: url,
      thumbnail_url: nextMediaType === "image" ? url : current.thumbnail_url,
      title: current.title || item.name || "",
      slug: current.slug || generateSlug(item.name || "gallery-item"),
      category: current.category || item.category || "معرض الوكالة",
      alt_text: current.alt_text || item.alt_text || item.name || "",
    }));
  }

  function startEdit(item: GalleryItem) {
    setEditingItem(item);
    setForm({
      title: item.title || "",
      slug: item.slug || "",
      category: item.category || "معرض الوكالة",
      media_type: item.media_type || "effect",
      description: item.description || "",
      media_url: item.media_url || "",
      thumbnail_url: item.thumbnail_url || "",
      effect_type: item.effect_type || "luxury_waves",
      external_url: item.external_url || "",
      alt_text: item.alt_text || "",
      button_label: item.button_label || "معرفة المزيد",
      button_url: item.button_url || "/programs",
      status: item.status || "published",
      is_visible: item.is_visible !== false,
      is_featured: item.is_featured === true,
      sort_order: String(item.sort_order ?? 10),
    });
    setMessageType("info");
    setMessage("يمكنك الآن تعديل عنصر المعرض المحدد.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm(clearMessage = true) {
    setEditingItem(null);
    setForm(emptyForm);
    if (clearMessage) setMessage("");
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || saving) return;

    const title = form.title.trim();
    const slug = form.slug.trim() || generateSlug(title);

    if (!title) {
      setMessageType("error");
      setMessage("يرجى إدخال عنوان عنصر المعرض.");
      return;
    }

    if (!slug) {
      setMessageType("error");
      setMessage("يرجى إدخال رابط تعريفي صحيح للعنصر.");
      return;
    }

    if (!form.description.trim()) {
      setMessageType("error");
      setMessage("يرجى إدخال وصف مناسب لعنصر المعرض.");
      return;
    }

    if (form.media_type === "image" && !form.media_url.trim()) {
      setMessageType("error");
      setMessage("يرجى إدخال رابط الصورة أو اختيار صورة من Media Library.");
      return;
    }

    if (form.media_type === "video" && !form.media_url.trim()) {
      setMessageType("error");
      setMessage("يرجى إدخال رابط الفيديو أو اختيار فيديو من Media Library.");
      return;
    }

    if (form.media_type === "external_video" && !form.external_url.trim()) {
      setMessageType("error");
      setMessage("يرجى إدخال رابط الفيديو الخارجي.");
      return;
    }

    setSaving(true);
    setMessage("");

    const mediaUrl = form.media_url.trim();
    const thumbnailUrl = form.thumbnail_url.trim();
    const externalUrl = form.external_url.trim();

    const payload = {
      title,
      slug,
      category: form.category.trim() || "معرض الوكالة",
      media_type: form.media_type,
      description: form.description.trim(),
      media_url: mediaUrl || null,
      thumbnail_url: thumbnailUrl || null,
      effect_type: form.media_type === "effect" ? form.effect_type : null,
      external_url: externalUrl || null,
      alt_text: form.alt_text.trim() || title,
      button_label: form.button_label.trim() || "معرفة المزيد",
      button_url: form.button_url.trim() || "/programs",
      status: form.status,
      is_visible: form.is_visible,
      is_featured: form.is_featured,
      sort_order: Number.parseInt(form.sort_order, 10) || 10,
      metadata: {
        managed_from: "admin_gallery",
        performance_note: form.media_type === "effect" ? "code_visual" : "media_with_cover",
      },
      updated_at: new Date().toISOString(),
    };

    try {
      let successText = "";

      if (editingItem) {
        const { error } = await supabase.from("gallery_items").update(payload).eq("id", editingItem.id);

        if (error) {
          setMessageType("error");
          setMessage("تعذر حفظ تعديلات عنصر المعرض.");
          return;
        }

        successText = "تم حفظ تعديلات عنصر المعرض بنجاح.";
      } else {
        const { error } = await supabase.from("gallery_items").insert(payload);

        if (error) {
          setMessageType("error");
          setMessage("تعذر إضافة عنصر المعرض. تأكد أن الرابط التعريفي غير مستخدم مسبقاً.");
          return;
        }

        successText = "تمت إضافة عنصر المعرض بنجاح.";
      }

      resetForm(false);
      await loadItems();

      setMessageType("success");
      setMessage(successText);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء حفظ عنصر المعرض.");
    } finally {
      setSaving(false);
    }
  }

  async function updateVisibility(item: GalleryItem, visible: boolean) {
    if (!supabase) return;

    const nextStatus = visible ? "published" : "hidden";

    try {
      const { error } = await supabase
        .from("gallery_items")
        .update({ is_visible: visible, status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) {
        setMessageType("error");
        setMessage("تعذر تحديث حالة الظهور.");
        return;
      }

      setMessageType("success");
      setMessage(visible ? "تم إظهار عنصر المعرض." : "تم إخفاء عنصر المعرض.");
      await loadItems();
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء تحديث حالة الظهور.");
    }
  }

  async function toggleFeatured(item: GalleryItem) {
    if (!supabase) return;

    const nextValue = !item.is_featured;

    try {
      const { error } = await supabase
        .from("gallery_items")
        .update({ is_featured: nextValue, updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (error) {
        setMessageType("error");
        setMessage("تعذر تحديث تمييز عنصر المعرض.");
        return;
      }

      setMessageType("success");
      setMessage(nextValue ? "تم تمييز عنصر المعرض." : "تم إلغاء التمييز.");
      await loadItems();
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء تحديث التمييز.");
    }
  }

  async function archiveItem(item: GalleryItem) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `هل تريد حذف ${item.title} من الواجهة؟ سيتم إخفاؤه وأرشفته بدون مسح نهائي.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("gallery_items")
        .update({
          title: item.title?.startsWith("محذوف -") ? item.title : `محذوف - ${item.title}`,
          status: "hidden",
          is_visible: false,
          is_featured: false,
          sort_order: 9999,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) {
        setMessageType("error");
        setMessage("تعذر حذف عنصر المعرض بشكل آمن.");
        return;
      }

      if (editingItem?.id === item.id) resetForm(false);

      setMessageType("success");
      setMessage("تم إخفاء عنصر المعرض وأرشفته بأمان.");
      await loadItems();
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء حذف عنصر المعرض بشكل آمن.");
    }
  }

  function getStatusLabel(status: string | null | undefined) {
    return statusOptions.find((option) => option.value === status)?.label || "غير محدد";
  }

  function getMediaTypeLabel(mediaType: string | null | undefined) {
    return mediaTypeOptions.find((option) => option.value === mediaType)?.label || "غير محدد";
  }

  function getPublicState(item: GalleryItem) {
    return item.is_visible !== false && item.status === "published" ? "ظاهر للعامة" : "غير ظاهر";
  }

  if (checking) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white">
        <div className="rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-purple-300/20 border-t-purple-300" />
          <h1 className="text-2xl font-black">جاري التحقق من صلاحيات الإدارة</h1>
          <p className="mt-3 text-white/60">يرجى الانتظار لحظات قليلة.</p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white">
        <div className="max-w-xl rounded-[2rem] border border-red-400/20 bg-red-500/10 p-8 text-center shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-black text-red-100">غير مصرح بالدخول</h1>
          <p className="mt-4 leading-8 text-white/70">
            {message || "يرجى تسجيل الدخول بحساب إداري مخول للوصول إلى هذه الصفحة."}
          </p>
          <Link href="/admin/login" className="mt-7 inline-flex rounded-full bg-purple-600 px-8 py-3 font-black text-white">
            الانتقال إلى تسجيل الدخول
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="relative min-h-screen overflow-hidden bg-[#070009] px-4 py-8 text-white md:px-8">
      <AdminBackground />

      {message && (
        <div
          className={`fixed left-4 right-4 top-4 z-50 rounded-3xl border p-4 text-center text-sm font-black shadow-2xl backdrop-blur md:left-auto md:right-8 md:top-8 md:max-w-xl ${
            messageType === "success"
              ? "border-green-400/30 bg-green-500/15 text-green-100"
              : messageType === "error"
                ? "border-red-400/30 bg-red-500/15 text-red-100"
                : "border-purple-400/30 bg-purple-500/15 text-purple-100"
          }`}
        >
          {message}
        </div>
      )}

      <section className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/admin" className="text-sm font-bold text-purple-200">
              ← العودة إلى لوحة التحكم
            </Link>
            <h1 className="mt-4 text-4xl font-black md:text-5xl">إدارة معرض الوكالة</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              تحكم بالعناصر الظاهرة في صفحة المعرض، مع إمكانية إضافة مؤثرات بصرية، صور، فيديوهات، روابط خارجية، صور غلاف، وترتيب الظهور.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/60">
            <div>الحساب الإداري</div>
            <div className="mt-1 font-black text-white">{adminProfile?.email}</div>
            <div className="mt-1 text-purple-200">{adminProfile?.role}</div>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard label="إجمالي العناصر" value={stats.total} />
          <StatCard label="ظاهر للعامة" value={stats.visible} />
          <StatCard label="مميز" value={stats.featured} />
          <StatCard label="مخفي" value={stats.hidden} />
        </div>

        <section className="mb-10 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">{editingItem ? "تعديل عنصر في المعرض" : "إضافة عنصر للمعرض"}</h2>
              <p className="mt-2 text-sm leading-7 text-white/55">
                اختر نوع العنصر المناسب، ويمكنك اختيار الصور والفيديوهات وصور الغلاف مباشرة من Media Library.
              </p>
            </div>

            {editingItem && (
              <button
                type="button"
                onClick={() => resetForm()}
                className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white/75"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={saveItem} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="عنوان العنصر">
                <input value={form.title} onChange={(event) => handleTitleChange(event.target.value)} className={inputClassName} placeholder="مثال: هوية وكالة حمزة" />
              </Field>

              <Field label="الرابط التعريفي Slug">
                <input value={form.slug} onChange={(event) => updateForm("slug", generateSlug(event.target.value))} className={inputClassName} placeholder="مثال: hamza-agency-identity" dir="ltr" />
              </Field>

              <Field label="التصنيف">
                <input value={form.category} onChange={(event) => updateForm("category", event.target.value)} className={inputClassName} placeholder="مثال: هوية الوكالة" />
              </Field>

              <Field label="نوع العنصر">
                <select value={form.media_type} onChange={(event) => updateForm("media_type", event.target.value)} className={inputClassName}>
                  {mediaTypeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              {form.media_type === "effect" && (
                <Field label="نوع المؤثر البصري">
                  <select value={form.effect_type} onChange={(event) => updateForm("effect_type", event.target.value)} className={inputClassName}>
                    {effectOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-black">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {form.media_type !== "effect" && (
                <Field label="رابط الوسائط من Media Library أو رابط يدوي">
                  <div className="grid gap-3">
                    <input value={form.media_url} onChange={(event) => updateForm("media_url", event.target.value)} className={inputClassName} placeholder="رابط الصورة أو الفيديو" dir="ltr" />
                    <select
                      value=""
                      onChange={(event) => {
                        const selected = mediaOptions.find((item) => String(item.id) === event.target.value);
                        if (selected) chooseMediaOption(selected, "media");
                      }}
                      className={inputClassName}
                    >
                      <option value="" className="bg-black">اختر وسائط من Media Library</option>
                      {mediaOptions.map((item) => (
                        <option key={item.id} value={item.id} className="bg-black">
                          {item.name || item.alt_text || item.file_url} · {item.file_type || "media"}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              )}

              {(form.media_type === "video" || form.media_type === "external_video") && (
                <Field label="رابط صورة الغلاف من Media Library أو رابط يدوي">
                  <div className="grid gap-3">
                    <input value={form.thumbnail_url} onChange={(event) => updateForm("thumbnail_url", event.target.value)} className={inputClassName} placeholder="رابط صورة غلاف خفيفة" dir="ltr" />
                    <select
                      value=""
                      onChange={(event) => {
                        const selected = mediaOptions.find((item) => String(item.id) === event.target.value);
                        if (selected) chooseMediaOption(selected, "thumbnail");
                      }}
                      className={inputClassName}
                    >
                      <option value="" className="bg-black">اختر صورة غلاف من Media Library</option>
                      {mediaOptions.filter((item) => !isVideoMedia(item)).map((item) => (
                        <option key={item.id} value={item.id} className="bg-black">
                          {item.name || item.alt_text || item.file_url}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              )}

              {form.media_type === "external_video" && (
                <Field label="رابط الفيديو الخارجي">
                  <input value={form.external_url} onChange={(event) => updateForm("external_url", event.target.value)} className={inputClassName} placeholder="https://..." dir="ltr" />
                </Field>
              )}

              <Field label="النص البديل للصورة">
                <input value={form.alt_text} onChange={(event) => updateForm("alt_text", event.target.value)} className={inputClassName} placeholder="وصف مختصر مناسب للوسائط" />
              </Field>

              <Field label="نص الزر">
                <input value={form.button_label} onChange={(event) => updateForm("button_label", event.target.value)} className={inputClassName} placeholder="مثال: تصفح البرامج" />
              </Field>

              <Field label="رابط الزر">
                <input value={form.button_url} onChange={(event) => updateForm("button_url", event.target.value)} className={inputClassName} placeholder="/programs" dir="ltr" />
              </Field>

              <Field label="ترتيب الظهور">
                <input value={form.sort_order} onChange={(event) => updateForm("sort_order", event.target.value)} className={inputClassName} type="number" min="0" />
              </Field>

              <Field label="حالة النشر">
                <select value={form.status} onChange={(event) => updateForm("status", event.target.value)} className={inputClassName}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-black">
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-4">
                <label className="flex items-center justify-between gap-4">
                  <span className="font-black text-white/75">ظاهر للعامة</span>
                  <input type="checkbox" checked={form.is_visible} onChange={(event) => updateForm("is_visible", event.target.checked)} className="h-5 w-5" />
                </label>

                <label className="flex items-center justify-between gap-4">
                  <span className="font-black text-white/75">عنصر مميز</span>
                  <input type="checkbox" checked={form.is_featured} onChange={(event) => updateForm("is_featured", event.target.checked)} className="h-5 w-5" />
                </label>
              </div>
            </div>

            {(form.media_url || form.thumbnail_url) && (
              <div className="rounded-3xl border border-purple-400/20 bg-purple-500/10 p-4">
                <div className="mb-3 text-sm font-black text-purple-100">معاينة الوسائط المختارة</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {form.media_url && <PreviewUrl url={form.media_url} label="الوسيط الأساسي" />}
                  {form.thumbnail_url && <PreviewUrl url={form.thumbnail_url} label="صورة الغلاف" />}
                </div>
              </div>
            )}

            <Field label="الوصف الظاهر للزائر">
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} className={`${inputClassName} min-h-32 resize-y leading-8`} placeholder="اكتب وصفاً تسويقياً مناسباً للظهور في صفحة المعرض." />
            </Field>

            <div className="flex flex-col gap-3 md:flex-row">
              <button type="submit" disabled={saving} className="rounded-full bg-purple-600 px-8 py-4 font-black text-white shadow-2xl disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "جاري الحفظ..." : editingItem ? "حفظ التعديلات" : "إضافة عنصر المعرض"}
              </button>

              <button type="button" onClick={() => resetForm()} className="rounded-full border border-white/10 bg-white/[0.05] px-8 py-4 font-black text-white/75">
                تفريغ النموذج
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">قائمة عناصر المعرض</h2>
              <p className="mt-2 text-sm leading-7 text-white/55">يمكنك البحث والتصفية ثم تعديل أي عنصر من القائمة.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClassName} placeholder="بحث بالعنوان أو التصنيف" />

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClassName}>
                <option value="all" className="bg-black">كل الحالات</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-black">{option.label}</option>
                ))}
              </select>

              <select value={mediaFilter} onChange={(event) => setMediaFilter(event.target.value)} className={inputClassName}>
                <option value="all" className="bg-black">كل الأنواع</option>
                {mediaTypeOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-black">{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-white/60">جاري تحميل البيانات...</div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center">
              <h3 className="text-xl font-black">لا توجد نتائج مطابقة</h3>
              <p className="mt-3 text-white/55">جرّب تغيير كلمات البحث أو حالة التصفية.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredItems.map((item) => (
                <article key={item.id} className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
                  <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                    <div>
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge>{getStatusLabel(item.status)}</Badge>
                        <Badge>{getPublicState(item)}</Badge>
                        <Badge>{getMediaTypeLabel(item.media_type)}</Badge>
                        {item.is_featured && <Badge>مميز</Badge>}
                        <Badge>ترتيب {item.sort_order ?? 0}</Badge>
                      </div>

                      <div className="flex items-start gap-4">
                        <PreviewBox item={item} />

                        <div>
                          <h3 className="text-2xl font-black">{item.title}</h3>
                          <p className="mt-1 text-sm font-bold text-yellow-100/80">{item.category || "معرض الوكالة"}</p>
                          <p className="mt-4 leading-8 text-white/65">{item.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Link href="/gallery" className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-black text-white/75">
                        فتح صفحة المعرض
                      </Link>

                      <button onClick={() => startEdit(item)} className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-black text-purple-100">تعديل</button>

                      <button onClick={() => toggleFeatured(item)} className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-100">
                        {item.is_featured ? "إلغاء التمييز" : "تمييز"}
                      </button>

                      <button onClick={() => updateVisibility(item, item.is_visible === false || item.status === "hidden")} className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100">
                        {item.is_visible === false || item.status === "hidden" ? "إظهار" : "إخفاء"}
                      </button>

                      <button onClick={() => archiveItem(item)} className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">
                        حذف آمن
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function PreviewBox({ item }: { item: GalleryItem }) {
  const label =
    item.media_type === "image" ? "صورة" : item.media_type === "video" ? "فيديو" : item.media_type === "external_video" ? "رابط" : "مؤثر";

  if (item.thumbnail_url || item.media_url) {
    return (
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl border border-purple-400/20 bg-purple-500/10">
        <img src={item.thumbnail_url || item.media_url || ""} alt={item.alt_text || item.title || "عنصر من المعرض"} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-purple-400/20 bg-purple-500/10 text-sm font-black text-yellow-100">
      {label}
    </div>
  );
}

function PreviewUrl({ url, label }: { url: string; label: string }) {
  const isVideo = /\.(mp4|webm|mov|m4v)$/i.test(url);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-3">
      <div className="mb-2 text-xs font-black text-white/50">{label}</div>
      {isVideo ? (
        <video src={url} controls className="h-40 w-full rounded-xl object-contain" />
      ) : (
        <img src={url} alt={label} className="h-40 w-full rounded-xl object-contain" />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm font-black text-white/70">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 text-center backdrop-blur">
      <div className="text-4xl font-black text-yellow-100">{value}</div>
      <div className="mt-2 text-sm font-bold text-white/55">{label}</div>
    </div>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-white/70">{children}</span>
  );
}

function AdminBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.11)_0%,rgba(124,58,237,0.2)_32%,rgba(7,0,9,0.98)_72%)]" />
      <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-purple-600/12 blur-3xl" />
      <div className="absolute -right-24 top-52 h-96 w-96 rounded-full bg-yellow-400/8 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.045] [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:48px_48px]" />
    </div>
  );
}
