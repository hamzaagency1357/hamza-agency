"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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

const emptyForm = {
  name: "",
  file_url: "",
  file_type: "image",
  category: "general",
  alt_text: "",
  page_slug: "",
  is_active: true,
};

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
  {
    name: "About Agency Visual",
    file_url: "generated://agency-about-glassmorphism",
    file_type: "generated_background",
    category: "section_visual",
    alt_text: "صورة بصرية لقسم من نحن",
    page_slug: "about",
    is_active: true,
  },
  {
    name: "AI Support Visual",
    file_url: "generated://ai-support-purple-core",
    file_type: "generated_background",
    category: "section_visual",
    alt_text: "خلفية بصرية لقسم دعم الذكاء الصناعي",
    page_slug: "ai-policy",
    is_active: true,
  },
];

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
  logo: "الشعارات",
  background: "الخلفيات",
  section_visual: "صور الأقسام",
  programs: "البرامج",
  services: "الخدمات",
  seo: "SEO / Open Graph",
  legal: "الصفحات القانونية",
};

export default function AdminMediaPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  useEffect(() => {
    async function checkAdminAccess() {
      if (!isSupabaseConfigured || !supabase) {
        router.replace("/admin/login");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/admin/login");
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "current_user_is_admin"
      );

      if (adminError || !isAdmin) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(session.user.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAdminAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadMedia();
  }, [isAuthorized]);

  async function loadMedia() {
    if (!supabase) return;

    setError("");

    const { data, error } = await supabase
      .from("media")
      .select(
        "id, created_at, updated_at, name, file_url, file_type, category, alt_text, page_slug, is_active, uploaded_by"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setError("تعذر تحميل مكتبة الوسائط. قد نحتاج إضافة RLS Policies لجدول media.");
      return;
    }

    setMediaItems(data || []);
  }

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(mediaItems.map((item) => item.category || "general"))
    );

    return ["all", ...uniqueCategories];
  }, [mediaItems]);

  const filteredMedia = useMemo(() => {
    return mediaItems.filter((item) => {
      const categoryMatch =
        activeCategory === "all" || item.category === activeCategory;

      const text = `${item.name || ""} ${item.file_url || ""} ${
        item.file_type || ""
      } ${item.category || ""} ${item.alt_text || ""} ${
        item.page_slug || ""
      }`.toLowerCase();

      return categoryMatch && text.includes(search.toLowerCase());
    });
  }, [mediaItems, activeCategory, search]);

  const activeCount = mediaItems.filter((item) => item.is_active !== false).length;
  const inactiveCount = mediaItems.filter((item) => item.is_active === false).length;
  const generatedCount = mediaItems.filter(
    (item) => item.file_type === "generated_background"
  ).length;
  const realFilesCount = mediaItems.length - generatedCount;

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setSelectedMedia(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function editMedia(item: MediaItem) {
    setSelectedMedia(item);

    setForm({
      name: item.name || "",
      file_url: item.file_url || "",
      file_type: item.file_type || "image",
      category: item.category || "general",
      alt_text: item.alt_text || "",
      page_slug: item.page_slug || "",
      is_active: item.is_active !== false,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDefaultMedia() {
    if (!supabase) return;

    setMessage("");
    setError("");
    setIsSavingDefaults(true);

    const existingNames = new Set(mediaItems.map((item) => item.name || ""));
    const missingDefaults = defaultMedia
      .filter((item) => !existingNames.has(item.name))
      .map((item) => ({
        ...item,
        uploaded_by: adminEmail,
        updated_at: new Date().toISOString(),
      }));

    if (missingDefaults.length === 0) {
      setIsSavingDefaults(false);
      setMessage("كل الوسائط الافتراضية موجودة مسبقاً.");
      return;
    }

    const { error } = await supabase.from("media").insert(missingDefaults);

    setIsSavingDefaults(false);

    if (error) {
      setError("فشل إنشاء الوسائط الافتراضية. قد نحتاج مراجعة صلاحيات RLS لجدول media.");
      return;
    }

    await logActivity(
      "seed_default_media",
      "media",
      "default_media",
      "",
      JSON.stringify(missingDefaults)
    );

    setMessage("تم إنشاء الوسائط الافتراضية بنجاح.");
    await loadMedia();
  }

  async function saveMedia(event: React.FormEvent) {
    event.preventDefault();

    if (!supabase) return;

    setMessage("");
    setError("");

    if (!form.name.trim()) {
      setError("يرجى كتابة اسم الوسيط.");
      return;
    }

    if (!form.file_url.trim()) {
      setError("يرجى إضافة رابط الملف أو قيمة generated:// للخلفيات البرمجية.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      file_url: form.file_url.trim(),
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

    if (result.error) {
      setError("فشل حفظ الوسيط. تحقق من صلاحيات جدول media.");
      return;
    }

    await logActivity(
      selectedMedia ? "update_media" : "create_media",
      "media",
      selectedMedia?.id ? String(selectedMedia.id) : payload.name,
      selectedMedia ? JSON.stringify(selectedMedia) : "",
      JSON.stringify(payload)
    );

    setMessage(selectedMedia ? "تم تحديث الوسيط بنجاح." : "تمت إضافة الوسيط بنجاح.");
    resetForm();
    await loadMedia();
  }

  async function toggleMedia(item: MediaItem) {
    if (!supabase) return;

    const nextValue = !Boolean(item.is_active !== false);

    const { error } = await supabase
      .from("media")
      .update({
        is_active: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert("فشل تحديث حالة الوسيط.");
      return;
    }

    await logActivity(
      "toggle_media",
      "media",
      String(item.id),
      JSON.stringify(item),
      JSON.stringify({ is_active: nextValue })
    );

    await loadMedia();
  }

  function copyUrl(url: string | null) {
    if (!url) return;
    navigator.clipboard.writeText(url);
    alert("تم نسخ الرابط");
  }

  function canPreviewImage(item: MediaItem) {
    const url = item.file_url || "";
    return (
      item.file_type === "image" ||
      item.file_type === "logo" ||
      item.file_type === "icon"
    ) && url.startsWith("http");
  }

  function canPreviewVideo(item: MediaItem) {
    const url = item.file_url || "";
    return (
      item.file_type === "video" ||
      item.file_type === "background_video"
    ) && url.startsWith("http");
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
            <h1 className="text-4xl font-black">مكتبة الوسائط</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              إدارة الصور، الفيديوهات، الشعارات، الخلفيات البرمجية، وملفات
              الموقع. حالياً ندير الروابط والسجلات، ولاحقاً نربطها بـ Supabase
              Storage للرفع المباشر.
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

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard title="كل الوسائط" value={mediaItems.length} />
          <StatCard title="مفعّلة" value={activeCount} />
          <StatCard title="غير مفعّلة" value={inactiveCount} />
          <StatCard title="خلفيات برمجية" value={generatedCount} />
        </div>

        <div className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">وسائط افتراضية احترافية</h2>
              <p className="mt-2 leading-8 text-white/60">
                هذه السجلات تجعل الموقع يبدو مكتمل البنية أثناء التطوير، مع
                إمكانية استبدالها لاحقاً بروابط صور وفيديوهات حقيقية من لوحة
                التحكم.
              </p>
            </div>

            <button
              onClick={saveDefaultMedia}
              disabled={isSavingDefaults}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black disabled:opacity-60"
            >
              {isSavingDefaults
                ? "جارٍ الإنشاء..."
                : "إنشاء الوسائط الافتراضية"}
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
            {error}
          </div>
        )}

        <form
          onSubmit={saveMedia}
          className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              {selectedMedia ? "تعديل وسيط" : "إضافة وسيط جديد"}
            </h2>

            {selectedMedia && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/15 px-4 py-2 text-white/70"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="اسم الوسيط مثال: Home Hero Video"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <input
              value={form.file_url}
              onChange={(e) => updateField("file_url", e.target.value)}
              placeholder="رابط الملف أو generated://luxury-purple-neon"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <select
              value={form.file_type}
              onChange={(e) => updateField("file_type", e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            >
              {Object.entries(fileTypeLabels).map(([value, label]) => (
                <option key={value} value={value} className="bg-black">
                  {label}
                </option>
              ))}
            </select>

            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            >
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value} className="bg-black">
                  {label}
                </option>
              ))}
            </select>

            <input
              value={form.page_slug}
              onChange={(e) => updateField("page_slug", e.target.value)}
              placeholder="page_slug مثال: home أو programs أو global"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
              />
              مفعّل
            </label>

            <textarea
              value={form.alt_text}
              onChange={(e) => updateField("alt_text", e.target.value)}
              placeholder="Alt text / وصف الوسيط"
              className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2"
            />
          </div>

          <button
            type="submit"
            className="mt-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black"
          >
            {selectedMedia ? "حفظ التعديل" : "إضافة الوسيط"}
          </button>
        </form>

        <div className="rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">قائمة الوسائط</h2>
              <p className="mt-2 text-white/55">
                كل وسيط يمكن استخدامه لاحقاً في الصفحات، البرامج، الخلفيات،
                SEO، والـ Page Builder.
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  activeCategory === category
                    ? "border-purple-400 bg-purple-500/20 text-white"
                    : "border-white/10 bg-black/20 text-white/60"
                }`}
              >
                {category === "all"
                  ? "الكل"
                  : categoryLabels[category] || category}
              </button>
            ))}
          </div>

          {filteredMedia.length === 0 ? (
            <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-yellow-100">
              لا توجد وسائط حالياً. اضغط على زر إنشاء الوسائط الافتراضية أو أضف
              رابط صورة / فيديو جديد.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filteredMedia.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-purple-200">
                        {categoryLabels[item.category || "general"] ||
                          item.category ||
                          "عام"}
                      </div>
                      <h3 className="mt-1 text-2xl font-black">
                        {item.name}
                      </h3>
                      <p className="mt-2 text-sm text-white/45">
                        {fileTypeLabels[item.file_type || "image"] ||
                          item.file_type}
                        {" · "}
                        {item.page_slug || "بدون صفحة محددة"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        item.is_active !== false
                          ? "border-green-500/30 bg-green-500/10 text-green-200"
                          : "border-red-500/30 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {item.is_active !== false ? "مفعّل" : "غير مفعّل"}
                    </span>
                  </div>

                  <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black/35">
                    {canPreviewImage(item) ? (
                      <img
                        src={item.file_url || ""}
                        alt={item.alt_text || item.name || "media"}
                        className="h-56 w-full object-cover"
                      />
                    ) : canPreviewVideo(item) ? (
                      <video
                        src={item.file_url || ""}
                        className="h-56 w-full object-cover"
                        controls
                      />
                    ) : (
                      <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
                        <div className="mb-3 text-5xl">◇</div>
                        <div className="text-lg font-bold text-purple-100">
                          {item.file_type === "generated_background"
                            ? "خلفية برمجية"
                            : "ملف بدون معاينة مباشرة"}
                        </div>
                        <p className="mt-2 break-all text-sm text-white/45">
                          {item.file_url}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="mb-4 min-h-12 leading-7 text-white/60">
                    {item.alt_text || "لا يوجد وصف لهذا الوسيط."}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => editMedia(item)}
                      className="rounded-xl border border-purple-500/30 px-4 py-2 text-sm"
                    >
                      تعديل
                    </button>

                    <button
                      onClick={() => toggleMedia(item)}
                      className="rounded-xl border border-yellow-500/30 px-4 py-2 text-sm text-yellow-100"
                    >
                      {item.is_active !== false ? "تعطيل" : "تفعيل"}
                    </button>

                    <button
                      onClick={() => copyUrl(item.file_url)}
                      className="rounded-xl border border-green-500/30 px-4 py-2 text-sm text-green-100"
                    >
                      نسخ الرابط
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mediaItems.length > 0 && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/45">
              الملفات الحقيقية: {realFilesCount} · الخلفيات البرمجية:{" "}
              {generatedCount}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-3xl border border-purple-500/20 bg-black/35 p-5">
      <div className="text-sm text-white/45">{title}</div>
      <div className="mt-2 text-4xl font-black">{value}</div>
    </div>
  );
}
