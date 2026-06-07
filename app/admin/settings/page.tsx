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

type NewSettingDraft = {
  setting_key: string;
  setting_value: string;
  setting_group: string;
  description: string;
  is_public: boolean;
};

type SettingMeta = {
  label: string;
  hint: string;
  control?: "text" | "textarea" | "color" | "toggle" | "select";
  placeholder?: string;
  options?: { label: string; value: string }[];
};

type SectionDefinition = {
  key: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  tone: string;
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
    description: "الخلفية المتحركة البرمجية الافتراضية عند عدم وجود فيديو مرفوع.",
    is_public: true,
  },
  {
    setting_key: "homepage_background_mode",
    setting_value: "generated",
    setting_group: "media",
    description: "وضع خلفية الصفحة الرئيسية: generated أو video. لاحقاً يتم التحكم به من لوحة الوسائط.",
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
    setting_value: "مرحباً، أحتاج التواصل مع موظف من وكالة حمزة بخصوص البرامج أو الطلبات.",
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

const sectionDefinitions: SectionDefinition[] = [
  {
    key: "identity",
    label: "الإعدادات العامة والهوية",
    shortLabel: "العامة",
    icon: "◆",
    description: "اسم الموقع، اسم الوكالة، الوصف العام، وتعريف الإدارة.",
    tone: "from-purple-500/20 to-fuchsia-500/10 border-purple-400/25",
  },
  {
    key: "contact",
    label: "معلومات التواصل",
    shortLabel: "التواصل",
    icon: "☎",
    description: "واتساب، البريد الرسمي، وروابط التواصل الأساسية.",
    tone: "from-emerald-500/20 to-green-500/10 border-emerald-400/25",
  },
  {
    key: "branding",
    label: "الألوان والمظهر",
    shortLabel: "المظهر",
    icon: "✦",
    description: "الألوان الأساسية للهوية البصرية الفاخرة.",
    tone: "from-amber-500/20 to-yellow-500/10 border-amber-400/25",
  },
  {
    key: "media",
    label: "الوسائط والخلفيات",
    shortLabel: "الوسائط",
    icon: "◈",
    description: "إعدادات الخلفيات البرمجية والفيديوهات المستقبلية.",
    tone: "from-pink-500/20 to-purple-500/10 border-pink-400/25",
  },
  {
    key: "languages",
    label: "اللغات",
    shortLabel: "اللغات",
    icon: "⌘",
    description: "اللغة الافتراضية واللغات المدعومة في الموقع.",
    tone: "from-cyan-500/20 to-blue-500/10 border-cyan-400/25",
  },
  {
    key: "seo",
    label: "إعدادات SEO",
    shortLabel: "SEO",
    icon: "◎",
    description: "العنوان والوصف والكلمات المفتاحية لمحركات البحث.",
    tone: "from-blue-500/20 to-indigo-500/10 border-blue-400/25",
  },
  {
    key: "ai",
    label: "الذكاء الصناعي",
    shortLabel: "AI",
    icon: "✺",
    description: "تفعيل الدعم الذكي ورسائل التحويل إلى واتساب.",
    tone: "from-violet-500/20 to-purple-500/10 border-violet-400/25",
  },
  {
    key: "system",
    label: "النظام والصيانة",
    shortLabel: "النظام",
    icon: "⚙",
    description: "وضع الصيانة والإعدادات الداخلية الحساسة.",
    tone: "from-red-500/20 to-orange-500/10 border-red-400/25",
  },
  {
    key: "custom",
    label: "إعدادات مخصصة",
    shortLabel: "مخصصة",
    icon: "+",
    description: "أي إعدادات إضافية نضيفها لاحقاً بدون تغيير الكود.",
    tone: "from-slate-500/20 to-white/5 border-white/15",
  },
];

const settingMeta: Record<string, SettingMeta> = {
  site_name: {
    label: "اسم الموقع الرسمي",
    hint: "يظهر في عناوين الصفحات ومحركات البحث.",
    control: "text",
    placeholder: "HAMZA AGENCY",
  },
  agency_name_ar: {
    label: "اسم الوكالة بالعربية",
    hint: "الاسم العربي المستخدم في الصفحات العامة.",
    control: "text",
    placeholder: "وكالة حمزة",
  },
  agency_manager_name: {
    label: "تعريف الوكيل / الإدارة",
    hint: "النص الرسمي الذي يوضح إدارة الوكالة.",
    control: "text",
  },
  site_description: {
    label: "وصف الوكالة العام",
    hint: "وصف قصير احترافي يظهر في الصفحات و SEO.",
    control: "textarea",
  },
  primary_whatsapp: {
    label: "رقم واتساب الأساسي",
    hint: "الرقم الرئيسي للتواصل وتحويل العملاء من الموقع.",
    control: "text",
    placeholder: "+905011730377",
  },
  support_email: {
    label: "البريد الإلكتروني الرسمي",
    hint: "البريد الظاهر في صفحة التواصل والفوتر.",
    control: "text",
  },
  primary_color: {
    label: "اللون الأساسي",
    hint: "اللون الملكي الرئيسي للهوية البصرية.",
    control: "color",
  },
  secondary_color: {
    label: "اللون الثانوي",
    hint: "اللون الذهبي أو لون التمييز في التصميم.",
    control: "color",
  },
  background_color: {
    label: "لون الخلفية الأساسي",
    hint: "الخلفية العامة الداكنة للموقع.",
    control: "color",
  },
  default_visual_background: {
    label: "الخلفية البرمجية الافتراضية",
    hint: "الخلفية الخفيفة التي تعمل عندما لا يوجد فيديو مرفوع.",
    control: "select",
    options: [
      { label: "Luxury Purple Neon", value: "luxury-purple-neon" },
      { label: "Royal Dark Waves", value: "royal-dark-waves" },
      { label: "Golden Network", value: "golden-network" },
      { label: "Soft Creator Glow", value: "soft-creator-glow" },
    ],
  },
  homepage_background_mode: {
    label: "طريقة خلفية الصفحة الرئيسية",
    hint: "هل نستخدم خلفية برمجية خفيفة أم فيديو مرفوع لاحقاً.",
    control: "select",
    options: [
      { label: "خلفية برمجية خفيفة", value: "generated" },
      { label: "فيديو مرفوع", value: "video" },
      { label: "بدون خلفية متحركة", value: "static" },
    ],
  },
  seo_default_title: {
    label: "عنوان SEO الافتراضي",
    hint: "العنوان الذي يظهر في Google عند عدم وجود عنوان مخصص للصفحة.",
    control: "text",
  },
  seo_default_description: {
    label: "وصف SEO الافتراضي",
    hint: "وصف مختصر واضح لمحركات البحث ووسائل المشاركة.",
    control: "textarea",
  },
  seo_default_keywords: {
    label: "الكلمات المفتاحية الافتراضية",
    hint: "كلمات مفصولة بفواصل تساعد في تنظيم استراتيجية SEO.",
    control: "textarea",
  },
  ai_support_enabled: {
    label: "تشغيل مساعد الذكاء الصناعي",
    hint: "إعداد داخلي لتفعيل أو إيقاف AI Support لاحقاً.",
    control: "toggle",
  },
  ai_whatsapp_escalation_message: {
    label: "رسالة التحويل إلى واتساب",
    hint: "الرسالة الجاهزة عند طلب العميل التواصل مع موظف.",
    control: "textarea",
  },
  maintenance_mode: {
    label: "وضع الصيانة",
    hint: "إعداد داخلي لإيقاف الموقع مؤقتاً أثناء الصيانة عند تفعيله لاحقاً.",
    control: "toggle",
  },
  default_language: {
    label: "اللغة الافتراضية",
    hint: "اللغة الأساسية التي يبدأ بها الموقع.",
    control: "select",
    options: [
      { label: "العربية", value: "ar" },
      { label: "English", value: "en" },
      { label: "Türkçe", value: "tr" },
    ],
  },
  supported_languages: {
    label: "اللغات المدعومة",
    hint: "اكتب رموز اللغات مفصولة بفواصل، مثال: ar,en,tr.",
    control: "text",
    placeholder: "ar,en,tr",
  },
};

const emptyNewSetting: NewSettingDraft = {
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
  const [newSetting, setNewSetting] = useState<NewSettingDraft>(emptyNewSetting);

  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

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

  const existingDefaultKeys = useMemo(() => {
    return new Set(settings.map((setting) => setting.setting_key || ""));
  }, [settings]);

  const missingDefaultsCount = defaultSettings.filter(
    (setting) => !existingDefaultKeys.has(setting.setting_key)
  ).length;

  const orderedGroupKeys = useMemo(() => {
    const presentGroups = new Set(
      settings.map((setting) => setting.setting_group || "custom")
    );

    const knownGroups = sectionDefinitions
      .map((section) => section.key)
      .filter((groupKey) => presentGroups.has(groupKey));

    const unknownGroups = Array.from(presentGroups).filter(
      (groupKey) => !sectionDefinitions.some((section) => section.key === groupKey)
    );

    return [...knownGroups, ...unknownGroups];
  }, [settings]);

  const filteredSettings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return settings.filter((setting) => {
      const groupKey = setting.setting_group || "custom";
      const key = setting.setting_key || "";
      const meta = getSettingMeta(key);
      const groupMatch = activeGroup === "all" || groupKey === activeGroup;
      const text = `${key} ${meta.label} ${meta.hint} ${setting.setting_value || ""} ${
        setting.description || ""
      } ${groupKey}`.toLowerCase();

      return groupMatch && (!normalizedSearch || text.includes(normalizedSearch));
    });
  }, [settings, activeGroup, search]);

  const settingsByGroup = useMemo(() => {
    return filteredSettings.reduce<Record<string, SettingItem[]>>((groups, setting) => {
      const groupKey = setting.setting_group || "custom";
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(setting);
      return groups;
    }, {});
  }, [filteredSettings]);

  const publicCount = settings.filter((setting) => setting.is_public).length;
  const privateCount = settings.filter((setting) => !setting.is_public).length;
  const visibleGroupCount = orderedGroupKeys.filter(
    (groupKey) => settingsByGroup[groupKey]?.length
  ).length;

  function updateDraft(id: number, key: keyof SettingDraft, value: string | boolean) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || { value: "", description: "", is_public: false }),
        [key]: value,
      },
    }));
  }

  function updateNewSetting<K extends keyof NewSettingDraft>(
    key: K,
    value: NewSettingDraft[K]
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

    const missingDefaults = defaultSettings.filter(
      (setting) => !existingDefaultKeys.has(setting.setting_key)
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

    setMessage(`تم حفظ الإعداد: ${getSettingMeta(setting.setting_key || "").label}`);
    await loadSettings();
  }

  async function createSetting(event: React.FormEvent) {
    event.preventDefault();

    if (!supabase) return;

    setMessage("");
    setError("");

    const newKey = newSetting.setting_key.trim();

    if (!newKey) {
      setError("يرجى كتابة مفتاح الإعداد.");
      return;
    }

    if (settings.some((setting) => setting.setting_key === newKey)) {
      setError("هذا المفتاح موجود مسبقاً. استخدم مفتاحاً مختلفاً أو عدّل الإعداد الحالي.");
      return;
    }

    const payload = {
      setting_key: newKey,
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

  function renderValueControl(setting: SettingItem, draft: SettingDraft) {
    const key = setting.setting_key || "";
    const meta = getSettingMeta(key);
    const control = resolveControl(key, draft.value, meta);

    if (control === "toggle") {
      const isOn = isEnabledValue(draft.value);

      return (
        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-black text-white">القيمة الحالية</div>
              <div className="mt-1 text-sm text-white/45">
                {isOn ? "مفعّل" : "متوقف"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateDraft(setting.id, "value", isOn ? "false" : "true")}
              className={classNames(
                "rounded-full border px-5 py-3 font-black transition",
                isOn
                  ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
                  : "border-white/15 bg-white/10 text-white/55"
              )}
            >
              {isOn ? "تشغيل" : "إيقاف"}
            </button>
          </div>
          <input
            value={draft.value}
            onChange={(event) => updateDraft(setting.id, "value", event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white/70 outline-none focus:border-purple-400"
          />
        </div>
      );
    }

    if (control === "color") {
      const colorValue = isValidHexColor(draft.value) ? draft.value : "#7c3aed";

      return (
        <div className="grid gap-3 md:grid-cols-[112px_1fr]">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-3">
            <input
              type="color"
              value={colorValue}
              onChange={(event) => updateDraft(setting.id, "value", event.target.value)}
              className="h-20 w-full cursor-pointer rounded-2xl border border-white/10 bg-transparent"
              aria-label={meta.label}
            />
          </div>
          <input
            value={draft.value}
            onChange={(event) => updateDraft(setting.id, "value", event.target.value)}
            placeholder="#7c3aed"
            className="rounded-3xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
          />
        </div>
      );
    }

    if (control === "select" && meta.options?.length) {
      return (
        <select
          value={draft.value}
          onChange={(event) => updateDraft(setting.id, "value", event.target.value)}
          className="w-full rounded-3xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
        >
          {meta.options.map((option) => (
            <option key={option.value} value={option.value} className="bg-[#120019]">
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (control === "textarea") {
      return (
        <textarea
          value={draft.value}
          onChange={(event) => updateDraft(setting.id, "value", event.target.value)}
          placeholder={meta.placeholder || "قيمة الإعداد"}
          className="min-h-32 w-full rounded-3xl border border-white/10 bg-black/35 p-4 leading-8 outline-none focus:border-purple-400"
        />
      );
    }

    return (
      <input
        value={draft.value}
        onChange={(event) => updateDraft(setting.id, "value", event.target.value)}
        placeholder={meta.placeholder || "قيمة الإعداد"}
        className="w-full rounded-3xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
      />
    );
  }

  if (isCheckingAuth) {
    return (
      <main
        dir="rtl"
        className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#070009] text-white"
      >
        <div className="rounded-[2rem] border border-purple-500/25 bg-black/45 p-8 text-center shadow-[0_0_90px_rgba(124,58,237,0.22)]">
          <div className="mb-3 text-sm text-purple-200">HAMZA AGENCY</div>
          <div className="text-2xl font-black">جاري التحقق من صلاحية الدخول...</div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#070009] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#4c0a77_0%,#120018_34%,#040006_72%,#000_100%)]" />
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(135deg,rgba(212,175,55,0.08),transparent_30%,rgba(124,58,237,0.10)_70%,transparent)]" />

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-7">
        <section className="mb-6 overflow-hidden rounded-[2rem] border border-purple-500/20 bg-black/45 shadow-[0_0_90px_rgba(124,58,237,0.14)] backdrop-blur-xl">
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-purple-400/30 bg-purple-500/15 px-4 py-2 text-sm font-bold text-purple-100">
                  Core CMS Foundation
                </span>
                <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                  واجهة منظمة جديدة
                </span>
              </div>

              <h1 className="text-3xl font-black leading-tight md:text-5xl">
                إعدادات الموقع
              </h1>
              <p className="mt-4 max-w-3xl leading-8 text-white/62">
                مركز مرتب لإدارة هوية HAMZA AGENCY، التواصل، الألوان، اللغات،
                SEO، الذكاء الصناعي، ووضع الصيانة بدون التعامل مع المفاتيح
                التقنية إلا عند الحاجة.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/50">
                <span>الأدمن: {adminEmail || "غير معروف"}</span>
                <span className="hidden text-white/20 md:inline">•</span>
                <span>الحفظ يتم مباشرة في Supabase</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:min-w-56">
              <Link
                href="/admin"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center font-bold text-white/85 transition hover:border-purple-300/50 hover:bg-white/10"
              >
                العودة للوحة التحكم
              </Link>
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-bold text-red-100 transition hover:bg-red-500/20"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-100">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
            {error}
          </div>
        )}

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard title="كل الإعدادات" value={settings.length} note="إجمالي القيم" />
          <StatCard title="عامة للموقع" value={publicCount} note="تظهر للواجهة" />
          <StatCard title="داخلية" value={privateCount} note="للإدارة فقط" />
          <StatCard title="الأقسام" value={visibleGroupCount} note="مجموعات منظمة" />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-purple-500/20 bg-black/40 p-5 backdrop-blur-xl md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black">تجهيز الإعدادات الأساسية</h2>
                <p className="mt-2 leading-7 text-white/55">
                  هذا الزر يضيف فقط الإعدادات الافتراضية الناقصة، ولا يكرر
                  الموجود ولا يحذف أي قيمة معدلة مسبقاً.
                </p>
              </div>
              <button
                type="button"
                onClick={saveDefaultSettings}
                disabled={isSavingDefaults}
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.25)] disabled:opacity-60"
              >
                {isSavingDefaults
                  ? "جارٍ التجهيز..."
                  : missingDefaultsCount > 0
                    ? `إضافة ${missingDefaultsCount} إعداد ناقص`
                    : "الإعدادات مكتملة"}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-amber-400/20 bg-amber-500/10 p-5 md:p-6">
            <div className="text-sm font-bold text-amber-100">ملاحظة إدارية</div>
            <p className="mt-2 leading-7 text-white/62">
              المفاتيح التقنية ما زالت محفوظة داخلياً حتى لا ينكسر الربط، لكن
              الواجهة تعرض أسماء واضحة مثل رقم واتساب الأساسي ووضع الصيانة.
            </p>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {orderedGroupKeys.map((groupKey) => {
            const group = resolveSection(groupKey);
            const count = settings.filter(
              (setting) => (setting.setting_group || "custom") === groupKey
            ).length;

            return (
              <button
                type="button"
                key={groupKey}
                onClick={() => setActiveGroup(groupKey)}
                className={classNames(
                  "rounded-[1.7rem] border bg-gradient-to-br p-5 text-right transition hover:-translate-y-0.5 hover:bg-white/[0.06]",
                  group.tone,
                  activeGroup === groupKey ? "ring-2 ring-purple-300/40" : ""
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-black/25 text-xl">
                    {group.icon}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-sm text-white/65">
                    {count} إعداد
                  </span>
                </div>
                <h3 className="text-lg font-black">{group.label}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {group.description}
                </p>
              </button>
            );
          })}
        </section>

        <section className="mb-6 rounded-[2rem] border border-purple-500/20 bg-black/40 p-4 backdrop-blur-xl md:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الإعداد، قيمته، أو وصفه..."
              className="w-full rounded-2xl border border-white/10 bg-black/35 px-5 py-4 outline-none transition focus:border-purple-400"
            />

            <div className="flex max-w-full gap-2 overflow-x-auto pb-1 md:justify-end">
              <button
                type="button"
                onClick={() => setActiveGroup("all")}
                className={tabClass(activeGroup === "all")}
              >
                الكل
              </button>
              {orderedGroupKeys.map((groupKey) => (
                <button
                  type="button"
                  key={groupKey}
                  onClick={() => setActiveGroup(groupKey)}
                  className={tabClass(activeGroup === groupKey)}
                >
                  {resolveSection(groupKey).shortLabel}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {filteredSettings.length === 0 ? (
            <div className="rounded-[2rem] border border-yellow-500/30 bg-yellow-500/10 p-6 text-yellow-100">
              لا توجد إعدادات مطابقة. جرّب تغيير البحث أو اضغط على الإعدادات
              الافتراضية إذا كانت الصفحة فارغة.
            </div>
          ) : (
            orderedGroupKeys.map((groupKey) => {
              const groupSettings = settingsByGroup[groupKey] || [];
              const group = resolveSection(groupKey);

              if (groupSettings.length === 0) return null;

              return (
                <div
                  key={groupKey}
                  className="rounded-[2rem] border border-purple-500/20 bg-black/38 p-4 backdrop-blur-xl md:p-6"
                >
                  <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div className="flex items-start gap-3">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-xl">
                        {group.icon}
                      </span>
                      <div>
                        <h2 className="text-2xl font-black">{group.label}</h2>
                        <p className="mt-1 leading-7 text-white/55">{group.description}</p>
                      </div>
                    </div>
                    <span className="w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60">
                      {groupSettings.length} إعداد
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {groupSettings.map((setting) => {
                      const draft =
                        drafts[setting.id] ||
                        {
                          value: setting.setting_value || "",
                          description: setting.description || "",
                          is_public: Boolean(setting.is_public),
                        };
                      const key = setting.setting_key || "";
                      const meta = getSettingMeta(key);

                      return (
                        <article
                          key={setting.id}
                          className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_0_40px_rgba(0,0,0,0.18)] md:p-5"
                        >
                          <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-100">
                                  {group.shortLabel}
                                </span>
                                <span
                                  className={classNames(
                                    "rounded-full border px-3 py-1 text-xs",
                                    draft.is_public
                                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                                      : "border-white/10 bg-white/5 text-white/45"
                                  )}
                                >
                                  {draft.is_public ? "عام" : "داخلي"}
                                </span>
                              </div>
                              <h3 className="text-xl font-black leading-8">{meta.label}</h3>
                              <p className="mt-1 leading-7 text-white/55">{meta.hint}</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {renderValueControl(setting, draft)}

                            <div>
                              <label className="mb-2 block text-sm font-bold text-white/70">
                                شرح داخلي لهذا الإعداد
                              </label>
                              <textarea
                                value={draft.description}
                                onChange={(event) =>
                                  updateDraft(setting.id, "description", event.target.value)
                                }
                                placeholder="اكتب شرحاً يساعد فريق الإدارة على فهم الإعداد."
                                className="min-h-24 w-full rounded-3xl border border-white/10 bg-black/30 p-4 leading-7 outline-none focus:border-purple-400"
                              />
                            </div>

                            <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
                              <label className="flex cursor-pointer items-center justify-between gap-4">
                                <span>
                                  <span className="block font-black">متاح للواجهة العامة</span>
                                  <span className="mt-1 block text-sm text-white/45">
                                    فعّله فقط للإعدادات التي يحتاج الموقع العام قراءتها.
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={Boolean(draft.is_public)}
                                  onChange={(event) =>
                                    updateDraft(setting.id, "is_public", event.target.checked)
                                  }
                                  className="h-5 w-5 accent-purple-500"
                                />
                              </label>
                            </div>

                            <details className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
                              <summary className="cursor-pointer font-bold text-white/60">
                                المفتاح التقني
                              </summary>
                              <div className="mt-2 select-all break-all rounded-xl bg-black/35 p-3 font-mono text-xs text-purple-100">
                                {key || "بدون مفتاح"}
                              </div>
                            </details>
                          </div>

                          <button
                            type="button"
                            onClick={() => saveSetting(setting)}
                            className="mt-5 w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-3 font-black text-emerald-100 transition hover:bg-emerald-500/20"
                          >
                            حفظ هذا الإعداد
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-6">
          <button
            type="button"
            onClick={() => setShowAdvancedForm((current) => !current)}
            className="flex w-full items-center justify-between gap-4 text-right"
          >
            <span>
              <span className="block text-2xl font-black">إضافة إعداد مخصص</span>
              <span className="mt-1 block leading-7 text-white/55">
                قسم متقدم لإضافة مفاتيح جديدة عند الحاجة بدون تعديل الكود.
              </span>
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-white/70">
              {showAdvancedForm ? "إخفاء" : "فتح"}
            </span>
          </button>

          {showAdvancedForm && (
            <form onSubmit={createSetting} className="mt-6 border-t border-white/10 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-bold text-white/70">المفتاح التقني</span>
                  <input
                    value={newSetting.setting_key}
                    onChange={(event) => updateNewSetting("setting_key", event.target.value)}
                    placeholder="footer_text"
                    className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold text-white/70">القسم</span>
                  <select
                    value={newSetting.setting_group}
                    onChange={(event) => updateNewSetting("setting_group", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                  >
                    {sectionDefinitions.map((section) => (
                      <option key={section.key} value={section.key} className="bg-[#120019]">
                        {section.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-white/70">القيمة</span>
                  <textarea
                    value={newSetting.setting_value}
                    onChange={(event) => updateNewSetting("setting_value", event.target.value)}
                    placeholder="قيمة الإعداد"
                    className="min-h-28 w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                  />
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-sm font-bold text-white/70">الشرح الداخلي</span>
                  <textarea
                    value={newSetting.description}
                    onChange={(event) => updateNewSetting("description", event.target.value)}
                    placeholder="شرح الإعداد لفريق الإدارة"
                    className="min-h-24 w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-4">
                  <input
                    type="checkbox"
                    checked={newSetting.is_public}
                    onChange={(event) => updateNewSetting("is_public", event.target.checked)}
                    className="h-5 w-5 accent-purple-500"
                  />
                  متاح للواجهة العامة
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.22)]"
              >
                إضافة الإعداد
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({ title, value, note }: { title: string; value: number; note: string }) {
  return (
    <div className="rounded-[1.7rem] border border-purple-500/20 bg-black/40 p-5 backdrop-blur-xl">
      <div className="text-sm font-bold text-white/45">{title}</div>
      <div className="mt-2 text-4xl font-black">{value}</div>
      <div className="mt-2 text-sm text-white/42">{note}</div>
    </div>
  );
}

function getSettingMeta(key: string): SettingMeta {
  return (
    settingMeta[key] || {
      label: prettifyKey(key),
      hint: "إعداد مخصص يمكن التحكم به من لوحة الإدارة.",
      control: "textarea",
    }
  );
}

function resolveSection(key: string): SectionDefinition {
  return (
    sectionDefinitions.find((section) => section.key === key) || {
      key,
      label: prettifyKey(key),
      shortLabel: prettifyKey(key),
      icon: "◇",
      description: "مجموعة إعدادات إضافية.",
      tone: "from-white/10 to-white/5 border-white/15",
    }
  );
}

function resolveControl(key: string, value: string, meta: SettingMeta) {
  if (meta.control) return meta.control;
  if (key.includes("color")) return "color";
  if (["true", "false"].includes(value.toLowerCase())) return "toggle";
  if (value.length > 80 || value.includes(",")) return "textarea";
  return "text";
}

function isEnabledValue(value: string) {
  return ["true", "1", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

function isValidHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function prettifyKey(key: string) {
  if (!key) return "إعداد بدون اسم";
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function tabClass(isActive: boolean) {
  return classNames(
    "shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition",
    isActive
      ? "border-purple-300/50 bg-purple-500/25 text-white"
      : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"
  );
}
