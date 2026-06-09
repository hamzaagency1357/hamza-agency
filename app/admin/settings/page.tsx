"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { requireAdminModuleAccess } from "@/lib/adminAccess";

type SettingItem = {
  id: number;
  created_at: string | null;
  updated_at: string | null;
  setting_key: string | null;
  setting_value: string | null;
  setting_group: string | null;
  group_name: string | null;
  label_ar: string | null;
  label_en: string | null;
  description: string | null;
  input_type: string | null;
  sort_order: number | null;
  is_public: boolean | null;
};

type SettingDraft = {
  value: string;
  groupName: string;
  labelAr: string;
  labelEn: string;
  description: string;
  inputType: string;
  sortOrder: string;
  isPublic: boolean;
};

type NewSettingDraft = {
  setting_key: string;
  setting_value: string;
  group_name: string;
  label_ar: string;
  label_en: string;
  description: string;
  input_type: string;
  sort_order: string;
  is_public: boolean;
};

type SectionDefinition = {
  key: string;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  tone: string;
};

type SettingMeta = {
  label: string;
  hint: string;
  control?: "text" | "textarea" | "color" | "toggle" | "select" | "url" | "email" | "number";
  placeholder?: string;
  options?: { label: string; value: string }[];
};

const sectionDefinitions: SectionDefinition[] = [
  {
    key: "identity",
    label: "الهوية العامة",
    shortLabel: "هوية",
    icon: "◆",
    description: "اسم الوكالة، وصفها المختصر، والنصوص التعريفية الأساسية.",
    tone: "from-purple-500/20 to-fuchsia-500/10 border-purple-400/25",
  },
  {
    key: "contact",
    label: "التواصل",
    shortLabel: "تواصل",
    icon: "☎",
    description: "أرقام واتساب، البريد الإلكتروني، وأوقات المتابعة.",
    tone: "from-emerald-500/20 to-green-500/10 border-emerald-400/25",
  },
  {
    key: "footer",
    label: "الفوتر",
    shortLabel: "فوتر",
    icon: "▣",
    description: "نصوص تذييل الموقع، حقوق النشر، وأزرار التواصل السريعة.",
    tone: "from-amber-500/20 to-yellow-500/10 border-amber-400/25",
  },
  {
    key: "social",
    label: "الروابط الاجتماعية",
    shortLabel: "روابط",
    icon: "↗",
    description: "روابط الحسابات الرسمية التي يمكن عرضها في الموقع.",
    tone: "from-cyan-500/20 to-blue-500/10 border-cyan-400/25",
  },
  {
    key: "branding",
    label: "الألوان والمظهر",
    shortLabel: "مظهر",
    icon: "✦",
    description: "ألوان الهوية البصرية والخلفيات العامة.",
    tone: "from-yellow-500/20 to-purple-500/10 border-yellow-400/25",
  },
  {
    key: "media",
    label: "الوسائط والخلفيات",
    shortLabel: "وسائط",
    icon: "◈",
    description: "إعدادات الخلفيات والوسائط المرتبطة بالموقع.",
    tone: "from-pink-500/20 to-purple-500/10 border-pink-400/25",
  },
  {
    key: "language",
    label: "اللغات",
    shortLabel: "لغات",
    icon: "⌘",
    description: "اللغة الافتراضية واتجاه العرض وإعدادات الترجمة.",
    tone: "from-sky-500/20 to-cyan-500/10 border-sky-400/25",
  },
  {
    key: "languages",
    label: "اللغات القديمة",
    shortLabel: "لغات",
    icon: "⌘",
    description: "إعدادات لغات موجودة من النظام السابق، تبقى قابلة للإدارة.",
    tone: "from-sky-500/20 to-cyan-500/10 border-sky-400/25",
  },
  {
    key: "seo",
    label: "SEO",
    shortLabel: "SEO",
    icon: "◎",
    description: "العنوان والوصف والكلمات المفتاحية الافتراضية لمحركات البحث.",
    tone: "from-blue-500/20 to-indigo-500/10 border-blue-400/25",
  },
  {
    key: "ai",
    label: "الذكاء الاصطناعي",
    shortLabel: "AI",
    icon: "✺",
    description: "تشغيل الدعم الذكي وتعليماته ورسائل التصعيد.",
    tone: "from-violet-500/20 to-purple-500/10 border-violet-400/25",
  },
  {
    key: "system",
    label: "النظام والصيانة",
    shortLabel: "نظام",
    icon: "⚙",
    description: "وضع الصيانة والإعدادات الداخلية الحساسة.",
    tone: "from-red-500/20 to-orange-500/10 border-red-400/25",
  },
  {
    key: "custom",
    label: "إعدادات مخصصة",
    shortLabel: "مخصص",
    icon: "+",
    description: "إعدادات إضافية غير مصنفة ضمن المجموعات الأساسية.",
    tone: "from-slate-500/20 to-white/5 border-white/15",
  },
];

const settingMeta: Record<string, SettingMeta> = {
  site_name: {
    label: "اسم الموقع الرسمي",
    hint: "الاسم الأساسي الذي يظهر في المتصفح وبيانات الموقع.",
    control: "text",
    placeholder: "HAMZA AGENCY",
  },
  agency_name_ar: {
    label: "اسم الوكالة بالعربية",
    hint: "الاسم العربي المستخدم في الصفحات العامة.",
    control: "text",
    placeholder: "وكالة حمزة",
  },
  agency_name_en: {
    label: "اسم الوكالة بالإنجليزية",
    hint: "الاسم الإنجليزي المستخدم في الواجهات وبيانات المشاركة.",
    control: "text",
    placeholder: "HAMZA AGENCY",
  },
  agency_manager_name: {
    label: "تعريف إدارة الوكالة",
    hint: "نص تعريفي إداري يظهر عند الحاجة داخل صفحات الوكالة.",
    control: "text",
  },
  site_tagline_ar: {
    label: "الوصف المختصر للموقع",
    hint: "جملة قصيرة تلخص نشاط وكالة حمزة.",
    control: "text",
  },
  site_description: {
    label: "وصف الوكالة العام",
    hint: "وصف عام يمكن استخدامه في الصفحات وبيانات SEO.",
    control: "textarea",
  },
  primary_whatsapp: {
    label: "رقم واتساب الأساسي",
    hint: "الرقم الرئيسي للتواصل من الصفحات العامة.",
    control: "text",
    placeholder: "+905011730377",
  },
  support_whatsapp: {
    label: "رقم واتساب الدعم",
    hint: "رقم الدعم والمتابعة المستخدم في صفحات التواصل والخدمات.",
    control: "text",
    placeholder: "+905011730377",
  },
  contact_email: {
    label: "البريد الإلكتروني",
    hint: "البريد الرسمي الظاهر في صفحة التواصل.",
    control: "email",
    placeholder: "name@example.com",
  },
  support_email: {
    label: "بريد الدعم",
    hint: "بريد دعم موجود من الإعدادات السابقة، يبقى قابلاً للإدارة.",
    control: "email",
  },
  working_hours: {
    label: "أوقات المتابعة",
    hint: "نص يوضح طريقة متابعة الرسائل والطلبات.",
    control: "textarea",
  },
  footer_description_ar: {
    label: "وصف الفوتر",
    hint: "النص التعريفي المختصر في تذييل الموقع.",
    control: "textarea",
  },
  footer_copyright_ar: {
    label: "حقوق النشر",
    hint: "نص حقوق النشر الظاهر أسفل الموقع.",
    control: "text",
  },
  footer_whatsapp_label: {
    label: "نص زر واتساب في الفوتر",
    hint: "النص المستخدم لزر التواصل السريع.",
    control: "text",
  },
  social_tiktok_url: {
    label: "رابط TikTok",
    hint: "رابط الحساب الرسمي عند توفره.",
    control: "url",
    placeholder: "https://...",
  },
  social_instagram_url: {
    label: "رابط Instagram",
    hint: "رابط حساب Instagram الرسمي عند توفره.",
    control: "url",
    placeholder: "https://...",
  },
  social_facebook_url: {
    label: "رابط Facebook",
    hint: "رابط صفحة Facebook الرسمية عند توفرها.",
    control: "url",
    placeholder: "https://...",
  },
  social_telegram_url: {
    label: "رابط Telegram",
    hint: "رابط Telegram الرسمي عند توفره.",
    control: "url",
    placeholder: "https://...",
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
    hint: "الخلفية الخفيفة التي تظهر عند عدم وجود وسائط مخصصة.",
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
    hint: "اختر نوع الخلفية الافتراضية للصفحة الرئيسية.",
    control: "select",
    options: [
      { label: "خلفية برمجية", value: "generated" },
      { label: "فيديو", value: "video" },
      { label: "ثابتة", value: "static" },
    ],
  },
  default_language: {
    label: "اللغة الافتراضية",
    hint: "اللغة الأساسية للموقع حالياً.",
    control: "select",
    options: [
      { label: "العربية", value: "ar" },
      { label: "English", value: "en" },
      { label: "Türkçe", value: "tr" },
    ],
  },
  default_direction: {
    label: "اتجاه العرض الافتراضي",
    hint: "اتجاه عرض النصوص في الموقع.",
    control: "select",
    options: [
      { label: "من اليمين إلى اليسار", value: "rtl" },
      { label: "من اليسار إلى اليمين", value: "ltr" },
    ],
  },
  supported_languages: {
    label: "اللغات المدعومة",
    hint: "رموز اللغات مفصولة بفواصل، مثال: ar,en,tr.",
    control: "text",
    placeholder: "ar,en,tr",
  },
  seo_default_title: {
    label: "عنوان SEO الافتراضي",
    hint: "العنوان الافتراضي عند عدم وجود عنوان مخصص للصفحة.",
    control: "text",
  },
  seo_default_description: {
    label: "وصف SEO الافتراضي",
    hint: "وصف مختصر لمحركات البحث ووسائل المشاركة.",
    control: "textarea",
  },
  seo_default_keywords: {
    label: "الكلمات المفتاحية الافتراضية",
    hint: "كلمات مفصولة بفواصل لتنظيم استراتيجية الظهور.",
    control: "textarea",
  },
  ai_support_enabled: {
    label: "تشغيل الدعم الذكي",
    hint: "إعداد داخلي لتفعيل أو إيقاف دعم الذكاء الاصطناعي.",
    control: "toggle",
  },
  ai_whatsapp_escalation_message: {
    label: "رسالة التحويل إلى واتساب",
    hint: "الرسالة الجاهزة عند تحويل الزائر إلى فريق الوكالة.",
    control: "textarea",
  },
  ai_support_instructions: {
    label: "تعليمات الدعم الذكي",
    hint: "إرشادات داخلية لضبط طريقة رد الدعم الذكي.",
    control: "textarea",
  },
  ai_knowledge_base_enabled: {
    label: "تفعيل قاعدة المعرفة للذكاء الاصطناعي",
    hint: "يسمح للدعم الذكي بالاعتماد على محتوى مركز المعرفة.",
    control: "toggle",
  },
  ai_unanswered_capture_enabled: {
    label: "حفظ الأسئلة غير المجابة",
    hint: "يجمع الأسئلة التي تحتاج مراجعة إدارية لتحسين الدعم.",
    control: "toggle",
  },
  maintenance_mode: {
    label: "وضع الصيانة",
    hint: "إعداد داخلي لإظهار رسالة صيانة عند تفعيله.",
    control: "toggle",
  },
  maintenance_mode_enabled: {
    label: "تفعيل وضع الصيانة",
    hint: "إعداد قديم للتوافق مع النسخة الحالية.",
    control: "toggle",
  },
  maintenance_message_ar: {
    label: "رسالة الصيانة",
    hint: "الرسالة التي تظهر عند تفعيل وضع الصيانة.",
    control: "textarea",
  },
  maintenance_mode_message: {
    label: "رسالة الصيانة القديمة",
    hint: "رسالة صيانة موجودة من الإعدادات السابقة.",
    control: "textarea",
  },
  maintenance_mode_whatsapp_enabled: {
    label: "إظهار واتساب أثناء الصيانة",
    hint: "يسمح بإظهار خيار التواصل أثناء وضع الصيانة.",
    control: "toggle",
  },
};

const inputTypeOptions = [
  { label: "نص قصير", value: "text" },
  { label: "نص طويل", value: "textarea" },
  { label: "رابط", value: "url" },
  { label: "بريد إلكتروني", value: "email" },
  { label: "لون", value: "color" },
  { label: "تشغيل/إيقاف", value: "boolean" },
  { label: "اختيار", value: "select" },
  { label: "رقم", value: "number" },
];

const emptyNewSetting: NewSettingDraft = {
  setting_key: "",
  setting_value: "",
  group_name: "custom",
  label_ar: "",
  label_en: "",
  description: "",
  input_type: "text",
  sort_order: "100",
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
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedForm, setShowAdvancedForm] = useState(false);

  useEffect(() => {
    async function checkAdminAccess() {
      const access = await requireAdminModuleAccess("settings");

      if (!access.isAuthorized || !access.profile) {
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
    if (!isAuthorized) return;
    loadSettings();
  }, [isAuthorized]);

  async function loadSettings() {
    if (!supabase) return;

    setIsLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("settings")
      .select(
        "id, created_at, updated_at, setting_key, setting_value, setting_group, group_name, label_ar, label_en, description, input_type, sort_order, is_public"
      )
      .order("group_name", { ascending: true, nullsFirst: false })
      .order("setting_group", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    setIsLoading(false);

    if (error) {
      setError("تعذر تحميل الإعدادات. يرجى التأكد من صلاحيات جدول settings.");
      return;
    }

    const items = (data || []) as SettingItem[];
    setSettings(items);

    const nextDrafts: Record<number, SettingDraft> = {};

    items.forEach((setting) => {
      const groupName = getGroupKey(setting);
      const meta = getSettingMeta(setting.setting_key || "", setting);

      nextDrafts[setting.id] = {
        value: setting.setting_value || "",
        groupName,
        labelAr: setting.label_ar || meta.label,
        labelEn: setting.label_en || "",
        description: setting.description || meta.hint,
        inputType: setting.input_type || normalizeInputType(meta.control || "text"),
        sortOrder: String(setting.sort_order ?? 100),
        isPublic: Boolean(setting.is_public),
      };
    });

    setDrafts(nextDrafts);
  }

  const orderedGroupKeys = useMemo(() => {
    const presentGroups = new Set(settings.map((setting) => getGroupKey(setting)));

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
      const groupKey = getGroupKey(setting);
      const key = setting.setting_key || "";
      const meta = getSettingMeta(key, setting);
      const draft = drafts[setting.id];
      const groupMatch = activeGroup === "all" || groupKey === activeGroup;
      const text = `${key} ${meta.label} ${meta.hint} ${setting.setting_value || ""} ${
        setting.description || ""
      } ${setting.label_ar || ""} ${setting.label_en || ""} ${groupKey} ${draft?.groupName || ""}`.toLowerCase();

      return groupMatch && (!normalizedSearch || text.includes(normalizedSearch));
    });
  }, [settings, activeGroup, search, drafts]);

  const settingsByGroup = useMemo(() => {
    return filteredSettings.reduce<Record<string, SettingItem[]>>((groups, setting) => {
      const groupKey = drafts[setting.id]?.groupName || getGroupKey(setting);
      groups[groupKey] = groups[groupKey] || [];
      groups[groupKey].push(setting);
      return groups;
    }, {});
  }, [filteredSettings, drafts]);

  const publicCount = settings.filter((setting) => setting.is_public).length;
  const privateCount = settings.filter((setting) => !setting.is_public).length;
  const footerAndContactCount = settings.filter((setting) =>
    ["contact", "footer", "social"].includes(getGroupKey(setting))
  ).length;
  const visibleGroupCount = orderedGroupKeys.filter((groupKey) => settingsByGroup[groupKey]?.length)
    .length;

  function updateDraft(id: number, key: keyof SettingDraft, value: string | boolean) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || defaultDraft()),
        [key]: value,
      },
    }));
  }

  function updateNewSetting<K extends keyof NewSettingDraft>(key: K, value: NewSettingDraft[K]) {
    setNewSetting((current) => ({ ...current, [key]: value }));
  }

  async function saveSetting(setting: SettingItem) {
    if (!supabase) return;

    const draft = drafts[setting.id];
    if (!draft) return;

    setMessage("");
    setError("");

    const cleanGroupName = draft.groupName.trim() || "custom";
    const cleanInputType = draft.inputType.trim() || "text";
    const payload = {
      setting_value: draft.value,
      setting_group: cleanGroupName,
      group_name: cleanGroupName,
      label_ar: draft.labelAr.trim() || prettifyKey(setting.setting_key || ""),
      label_en: draft.labelEn.trim(),
      description: draft.description.trim(),
      input_type: cleanInputType,
      sort_order: Number.parseInt(draft.sortOrder, 10) || 0,
      is_public: draft.isPublic,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("settings").update(payload).eq("id", setting.id);

    if (error) {
      setError("فشل حفظ الإعداد. يرجى التأكد من صلاحيات جدول settings.");
      return;
    }

    await logActivity(
      "update_setting",
      "settings",
      String(setting.id),
      JSON.stringify(setting),
      JSON.stringify(payload)
    );

    setMessage(`تم حفظ الإعداد: ${payload.label_ar}`);
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

    const cleanGroupName = newSetting.group_name.trim() || "custom";
    const payload = {
      setting_key: newKey,
      setting_value: newSetting.setting_value.trim(),
      setting_group: cleanGroupName,
      group_name: cleanGroupName,
      label_ar: newSetting.label_ar.trim() || prettifyKey(newKey),
      label_en: newSetting.label_en.trim(),
      description: newSetting.description.trim(),
      input_type: newSetting.input_type.trim() || "text",
      sort_order: Number.parseInt(newSetting.sort_order, 10) || 100,
      is_public: Boolean(newSetting.is_public),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("settings").insert(payload);

    if (error) {
      setError("فشل إضافة الإعداد. تأكد أن صلاحيات جدول settings صحيحة.");
      return;
    }

    await logActivity("create_setting", "settings", payload.setting_key, "", JSON.stringify(payload));

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
    const meta = getSettingMeta(key, setting);
    const control = resolveControl(key, draft.value, draft.inputType, meta);

    if (control === "toggle") {
      const isOn = isEnabledValue(draft.value);

      return (
        <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="font-black text-white">القيمة الحالية</div>
              <div className="mt-1 text-sm text-white/45">{isOn ? "مفعّل" : "متوقف"}</div>
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
              aria-label={draft.labelAr || meta.label}
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
        type={control === "email" ? "email" : control === "url" ? "url" : control === "number" ? "number" : "text"}
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
                  Settings CMS
                </span>
              </div>

              <h1 className="text-3xl font-black leading-tight md:text-5xl">إعدادات الموقع</h1>
              <p className="mt-4 max-w-3xl leading-8 text-white/62">
                مركز منظم لإدارة هوية HAMZA AGENCY، التواصل، الفوتر، الروابط الاجتماعية،
                SEO، الذكاء الاصطناعي، ووضع الصيانة من لوحة واحدة.
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
          <StatCard title="عامة للموقع" value={publicCount} note="تقرأها الواجهة" />
          <StatCard title="داخلية" value={privateCount} note="للإدارة فقط" />
          <StatCard title="التواصل والفوتر" value={footerAndContactCount} note="جاهزة للإدارة" />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-purple-500/20 bg-black/40 p-5 backdrop-blur-xl md:p-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black">إدارة منظمة حسب التصنيفات</h2>
                <p className="mt-2 leading-7 text-white/55">
                  تعرض هذه الصفحة الحقول الجديدة مثل التصنيف، التسمية العربية، نوع الحقل،
                  والترتيب، مع إبقاء المفاتيح التقنية قابلة للفحص عند الحاجة.
                </p>
              </div>
              <button
                type="button"
                onClick={loadSettings}
                disabled={isLoading}
                className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.25)] disabled:opacity-60"
              >
                {isLoading ? "جاري التحديث..." : "تحديث الإعدادات"}
              </button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-amber-400/20 bg-amber-500/10 p-5 md:p-6">
            <div className="text-sm font-bold text-amber-100">تنظيم مهم</div>
            <p className="mt-2 leading-7 text-white/62">
              تظهر الإعدادات القديمة والجديدة معاً لضمان عدم كسر أي صفحة. يتم توحيد الأسماء
              بشكل نهائي ضمن مراجعة الجودة الشاملة.
            </p>
          </div>
        </section>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-black/35 p-4 md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث باسم الإعداد، المفتاح، التصنيف، أو القيمة..."
              className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
            />

            <button
              type="button"
              onClick={() => setShowAdvancedForm((current) => !current)}
              className="rounded-2xl border border-purple-400/25 bg-purple-500/15 px-5 py-4 font-black text-purple-100"
            >
              {showAdvancedForm ? "إخفاء إضافة إعداد" : "إضافة إعداد مخصص"}
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button type="button" onClick={() => setActiveGroup("all")} className={tabClass(activeGroup === "all")}>
              الكل
            </button>
            {orderedGroupKeys.map((groupKey) => {
              const group = resolveSection(groupKey);
              return (
                <button
                  key={groupKey}
                  type="button"
                  onClick={() => setActiveGroup(groupKey)}
                  className={tabClass(activeGroup === groupKey)}
                >
                  {group.shortLabel}
                </button>
              );
            })}
          </div>
        </section>

        {showAdvancedForm && (
          <section className="mb-6 rounded-[2rem] border border-purple-500/20 bg-black/40 p-5 md:p-6">
            <form onSubmit={createSetting} className="grid gap-4 md:grid-cols-2">
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
                <span className="mb-2 block text-sm font-bold text-white/70">التصنيف</span>
                <select
                  value={newSetting.group_name}
                  onChange={(event) => updateNewSetting("group_name", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                >
                  {sectionDefinitions.map((section) => (
                    <option key={section.key} value={section.key} className="bg-[#120019]">
                      {section.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-white/70">الاسم العربي</span>
                <input
                  value={newSetting.label_ar}
                  onChange={(event) => updateNewSetting("label_ar", event.target.value)}
                  placeholder="اسم واضح داخل لوحة التحكم"
                  className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-white/70">نوع الحقل</span>
                <select
                  value={newSetting.input_type}
                  onChange={(event) => updateNewSetting("input_type", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                >
                  {inputTypeOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#120019]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-white/70">الترتيب</span>
                <input
                  value={newSetting.sort_order}
                  onChange={(event) => updateNewSetting("sort_order", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-bold text-white/70">الاسم الإنجليزي</span>
                <input
                  value={newSetting.label_en}
                  onChange={(event) => updateNewSetting("label_en", event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-purple-400"
                />
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
                <span className="mb-2 block text-sm font-bold text-white/70">الشرح الإداري</span>
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

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-8 py-4 font-black shadow-[0_0_35px_rgba(168,85,247,0.22)]"
                >
                  إضافة الإعداد
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="space-y-5">
          {filteredSettings.length === 0 ? (
            <div className="rounded-[2rem] border border-white/10 bg-black/35 p-8 text-center text-white/55">
              لا توجد إعدادات مطابقة. جرّب تغيير البحث أو التصنيف.
            </div>
          ) : (
            orderedGroupKeys.map((groupKey) => {
              const groupSettings = settingsByGroup[groupKey] || [];
              const group = resolveSection(groupKey);
              if (groupSettings.length === 0) return null;

              return (
                <div
                  key={groupKey}
                  className={classNames(
                    "rounded-[2rem] border bg-gradient-to-br p-4 backdrop-blur-xl md:p-6",
                    group.tone
                  )}
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
                    <span className="w-fit rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/70">
                      {groupSettings.length} إعداد
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    {groupSettings.map((setting) => {
                      const draft = drafts[setting.id] || defaultDraft();
                      const key = setting.setting_key || "";
                      const meta = getSettingMeta(key, setting);

                      return (
                        <article
                          key={setting.id}
                          className="rounded-[1.7rem] border border-white/10 bg-black/35 p-4 shadow-[0_0_40px_rgba(0,0,0,0.18)] md:p-5"
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
                                    draft.isPublic
                                      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                                      : "border-white/10 bg-white/5 text-white/45"
                                  )}
                                >
                                  {draft.isPublic ? "عام" : "داخلي"}
                                </span>
                              </div>
                              <h3 className="text-xl font-black leading-8">
                                {draft.labelAr || meta.label}
                              </h3>
                              <p className="mt-1 leading-7 text-white/55">
                                {draft.description || meta.hint}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {renderValueControl(setting, draft)}

                            <div className="grid gap-3 md:grid-cols-2">
                              <label>
                                <span className="mb-2 block text-sm font-bold text-white/70">
                                  التسمية العربية
                                </span>
                                <input
                                  value={draft.labelAr}
                                  onChange={(event) => updateDraft(setting.id, "labelAr", event.target.value)}
                                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-400"
                                />
                              </label>

                              <label>
                                <span className="mb-2 block text-sm font-bold text-white/70">
                                  التصنيف
                                </span>
                                <select
                                  value={draft.groupName}
                                  onChange={(event) => updateDraft(setting.id, "groupName", event.target.value)}
                                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-400"
                                >
                                  {sectionDefinitions.map((section) => (
                                    <option key={section.key} value={section.key} className="bg-[#120019]">
                                      {section.label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                <span className="mb-2 block text-sm font-bold text-white/70">
                                  نوع الحقل
                                </span>
                                <select
                                  value={draft.inputType}
                                  onChange={(event) => updateDraft(setting.id, "inputType", event.target.value)}
                                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-400"
                                >
                                  {inputTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value} className="bg-[#120019]">
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label>
                                <span className="mb-2 block text-sm font-bold text-white/70">الترتيب</span>
                                <input
                                  value={draft.sortOrder}
                                  onChange={(event) => updateDraft(setting.id, "sortOrder", event.target.value)}
                                  className="w-full rounded-2xl border border-white/10 bg-black/30 p-3 outline-none focus:border-purple-400"
                                />
                              </label>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-bold text-white/70">
                                الشرح الإداري
                              </label>
                              <textarea
                                value={draft.description}
                                onChange={(event) => updateDraft(setting.id, "description", event.target.value)}
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
                                  checked={Boolean(draft.isPublic)}
                                  onChange={(event) => updateDraft(setting.id, "isPublic", event.target.checked)}
                                  className="h-5 w-5 accent-purple-500"
                                />
                              </label>
                            </div>

                            <details className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
                              <summary className="cursor-pointer font-bold text-white/60">المفتاح التقني</summary>
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

function getSettingMeta(key: string, setting?: SettingItem): SettingMeta {
  const explicitLabel = setting?.label_ar?.trim();
  const explicitHint = setting?.description?.trim();
  const base =
    settingMeta[key] ||
    ({
      label: prettifyKey(key),
      hint: "إعداد مخصص يمكن التحكم به من لوحة الإدارة.",
      control: "textarea",
    } satisfies SettingMeta);

  return {
    ...base,
    label: explicitLabel || base.label,
    hint: explicitHint || base.hint,
    control: normalizeControl(setting?.input_type || base.control),
  };
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

function resolveControl(key: string, value: string, inputType: string, meta: SettingMeta) {
  const normalized = normalizeControl(inputType || meta.control);
  if (normalized) return normalized;
  if (key.includes("color")) return "color";
  if (["true", "false"].includes(value.toLowerCase())) return "toggle";
  if (value.length > 80 || value.includes(",")) return "textarea";
  return "text";
}

function normalizeControl(value?: string | null): SettingMeta["control"] | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "boolean") return "toggle";
  if (normalized === "long_text") return "textarea";
  if (["text", "textarea", "color", "toggle", "select", "url", "email", "number"].includes(normalized)) {
    return normalized as SettingMeta["control"];
  }
  return undefined;
}

function normalizeInputType(value?: string | null) {
  const normalized = value?.trim().toLowerCase() || "text";
  if (normalized === "toggle") return "boolean";
  if (["text", "textarea", "url", "email", "color", "boolean", "select", "number"].includes(normalized)) {
    return normalized;
  }
  return "text";
}

function getGroupKey(setting: SettingItem) {
  return setting.group_name || setting.setting_group || "custom";
}

function defaultDraft(): SettingDraft {
  return {
    value: "",
    groupName: "custom",
    labelAr: "",
    labelEn: "",
    description: "",
    inputType: "text",
    sortOrder: "100",
    isPublic: false,
  };
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
