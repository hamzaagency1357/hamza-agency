"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";

type AdminStatus = "checking" | "authorized" | "unauthorized";
type MessageType = "success" | "error" | "info";

type SuccessStory = {
  id: number;
  title: string | null;
  person_name: string | null;
  country: string | null;
  platform: string | null;
  result_summary: string | null;
  story: string | null;
  image_url: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  status: string | null;
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type MediaPickerItem = {
  id: number;
  name: string | null;
  file_url: string | null;
  file_type: string | null;
  category: string | null;
  alt_text: string | null;
  page_slug: string | null;
  is_active: boolean | null;
};

type StoryForm = {
  title: string;
  personName: string;
  country: string;
  platform: string;
  resultSummary: string;
  story: string;
  imageUrl: string;
  status: string;
  sortOrder: string;
  isFeatured: boolean;
  isVisible: boolean;
};

const emptyForm: StoryForm = {
  title: "",
  personName: "",
  country: "",
  platform: "",
  resultSummary: "",
  story: "",
  imageUrl: "",
  status: "published",
  sortOrder: "0",
  isFeatured: false,
  isVisible: true,
};

const statusOptions = [
  { value: "published", label: "منشور" },
  { value: "draft", label: "مسودة" },
  { value: "hidden", label: "مخفي" },
];

function isSelectableMedia(item: MediaPickerItem) {
  const fileType = (item.file_type || "").toLowerCase();
  const fileUrl = item.file_url || "";

  return (
    Boolean(fileUrl) &&
    (fileType === "image" ||
      fileType === "logo" ||
      fileType === "icon" ||
      fileType.startsWith("image") ||
      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileUrl))
  );
}

function getSuccessStorySnapshot(story: SuccessStory) {
  return {
    id: story.id,
    title: story.title,
    person_name: story.person_name,
    country: story.country,
    platform: story.platform,
    result_summary: story.result_summary,
    story: story.story,
    image_url: story.image_url,
    is_featured: story.is_featured,
    sort_order: story.sort_order,
    status: story.status,
    is_visible: story.is_visible,
    created_at: story.created_at,
    updated_at: story.updated_at,
  };
}

function getSuccessStoryQuickAction(
  changes: Partial<Pick<SuccessStory, "status" | "is_visible" | "is_featured">>
) {
  if (Object.prototype.hasOwnProperty.call(changes, "status")) return "update_success_story_status";
  if (Object.prototype.hasOwnProperty.call(changes, "is_visible")) return "toggle_success_story_visibility";
  if (Object.prototype.hasOwnProperty.call(changes, "is_featured")) return "toggle_success_story_featured";
  return "update_success_story";
}

export default function AdminSuccessStoriesPage() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("checking");
  const [adminEmail, setAdminEmail] = useState("");

  const [stories, setStories] = useState<SuccessStory[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaPickerItem[]>([]);
  const [form, setForm] = useState<StoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");

  const showMessage = useCallback((text: string, type: MessageType = "info") => {
    setMessage(text);
    setMessageType(type);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage("");
    setMessageType("info");
  }, []);

  const loadStories = useCallback(async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("success_stories")
      .select(
        "id, title, person_name, country, platform, result_summary, story, image_url, is_featured, sort_order, status, is_visible, created_at, updated_at"
      )
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      showMessage(
        "تعذر تحميل قصص النجاح. يرجى تحديث الصفحة والمحاولة مرة أخرى.",
        "error"
      );
      return;
    }

    setStories((data || []) as SuccessStory[]);
  }, [showMessage]);

  const loadMediaItems = useCallback(async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("media")
      .select("id, name, file_url, file_type, category, alt_text, page_slug, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error || !data) return;

    setMediaItems(((data || []) as MediaPickerItem[]).filter(isSelectableMedia));
  }, []);

  const checkAccessAndLoad = useCallback(async () => {
    setIsLoading(true);

    if (!supabase) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    const access = await requireAdminModuleAccess("success_stories");

    if (!access.isAuthorized || !access.profile) {
      if (access.reason === "not_signed_in" || access.reason === "not_admin") {
        window.location.href = "/admin/login";
        return;
      }

      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    setAdminEmail(access.profile.email || access.user?.email || "");
    setAdminStatus("authorized");
    await Promise.all([loadStories(), loadMediaItems()]);
    setIsLoading(false);
  }, [loadMediaItems, loadStories]);

  useEffect(() => {
    void checkAccessAndLoad();
  }, [checkAccessAndLoad]);

  function updateForm(key: keyof StoryForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm(options?: { keepMessage?: boolean }) {
    setForm(emptyForm);
    setEditingId(null);

    if (!options?.keepMessage) {
      clearMessage();
    }
  }

  function editStory(story: SuccessStory) {
    setEditingId(story.id);
    setForm({
      title: story.title || "",
      personName: story.person_name || "",
      country: story.country || "",
      platform: story.platform || "",
      resultSummary: story.result_summary || "",
      story: story.story || "",
      imageUrl: story.image_url || "",
      status: story.status || "published",
      sortOrder: String(story.sort_order || 0),
      isFeatured: story.is_featured === true,
      isVisible: story.is_visible !== false,
    });

    showMessage(
      "وضع التعديل مفعل الآن. عدّل البيانات ثم اضغط حفظ التعديلات.",
      "info"
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveStory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessage();

    if (!supabase) {
      showMessage("الاتصال بقاعدة البيانات غير مفعل.", "error");
      return;
    }

    if (!form.title.trim()) {
      showMessage("يرجى كتابة عنوان قصة النجاح.", "error");
      return;
    }

    if (!form.resultSummary.trim()) {
      showMessage("يرجى كتابة ملخص النتيجة.", "error");
      return;
    }

    if (!form.story.trim()) {
      showMessage("يرجى كتابة تفاصيل القصة.", "error");
      return;
    }

    const now = new Date().toISOString();

    const payload = {
      title: form.title.trim(),
      person_name: form.personName.trim(),
      country: form.country.trim(),
      platform: form.platform.trim(),
      result_summary: form.resultSummary.trim(),
      story: form.story.trim(),
      image_url: form.imageUrl.trim() || null,
      is_featured: form.isFeatured,
      sort_order: Number(form.sortOrder || 0),
      status: form.status,
      is_visible: form.isVisible,
      updated_at: now,
      ...(editingId ? {} : { created_at: now }),
    };

    const oldStory = editingId ? stories.find((story) => story.id === editingId) || null : null;

    setIsSaving(true);

    const result = editingId
      ? await supabase
          .from("success_stories")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("success_stories").insert(payload);

    setIsSaving(false);

    if (result.error) {
      showMessage("تعذر حفظ قصة النجاح. يرجى المحاولة مرة أخرى.", "error");
      return;
    }

    await logAdminActivity({
      action: editingId ? "update_success_story" : "create_success_story",
      module: "success_stories",
      adminEmail,
      recordId: editingId ?? payload.title,
      details: editingId ? "تعديل قصة نجاح من لوحة الإدارة" : "إضافة قصة نجاح من لوحة الإدارة",
      oldData: oldStory ? getSuccessStorySnapshot(oldStory) : null,
      newData: payload,
    });

    const successText = editingId
      ? "تم حفظ تعديلات قصة النجاح بنجاح."
      : "تم إضافة قصة النجاح بنجاح.";

    resetForm({ keepMessage: true });
    await loadStories();
    showMessage(successText, "success");
  }

  async function quickUpdateStory(
    story: SuccessStory,
    changes: Partial<
      Pick<SuccessStory, "status" | "is_visible" | "is_featured">
    >,
    successMessage: string
  ) {
    if (!supabase) return;

    clearMessage();

    const updatePayload = {
      ...changes,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("success_stories")
      .update(updatePayload)
      .eq("id", story.id);

    if (error) {
      showMessage("تعذر تنفيذ الإجراء. يرجى المحاولة مرة أخرى.", "error");
      return;
    }

    await logAdminActivity({
      action: getSuccessStoryQuickAction(changes),
      module: "success_stories",
      adminEmail,
      recordId: story.id,
      details: "تحديث سريع لقصة نجاح من لوحة الإدارة",
      oldData: getSuccessStorySnapshot(story),
      newData: {
        ...getSuccessStorySnapshot(story),
        ...updatePayload,
      },
    });

    await loadStories();
    showMessage(successMessage, "success");
  }

  async function deleteStory(story: SuccessStory) {
    if (!supabase) return;

    const confirmed = window.confirm(
      "هل تريد إخفاء قصة النجاح وأرشفتها؟ لن يتم حذفها نهائياً من قاعدة البيانات."
    );

    if (!confirmed) return;

    clearMessage();

    const archivePayload = {
      status: "hidden",
      is_visible: false,
      is_featured: false,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("success_stories")
      .update(archivePayload)
      .eq("id", story.id);

    if (error) {
      showMessage("تعذر أرشفة قصة النجاح. يرجى المحاولة مرة أخرى.", "error");
      return;
    }

    await logAdminActivity({
      action: "archive_success_story",
      module: "success_stories",
      adminEmail,
      recordId: story.id,
      details: "إخفاء وأرشفة قصة نجاح من لوحة الإدارة",
      oldData: getSuccessStorySnapshot(story),
      newData: {
        ...getSuccessStorySnapshot(story),
        ...archivePayload,
      },
    });

    if (editingId === story.id) {
      resetForm({ keepMessage: true });
    }

    await loadStories();
    showMessage("تم إخفاء قصة النجاح وأرشفته بأمان.", "success");
  }

  const filteredStories = useMemo(() => {
    const text = search.trim().toLowerCase();

    return stories.filter((story) => {
      const matchesSearch =
        !text ||
        [
          story.title,
          story.person_name,
          story.country,
          story.platform,
          story.result_summary,
          story.story,
          story.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(text);

      const matchesStatus =
        statusFilter === "all" || story.status === statusFilter;

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && story.is_visible !== false) ||
        (visibilityFilter === "hidden" && story.is_visible === false) ||
        (visibilityFilter === "featured" && story.is_featured === true);

      return matchesSearch && matchesStatus && matchesVisibility;
    });
  }, [stories, search, statusFilter, visibilityFilter]);

  const stats = useMemo(() => {
    return {
      total: stories.length,
      published: stories.filter((story) => story.status === "published").length,
      featured: stories.filter((story) => story.is_featured === true).length,
      hidden: stories.filter(
        (story) => story.is_visible === false || story.status === "hidden"
      ).length,
    };
  }, [stories]);

  if (adminStatus === "checking" || isLoading) {
    return (
      <AdminShell>
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-purple-400/20 bg-white/[0.04] p-8 text-center text-white">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </AdminShell>
    );
  }

  if (adminStatus === "unauthorized") {
    return (
      <AdminShell>
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center text-white">
          <h1 className="text-3xl font-black">غير مصرح</h1>
          <p className="mt-4 text-white/65">
            يجب تسجيل الدخول بحساب إداري نشط للوصول إلى إدارة قصص النجاح.
          </p>
          <Link
            href="/admin/login"
            className="mt-6 inline-flex rounded-full bg-purple-600 px-6 py-3 font-bold"
          >
            تسجيل الدخول
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-[2rem] border border-purple-400/20 bg-purple-500/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm text-purple-100">HAMZA AGENCY Admin</div>
              <h1 className="mt-2 text-4xl font-black text-white">
                إدارة قصص النجاح
              </h1>
              <p className="mt-2 text-sm text-white/55">{adminEmail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  await Promise.all([loadStories(), loadMediaItems()]);
                  showMessage("تم تحديث بيانات قصص النجاح بنجاح.", "success");
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white/75"
              >
                تحديث البيانات
              </button>

              <Link
                href="/success-stories"
                className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-100"
              >
                عرض الصفحة العامة
              </Link>
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard title="إجمالي القصص" value={stats.total} />
          <StatCard title="منشورة" value={stats.published} />
          <StatCard title="مميزة" value={stats.featured} />
          <StatCard title="مخفية" value={stats.hidden} />
        </div>

        {message && <MessageBox type={messageType}>{message}</MessageBox>}

        <section className="mb-6 rounded-[2rem] border border-green-400/20 bg-[#07130f]/90 p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-black text-white">
              {editingId ? "تعديل قصة نجاح" : "إضافة قصة نجاح جديدة"}
            </h2>

            {editingId && (
              <button
                onClick={() => resetForm()}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-white/70"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={saveStory} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="عنوان قصة النجاح">
                <input
                  value={form.title}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="مثال: مسار انطلاق صانع محتوى جديد"
                  className={inputClassName}
                />
              </Field>

              <Field label="اسم المسار أو صاحب القصة">
                <input
                  value={form.personName}
                  onChange={(event) =>
                    updateForm("personName", event.target.value)
                  }
                  placeholder="مثال: مسار صناع المحتوى"
                  className={inputClassName}
                />
              </Field>

              <Field label="الدولة أو النطاق">
                <input
                  value={form.country}
                  onChange={(event) => updateForm("country", event.target.value)}
                  placeholder="مثال: عدة دول"
                  className={inputClassName}
                />
              </Field>

              <Field label="المنصة / القسم">
                <input
                  value={form.platform}
                  onChange={(event) =>
                    updateForm("platform", event.target.value)
                  }
                  placeholder="TikTok / BIGO LIVE / Digital Services"
                  className={inputClassName}
                />
              </Field>

              <Field label="صورة قصة النجاح - اختياري">
                <div className="space-y-3">
                  <input
                    value={form.imageUrl}
                    onChange={(event) => updateForm("imageUrl", event.target.value)}
                    placeholder="https://..."
                    className={inputClassName}
                  />

                  <select
                    value=""
                    onChange={(event) => {
                      if (event.target.value) {
                        updateForm("imageUrl", event.target.value);
                        showMessage("تم اختيار صورة القصة من مكتبة الوسائط.", "success");
                      }
                    }}
                    className={inputClassName}
                  >
                    <option value="">اختيار صورة من مكتبة الوسائط</option>
                    {mediaItems.map((item) => (
                      <option key={item.id} value={item.file_url || ""}>
                        {item.name || item.alt_text || item.file_url}
                      </option>
                    ))}
                  </select>

                  {form.imageUrl && (
                    <a
                      href={form.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-100"
                    >
                      فتح الصورة المختارة
                    </a>
                  )}
                </div>
              </Field>

              <Field label="حالة النشر">
                <select
                  value={form.status}
                  onChange={(event) => updateForm("status", event.target.value)}
                  className={inputClassName}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="ترتيب الظهور">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    updateForm("sortOrder", event.target.value)
                  }
                  className={inputClassName}
                />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm font-bold text-white/75">
                  <input
                    type="checkbox"
                    checked={form.isVisible}
                    onChange={(event) =>
                      updateForm("isVisible", event.target.checked)
                    }
                  />
                  إظهار للعامة
                </label>

                <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm font-bold text-white/75">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(event) =>
                      updateForm("isFeatured", event.target.checked)
                    }
                  />
                  قصة مميزة
                </label>
              </div>
            </div>

            <Field label="ملخص النتيجة">
              <textarea
                value={form.resultSummary}
                onChange={(event) =>
                  updateForm("resultSummary", event.target.value)
                }
                placeholder="اكتب ملخصاً واضحاً للنتيجة أو الفائدة التي تعرضها القصة."
                className={`${inputClassName} min-h-28 resize-none`}
              />
            </Field>

            <Field label="تفاصيل القصة">
              <textarea
                value={form.story}
                onChange={(event) => updateForm("story", event.target.value)}
                placeholder="اكتب تفاصيل القصة أو المسار بطريقة احترافية مناسبة للعرض العام."
                className={`${inputClassName} min-h-36 resize-none`}
              />
            </Field>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-full bg-gradient-to-r from-green-600 to-emerald-500 px-8 py-4 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "جارٍ الحفظ..."
                : editingId
                  ? "حفظ التعديلات"
                  : "إضافة قصة النجاح"}
            </button>
          </form>
        </section>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالعنوان، المنصة، الدولة، النص..."
              className={inputClassName}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="all">كل الحالات</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="all">كل القصص</option>
              <option value="visible">الظاهرة للعامة</option>
              <option value="hidden">المخفية</option>
              <option value="featured">المميزة</option>
            </select>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-white">قائمة قصص النجاح</h2>
            <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/60">
              {filteredStories.length} قصة
            </div>
          </div>

          {filteredStories.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-white/55">
              لا توجد قصص نجاح مطابقة حالياً.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredStories.map((story) => (
                <StoryAdminCard
                  key={story.id}
                  story={story}
                  onEdit={() => editStory(story)}
                  onDelete={() => deleteStory(story)}
                  onToggleVisible={() =>
                    quickUpdateStory(
                      story,
                      {
                        is_visible: story.is_visible === false,
                      },
                      story.is_visible === false
                        ? "تم إظهار قصة النجاح بنجاح."
                        : "تم إخفاء قصة النجاح من الظهور العام بنجاح."
                    )
                  }
                  onToggleFeatured={() =>
                    quickUpdateStory(
                      story,
                      {
                        is_featured: story.is_featured !== true,
                      },
                      story.is_featured === true
                        ? "تم إلغاء تمييز قصة النجاح بنجاح."
                        : "تم تمييز قصة النجاح بنجاح."
                    )
                  }
                  onPublish={() =>
                    quickUpdateStory(
                      story,
                      {
                        status: "published",
                        is_visible: true,
                      },
                      "تم نشر قصة النجاح بنجاح."
                    )
                  }
                  onHide={() =>
                    quickUpdateStory(
                      story,
                      {
                        status: "hidden",
                        is_visible: false,
                      },
                      "تم إخفاء قصة النجاح بالكامل بنجاح."
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </AdminShell>
  );
}

function StoryAdminCard({
  story,
  onEdit,
  onDelete,
  onToggleVisible,
  onToggleFeatured,
  onPublish,
  onHide,
}: {
  story: SuccessStory;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisible: () => void;
  onToggleFeatured: () => void;
  onPublish: () => void;
  onHide: () => void;
}) {
  return (
    <article className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant={story.status === "published" ? "green" : "yellow"}>
              {statusLabel(story.status)}
            </Badge>

            <Badge variant={story.is_visible === false ? "red" : "purple"}>
              {story.is_visible === false ? "مخفي" : "ظاهر"}
            </Badge>

            {story.is_featured && <Badge variant="gold">مميزة</Badge>}

            <Badge variant="gray">ترتيب: {story.sort_order || 0}</Badge>
          </div>

          <h3 className="break-words text-2xl font-black text-white">
            {story.title || "بدون عنوان"}
          </h3>

          <p className="mt-2 text-sm text-white/50">
            {story.person_name || "بدون اسم"} — {story.country || "بدون دولة"} — {story.platform || "بدون منصة"}
          </p>

          {story.result_summary && (
            <p className="mt-4 rounded-2xl border border-green-400/20 bg-green-500/10 p-4 leading-8 text-white/70">
              {story.result_summary}
            </p>
          )}

          <p className="mt-4 leading-8 text-white/70">
            {story.story || "لا توجد تفاصيل."}
          </p>

          {story.image_url && (
            <p className="mt-3 break-all text-xs text-purple-200/70">
              رابط الصورة: {story.image_url}
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-72">
          <ActionButton onClick={onEdit}>تعديل</ActionButton>
          <ActionButton onClick={onToggleFeatured}>
            {story.is_featured ? "إلغاء التمييز" : "تمييز"}
          </ActionButton>
          <ActionButton onClick={onToggleVisible}>
            {story.is_visible === false ? "إظهار" : "إخفاء"}
          </ActionButton>
          <ActionButton onClick={onPublish}>نشر</ActionButton>
          <ActionButton onClick={onHide}>إخفاء كامل</ActionButton>
          <ActionButton danger onClick={onDelete}>
            حذف
          </ActionButton>
        </div>
      </div>
    </article>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main
      dir="rtl"
      className="relative min-h-screen overflow-x-hidden bg-[#070009] px-4 py-6 text-white"
    >
      <Background />
      <div className="relative z-10">{children}</div>
    </main>
  );
}

function MessageBox({
  children,
  type,
}: {
  children: ReactNode;
  type: MessageType;
}) {
  const className =
    type === "success"
      ? "border-green-400/30 bg-green-500/10 text-green-100"
      : type === "error"
        ? "border-red-400/30 bg-red-500/10 text-red-100"
        : "border-yellow-400/25 bg-yellow-500/10 text-yellow-100";

  return (
    <div
      className={`mb-6 rounded-3xl border p-5 text-center font-black leading-8 ${className}`}
    >
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-white/75">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 text-center">
      <div className="text-4xl font-black text-yellow-100">{value}</div>
      <div className="mt-2 text-sm font-bold text-white/55">{title}</div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-black ${
        danger
          ? "border-red-400/25 bg-red-500/10 text-red-100"
          : "border-white/10 bg-white/[0.05] text-white/75"
      }`}
    >
      {children}
    </button>
  );
}

function Badge({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "green" | "yellow" | "red" | "purple" | "gold" | "gray";
}) {
  const className =
    variant === "green"
      ? "border-green-400/25 bg-green-500/10 text-green-100"
      : variant === "yellow"
        ? "border-yellow-400/25 bg-yellow-500/10 text-yellow-100"
        : variant === "red"
          ? "border-red-400/25 bg-red-500/10 text-red-100"
          : variant === "gold"
            ? "border-yellow-300/25 bg-yellow-400/10 text-yellow-100"
            : variant === "purple"
              ? "border-purple-400/25 bg-purple-500/10 text-purple-100"
              : "border-white/10 bg-white/[0.05] text-white/60";

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${className}`}
    >
      {children}
    </span>
  );
}

function statusLabel(status: string | null) {
  if (status === "published") return "منشور";
  if (status === "draft") return "مسودة";
  if (status === "hidden") return "مخفي";
  return status || "غير محدد";
}

const inputClassName =
  "w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-white outline-none transition placeholder:text-white/35 focus:border-purple-400/70 focus:ring-4 focus:ring-purple-500/10";

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#070009]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_44%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,8,60,0.32),rgba(7,0,9,0.96))]" />
    </div>
  );
}
