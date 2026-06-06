"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AdminStatus = "checking" | "authorized" | "unauthorized";
type MessageType = "success" | "error" | "info";

type Review = {
  id: number;
  reviewer_name: string | null;
  country: string | null;
  platform: string | null;
  rating: number | null;
  content: string | null;
  avatar_url: string | null;
  is_featured: boolean | null;
  sort_order: number | null;
  status: string | null;
  is_visible: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type ReviewForm = {
  reviewerName: string;
  country: string;
  platform: string;
  rating: string;
  content: string;
  avatarUrl: string;
  status: string;
  sortOrder: string;
  isFeatured: boolean;
  isVisible: boolean;
};

const emptyForm: ReviewForm = {
  reviewerName: "",
  country: "",
  platform: "",
  rating: "5",
  content: "",
  avatarUrl: "",
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

export default function AdminReviewsPage() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>("checking");
  const [adminEmail, setAdminEmail] = useState("");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [form, setForm] = useState<ReviewForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("info");

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  function showMessage(text: string, type: MessageType = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage("");
    setMessageType("info");
  }

  async function checkAccessAndLoad() {
    setIsLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const email = sessionData.session?.user?.email || "";

    if (!email) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    setAdminEmail(email);

    const { data: isAdmin, error } = await supabase.rpc("current_user_is_admin");

    if (error || !isAdmin) {
      setAdminStatus("unauthorized");
      setIsLoading(false);
      return;
    }

    setAdminStatus("authorized");
    await loadReviews();
    setIsLoading(false);
  }

  async function loadReviews() {
    if (!supabase) return;

    const { data, error } = await supabase
      .from("reviews")
      .select(
        "id, reviewer_name, country, platform, rating, content, avatar_url, is_featured, sort_order, status, is_visible, created_at, updated_at"
      )
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      showMessage("تعذر تحميل التقييمات. يرجى تحديث الصفحة والمحاولة مرة أخرى.", "error");
      return;
    }

    setReviews((data || []) as Review[]);
  }

  function updateForm(key: keyof ReviewForm, value: string | boolean) {
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

  function editReview(review: Review) {
    setEditingId(review.id);
    setForm({
      reviewerName: review.reviewer_name || "",
      country: review.country || "",
      platform: review.platform || "",
      rating: String(review.rating || 5),
      content: review.content || "",
      avatarUrl: review.avatar_url || "",
      status: review.status || "published",
      sortOrder: String(review.sort_order || 0),
      isFeatured: review.is_featured === true,
      isVisible: review.is_visible !== false,
    });

    showMessage("وضع التعديل مفعل الآن. عدّل البيانات ثم اضغط حفظ التعديلات.", "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessage();

    if (!supabase) {
      showMessage("الاتصال بقاعدة البيانات غير مفعل.", "error");
      return;
    }

    if (!form.reviewerName.trim()) {
      showMessage("يرجى كتابة اسم صاحب التقييم.", "error");
      return;
    }

    if (!form.content.trim()) {
      showMessage("يرجى كتابة نص التقييم.", "error");
      return;
    }

    const ratingNumber = Math.max(1, Math.min(5, Number(form.rating || 5)));

    const payload = {
      reviewer_name: form.reviewerName.trim(),
      country: form.country.trim(),
      platform: form.platform.trim(),
      rating: ratingNumber,
      content: form.content.trim(),
      avatar_url: form.avatarUrl.trim() || null,
      is_featured: form.isFeatured,
      sort_order: Number(form.sortOrder || 0),
      status: form.status,
      is_visible: form.isVisible,
      updated_at: new Date().toISOString(),
    };

    setIsSaving(true);

    const result = editingId
      ? await supabase.from("reviews").update(payload).eq("id", editingId)
      : await supabase.from("reviews").insert(payload);

    setIsSaving(false);

    if (result.error) {
      showMessage("تعذر حفظ التقييم. يرجى المحاولة مرة أخرى.", "error");
      return;
    }

    const successText = editingId
      ? "تم حفظ تعديلات التقييم بنجاح."
      : "تم إضافة التقييم بنجاح.";

    resetForm({ keepMessage: true });
    await loadReviews();
    showMessage(successText, "success");
  }

  async function quickUpdateReview(
    reviewId: number,
    changes: Partial<Pick<Review, "status" | "is_visible" | "is_featured">>,
    successMessage: string
  ) {
    if (!supabase) return;

    clearMessage();

    const { error } = await supabase
      .from("reviews")
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (error) {
      showMessage("تعذر تنفيذ الإجراء. يرجى المحاولة مرة أخرى.", "error");
      return;
    }

    await loadReviews();
    showMessage(successMessage, "success");
  }

  async function deleteReview(reviewId: number) {
    if (!supabase) return;

    const confirmed = window.confirm(
      "هل أنت متأكد من حذف هذا التقييم؟ هذا الحذف مخصص للاختبار والتنظيف حالياً."
    );

    if (!confirmed) return;

    clearMessage();

    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

    if (error) {
      showMessage("تعذر حذف التقييم. يرجى المحاولة مرة أخرى.", "error");
      return;
    }

    if (editingId === reviewId) {
      resetForm({ keepMessage: true });
    }

    await loadReviews();
    showMessage("تم حذف التقييم بنجاح.", "success");
  }

  const filteredReviews = useMemo(() => {
    const text = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesSearch =
        !text ||
        [
          review.reviewer_name,
          review.country,
          review.platform,
          review.content,
          review.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(text);

      const matchesStatus =
        statusFilter === "all" || review.status === statusFilter;

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && review.is_visible !== false) ||
        (visibilityFilter === "hidden" && review.is_visible === false) ||
        (visibilityFilter === "featured" && review.is_featured === true);

      return matchesSearch && matchesStatus && matchesVisibility;
    });
  }, [reviews, search, statusFilter, visibilityFilter]);

  const stats = useMemo(() => {
    return {
      total: reviews.length,
      published: reviews.filter((review) => review.status === "published").length,
      featured: reviews.filter((review) => review.is_featured === true).length,
      hidden: reviews.filter(
        (review) => review.is_visible === false || review.status === "hidden"
      ).length,
    };
  }, [reviews]);

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
            يجب تسجيل الدخول بحساب إداري نشط للوصول إلى إدارة التقييمات.
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
                إدارة التقييمات
              </h1>
              <p className="mt-2 text-sm text-white/55">{adminEmail}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  await loadReviews();
                  showMessage("تم تحديث بيانات التقييمات بنجاح.", "success");
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white/75"
              >
                تحديث البيانات
              </button>

              <Link
                href="/reviews"
                className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-5 py-3 text-sm font-bold text-yellow-100"
              >
                عرض الصفحة العامة
              </Link>
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard title="إجمالي التقييمات" value={stats.total} />
          <StatCard title="منشورة" value={stats.published} />
          <StatCard title="مميزة" value={stats.featured} />
          <StatCard title="مخفية" value={stats.hidden} />
        </div>

        {message && <MessageBox type={messageType}>{message}</MessageBox>}

        <section className="mb-6 rounded-[2rem] border border-green-400/20 bg-[#07130f]/90 p-6">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 className="text-2xl font-black text-white">
              {editingId ? "تعديل تقييم" : "إضافة تقييم جديد"}
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

          <form onSubmit={saveReview} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="اسم صاحب التقييم">
                <input
                  value={form.reviewerName}
                  onChange={(event) =>
                    updateForm("reviewerName", event.target.value)
                  }
                  placeholder="مثال: صانع محتوى من TikTok"
                  className={inputClassName}
                />
              </Field>

              <Field label="الدولة">
                <input
                  value={form.country}
                  onChange={(event) => updateForm("country", event.target.value)}
                  placeholder="مثال: تركيا"
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

              <Field label="رابط صورة/أفاتار - اختياري">
                <input
                  value={form.avatarUrl}
                  onChange={(event) =>
                    updateForm("avatarUrl", event.target.value)
                  }
                  placeholder="https://..."
                  className={inputClassName}
                />
              </Field>

              <Field label="التقييم من 1 إلى 5">
                <select
                  value={form.rating}
                  onChange={(event) => updateForm("rating", event.target.value)}
                  className={inputClassName}
                >
                  <option value="5">5 نجوم</option>
                  <option value="4">4 نجوم</option>
                  <option value="3">3 نجوم</option>
                  <option value="2">2 نجوم</option>
                  <option value="1">1 نجمة</option>
                </select>
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
                  تقييم مميز
                </label>
              </div>
            </div>

            <Field label="نص التقييم">
              <textarea
                value={form.content}
                onChange={(event) => updateForm("content", event.target.value)}
                placeholder="اكتب نص التقييم الذي سيظهر في صفحة التقييمات العامة."
                className={`${inputClassName} min-h-32 resize-none`}
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
                  : "إضافة التقييم"}
            </button>
          </form>
        </section>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالاسم، الدولة، المنصة، النص..."
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
              <option value="all">كل التقييمات</option>
              <option value="visible">الظاهرة للعامة</option>
              <option value="hidden">المخفية</option>
              <option value="featured">المميزة</option>
            </select>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-white">قائمة التقييمات</h2>
            <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/60">
              {filteredReviews.length} تقييم
            </div>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-white/55">
              لا توجد تقييمات مطابقة حالياً.
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredReviews.map((review) => (
                <ReviewAdminCard
                  key={review.id}
                  review={review}
                  onEdit={() => editReview(review)}
                  onDelete={() => deleteReview(review.id)}
                  onToggleVisible={() =>
                    quickUpdateReview(
                      review.id,
                      {
                        is_visible: review.is_visible === false,
                      },
                      review.is_visible === false
                        ? "تم إظهار التقييم بنجاح."
                        : "تم إخفاء التقييم من الظهور العام بنجاح."
                    )
                  }
                  onToggleFeatured={() =>
                    quickUpdateReview(
                      review.id,
                      {
                        is_featured: review.is_featured !== true,
                      },
                      review.is_featured === true
                        ? "تم إلغاء تمييز التقييم بنجاح."
                        : "تم تمييز التقييم بنجاح."
                    )
                  }
                  onPublish={() =>
                    quickUpdateReview(
                      review.id,
                      {
                        status: "published",
                        is_visible: true,
                      },
                      "تم نشر التقييم بنجاح."
                    )
                  }
                  onHide={() =>
                    quickUpdateReview(
                      review.id,
                      {
                        status: "hidden",
                        is_visible: false,
                      },
                      "تم إخفاء التقييم بالكامل بنجاح."
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

function ReviewAdminCard({
  review,
  onEdit,
  onDelete,
  onToggleVisible,
  onToggleFeatured,
  onPublish,
  onHide,
}: {
  review: Review;
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
            <Badge variant={review.status === "published" ? "green" : "yellow"}>
              {statusLabel(review.status)}
            </Badge>

            <Badge variant={review.is_visible === false ? "red" : "purple"}>
              {review.is_visible === false ? "مخفي" : "ظاهر"}
            </Badge>

            {review.is_featured && <Badge variant="gold">مميز</Badge>}

            <Badge variant="gray">ترتيب: {review.sort_order || 0}</Badge>
          </div>

          <h3 className="break-words text-2xl font-black text-white">
            {review.reviewer_name || "بدون اسم"}
          </h3>

          <p className="mt-2 text-sm text-white/50">
            {review.country || "بدون دولة"} —{" "}
            {review.platform || "بدون منصة"} — {review.rating || 5} نجوم
          </p>

          <p className="mt-4 leading-8 text-white/70">
            {review.content || "لا يوجد نص."}
          </p>

          {review.avatar_url && (
            <p className="mt-3 break-all text-xs text-purple-200/70">
              Avatar: {review.avatar_url}
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:w-72">
          <ActionButton onClick={onEdit}>تعديل</ActionButton>
          <ActionButton onClick={onToggleFeatured}>
            {review.is_featured ? "إلغاء التمييز" : "تمييز"}
          </ActionButton>
          <ActionButton onClick={onToggleVisible}>
            {review.is_visible === false ? "إظهار" : "إخفاء"}
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
    <div className={`mb-6 rounded-3xl border p-5 text-center font-black leading-8 ${className}`}>
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
