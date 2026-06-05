"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Announcement = {
  id: number;
  created_at: string;
  updated_at: string | null;
  title: string | null;
  content: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean | null;
  show_on_homepage: boolean | null;
  priority: number | null;
};

const emptyForm = {
  title: "",
  content: "",
  start_date: "",
  end_date: "",
  is_active: true,
  show_on_homepage: true,
  priority: "1",
};

const defaultAnnouncements = [
  {
    title: "التسجيل مفتوح الآن",
    content:
      "التقديم متاح حالياً لصناع المحتوى على برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii عبر وكالة حمزة.",
    start_date: null,
    end_date: null,
    is_active: true,
    show_on_homepage: true,
    priority: 1,
  },
  {
    title: "دعم وكالة حمزة",
    content:
      "فريق وكالة حمزة يساعدك في التقديم، المتابعة، تطوير الحساب، وحل المشاكل التقنية عبر واتساب.",
    start_date: null,
    end_date: null,
    is_active: true,
    show_on_homepage: true,
    priority: 2,
  },
];

export default function AdminAnnouncementsPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [search, setSearch] = useState("");
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
    loadAnnouncements();
  }, [isAuthorized]);

  async function loadAnnouncements() {
    if (!supabase) return;

    setError("");

    const { data, error } = await supabase
      .from("announcements")
      .select(
        "id, created_at, updated_at, title, content, start_date, end_date, is_active, show_on_homepage, priority"
      )
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setError(
        "تعذر تحميل الإعلانات. قد نحتاج إضافة RLS Policies لجدول announcements."
      );
      return;
    }

    setAnnouncements(data || []);
  }

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      const text = `${item.title || ""} ${item.content || ""}`.toLowerCase();
      return text.includes(search.toLowerCase());
    });
  }, [announcements, search]);

  const activeCount = announcements.filter(
    (item) => item.is_active !== false
  ).length;

  const inactiveCount = announcements.filter(
    (item) => item.is_active === false
  ).length;

  const homepageCount = announcements.filter(
    (item) => item.show_on_homepage !== false
  ).length;

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setSelectedAnnouncement(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function formatDateForInput(value: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const pad = (number: number) => String(number).padStart(2, "0");

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function toIsoOrNull(value: string) {
    if (!value) return null;
    return new Date(value).toISOString();
  }

  function editAnnouncement(item: Announcement) {
    setSelectedAnnouncement(item);

    setForm({
      title: item.title || "",
      content: item.content || "",
      start_date: formatDateForInput(item.start_date),
      end_date: formatDateForInput(item.end_date),
      is_active: item.is_active !== false,
      show_on_homepage: item.show_on_homepage !== false,
      priority: String(item.priority || 1),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDefaultAnnouncements() {
    if (!supabase) return;

    setMessage("");
    setError("");
    setIsSavingDefaults(true);

    const existingTitles = new Set(announcements.map((item) => item.title || ""));

    const missingDefaults = defaultAnnouncements.filter(
      (item) => !existingTitles.has(item.title)
    );

    if (missingDefaults.length === 0) {
      setIsSavingDefaults(false);
      setMessage("كل الإعلانات الافتراضية موجودة مسبقاً.");
      return;
    }

    const { error } = await supabase
      .from("announcements")
      .insert(missingDefaults);

    setIsSavingDefaults(false);

    if (error) {
      setError(
        "فشل إنشاء الإعلانات الافتراضية. قد نحتاج مراجعة صلاحيات RLS لجدول announcements."
      );
      return;
    }

    await logActivity(
      "seed_default_announcements",
      "announcements",
      "default_announcements",
      "",
      JSON.stringify(missingDefaults)
    );

    setMessage("تم إنشاء الإعلانات الافتراضية بنجاح.");
    await loadAnnouncements();
  }

  async function saveAnnouncement(event: React.FormEvent) {
    event.preventDefault();

    if (!supabase) return;

    setMessage("");
    setError("");

    if (!form.title.trim()) {
      setError("يرجى كتابة عنوان الإعلان.");
      return;
    }

    if (!form.content.trim()) {
      setError("يرجى كتابة محتوى الإعلان.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      start_date: toIsoOrNull(form.start_date),
      end_date: toIsoOrNull(form.end_date),
      is_active: form.is_active,
      show_on_homepage: form.show_on_homepage,
      priority: Number(form.priority || 1),
      updated_at: new Date().toISOString(),
    };

    const result = selectedAnnouncement
      ? await supabase
          .from("announcements")
          .update(payload)
          .eq("id", selectedAnnouncement.id)
      : await supabase.from("announcements").insert(payload);

    if (result.error) {
      setError("فشل حفظ الإعلان. تحقق من صلاحيات جدول announcements.");
      return;
    }

    await logActivity(
      selectedAnnouncement ? "update_announcement" : "create_announcement",
      "announcements",
      selectedAnnouncement?.id ? String(selectedAnnouncement.id) : payload.title,
      selectedAnnouncement ? JSON.stringify(selectedAnnouncement) : "",
      JSON.stringify(payload)
    );

    setMessage(
      selectedAnnouncement
        ? "تم تحديث الإعلان بنجاح."
        : "تمت إضافة الإعلان بنجاح."
    );

    resetForm();
    await loadAnnouncements();
  }

  async function toggleAnnouncement(
    item: Announcement,
    field: "is_active" | "show_on_homepage"
  ) {
    if (!supabase) return;

    const nextValue = !Boolean(item[field] !== false);

    const { error } = await supabase
      .from("announcements")
      .update({
        [field]: nextValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      alert("فشل تحديث حالة الإعلان.");
      return;
    }

    await logActivity(
      field === "is_active"
        ? "toggle_announcement_active"
        : "toggle_announcement_homepage",
      "announcements",
      String(item.id),
      JSON.stringify(item),
      JSON.stringify({ [field]: nextValue })
    );

    await loadAnnouncements();
  }

  function isAnnouncementCurrentlyVisible(item: Announcement) {
    const now = new Date();
    const startDate = item.start_date ? new Date(item.start_date) : null;
    const endDate = item.end_date ? new Date(item.end_date) : null;

    if (item.is_active === false) return false;
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;

    return true;
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
            <h1 className="text-4xl font-black">الإعلانات</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              إدارة شريط الإعلانات العلوي والتنبيهات العامة في الموقع، مع إمكانية
              التفعيل، الإخفاء، الترتيب، وجدولة تاريخ البداية والنهاية.
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
          <StatCard title="كل الإعلانات" value={announcements.length} />
          <StatCard title="مفعّلة" value={activeCount} />
          <StatCard title="غير مفعّلة" value={inactiveCount} />
          <StatCard title="تظهر بالرئيسية" value={homepageCount} />
        </div>

        <div className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">إعلانات افتراضية احترافية</h2>
              <p className="mt-2 leading-8 text-white/60">
                هذه الإعلانات تملأ الموقع برسائل مناسبة قابلة للتعديل لاحقاً من
                لوحة التحكم حتى لا يبقى شريط الإعلانات فارغاً أثناء التطوير.
              </p>
            </div>

            <button
              onClick={saveDefaultAnnouncements}
              disabled={isSavingDefaults}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black disabled:opacity-60"
            >
              {isSavingDefaults
                ? "جارٍ الإنشاء..."
                : "إنشاء الإعلانات الافتراضية"}
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
          onSubmit={saveAnnouncement}
          className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-3xl font-black">
              {selectedAnnouncement ? "تعديل إعلان" : "إضافة إعلان جديد"}
            </h2>

            {selectedAnnouncement && (
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
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="عنوان الإعلان مثال: التسجيل مفتوح الآن"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <input
              value={form.priority}
              onChange={(e) => updateField("priority", e.target.value)}
              placeholder="الأولوية / الترتيب"
              type="number"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <textarea
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              placeholder="محتوى الإعلان"
              className="min-h-32 rounded-2xl border border-white/10 bg-black/35 p-4 leading-8 outline-none focus:border-purple-400 md:col-span-2"
            />

            <div>
              <label className="mb-2 block text-sm text-white/50">
                تاريخ البداية اختياري
              </label>
              <input
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
                type="datetime-local"
                className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/50">
                تاريخ النهاية اختياري
              </label>
              <input
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
                type="datetime-local"
                className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
              />
              الإعلان مفعّل
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
              <input
                type="checkbox"
                checked={form.show_on_homepage}
                onChange={(e) =>
                  updateField("show_on_homepage", e.target.checked)
                }
              />
              يظهر في الصفحة الرئيسية
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black"
          >
            {selectedAnnouncement ? "حفظ التعديل" : "إضافة الإعلان"}
          </button>
        </form>

        <div className="rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">قائمة الإعلانات</h2>
              <p className="mt-2 text-white/55">
                الإعلان النشط والمجدول يمكن ربطه لاحقاً بشريط علوي داخل الموقع
                العام.
              </p>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث..."
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />
          </div>

          {filteredAnnouncements.length === 0 ? (
            <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-yellow-100">
              لا توجد إعلانات حالياً. اضغط على زر إنشاء الإعلانات الافتراضية أو
              أضف إعلاناً جديداً.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAnnouncements.map((item) => {
                const currentlyVisible = isAnnouncementCurrentlyVisible(item);

                return (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${
                              item.is_active !== false
                                ? "border-green-500/30 bg-green-500/10 text-green-200"
                                : "border-red-500/30 bg-red-500/10 text-red-200"
                            }`}
                          >
                            {item.is_active !== false ? "مفعّل" : "غير مفعّل"}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${
                              currentlyVisible
                                ? "border-purple-500/30 bg-purple-500/10 text-purple-100"
                                : "border-yellow-500/30 bg-yellow-500/10 text-yellow-100"
                            }`}
                          >
                            {currentlyVisible ? "ظاهر حالياً" : "غير ظاهر حالياً"}
                          </span>

                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50">
                            أولوية {item.priority || 1}
                          </span>
                        </div>

                        <h3 className="text-2xl font-black">{item.title}</h3>
                        <p className="mt-3 leading-8 text-white/65">
                          {item.content}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 grid gap-3 text-sm text-white/45 md:grid-cols-3">
                      <div>
                        البداية:{" "}
                        {item.start_date
                          ? new Date(item.start_date).toLocaleString("ar")
                          : "غير محددة"}
                      </div>
                      <div>
                        النهاية:{" "}
                        {item.end_date
                          ? new Date(item.end_date).toLocaleString("ar")
                          : "غير محددة"}
                      </div>
                      <div>
                        الرئيسية:{" "}
                        {item.show_on_homepage !== false ? "نعم" : "لا"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => editAnnouncement(item)}
                        className="rounded-xl border border-purple-500/30 px-4 py-2 text-sm"
                      >
                        تعديل
                      </button>

                      <button
                        onClick={() => toggleAnnouncement(item, "is_active")}
                        className="rounded-xl border border-yellow-500/30 px-4 py-2 text-sm text-yellow-100"
                      >
                        {item.is_active !== false ? "تعطيل" : "تفعيل"}
                      </button>

                      <button
                        onClick={() =>
                          toggleAnnouncement(item, "show_on_homepage")
                        }
                        className="rounded-xl border border-green-500/30 px-4 py-2 text-sm text-green-100"
                      >
                        {item.show_on_homepage !== false
                          ? "إخفاء من الرئيسية"
                          : "إظهار بالرئيسية"}
                      </button>
                    </div>
                  </div>
                );
              })}
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
