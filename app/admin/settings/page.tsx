"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SettingItem = {
  id: number;
  created_at: string;
  updated_at: string | null;
  setting_key: string | null;
  setting_value: string | null;
  setting_group: string | null;
  description: string | null;
  is_public: boolean | null;
};

type SettingDraft = {
  value: string;
  description: string;
  is_public: boolean;
};

const defaultSettings = [
  {
    setting_key: "site_name",
    setting_value: "HAMZA AGENCY",
    setting_group: "identity",
    description: "اسم الموقع الرسمي الذي يظهر في العنوان والـ SEO.",
    is_public: true,
  },
  {
    setting_key: "agency_name_ar",
    setting_value: "وكالة حمزة",
    setting_group: "identity",
    description: "اسم الوكالة باللغة العربية.",
    is_public: true,
  },
  {
    setting_key: "agency_manager_name",
    setting_value: "وكالة حمزة بإدارة الوكيل ⚔عܓོراب✴سܓོوريا⚔",
    setting_group: "identity",
    description: "تعريف الوكيل يظهر في صفحة من نحن وليس في Hero الرئيسي.",
    is_public: true,
  },
  {
    setting_key: "site_description",
    setting_value:
      "منصة وكالة احترافية لإدارة وتوظيف ودعم صناع المحتوى على منصات البث المباشر والتواصل الاجتماعي.",
    setting_group: "identity",
    description: "وصف عام للموقع والوكالة.",
    is_public: true,
  },
  {
    setting_key: "primary_whatsapp",
    setting_value: "+905011730377",
    setting_group: "contact",
    description: "رقم واتساب الأساسي للتواصل والتحويل من AI Support.",
    is_public: true,
  },
  {
    setting_key: "support_email",
    setting_value: "hamza.alshami.13579@gmail.com",
    setting_group: "contact",
    description: "البريد الرسمي الظاهر في صفحات التواصل والفوتر.",
    is_public: true,
  },
  {
    setting_key: "primary_color",
    setting_value: "#7c3aed",
    setting_group: "branding",
    description: "اللون الأساسي: موف ملكي.",
    is_public: true,
  },
  {
    setting_key: "secondary_color",
    setting_value: "#d4af37",
    setting_group: "branding",
    description: "اللون الثانوي: ذهبي فاخر.",
    is_public: true,
  },
  {
    setting_key: "background_color",
    setting_value: "#070009",
    setting_group: "branding",
    description: "لون الخلفية الأساسي للموقع.",
    is_public: true,
  },
  {
    setting_key: "default_visual_background",
    setting_value: "luxury-purple-neon",
    setting_group: "media",
    description:
      "الخلفية المتحركة البرمجية الافتراضية عند عدم وجود فيديو مرفوع.",
    is_public: true,
  },
  {
    setting_key: "homepage_background_mode",
    setting_value: "generated",
    setting_group: "media",
    description:
      "وضع خلفية الصفحة الرئيسية: generated أو video. لاحقاً يتم التحكم به من لوحة الوسائط.",
    is_public: true,
  },
  {
    setting_key: "seo_default_title",
    setting_value: "HAMZA AGENCY | وكالة حمزة لصناع المحتوى",
    setting_group: "seo",
    description: "عنوان SEO الافتراضي للموقع.",
    is_public: true,
  },
  {
    setting_key: "seo_default_description",
    setting_value:
      "وكالة حمزة منصة احترافية لدعم صناع المحتوى والتقديم على برامج TikTok وBIGO LIVE وYaahlan وXena وCatchii.",
    setting_group: "seo",
    description: "وصف SEO الافتراضي للموقع.",
    is_public: true,
  },
  {
    setting_key: "seo_default_keywords",
    setting_value:
      "وكالة حمزة, صناع المحتوى, TikTok Agency, BIGO LIVE, بث مباشر, وكالة محتوى",
    setting_group: "seo",
    description: "الكلمات المفتاحية الافتراضية.",
    is_public: true,
  },
  {
    setting_key: "ai_support_enabled",
    setting_value: "true",
    setting_group: "ai",
    description: "تشغيل أو إيقاف دعم الذكاء الصناعي داخل الموقع.",
    is_public: false,
  },
  {
    setting_key: "ai_whatsapp_escalation_message",
    setting_value:
      "مرحباً، أحتاج التواصل مع موظف من وكالة حمزة بخصوص البرامج أو الطلبات.",
    setting_group: "ai",
    description: "الرسالة الجاهزة عند تحويل العميل إلى واتساب.",
    is_public: false,
  },
  {
    setting_key: "maintenance_mode",
    setting_value: "false",
    setting_group: "system",
    description: "تشغيل أو إيقاف وضع الصيانة للموقع.",
    is_public: false,
  },
  {
    setting_key: "default_language",
    setting_value: "ar",
    setting_group: "languages",
    description: "اللغة الافتراضية للموقع.",
    is_public: true,
  },
  {
    setting_key: "supported_languages",
    setting_value: "ar,en,tr",
    setting_group: "languages",
    description: "اللغات المدعومة في الموقع.",
    is_public: true,
  },
];

const groupLabels: Record<string, string> = {
  identity: "الهوية",
  contact: "التواصل",
  branding: "الألوان والهوية البصرية",
  media: "الوسائط والخلفيات",
  seo: "SEO",
  ai: "الذكاء الصناعي",
  system: "النظام",
  languages: "اللغات",
  custom: "إعدادات مخصصة",
};

const emptyNewSetting = {
  setting_key: "",
  setting_value: "",
  setting_group: "custom",
  description: "",
  is_public: false,
};

export default function AdminSettingsPage() {
  const router = useRouter();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, SettingDraft>>({});
  const [newSetting, setNewSetting] = useState(emptyNewSetting);

  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
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
    loadSettings();
  }, [isAuthorized]);

  async function loadSettings() {
    if (!supabase) return;

    setError("");

    const { data, error } = await supabase
      .from("settings")
      .select(
        "id, created_at, updated_at, setting_key, setting_value, setting_group, description, is_public"
      )
      .order("setting_group", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setError("تعذر تحميل الإعدادات. قد نحتاج إضافة RLS Policies لجدول settings.");
      return;
    }

    const items = data || [];
    setSettings(items);

    const nextDrafts: Record<number, SettingDraft> = {};

    items.forEach((setting) => {
      nextDrafts[setting.id] = {
        value: setting.setting_value || "",
        description: setting.description || "",
        is_public: Boolean(setting.is_public),
      };
    });

    setDrafts(nextDrafts);
  }

  const groups = useMemo(() => {
    const uniqueGroups = Array.from(
      new Set(settings.map((setting) => setting.setting_group || "custom"))
    );

    return ["all", ...uniqueGroups];
  }, [settings]);

  const filteredSettings = useMemo(() => {
    return settings.filter((setting) => {
      const groupMatch =
        activeGroup === "all" || setting.setting_group === activeGroup;

      const text = `${setting.setting_key || ""} ${
        setting.setting_value || ""
      } ${setting.description || ""} ${
        setting.setting_group || ""
      }`.toLowerCase();

      return groupMatch && text.includes(search.toLowerCase());
    });
  }, [settings, activeGroup, search]);

  const publicCount = settings.filter((setting) => setting.is_public).length;
  const privateCount = settings.filter((setting) => !setting.is_public).length;

  function updateDraft(
    id: number,
    key: keyof SettingDraft,
    value: string | boolean
  ) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
  }

  function updateNewSetting(
    key: keyof typeof emptyNewSetting,
    value: string | boolean
  ) {
    setNewSetting((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function saveDefaultSettings() {
    if (!supabase) return;

    setMessage("");
    setError("");
    setIsSavingDefaults(true);

    const existingKeys = new Set(
      settings.map((setting) => setting.setting_key || "")
    );

    const missingDefaults = defaultSettings.filter(
      (setting) => !existingKeys.has(setting.setting_key)
    );

    if (missingDefaults.length === 0) {
      setIsSavingDefaults(false);
      setMessage("كل الإعدادات الافتراضية موجودة مسبقاً.");
      return;
    }

    const { error } = await supabase.from("settings").insert(missingDefaults);

    setIsSavingDefaults(false);

    if (error) {
      setError("فشل إنشاء الإعدادات الافتراضية. قد نحتاج مراجعة صلاحيات RLS.");
      return;
    }

    await logActivity(
      "seed_default_settings",
      "settings",
      "default_settings",
      "",
      JSON.stringify(missingDefaults)
    );

    setMessage("تم إنشاء الإعدادات الافتراضية بنجاح.");
    await loadSettings();
  }

  async function saveSetting(setting: SettingItem) {
    if (!supabase) return;

    const draft = drafts[setting.id];

    if (!draft) return;

    setMessage("");
    setError("");

    const payload = {
      setting_value: draft.value,
      description: draft.description,
      is_public: draft.is_public,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("settings")
      .update(payload)
      .eq("id", setting.id);

    if (error) {
      setError("فشل حفظ الإعداد. تحقق من صلاحيات جدول settings.");
      return;
    }

    await logActivity(
      "update_setting",
      "settings",
      String(setting.id),
      JSON.stringify(setting),
      JSON.stringify(payload)
    );

    setMessage(`تم حفظ الإعداد: ${setting.setting_key}`);
    await loadSettings();
  }

  async function createSetting(event: React.FormEvent) {
    event.preventDefault();

    if (!supabase) return;

    setMessage("");
    setError("");

    if (!newSetting.setting_key.trim()) {
      setError("يرجى كتابة مفتاح الإعداد.");
      return;
    }

    const payload = {
      setting_key: newSetting.setting_key.trim(),
      setting_value: newSetting.setting_value.trim(),
      setting_group: newSetting.setting_group.trim() || "custom",
      description: newSetting.description.trim(),
      is_public: Boolean(newSetting.is_public),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("settings").insert(payload);

    if (error) {
      setError("فشل إضافة الإعداد. تأكد أن صلاحيات جدول settings صحيحة.");
      return;
    }

    await logActivity(
      "create_setting",
      "settings",
      payload.setting_key,
      "",
      JSON.stringify(payload)
    );

    setNewSetting(emptyNewSetting);
    setMessage("تمت إضافة الإعداد الجديد بنجاح.");
    await loadSettings();
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
            <h1 className="text-4xl font-black">إعدادات الموقع</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/60">
              مركز التحكم في هوية HAMZA AGENCY، بيانات التواصل، الألوان،
              إعدادات SEO، الخلفيات المتحركة، الذكاء الصناعي، اللغات، ووضع
              الصيانة.
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
          <StatCard title="كل الإعدادات" value={settings.length} />
          <StatCard title="إعدادات عامة" value={publicCount} />
          <StatCard title="إعدادات داخلية" value={privateCount} />
          <StatCard title="المجموعات" value={Math.max(groups.length - 1, 0)} />
        </div>

        <div className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">الإعدادات الافتراضية</h2>
              <p className="mt-2 leading-8 text-white/60">
                هذه الإعدادات تملأ الموقع بقيم احترافية قابلة للتعديل لاحقاً
                من لوحة التحكم، حتى لا يبقى المشروع فارغاً أثناء التطوير.
              </p>
            </div>

            <button
              onClick={saveDefaultSettings}
              disabled={isSavingDefaults}
              className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black disabled:opacity-60"
            >
              {isSavingDefaults
                ? "جارٍ الإنشاء..."
                : "إنشاء الإعدادات الافتراضية"}
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
          onSubmit={createSetting}
          className="mb-8 rounded-[2rem] border border-purple-500/20 bg-black/35 p-6"
        >
          <h2 className="mb-6 text-3xl font-black">إضافة إعداد مخصص</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={newSetting.setting_key}
              onChange={(e) => updateNewSetting("setting_key", e.target.value)}
              placeholder="setting_key مثال: footer_text"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <input
              value={newSetting.setting_group}
              onChange={(e) => updateNewSetting("setting_group", e.target.value)}
              placeholder="setting_group مثال: branding"
              className="rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <textarea
              value={newSetting.setting_value}
              onChange={(e) => updateNewSetting("setting_value", e.target.value)}
              placeholder="قيمة الإعداد"
              className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2"
            />

            <textarea
              value={newSetting.description}
              onChange={(e) => updateNewSetting("description", e.target.value)}
              placeholder="شرح الإعداد"
              className="min-h-24 rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2"
            />

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
              <input
                type="checkbox"
                checked={newSetting.is_public}
                onChange={(e) =>
                  updateNewSetting("is_public", e.target.checked)
                }
              />
              متاح للواجهة العامة
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black"
          >
            إضافة الإعداد
          </button>
        </form>

        <div className="rounded-[2rem] border border-purple-500/20 bg-black/35 p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-black">قائمة الإعدادات</h2>
              <p className="mt-2 text-white/55">
                كل إعداد يمكن تعديله وحفظه بشكل مستقل.
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
            {groups.map((group) => (
              <button
                key={group}
                onClick={() => setActiveGroup(group)}
                className={`rounded-full border px-4 py-2 text-sm ${
                  activeGroup === group
                    ? "border-purple-400 bg-purple-500/20 text-white"
                    : "border-white/10 bg-black/20 text-white/60"
                }`}
              >
                {group === "all"
                  ? "الكل"
                  : groupLabels[group] || group}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {filteredSettings.length === 0 ? (
              <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6 text-yellow-100">
                لا توجد إعدادات حالياً. اضغط على زر إنشاء الإعدادات الافتراضية
                لملء الموقع بإعدادات احترافية قابلة للتعديل.
              </div>
            ) : (
              filteredSettings.map((setting) => {
                const draft = drafts[setting.id];

                return (
                  <div
                    key={setting.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <div className="text-sm text-purple-200">
                          {groupLabels[setting.setting_group || "custom"] ||
                            setting.setting_group ||
                            "إعدادات مخصصة"}
                        </div>
                        <h3 className="mt-1 text-2xl font-black">
                          {setting.setting_key}
                        </h3>
                      </div>

                      <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60">
                        {setting.is_public ? "عام" : "داخلي"}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <textarea
                        value={draft?.value || ""}
                        onChange={(e) =>
                          updateDraft(setting.id, "value", e.target.value)
                        }
                        className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2"
                      />

                      <textarea
                        value={draft?.description || ""}
                        onChange={(e) =>
                          updateDraft(
                            setting.id,
                            "description",
                            e.target.value
                          )
                        }
                        className="min-h-24 rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400 md:col-span-2"
                      />

                      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                        <input
                          type="checkbox"
                          checked={Boolean(draft?.is_public)}
                          onChange={(e) =>
                            updateDraft(
                              setting.id,
                              "is_public",
                              e.target.checked
                            )
                          }
                        />
                        متاح للواجهة العامة
                      </label>
                    </div>

                    <button
                      onClick={() => saveSetting(setting)}
                      className="mt-5 rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-3 font-bold text-green-100"
                    >
                      حفظ هذا الإعداد
                    </button>
                  </div>
                );
              })
            )}
          </div>
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
