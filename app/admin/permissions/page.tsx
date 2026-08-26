"use client";

import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { logAdminActivity } from "@/lib/adminActivityLogger";

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
  { key: "version_history", label: "سجل الإصدارات" },
  { key: "export_center", label: "مركز التصدير" },
  { key: "audit_mode", label: "وضع التدقيق" },
  { key: "knowledge_base", label: "قاعدة المعرفة" },
  { key: "ai_support", label: "الدعم الذكي" },
  { key: "ai_settings", label: "إعدادات الدعم الذكي" },
  { key: "notifications", label: "الإشعارات" },
  { key: "analytics", label: "التحليلات" },
  { key: "launch_checklist", label: "فحص الإطلاق" },
  { key: "permissions", label: "الصلاحيات" },
];

const permissionFields: { key: PermissionKey; label: string; description: string }[] = [
  { key: "can_view", label: "عرض", description: "مشاهدة القسم والبيانات." },
  { key: "can_create", label: "إضافة", description: "إنشاء عناصر جديدة." },
  { key: "can_edit", label: "تعديل", description: "تحديث العناصر الحالية." },
  { key: "can_delete", label: "حذف", description: "حذف العناصر أو نقلها إلى السلة حسب القسم." },
  { key: "can_export", label: "تصدير", description: "تصدير البيانات إلى الملفات المسموح بها." },
  { key: "can_manage", label: "إدارة كاملة للقسم", description: "صلاحية حساسة تمنح تحكمًا إداريًا متقدمًا داخل القسم." },
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
  return moduleOptions.find((module) => module.key === moduleKey)?.label || "قسم إداري";
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

function getPermissionSnapshot(row: AnyRow) {
  return {
    admin_email: getString(row, ["admin_email", "email"], ""),
    module_key: getString(row, ["module_key"], ""),
    module_label: getModuleLabel(getString(row, ["module_key"], "")),
    can_view: getBoolean(row, "can_view"),
    can_create: getBoolean(row, "can_create"),
    can_edit: getBoolean(row, "can_edit"),
    can_delete: getBoolean(row, "can_delete"),
    can_export: getBoolean(row, "can_export"),
    can_manage: getBoolean(row, "can_manage"),
    notes: getString(row, ["notes"], ""),
    created_at: getString(row, ["created_at"], ""),
    updated_at: getString(row, ["updated_at"], ""),
  };
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
      const access = await requireAdminModuleAccess("permissions");
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
      setError("تعذر الاتصال بخدمة البيانات حاليًا.");
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
      setError("تعذر تحميل حسابات الإدارة. حاول مرة أخرى.");
      return;
    }
    if (permissionsResult.error) {
      setError("تعذر تحميل الصلاحيات. حاول مرة أخرى.");
      return;
    }

    setAdminUsers((usersResult.data || []) as AnyRow[]);
    setPermissions((permissionsResult.data || []) as AnyRow[]);
  }

  const filteredPermissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return permissions;
    return permissions.filter((permission) =>
      [
        getString(permission, ["admin_email", "email"], ""),
        getString(permission, ["module_key"], ""),
        getModuleLabel(getString(permission, ["module_key"], "")),
        getString(permission, ["notes"], ""),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [permissions, search]);

  function updateForm<K extends keyof PermissionForm>(key: K, value: PermissionForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  function editPermission(permission: AnyRow) {
    setForm(toForm(permission));
    setMessage("تم فتح الصلاحية للتعديل.");
    setError("");
  }

  async function savePermission() {
    if (!supabase) return;
    const email = normalizeEmail(form.admin_email);
    if (!email) {
      setError("يرجى اختيار أو كتابة بريد المدير.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    const payload = {
      admin_email: email,
      module_key: form.module_key,
      can_view: form.can_view,
      can_create: form.can_create,
      can_edit: form.can_edit,
      can_delete: form.can_delete,
      can_export: form.can_export,
      can_manage: form.can_manage,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const oldPermission = permissions.find((permission) => {
      const permissionEmail = normalizeEmail(getString(permission, ["admin_email", "email"], ""));
      const moduleKey = getString(permission, ["module_key"], "");
      return permissionEmail === email && moduleKey === form.module_key;
    });

    const { error: saveError } = await adminBoundaryMutation(
      "pr116_permissions_page_entity_admin_permissions_upsert",
      { values: payload, filters: [], select: undefined, returnMode: "many", options: { onConflict: "admin_email,module_key" } }
    );
    setIsSaving(false);

    if (saveError) {
      setError("تعذر حفظ الصلاحية. لم يتم تأكيد التغيير؛ حاول مرة أخرى.");
      return;
    }

    await logAdminActivity({
      action: oldPermission ? "update_admin_permission" : "create_admin_permission",
      module: "permissions",
      adminEmail,
      recordId: `${email}:${form.module_key}`,
      details: oldPermission ? "تعديل صلاحية مدير من لوحة الإدارة" : "إنشاء صلاحية مدير من لوحة الإدارة",
      oldData: oldPermission ? getPermissionSnapshot(oldPermission) : null,
      newData: { ...payload, module_label: getModuleLabel(form.module_key) },
    });

    setMessage("تم حفظ الصلاحية بنجاح.");
    await loadData();
  }

  async function deletePermission(permission: AnyRow) {
    if (!supabase) return;
    const email = getString(permission, ["admin_email", "email"], "");
    const moduleKey = getString(permission, ["module_key"], "");
    if (!email || !moduleKey) {
      setError("تعذر تحديد الصلاحية المطلوبة للحذف.");
      return;
    }

    const confirmed = window.confirm(
      `سيتم إزالة إعداد الصلاحيات الخاص بـ ${email} من قسم «${getModuleLabel(moduleKey)}». قد يتأثر وصول هذا الحساب إلى القسم. هل تريد المتابعة؟`
    );
    if (!confirmed) return;

    setError("");
    setMessage("");
    const { error: deleteError } = await adminBoundaryMutation(
      "pr116_permissions_page_entity_admin_permissions_delete",
      {
        values: undefined,
        filters: [
          { op: "eq", field: "admin_email", value: email },
          { op: "eq", field: "module_key", value: moduleKey },
        ],
        select: undefined,
        returnMode: "many",
        options: undefined,
      }
    );

    if (deleteError) {
      setError("تعذر حذف إعداد الصلاحية. لم يتم تأكيد التغيير؛ حاول مرة أخرى.");
      return;
    }

    await logAdminActivity({
      action: "delete_admin_permission",
      module: "permissions",
      adminEmail,
      recordId: `${email}:${moduleKey}`,
      details: "حذف صلاحية مدير من لوحة الإدارة",
      oldData: getPermissionSnapshot(permission),
      newData: null,
    });

    setMessage("تم حذف إعداد الصلاحية بنجاح.");
    await loadData();
  }

  if (isCheckingAuth) {
    return (
      <main dir="rtl" className="min-h-screen bg-[#070009] p-6 text-white">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
          جارٍ التحقق من صلاحيات الإدارة...
        </div>
      </main>
    );
  }

  if (isForbidden) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] p-6 text-white">
        <div className="max-w-xl rounded-3xl border border-red-400/25 bg-red-500/10 p-8 text-center">
          <h1 className="text-3xl font-black text-red-100">غير مصرح بالدخول</h1>
          <p className="mt-4 leading-8 text-white/65">إدارة الصلاحيات متاحة فقط للمدير الأعلى.</p>
          <Link href="/admin" className="mt-6 inline-flex rounded-full bg-purple-600 px-7 py-4 font-black text-white">
            العودة للوحة التحكم
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[#070009] p-4 text-white sm:p-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.28),transparent_44%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(35,8,60,0.32),rgba(7,0,9,0.96))]" />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl">
        <nav className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-purple-200">إدارة HAMZA AGENCY</div>
            <h1 className="mt-2 text-3xl font-black">إدارة صلاحيات المدراء</h1>
            <p className="mt-2 text-sm text-white/50">الحساب الحالي: {adminEmail}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={loadData} className="rounded-full border border-purple-400/25 bg-purple-500/10 px-5 py-3 font-bold text-purple-100 transition hover:bg-purple-500/20">
              تحديث البيانات
            </button>
            <button type="button" onClick={resetForm} className="rounded-full border border-yellow-400/25 bg-yellow-500/10 px-5 py-3 font-bold text-yellow-100 transition hover:bg-yellow-500/20">
              صلاحية جديدة
            </button>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 font-bold text-white/75 transition hover:text-white">
              العودة للوحة التحكم
            </Link>
          </div>
        </nav>

        <div className="mb-6 rounded-3xl border border-yellow-400/20 bg-yellow-500/10 p-4 text-sm leading-7 text-yellow-50">
          <strong>تنبيه:</strong> تغيير الصلاحيات قد يمنح أو يزيل وصولًا إداريًا. راجع اسم الحساب والقسم بعناية قبل الحفظ، وتجنب منح «إدارة كاملة للقسم» إلا عند الحاجة.
        </div>

        {error && <div role="alert" className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 text-center font-bold text-red-100">{error}</div>}
        {message && <div role="status" aria-live="polite" className="mb-6 rounded-3xl border border-green-400/25 bg-green-500/10 p-5 text-center font-bold text-green-100">{message}</div>}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur">
            <h2 className="text-2xl font-black">إعداد الصلاحية</h2>
            <p className="mt-2 text-sm leading-7 text-white/50">اختر المدير والقسم ثم حدد ما يُسمح لهذا الحساب بتنفيذه.</p>
            <div className="mt-6 grid gap-5">
              <label className="grid gap-2">
                <span className="text-sm font-black text-white/70">بريد المدير</span>
                <input
                  list="admin-users-list"
                  value={form.admin_email}
                  onChange={(event) => updateForm("admin_email", event.target.value)}
                  placeholder="admin@example.com"
                  className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none transition focus:border-purple-400/70 focus-visible:ring-2 focus-visible:ring-purple-300"
                  dir="ltr"
                />
                <datalist id="admin-users-list">
                  {adminUsers.map((user) => {
                    const email = getString(user, ["email", "admin_email"], "");
                    return email ? <option key={email} value={email} /> : null;
                  })}
                </datalist>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-black text-white/70">القسم</span>
                <select
                  value={form.module_key}
                  onChange={(event) => updateForm("module_key", event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none transition focus:border-purple-400/70 focus-visible:ring-2 focus-visible:ring-purple-300"
                >
                  {moduleOptions.map((module) => <option key={module.key} value={module.key}>{module.label}</option>)}
                </select>
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                {permissionFields.map((field) => (
                  <label key={field.key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={form[field.key]}
                        onChange={(event) => updateForm(field.key, event.target.checked)}
                        className="h-5 w-5 accent-purple-500"
                      />
                      <span className="font-black">{field.label}</span>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-white/45">{field.description}</p>
                  </label>
                ))}
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-black text-white/70">ملاحظات داخلية</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="سبب منح الصلاحية أو ملاحظة للفريق..."
                  className="min-h-28 resize-none rounded-2xl border border-white/10 bg-black/30 px-5 py-4 outline-none transition focus:border-purple-400/70 focus-visible:ring-2 focus-visible:ring-purple-300"
                />
              </label>

              <button
                type="button"
                disabled={isSaving}
                onClick={savePermission}
                className="rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 text-lg font-black shadow-[0_0_35px_rgba(168,85,247,0.24)] transition hover:scale-[1.01] disabled:opacity-60"
              >
                {isSaving ? "جارٍ الحفظ..." : "حفظ الصلاحية"}
              </button>
            </div>
          </section>

          <section className="min-w-0 rounded-[2rem] border border-white/10 bg-black/25 p-5 backdrop-blur">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-black">الصلاحيات الحالية</h2>
                <p className="mt-2 text-sm text-white/50">النتائج: {filteredPermissions.length}</p>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث بالبريد أو القسم..."
                className="min-w-0 rounded-2xl border border-white/10 bg-black/30 px-5 py-3 outline-none transition focus:border-purple-400/70"
              />
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-white/60">جارٍ تحميل الصلاحيات...</div>
            ) : filteredPermissions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-white/60">لا توجد صلاحيات مطابقة حاليًا.</div>
            ) : (
              <div className="space-y-4">
                {filteredPermissions.map((permission) => {
                  const email = getString(permission, ["admin_email", "email"], "");
                  const moduleKey = getString(permission, ["module_key"], "");
                  const key = `${email}-${moduleKey}`;
                  return (
                    <div key={key} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="break-all font-black text-yellow-100" dir="ltr">{email}</div>
                          <div className="mt-2 text-sm text-white/65">{getModuleLabel(moduleKey)}</div>
                          <div className="mt-2 text-xs text-white/40">آخر تحديث: {formatDate(getString(permission, ["updated_at", "created_at"], ""))}</div>
                          <details className="mt-2 text-xs text-white/40">
                            <summary className="cursor-pointer">تفاصيل تقنية</summary>
                            <span className="mt-1 block" dir="ltr">{moduleKey}</span>
                          </details>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => editPermission(permission)} className="rounded-full border border-purple-400/25 bg-purple-500/10 px-4 py-2 text-sm font-bold text-purple-100">تعديل</button>
                          <button type="button" onClick={() => deletePermission(permission)} className="rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100">إزالة الصلاحية</button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {permissionFields.map((field) => (
                          <div key={field.key} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm">
                            <span className="font-bold text-white/70">{field.label}: </span>
                            <span className={getBoolean(permission, field.key) ? "text-green-200" : "text-white/35"}>
                              {getBoolean(permission, field.key) ? "مسموح" : "غير مفعّل"}
                            </span>
                          </div>
                        ))}
                      </div>

                      {getString(permission, ["notes"], "") && (
                        <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm leading-7 text-white/60">{getString(permission, ["notes"], "")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
