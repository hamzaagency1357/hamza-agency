"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";

type Partner = {
  id: number;
  name: string;
  slug: string | null;
  category: string | null;
  description: string | null;
  badge: string | null;
  logo_url: string | null;
  detail_url: string | null;
  website_url: string | null;
  status: string | null;
  is_visible: boolean | null;
  is_featured: boolean | null;
  sort_order: number | null;
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

type PartnerForm = {
  name: string;
  slug: string;
  category: string;
  description: string;
  badge: string;
  logo_url: string;
  detail_url: string;
  website_url: string;
  status: string;
  is_visible: boolean;
  is_featured: boolean;
  sort_order: string;
};

const emptyForm: PartnerForm = {
  name: "",
  slug: "",
  category: "",
  description: "",
  badge: "اتفاق تعاون",
  logo_url: "",
  detail_url: "",
  website_url: "",
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

const inputClassName =
  "w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-white outline-none transition placeholder:text-white/30 focus:border-purple-300/50";

function isLogoMedia(item: MediaOption) {
  const fileType = (item.file_type || "").toLowerCase();
  const category = (item.category || "").toLowerCase();
  const pageSlug = (item.page_slug || "").toLowerCase();
  const url = item.file_url || "";

  if (!item.is_active || !url) return false;

  const isImageUrl = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(url);
  const isImageType = fileType === "image" || fileType === "logo" || fileType.startsWith("image");
  const isLogoContext =
    category.includes("logo") ||
    category.includes("partner") ||
    category.includes("program") ||
    pageSlug.includes("partner") ||
    pageSlug.includes("program");

  return isImageType || isImageUrl || isLogoContext;
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

function getPartnerSnapshot(partner: Partner) {
  return {
    id: partner.id,
    name: partner.name,
    slug: partner.slug,
    category: partner.category,
    description: partner.description,
    badge: partner.badge,
    logo_url: partner.logo_url,
    detail_url: partner.detail_url,
    website_url: partner.website_url,
    status: partner.status,
    is_visible: partner.is_visible,
    is_featured: partner.is_featured,
    sort_order: partner.sort_order,
    created_at: partner.created_at,
    updated_at: partner.updated_at,
  };
}

export default function AdminPartnersPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  const [partners, setPartners] = useState<Partner[]>([]);
  const [mediaOptions, setMediaOptions] = useState<MediaOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");

  const loadPartners = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        setMessageType("error");
        setMessage("تعذر تحميل بيانات الشركاء والبرامج حالياً.");
        return;
      }

      setPartners((data || []) as Partner[]);
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء تحميل بيانات الشركاء والبرامج.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMediaOptions = useCallback(async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from("media")
        .select("id, name, file_url, file_type, category, alt_text, page_slug, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(80);

      if (error || !data) {
        setMediaOptions([]);
        return;
      }

      setMediaOptions((data as MediaOption[]).filter(isLogoMedia));
    } catch {
      setMediaOptions([]);
    }
  }, []);

  const initializeAdminPage = useCallback(async () => {
    setChecking(true);
    setMessage("");

    try {
      if (!supabase) {
        setAuthorized(false);
        setMessageType("error");
        setMessage("تعذر الاتصال بقاعدة البيانات. يرجى مراجعة إعدادات Supabase.");
        return;
      }

      const access = await requireAdminModuleAccess("partners");

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
      await Promise.all([loadPartners(), loadMediaOptions()]);
    } catch {
      setAuthorized(false);
      setMessageType("error");
      setMessage("حدث خطأ أثناء التحقق من صلاحيات الدخول.");
    } finally {
      setChecking(false);
    }
  }, [loadMediaOptions, loadPartners]);

  useEffect(() => {
    void initializeAdminPage();
  }, [initializeAdminPage]);

  const filteredPartners = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return partners.filter((partner) => {
      const matchesSearch =
        !normalizedSearch ||
        partner.name?.toLowerCase().includes(normalizedSearch) ||
        partner.slug?.toLowerCase().includes(normalizedSearch) ||
        partner.category?.toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === "all" || partner.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [partners, search, statusFilter]);

  const stats = useMemo(() => {
    const total = partners.length;
    const visible = partners.filter(
      (partner) => partner.is_visible !== false && partner.status === "published"
    ).length;
    const featured = partners.filter((partner) => partner.is_featured).length;
    const hidden = partners.filter(
      (partner) => partner.is_visible === false || partner.status === "hidden"
    ).length;

    return { total, visible, featured, hidden };
  }, [partners]);

  function updateForm<K extends keyof PartnerForm>(key: K, value: PartnerForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleNameChange(value: string) {
    setForm((current) => ({
      ...current,
      name: value,
      slug: editingPartner || current.slug.trim() ? current.slug : generateSlug(value),
    }));
  }

  function startEdit(partner: Partner) {
    setEditingPartner(partner);
    setForm({
      name: partner.name || "",
      slug: partner.slug || "",
      category: partner.category || "",
      description: partner.description || "",
      badge: partner.badge || "اتفاق تعاون",
      logo_url: partner.logo_url || "",
      detail_url: partner.detail_url || "",
      website_url: partner.website_url || "",
      status: partner.status || "published",
      is_visible: partner.is_visible !== false,
      is_featured: partner.is_featured === true,
      sort_order: String(partner.sort_order ?? 10),
    });
    setMessageType("info");
    setMessage("يمكنك الآن تعديل بيانات الشريك أو البرنامج المحدد.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm(clearMessage = true) {
    setEditingPartner(null);
    setForm(emptyForm);

    if (clearMessage) setMessage("");
  }

  async function savePartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || saving) return;

    const name = form.name.trim();
    const slug = form.slug.trim() || generateSlug(name);

    if (!name) {
      setMessageType("error");
      setMessage("يرجى إدخال اسم الشريك أو البرنامج.");
      return;
    }

    if (!slug) {
      setMessageType("error");
      setMessage("يرجى إدخال رابط تعريفي صحيح للبرنامج.");
      return;
    }

    if (!form.description.trim()) {
      setMessageType("error");
      setMessage("يرجى إدخال وصف احترافي للشريك أو البرنامج.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      name,
      slug,
      category: form.category.trim() || "برنامج وشريك تعاون",
      description: form.description.trim(),
      badge: form.badge.trim() || "اتفاق تعاون",
      logo_url: form.logo_url.trim() || null,
      detail_url: form.detail_url.trim() || `/programs/${slug}`,
      website_url: form.website_url.trim() || null,
      status: form.status,
      is_visible: form.is_visible,
      is_featured: form.is_featured,
      sort_order: Number.parseInt(form.sort_order, 10) || 10,
      updated_at: new Date().toISOString(),
    };

    try {
      let successText = "";

      if (editingPartner) {
        const { error } = await supabase.from("partners").update(payload).eq("id", editingPartner.id);

        if (error) {
          setMessageType("error");
          setMessage("تعذر حفظ تعديلات الشريك أو البرنامج.");
          return;
        }

        await logAdminActivity({
          action: "update_partner",
          module: "partners",
          adminEmail: adminProfile?.email || "",
          recordId: editingPartner.id,
          details: "تعديل شريك أو برنامج من لوحة الإدارة",
          oldData: getPartnerSnapshot(editingPartner),
          newData: payload,
        });

        successText = "تم حفظ تعديلات الشريك أو البرنامج بنجاح.";
      } else {
        const { error } = await supabase.from("partners").insert(payload);

        if (error) {
          setMessageType("error");
          setMessage("تعذر إضافة الشريك أو البرنامج. تأكد أن الرابط التعريفي غير مستخدم مسبقاً.");
          return;
        }

        await logAdminActivity({
          action: "create_partner",
          module: "partners",
          adminEmail: adminProfile?.email || "",
          recordId: payload.slug,
          details: "إضافة شريك أو برنامج من لوحة الإدارة",
          oldData: null,
          newData: payload,
        });

        successText = "تمت إضافة الشريك أو البرنامج بنجاح.";
      }

      resetForm(false);
      await loadPartners();

      setMessageType("success");
      setMessage(successText);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء حفظ بيانات الشريك أو البرنامج.");
    } finally {
      setSaving(false);
    }
  }

  async function updatePartnerVisibility(partner: Partner, visible: boolean) {
    if (!supabase) return;

    const nextStatus = visible ? "published" : "hidden";
    const updatePayload = { is_visible: visible, status: nextStatus, updated_at: new Date().toISOString() };

    try {
      const { error } = await supabase
        .from("partners")
        .update(updatePayload)
        .eq("id", partner.id);

      if (error) {
        setMessageType("error");
        setMessage("تعذر تحديث حالة الظهور.");
        return;
      }

      await logAdminActivity({
        action: "toggle_partner_visibility",
        module: "partners",
        adminEmail: adminProfile?.email || "",
        recordId: partner.id,
        details: visible ? "إظهار شريك أو برنامج للعامة" : "إخفاء شريك أو برنامج من العامة",
        oldData: getPartnerSnapshot(partner),
        newData: {
          ...getPartnerSnapshot(partner),
          ...updatePayload,
        },
      });

      setMessageType("success");
      setMessage(visible ? "تم إظهار الشريك أو البرنامج." : "تم إخفاء الشريك أو البرنامج.");
      await loadPartners();
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء تحديث حالة الظهور.");
    }
  }

  async function toggleFeatured(partner: Partner) {
    if (!supabase) return;

    const nextValue = !partner.is_featured;
    const updatePayload = { is_featured: nextValue, updated_at: new Date().toISOString() };

    try {
      const { error } = await supabase
        .from("partners")
        .update(updatePayload)
        .eq("id", partner.id);

      if (error) {
        setMessageType("error");
        setMessage("تعذر تحديث تمييز الشريك أو البرنامج.");
        return;
      }

      await logAdminActivity({
        action: "toggle_partner_featured",
        module: "partners",
        adminEmail: adminProfile?.email || "",
        recordId: partner.id,
        details: nextValue ? "تمييز شريك أو برنامج" : "إلغاء تمييز شريك أو برنامج",
        oldData: getPartnerSnapshot(partner),
        newData: {
          ...getPartnerSnapshot(partner),
          ...updatePayload,
        },
      });

      setMessageType("success");
      setMessage(nextValue ? "تم تمييز الشريك أو البرنامج." : "تم إلغاء التمييز.");
      await loadPartners();
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء تحديث التمييز.");
    }
  }

  async function archivePartner(partner: Partner) {
    if (!supabase) return;

    const confirmed = window.confirm(
      `هل تريد حذف ${partner.name} من الواجهة؟ سيتم إخفاؤه وأرشفته بدون مسح بياناته نهائياً.`
    );

    if (!confirmed) return;

    const archivePayload = {
      name: `محذوف - ${partner.name}`,
      status: "hidden",
      is_visible: false,
      is_featured: false,
      sort_order: 9999,
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from("partners")
        .update(archivePayload)
        .eq("id", partner.id);

      if (error) {
        setMessageType("error");
        setMessage("تعذر حذف الشريك أو البرنامج بشكل آمن.");
        return;
      }

      await logAdminActivity({
        action: "archive_partner",
        module: "partners",
        adminEmail: adminProfile?.email || "",
        recordId: partner.id,
        details: "حذف آمن وأرشفة شريك أو برنامج من لوحة الإدارة",
        oldData: getPartnerSnapshot(partner),
        newData: {
          ...getPartnerSnapshot(partner),
          ...archivePayload,
        },
      });

      if (editingPartner?.id === partner.id) resetForm();

      setMessageType("success");
      setMessage("تم حذف الشريك أو البرنامج من الواجهة وأرشفته بأمان.");
      await loadPartners();
    } catch {
      setMessageType("error");
      setMessage("حدث خطأ أثناء حذف الشريك أو البرنامج بشكل آمن.");
    }
  }

  function getStatusLabel(status: string | null | undefined) {
    return statusOptions.find((option) => option.value === status)?.label || "غير محدد";
  }

  function getPublicState(partner: Partner) {
    return partner.is_visible !== false && partner.status === "published" ? "ظاهر للعامة" : "غير ظاهر";
  }

  function getPartnerLink(partner: Partner) {
    return partner.detail_url || (partner.slug ? `/programs/${partner.slug}` : "/programs");
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
          <p className="mt-4 leading-8 text-white/70">{message || "يرجى تسجيل الدخول بحساب إداري مخول للوصول إلى هذه الصفحة."}</p>
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
            <h1 className="mt-4 text-4xl font-black md:text-5xl">إدارة الشركاء والبرامج</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              تحكم بالبرامج المتعاقد معها والشركاء الظاهرين في صفحة “شركاؤنا وبرامجنا”، مع إمكانية الترتيب، الإظهار، الإخفاء، وتحديث الروابط والشعارات.
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

        {message && (
          <div
            className={`mb-8 rounded-3xl border p-5 text-sm font-bold ${
              messageType === "success"
                ? "border-green-400/25 bg-green-500/10 text-green-100"
                : messageType === "error"
                  ? "border-red-400/25 bg-red-500/10 text-red-100"
                  : "border-purple-400/25 bg-purple-500/10 text-purple-100"
            }`}
          >
            {message}
          </div>
        )}

        <section className="mb-10 rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">{editingPartner ? "تعديل شريك أو برنامج" : "إضافة شريك أو برنامج"}</h2>
              <p className="mt-2 text-sm leading-7 text-white/55">
                البيانات التي تحفظ هنا تظهر في صفحة الشركاء العامة حسب حالة النشر والظهور.
              </p>
            </div>

            {editingPartner && (
              <button
                type="button"
                onClick={() => resetForm()}
                className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-black text-white/75"
              >
                إلغاء التعديل
              </button>
            )}
          </div>

          <form onSubmit={savePartner} className="grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="اسم الشريك أو البرنامج">
                <input value={form.name} onChange={(event) => handleNameChange(event.target.value)} className={inputClassName} placeholder="مثال: TikTok" />
              </Field>

              <Field label="الرابط التعريفي Slug">
                <input value={form.slug} onChange={(event) => updateForm("slug", generateSlug(event.target.value))} className={inputClassName} placeholder="مثال: tiktok" dir="ltr" />
              </Field>

              <Field label="التصنيف">
                <input value={form.category} onChange={(event) => updateForm("category", event.target.value)} className={inputClassName} placeholder="مثال: صناعة المحتوى والبث المباشر" />
              </Field>

              <Field label="الشارة">
                <input value={form.badge} onChange={(event) => updateForm("badge", event.target.value)} className={inputClassName} placeholder="مثال: اتفاق تعاون" />
              </Field>

              <Field label="رابط صفحة البرنامج">
                <input value={form.detail_url} onChange={(event) => updateForm("detail_url", event.target.value)} className={inputClassName} placeholder="/programs/tiktok" dir="ltr" />
              </Field>

              <Field label="شعار الشريك من Media Library">
                <div className="grid gap-3">
                  <input
                    value={form.logo_url}
                    onChange={(event) => updateForm("logo_url", event.target.value)}
                    className={inputClassName}
                    placeholder="اختر من مكتبة الوسائط أو الصق رابط الشعار"
                    dir="ltr"
                  />

                  <select
                    value=""
                    onChange={(event) => {
                      if (event.target.value) updateForm("logo_url", event.target.value);
                    }}
                    className={inputClassName}
                  >
                    <option value="" className="bg-black">
                      اختر شعاراً من Media Library
                    </option>
                    {mediaOptions.map((item) => (
                      <option key={item.id} value={item.file_url || ""} className="bg-black">
                        {item.name || item.alt_text || item.file_url}
                      </option>
                    ))}
                  </select>

                  {form.logo_url ? (
                    <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/25 p-3">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-purple-400/20 bg-purple-500/10">
                        <Image
                          src={form.logo_url}
                          alt="معاينة الشعار"
                          width={64}
                          height={64}
                          unoptimized
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => updateForm("logo_url", "")}
                        className="rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-black text-red-100"
                      >
                        إزالة الشعار
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs leading-6 text-white/40">
                      تظهر هنا الصور والشعارات المفعّلة من جدول media. يبقى اللصق اليدوي متاحاً.
                    </p>
                  )}
                </div>
              </Field>

              <Field label="رابط خارجي اختياري">
                <input value={form.website_url} onChange={(event) => updateForm("website_url", event.target.value)} className={inputClassName} placeholder="https://example.com" dir="ltr" />
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
                  <span className="font-black text-white/75">برنامج مميز</span>
                  <input type="checkbox" checked={form.is_featured} onChange={(event) => updateForm("is_featured", event.target.checked)} className="h-5 w-5" />
                </label>
              </div>
            </div>

            <Field label="الوصف الاحترافي">
              <textarea value={form.description} onChange={(event) => updateForm("description", event.target.value)} className={`${inputClassName} min-h-32 resize-y leading-8`} placeholder="اكتب وصفاً واضحاً ومناسباً للظهور على الموقع العام." />
            </Field>

            <div className="flex flex-col gap-3 md:flex-row">
              <button type="submit" disabled={saving} className="rounded-full bg-purple-600 px-8 py-4 font-black text-white shadow-2xl disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "جاري الحفظ..." : editingPartner ? "حفظ التعديلات" : "إضافة الشريك أو البرنامج"}
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
              <h2 className="text-2xl font-black">قائمة الشركاء والبرامج</h2>
              <p className="mt-2 text-sm leading-7 text-white/55">يمكنك البحث والتصفية ثم تعديل أي عنصر من القائمة.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClassName} placeholder="بحث بالاسم أو التصنيف" />

              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClassName}>
                <option value="all" className="bg-black">كل الحالات</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value} className="bg-black">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center text-white/60">جاري تحميل البيانات...</div>
          ) : filteredPartners.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/25 p-8 text-center">
              <h3 className="text-xl font-black">لا توجد نتائج مطابقة</h3>
              <p className="mt-3 text-white/55">جرّب تغيير كلمات البحث أو حالة التصفية.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {filteredPartners.map((partner) => (
                <article key={partner.id} className="rounded-[2rem] border border-white/10 bg-black/25 p-5">
                  <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                    <div>
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge>{getStatusLabel(partner.status)}</Badge>
                        <Badge>{getPublicState(partner)}</Badge>
                        {partner.is_featured && <Badge>مميز</Badge>}
                        <Badge>ترتيب {partner.sort_order ?? 0}</Badge>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-purple-400/20 bg-purple-500/10">
                          {partner.logo_url ? (
                            <Image
                              src={partner.logo_url}
                              alt={partner.name}
                              width={80}
                              height={80}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-black text-yellow-100">{partner.name.slice(0, 1)}</span>
                          )}
                        </div>

                        <div>
                          <h3 className="text-2xl font-black">{partner.name}</h3>
                          <p className="mt-1 text-sm font-bold text-yellow-100/80">{partner.category || "برنامج وشريك تعاون"}</p>
                          <p className="mt-4 leading-8 text-white/65">{partner.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <Link href={getPartnerLink(partner)} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-black text-white/75">
                        فتح الصفحة العامة
                      </Link>

                      <button onClick={() => startEdit(partner)} className="rounded-2xl border border-purple-400/20 bg-purple-500/10 px-4 py-3 text-sm font-black text-purple-100">
                        تعديل
                      </button>

                      <button onClick={() => toggleFeatured(partner)} className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-sm font-black text-yellow-100">
                        {partner.is_featured ? "إلغاء التمييز" : "تمييز"}
                      </button>

                      <button
                        onClick={() => updatePartnerVisibility(partner, partner.is_visible === false || partner.status === "hidden")}
                        className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm font-black text-blue-100"
                      >
                        {partner.is_visible === false || partner.status === "hidden" ? "إظهار" : "إخفاء"}
                      </button>

                      <button onClick={() => archivePartner(partner)} className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-black text-red-100">
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
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-white/70">
      {children}
    </span>
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
