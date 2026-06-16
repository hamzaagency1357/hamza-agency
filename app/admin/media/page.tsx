"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { moveRecordToTrash } from "@/lib/adminTrash";

type MediaItem = {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  alt_text: string | null;
  page_slug: string | null;
  is_active: boolean | null;
  uploaded_by: string | null;
};

type MediaForm = {
  name: string;
  file_url: string;
  file_type: string;
  category: string;
  alt_text: string;
  page_slug: string;
  is_active: boolean;
};

const MEDIA_BUCKET = "media-library";
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

const emptyForm: MediaForm = {
  name: "",
  file_url: "",
  file_type: "image",
  category: "general",
  alt_text: "",
  page_slug: "",
  is_active: true,
};

const fileTypeLabels: Record<string, string> = {
  image: "صورة",
  video: "فيديو",
  logo: "شعار",
  background_video: "فيديو خلفية",
  generated_background: "خلفية برمجية",
  document: "ملف",
  icon: "أيقونة",
};

const categoryLabels: Record<string, string> = {
  general: "عام",
  logo: "الشعارات العامة",
  "program-logo": "شعارات البرامج",
  background: "الخلفيات",
  section_visual: "صور الأقسام",
  programs: "البرامج",
  services: "الخدمات",
  seo: "SEO / Open Graph",
  legal: "الصفحات القانونية",
  gallery: "المعرض",
};

const programSlugOptions = [
  { slug: "tiktok", label: "TikTok" },
  { slug: "bigo-live", label: "BIGO LIVE" },
  { slug: "yaahlan", label: "Yaahlan" },
  { slug: "xena", label: "Xena" },
  { slug: "catchii", label: "Catchii" },
];

const defaultMedia = [
  {
    name: "HAMZA AGENCY Luxury Logo",
    file_url: "generated://hamza-agency-luxury-logo",
    file_type: "generated_background",
    category: "logo",
    alt_text: "شعار وكالة حمزة الفاخر",
    page_slug: "global",
    is_active: true,
  },
  {
    name: "Homepage Purple Neon Background",
    file_url: "generated://luxury-purple-neon",
    file_type: "generated_background",
    category: "background",
    alt_text: "خلفية متحركة فاخرة للصفحة الرئيسية",
    page_slug: "home",
    is_active: true,
  },
  {
    name: "Programs Dynamic Background",
    file_url: "generated://programs-floating-orbs",
    file_type: "generated_background",
    category: "background",
    alt_text: "خلفية متحركة لصفحة البرامج",
    page_slug: "programs",
    is_active: true,
  },
];

export default function AdminMediaPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [form, setForm] = useState<MediaForm>(emptyForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function checkAdminAccess() {
      const access = await requireAdminModuleAccess("media");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
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
    if (isAuthorized) loadMedia();
  }, [isAuthorized]);

  async function loadMedia() {
    if (!supabase) return;

    setError("");
    const { data, error: loadError } = await supabase
      .from("media")
      .select("id, created_at, updated_at, name, file_url, file_type, category, alt_text, page_slug, is_active, uploaded_by")
      .order("created_at", { ascending: false });

    if (loadError) {
      setError("تعذر تحميل مكتبة الوسائط. يرجى مراجعة صلاحيات جدول media.");
      return;
    }

    setMediaItems((data || []) as MediaItem[]);
  }

  const categories = useMemo(() => {
    return ["all", ...Array.from(new Set(mediaItems.map((item) => item.category || "general")))];
  }, [mediaItems]);

  const filteredMedia = useMemo(() => {
    return mediaItems.filter((item) => {
      const categoryMatch = activeCategory === "all" || item.category === activeCategory;
      const text = `${item.name || ""} ${item.file_url || ""} ${item.file_type || ""} ${item.category || ""} ${item.alt_text || ""} ${item.page_slug || ""}`.toLowerCase();
      return categoryMatch && text.includes(search.toLowerCase());
    });
  }, [mediaItems, activeCategory, search]);

  const activeCount = mediaItems.filter((item) => item.is_active !== false).length;
  const inactiveCount = mediaItems.filter((item) => item.is_active === false).length;
  const generatedCount = mediaItems.filter((item) => item.file_type === "generated_background").length;
  const realFilesCount = mediaItems.length - generatedCount;

  function showSuccess(text: string) {
    setError("");
    setMessage(text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showError(text: string) {
    setMessage("");
    setError(text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateField(key: keyof MediaForm, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setSelectedMedia(null);
    setSelectedFile(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function editMedia(item: MediaItem) {
    setSelectedMedia(item);
    setSelectedFile(null);
    setForm({
      name: item.name || "",
      file_url: item.file_url || "",
      file_type: item.file_type || "image",
      category: item.category || "general",
      alt_text: item.alt_text || "",
      page_slug: item.page_slug || "",
      is_active: item.is_active !== false,
    });
    setMessage(`أنت الآن تعدّل الوسيط: ${item.name || "بدون اسم"}`);
  }

  function handleFileSelect(file: File | null) {
    setSelectedFile(file);
    setMessage("");
    setError("");

    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE) {
      setSelectedFile(null);
      showError("حجم الملف كبير. الحد الحالي 50MB للرفع من لوحة التحكم.");
      return;
    }

    const detectedType = detectFileType(file);
    setForm((current) => ({
      ...current,
      name: current.name || cleanNameFromFile(file.name),
      file_type: current.category === "program-logo" ? "logo" : detectedType,
      category: detectCategory(detectedType, current.category),
      alt_text: current.alt_text || cleanNameFromFile(file.name),
    }));
  }

  async function uploadSelectedFile() {
    if (!supabase || !selectedFile) return form.file_url.trim();

    const safePath = buildStoragePath(selectedFile, form.category, form.page_slug);
    const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(safePath, selectedFile, {
      cacheControl: "31536000",
      upsert: false,
      contentType: selectedFile.type || undefined,
    });

    if (uploadError) {
      throw new Error("فشل رفع الملف إلى Supabase Storage. تأكد من وجود bucket باسم media-library ومن صلاحيات الرفع للأدمن.");
    }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(safePath);
    return data.publicUrl;
  }

  async function saveDefaultMedia() {
    if (!supabase) return;

    setIsSavingDefaults(true);
    const existingNames = new Set(mediaItems.map((item) => item.name || ""));
    const missingDefaults = defaultMedia
      .filter((item) => !existingNames.has(item.name))
      .map((item) => ({ ...item, uploaded_by: adminEmail, updated_at: new Date().toISOString() }));

    if (missingDefaults.length === 0) {
      setIsSavingDefaults(false);
      showSuccess("كل الوسائط الافتراضية موجودة مسبقاً.");
      return;
    }

    const { error: insertError } = await supabase.from("media").insert(missingDefaults);
    setIsSavingDefaults(false);

    if (insertError) {
      showError("فشل إنشاء الوسائط الافتراضية. يرجى مراجعة صلاحيات جدول media.");
      return;
    }

    await logActivity("seed_default_media", "media", "default_media", "", JSON.stringify(missingDefaults));
    showSuccess("تم إنشاء الوسائط الافتراضية بنجاح.");
    await loadMedia();
  }

  async function saveMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setMessage("");
    setError("");

    if (!form.name.trim()) {
      showError("يرجى كتابة اسم الوسيط.");
      return;
    }

    if (!selectedFile && !form.file_url.trim()) {
      showError("يرجى اختيار ملف للرفع أو إضافة رابط ملف جاهز.");
      return;
    }

    setIsSaving(true);
    let finalFileUrl = form.file_url.trim();

    try {
      finalFileUrl = await uploadSelectedFile();
    } catch (uploadError) {
      setIsSaving(false);
      showError(uploadError instanceof Error ? uploadError.message : "فشل رفع الملف.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      file_url: finalFileUrl,
      file_type: form.file_type.trim(),
      category: form.category.trim() || "general",
      alt_text: form.alt_text.trim(),
      page_slug: form.page_slug.trim(),
      is_active: form.is_active,
      uploaded_by: adminEmail,
      updated_at: new Date().toISOString(),
    };

    const result = selectedMedia
      ? await supabase.from("media").update(payload).eq("id", selectedMedia.id)
      : await supabase.from("media").insert(payload);

    setIsSaving(false);

    if (result.error) {
      showError("فشل حفظ الوسيط. تحقق من صلاحيات جدول media.");
      return;
    }

    await logActivity(
      selectedMedia ? "update_media" : "create_media",
      "media",
      selectedMedia?.id ? String(selectedMedia.id) : payload.name,
      selectedMedia ? JSON.stringify(selectedMedia) : "",
      JSON.stringify(payload)
    );

    resetForm();
    showSuccess(selectedMedia ? "تم تحديث الوسيط بنجاح." : "تم رفع الوسيط وحفظه في مكتبة الوسائط بنجاح.");
    await loadMedia();
  }

  async function toggleMedia(item: MediaItem) {
    if (!supabase) return;

    const nextValue = !Boolean(item.is_active !== false);
    const { error: updateError } = await supabase
      .from("media")
      .update({ is_active: nextValue, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (updateError) {
      showError("فشل تحديث حالة الوسيط.");
      return;
    }

    await logActivity("toggle_media", "media", String(item.id), JSON.stringify(item), JSON.stringify({ is_active: nextValue }));
    showSuccess(nextValue ? "تم تفعيل الوسيط بنجاح." : "تم تعطيل الوسيط بنجاح.");
    await loadMedia();
  }

  async function archiveMedia(item: MediaItem) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `هل تريد حذف الوسيط من الواجهة: ${item.name || "بدون اسم"}؟ سيتم حفظ نسخة في السلة ثم تعطيله وأرشفته بدون مسح نهائي.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const trashResult = await moveRecordToTrash({
      supabase: supabase as any,
      tableName: "media",
      recordId: item.id,
      title: item.name || "وسيط بدون اسم",
      record: { ...item },
      adminEmail,
      reason: "Media item archived from Media Library",
    });

    if (!trashResult.success) {
      showError(`فشل نقل نسخة من الوسيط إلى السلة: ${trashResult.error || "خطأ غير معروف"}. لم يتم أرشفة الوسيط.`);
      return;
    }

    const archivePayload = {
      is_active: false,
      category: item.category ? `${item.category}-archived` : "archived",
      updated_at: new Date().toISOString(),
    };

    const result = await supabase.from("media").update(archivePayload).eq("id", item.id);

    if (result.error) {
      showError("تم حفظ نسخة في السلة، لكن فشل أرشفة الوسيط. تحقق من صلاحيات جدول media.");
      return;
    }

    await logActivity("archive_media", "media", String(item.id), JSON.stringify(item), JSON.stringify(archivePayload));

    if (selectedMedia?.id === item.id) resetForm();

    showSuccess("تم حفظ نسخة من الوسيط في السلة ثم تعطيله وأرشفته بأمان.");
    await loadMedia();
  }

  function copyUrl(url: string | null) {
    if (!url) return;
    navigator.clipboard.writeText(url);
    showSuccess("تم نسخ رابط الوسيط.");
  }

  function canPreviewImage(item: MediaItem) {
    const url = item.file_url || "";
    return (item.file_type === "image" || item.file_type === "logo" || item.file_type === "icon") && (url.startsWith("http") || url.startsWith("/"));
  }

  function canPreviewVideo(item: MediaItem) {
    const url = item.file_url || "";
    return (item.file_type === "video" || item.file_type === "background_video") && (url.startsWith("http") || url.startsWith("/"));
  }

  function canOpenMedia(item: MediaItem) {
    const url = item.file_url || "";
    return url.startsWith("http") || url.startsWith("/");
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

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] text-white">
        جاري التحقق من صلاحية الدخول...
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] px-5 text-white">
        <div className="max-w-xl rounded-3xl border border-red-400/25 bg-red-500/10 p-8 text-center backdrop-blur">
          <div className="text-3xl font-black text-red-100">غير مصرح بالدخول</div>
          <p className="mt-4 leading-8 text-white/65">يجب تسجيل الدخول بحساب إداري يملك صلاحية مكتبة الوسائط.</p>
          {error && <div className="mt-4 rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-4 text-sm font-bold text-yellow-100">{error}</div>}
          <Link href="/admin/login" className="mt-6 inline-flex rounded-full bg-purple-600 px-7 py-4 font-black text-white">
            تسجيل الدخول
          </Link>
        </div>
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
            <h1 className="text-4xl font-black">مكتبة الوسائط</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">إدارة ورفع الصور، الفيديوهات، الشعارات، الخلفيات، والملفات من لوحة التحكم وربطها بصفحات وبرامج الموقع.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="rounded-2xl border border-white/15 px-4 py-3 text-white/80">العودة للوحة التحكم</Link>
            <button onClick={logout} className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-200">تسجيل الخروج</button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard title="كل الوسائط" value={mediaItems.length} />
          <StatCard title="مفعّلة" value={activeCount} />
          <StatCard title="غير مفعّلة" value={inactiveCount} />
          <StatCard title="ملفات حقيقية" value={realFilesCount} />
        </div>

        <div className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">وسائط افتراضية احترافية</h2>
              <p className="mt-2 leading-8 text-white/60">هذه السجلات تدعم الخلفيات والهوية البصرية الحالية، ويمكن استبدالها في أي وقت بملفات حقيقية من مكتبة الوسائط.</p>
            </div>

            <button onClick={saveDefaultMedia} disabled={isSavingDefaults} className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black disabled:opacity-60">
              {isSavingDefaults ? "جارٍ الإنشاء..." : "إنشاء الوسائط الافتراضية"}
            </button>
          </div>
        </div>

        {message && <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{message}</div>}
        {error && <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">{error}</div>}

        <form onSubmit={saveMedia} className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">{selectedMedia ? "تعديل وسيط" : "رفع وسيط جديد"}</h2>
              <p className="mt-2 text-white/55">يمكنك رفع ملف من جهازك أو استخدام رابط خارجي جاهز.</p>
            </div>

            {selectedMedia && <button type="button" onClick={resetForm} className="rounded-xl border border-white/15 px-4 py-2 text-white/70">إلغاء التعديل</button>}
          </div>

          {selectedMedia && <div className="mb-5 rounded-2xl border border-blue-400/25 bg-blue-500/10 p-4 text-blue-100">أنت الآن تعدّل الوسيط: {selectedMedia.name || "بدون اسم"}</div>}

          <div className="mb-5 rounded-3xl border border-dashed border-purple-400/35 bg-purple-500/10 p-5">
            <label className="block cursor-pointer text-center">
              <input type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(event) => handleFileSelect(event.target.files?.[0] || null)} />
              <div className="text-2xl font-black text-purple-100">اختيار ملف من الجهاز</div>
              <div className="mt-2 text-sm text-white/55">صور، فيديوهات، شعارات، وملفات حتى 50MB</div>
              {selectedFile && <div className="mt-4 rounded-2xl border border-green-400/25 bg-green-500/10 p-3 text-green-100">الملف المختار: {selectedFile.name}</div>}
            </label>
          </div>

          <div className="mb-5 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5">
            <h3 className="text-xl font-black text-yellow-100">وسم سريع لشعارات البرامج</h3>
            <p className="mt-2 text-sm leading-7 text-white/60">اختر البرنامج هنا قبل الحفظ ليظهر شعاره تلقائياً في صفحة البرامج العامة.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {programSlugOptions.map((program) => (
                <button key={program.slug} type="button" onClick={() => setForm((current) => ({ ...current, file_type: "logo", category: "program-logo", page_slug: program.slug, name: current.name || `${program.label} Logo`, alt_text: current.alt_text || `شعار برنامج ${program.label}` }))} className={`rounded-full border px-4 py-2 text-sm font-black ${form.page_slug === program.slug && form.category === "program-logo" ? "border-yellow-300 bg-yellow-400/20 text-yellow-100" : "border-white/10 bg-white/[0.04] text-white/70"}`}>
                  {program.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="اسم الوسيط" className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400" />
            <input value={form.file_url} onChange={(e) => updateField("file_url", e.target.value)} placeholder="رابط الملف الخارجي أو generated://" className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400" />

            <select value={form.file_type} onChange={(e) => updateField("file_type", e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400">
              {Object.entries(fileTypeLabels).map(([value, label]) => <option key={value} value={value} className="bg-black">{label}</option>)}
            </select>

            <select value={form.category} onChange={(e) => updateField("category", e.target.value)} className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400">
              {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value} className="bg-black">{label}</option>)}
            </select>

            <input value={form.page_slug} onChange={(e) => updateField("page_slug", e.target.value)} placeholder="page_slug مثال: tiktok أو bigo-live" className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400" />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
              <input type="checkbox" checked={form.is_active} onChange={(e) => updateField("is_active", e.target.checked)} />
              مفعّل
            </label>

            <textarea value={form.alt_text} onChange={(e) => updateField("alt_text", e.target.value)} placeholder="وصف الوسيط" className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2" />
          </div>

          <button type="submit" disabled={isSaving} className="mt-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black disabled:opacity-60">
            {isSaving ? "جارٍ الحفظ..." : selectedMedia ? "حفظ التعديل" : "رفع وحفظ الوسيط"}
          </button>
        </form>

        <div className="rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">قائمة الوسائط</h2>
              <p className="mt-2 text-white/55">كل وسيط يمكن استخدامه في الصفحات، البرامج، الخلفيات، والهوية.</p>
            </div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث في الوسائط..." className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:min-w-72" />
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button key={category} onClick={() => setActiveCategory(category)} className={`shrink-0 rounded-full border px-4 py-2 text-sm ${activeCategory === category ? "border-purple-400 bg-purple-500/20 text-white" : "border-white/10 bg-white/[0.04] text-white/65"}`}>
                {category === "all" ? "الكل" : categoryLabels[category] || category}
              </button>
            ))}
          </div>

          {filteredMedia.length === 0 ? (
            <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-yellow-100">لا توجد وسائط مطابقة حالياً.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredMedia.map((item) => (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-purple-200">{categoryLabels[item.category || "general"] || item.category || "عام"}</div>
                      <h3 className="mt-1 text-2xl font-black">{item.name}</h3>
                      <p className="mt-2 text-sm text-white/45">{fileTypeLabels[item.file_type || "image"] || item.file_type} · {item.page_slug || "بدون صفحة محددة"}</p>
                    </div>

                    <span className={`rounded-full border px-3 py-1 text-xs ${item.is_active !== false ? "border-green-500/30 bg-green-500/10 text-green-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
                      {item.is_active !== false ? "مفعّل" : "غير مفعّل"}
                    </span>
                  </div>

                  <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                    {canPreviewImage(item) ? (
                      <img src={item.file_url || ""} alt={item.alt_text || item.name || "media"} className="h-72 w-full object-contain p-2" />
                    ) : canPreviewVideo(item) ? (
                      <video src={item.file_url || ""} className="h-72 w-full object-contain p-2" controls />
                    ) : (
                      <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
                        <div className="mb-3 text-5xl">◇</div>
                        <div className="text-lg font-bold text-purple-100">{item.file_type === "generated_background" ? "خلفية برمجية" : "ملف بدون معاينة مباشرة"}</div>
                        <p className="mt-2 break-all text-sm text-white/45">{item.file_url}</p>
                      </div>
                    )}
                  </div>

                  {canOpenMedia(item) && <a href={item.file_url || "#"} target="_blank" rel="noreferrer" className="mb-4 inline-flex rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75">فتح الملف كاملاً</a>}
                  <p className="mb-4 min-h-12 leading-7 text-white/60">{item.alt_text || "لا يوجد وصف لهذا الوسيط."}</p>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => editMedia(item)} className="rounded-xl border border-purple-500/30 px-4 py-2 text-sm">تعديل</button>
                    <button onClick={() => toggleMedia(item)} className="rounded-xl border border-yellow-500/30 px-4 py-2 text-sm text-yellow-100">{item.is_active !== false ? "تعطيل" : "تفعيل"}</button>
                    <button onClick={() => copyUrl(item.file_url)} className="rounded-xl border border-green-500/30 px-4 py-2 text-sm text-green-100">نسخ الرابط</button>
                    <button onClick={() => archiveMedia(item)} className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-100">حذف آمن</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mediaItems.length > 0 && <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/45">الملفات الحقيقية: {realFilesCount} · الخلفيات البرمجية: {generatedCount}</div>}
        </div>
      </div>
    </main>
  );
}

function detectFileType(file: File) {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/") && name.includes("logo")) return "logo";
  if (type.startsWith("image/")) return "image";
  if (name.endsWith(".ico") || name.endsWith(".svg")) return "icon";
  return "document";
}

function detectCategory(fileType: string, currentCategory: string) {
  if (currentCategory && currentCategory !== "general") return currentCategory;
  if (fileType === "logo" || fileType === "icon") return "logo";
  if (fileType === "video") return "background";
  if (fileType === "image") return "general";
  return "general";
}

function cleanNameFromFile(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
}

function buildStoragePath(file: File, category: string, pageSlug: string) {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "file";
  const safeCategory = sanitizeSegment(category || "general");
  const safePage = sanitizeSegment(pageSlug || "global");
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
  return `${safeCategory}/${safePage}/${uniqueName}`;
}

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "media";
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-purple-500/20 bg-black/35 p-5">
      <div className="text-sm text-white/45">{title}</div>
      <div className="mt-2 text-4xl font-black">{value}</div>
    </div>
  );
}
