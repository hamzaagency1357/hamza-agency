"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type AnyRow = Record<string, unknown>;
type PermissionKey = "can_view" | "can_create" | "can_edit" | "can_delete" | "can_export" | "can_manage";

type PermissionForm = {
  admin_email: string;
  module_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_manage: boolean;
  notes: string;
};

const moduleOptions = [
  { key: "dashboard", label: "لوحة التحكم" },
  { key: "applications", label: "طلبات الانضمام" },
  { key: "service_requests", label: "طلبات الخدمات" },
  { key: "programs", label: "البرامج" },
  { key: "pages", label: "الصفحات" },
  { key: "media", label: "الوسائط" },
  { key: "announcements", label: "الإعلانات" },
  { key: "settings", label: "الإعدادات" },
  { key: "jobs", label: "الوظائف" },
  { key: "reviews", label: "التقييمات" },
  { key: "success_stories", label: "قصص النجاح" },
  { key: "partners", label: "الشركاء" },
  { key: "gallery", label: "المعرض" },
  { key: "activity_logs", label: "سجل النشاطات" },
  { key: "trash", label: "سلة المحذوفات" },
  { key: "backups", label: "النسخ الاحتياطي" },
  { key: "notifications", label: "الإشعارات" },
  { key: "analytics", label: "التحليلات" },
  { key: "launch_checklist", label: "فحص الإطلاق" },
  { key: "permissions", label: "الصلاحيات" },
];

const permissionFields: { key: PermissionKey; label: string; description: string }[] = [
  { key: "can_view", label: "عرض", description: "مشاهدة القسم والبيانات." },
  { key: "can_create", label: "إضافة", description: "إنشاء عناصر جديدة." },
  { key: "can_edit", label: "تعديل", description: "تحديث العناصر الحالية." },
  { key: "can_delete", label: "حذف", description: "حذف أو نقل العناصر للسلة." },
  { key: "can_export", label: "تصدير", description: "تصدير البيانات CSV / Excel." },
  { key: "can_manage", label: "إدارة", description: "تحكم إداري متقدم داخل القسم." },
];

const emptyForm: PermissionForm = {
  admin_email: "",
  module_key: "dashboard",
  can_view: true,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_export: false,
  can_manage: false,
  notes: "",
};

function getString(row: AnyRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
  }

  return fallback;
}

function getBoolean(row: AnyRow, key: PermissionKey) {
  return row[key] === true;
}

function getModuleLabel(moduleKey: string) {
  return moduleOptions.find((module) => module.key === moduleKey)?.label || moduleKey || "غير محدد";
}

function formatDate(value: string) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toForm(row: AnyRow): PermissionForm {
  return {
    admin_email: getString(row, ["admin_email", "email"], ""),
    module_key: getString(row, ["module_key"], "dashboard"),
    can_view: getBoolean(row, "can_view"),
    can_create: getBoolean(row, "can_create"),
    can_edit: getBoolean(row, "can_edit"),
    can_delete: getBoolean(row, "can_delete"),
    can_export: getBoolean(row, "can_export"),
    can_manage: getBoolean(row, "can_manage"),
    notes: getString(row, ["notes"], ""),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export default function AdminPermissionsPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsers, setAdminUsers] = useState<AnyRow[]>([]);
  const [permissions, setPermissions] = useState<AnyRow[]>([]);
  const [form, setForm] = useState<PermissionForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("dashboard");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");

      if (access.profile.role !== "super_admin") {
        setIsForbidden(true);
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        return;
      }

      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadData();
  }, [isAuthorized]);

  async function loadData() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setIsLoading(true);
    setError("");
    setMessage("");

    const [usersResult, permissionsResult] = await Promise.all([
      supabase.from("admin_users").select("*").limit(200),
      supabase.from("admin_permissions").select("*").limit(500),
    ]);

    setIsLoading(false);

    if (usersResult.error) {
      setError("تعذر تحميل حسابات الإدارة. يرجى التأكد من صلاحيات جدول admin_users.");
      return;
    }

    if (permissionsResult.error) {
      setError("تعذر تحميل صلاحيات الإدارة. يرجى التأكد من إعدادات جدول admin_permissions.");
      return;
    }

    const users = ((usersResult.data || []) as AnyRow[]).slice().sort((a, b) => {
      const first = getString(a, ["email"]);
      const second = getString(b, ["email"]);
      return first.localeCompare(second);
    });

    const rows = ((permissionsResult.data || []) as AnyRow[]).slice().sort((a, b) => {
      const emailCompare = getString(a, ["admin_email"]).localeCompare(getString(b, ["admin_email"]));
      if (emailCompare !== 0) return emailCompare;
      return getString(a, ["module_key"]).localeCompare(getString(b, ["module_key"]));
    });

    setAdminUsers(users);
    setPermissions(rows);

    if (!form.admin_email && users.length > 0) {
      setForm((current) => ({ ...current, admin_email: getString(users[0], ["email"]) }));
    }
  }

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissions;

    return permissions.filter((permission) => {
      const text = [
        getString(permission, ["admin_email"]),
        getString(permission, ["module_key"]),
        getModuleLabel(getString(permission, ["module_key"])),
        getString(permission, ["notes"]),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(query);
    });
  }, [permissions, search]);

  const selectedExistingPermission = useMemo(() => {
    const email = normalizeEmail(form.admin_email);
    return permissions.find(
      (permission) => normalizeEmail(getString(permission, ["admin_email"])) === email && getString(permission, ["module_key"]) === form.module_key
    );
  }, [permissions, form.admin_email, form.module_key]);

  function fillFromExistingIfAvailable(nextEmail: string, nextModule: string) {
    const existing = permissions.find(
      (permission) => normalizeEmail(getString(permission, ["admin_email"])) === normalizeEmail(nextEmail) && getString(permission, ["module_key"]) === nextModule
    );

    if (existing) {
      setForm(toForm(existing));
      return;
    }

    setForm({ ...emptyForm, admin_email: nextEmail, module_key: nextModule });
  }

  async function savePermission() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const email = form.admin_email.trim();
    const moduleKey = form.module_key.trim();

    if (!email || !moduleKey) {
      setError("اختر حساب الإدارة والقسم قبل الحفظ.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    const payload = {
      admin_email: email,
      module_key: moduleKey,
      can_view: form.can_view,
      can_create: form.can_create,
      can_edit: form.can_edit,
      can_delete: form.can_delete,
      can_export: form.can_export,
      can_manage: form.can_manage,
      notes: form.notes.trim() || null,
      updated_by: adminEmail || null,
    };

    const existing = selectedExistingPermission;
    const existingId = existing ? getString(existing, ["id"]) : "";

    const result = existingId
      ? await supabase.from("admin_permissions").update(payload).eq("id", existingId)
      : await supabase.from("admin_permissions").insert({ ...payload, created_by: adminEmail || null });

    setIsSaving(false);

    if (result.error) {
      setError("تعذر حفظ الصلاحيات. تأكد أن الحساب الحالي Super Admin وأن السجل غير مكرر.");
      return;
    }

    setMessage(existingId ? "تم تحديث الصلاحيات بنجاح." : "تم إنشاء الصلاحيات بنجاح.");
    await loadData();
  }

  function editPermission(permission: AnyRow) {
    setForm(toForm(permission));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جاري التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (isForbidden) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
        <section className="mx-auto max-w-4xl rounded-[2rem] border border-red-400/25 bg-red-500/10 p-8 text-center">
          <div className="text-sm font-black tracking-[0.25em] text-red-100">صلاحيات محدودة</div>
          <h1 className="mt-3 text-3xl font-black">إدارة الصلاحيات مخصصة للسوبر أدمن فقط</h1>
          <p className="mt-4 leading-8 text-white/60">هذه الصفحة تتحكم بصلاحيات المدراء، لذلك لا تظهر إلا لحساب السوبر أدمن.</p>
          <p className="mt-3 text-sm text-white/45">الحساب: {adminEmail}</p>
          <Link href="/admin" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/[0.06] px-6 py-3 font-bold text-white/75">
            العودة إلى لوحة التحكم
          </Link>
        </section>
      </main>
    );
  }

  if (!isAuthorized) return null;

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-5 pb-40 text-white md:p-8 md:pb-10">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-2 text-sm font-bold text-purple-100">
              الصلاحيات المتقدمة
            </div>
            <h1 className="text-4xl font-black md:text-5xl">Admin Permissions</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              إدارة أولية لصلاحيات المدراء حسب القسم. هذه المرحلة تؤسس النظام بدون تغيير سلوك الحماية الحالي في باقي الصفحات.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-3 font-black shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث البيانات"}
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة التحكم
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب السوبر أدمن: <span className="text-white">{adminEmail}</span>
        </div>

        <div className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-5 leading-8 text-yellow-50/85">
          هذه الصفحة تحفظ الصلاحيات في قاعدة البيانات فقط. تطبيق الصلاحيات على كل الأقسام سيتم تدريجياً في مرحلة الربط المتقدم.
        </div>

        {message && <div className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-green-100">{message}</div>}
        {error && <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-red-100">{error}</div>}

        <section className="mb-8 rounded-[2rem] border border-purple-400/20 bg-purple-500/[0.05] p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-2">
            <h2 className="text-2xl font-black">إضافة أو تعديل صلاحية</h2>
            <p className="text-sm leading-7 text-white/50">اختر حساب المدير والقسم، ثم حدد الصلاحيات المطلوبة واحفظها.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-white/70">حساب الإدارة</span>
              <select
                value={form.admin_email}
                onChange={(event) => fillFromExistingIfAvailable(event.target.value, form.module_key)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-purple-300/50"
              >
                <option value="">اختر حساباً</option>
                {adminUsers.map((user) => {
                  const email = getString(user, ["email"]);
                  const role = getString(user, ["role"], "admin");
                  return (
                    <option key={email} value={email}>
                      {email} — {role}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold text-white/70">القسم</span>
              <select
                value={form.module_key}
                onChange={(event) => fillFromExistingIfAvailable(form.admin_email, event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-purple-300/50"
              >
                {moduleOptions.map((module) => (
                  <option key={module.key} value={module.key}>
                    {module.label} — {module.key}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {permissionFields.map((field) => (
              <button
                key={field.key}
                type="button"
                onClick={() => setForm((current) => ({ ...current, [field.key]: !current[field.key] }))}
                className={`rounded-2xl border p-4 text-right transition ${
                  form[field.key]
                    ? "border-purple-300/45 bg-purple-500/20 text-white"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:border-purple-300/35"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-black">{field.label}</span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold">
                    {form[field.key] ? "مفعلة" : "متوقفة"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 opacity-70">{field.description}</p>
              </button>
            ))}
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-bold text-white/70">ملاحظات داخلية</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-purple-300/50"
              placeholder="مثال: صلاحية مؤقتة لنائب السوبر أدمن..."
            />
          </label>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={savePermission}
              disabled={isSaving}
              className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-3 font-black text-white disabled:opacity-60"
            >
              {isSaving ? "جاري الحفظ..." : selectedExistingPermission ? "تحديث الصلاحية" : "حفظ صلاحية جديدة"}
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...emptyForm, admin_email: form.admin_email })}
              className="rounded-full border border-white/10 bg-white/[0.04] px-7 py-3 font-bold text-white/70"
            >
              تفريغ النموذج
            </button>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">سجلات الصلاحيات</h2>
              <p className="mt-2 text-sm text-white/50">عدد السجلات: {permissions.length}</p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث بالإيميل أو القسم..."
              className="w-full rounded-full border border-white/10 bg-black/30 px-5 py-3 text-white outline-none placeholder:text-white/35 focus:border-purple-300/50 md:max-w-sm"
            />
          </div>

          <div className="grid gap-4">
            {filteredPermissions.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-white/55">
                لا توجد صلاحيات مطابقة حالياً.
              </div>
            )}

            {filteredPermissions.map((permission, index) => {
              const moduleKey = getString(permission, ["module_key"], "dashboard");
              const rowEmail = getString(permission, ["admin_email"], "غير محدد");
              const updatedAt = getString(permission, ["updated_at", "created_at"], "");

              return (
                <article key={getString(permission, ["id"], String(index))} className="rounded-3xl border border-white/10 bg-black/25 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-100">
                          {getModuleLabel(moduleKey)}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/55" dir="ltr">
                          {moduleKey}
                        </span>
                      </div>
                      <h3 className="text-xl font-black" dir="ltr">{rowEmail}</h3>
                      <p className="mt-2 text-sm text-white/45">آخر تحديث: {formatDate(updatedAt)}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {permissionFields.map((field) => (
                          <span
                            key={field.key}
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${
                              getBoolean(permission, field.key)
                                ? "border-green-400/25 bg-green-500/10 text-green-100"
                                : "border-white/10 bg-white/[0.03] text-white/35"
                            }`}
                          >
                            {field.label}
                          </span>
                        ))}
                      </div>

                      {getString(permission, ["notes"]) && (
                        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/60">
                          {getString(permission, ["notes"])}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => editPermission(permission)}
                      className="rounded-full border border-purple-300/30 bg-purple-500/10 px-5 py-3 text-sm font-black text-purple-100"
                    >
                      تعديل
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
