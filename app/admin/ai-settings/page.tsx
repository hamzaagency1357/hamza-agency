"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type SettingRow = {
  id?: string | number | null;
  setting_key?: string | null;
  setting_value?: string | null;
  setting_group?: string | null;
  description?: string | null;
  is_public?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Tone = "purple" | "green" | "blue" | "yellow" | "red" | "cyan";
type SettingStatus = "enabled" | "disabled" | "configured" | "missing";

const aiSettingDefinitions = [
  {
    key: "ai_support_enabled",
    title: "تشغيل الدعم الذكي",
    group: "ai",
    description: "التحكم بتفعيل أو إيقاف واجهة الدعم الذكي عند ربطها بالزوار.",
    safeDefault: "false",
    tone: "green" as Tone,
  },
  {
    key: "ai_support_instructions",
    title: "تعليمات المساعد",
    group: "ai",
    description: "التعليمات الأساسية التي تحدد طريقة رد المساعد الذكي ونطاق عمله.",
    safeDefault: "مساعد وكالة حمزة يجيب فقط من معلومات الوكالة وقاعدة المعرفة.",
    tone: "purple" as Tone,
  },
  {
    key: "ai_whatsapp_escalation_message",
    title: "رسالة التحويل إلى واتساب",
    group: "ai",
    description: "النص المستخدم عند تحويل الزائر إلى المتابعة البشرية عبر واتساب.",
    safeDefault: "يرجى التواصل مع فريق وكالة حمزة عبر واتساب لمتابعة طلبك.",
    tone: "yellow" as Tone,
  },
  {
    key: "ai_knowledge_base_enabled",
    title: "استخدام قاعدة المعرفة",
    group: "ai",
    description: "تجهيز ربط الدعم الذكي بمحتوى قاعدة المعرفة المعتمد.",
    safeDefault: "true",
    tone: "cyan" as Tone,
  },
  {
    key: "ai_unanswered_capture_enabled",
    title: "تسجيل الأسئلة غير المجاب عنها",
    group: "ai",
    description: "تجهيز حفظ الأسئلة التي لا يستطيع المساعد الإجابة عنها لمراجعتها من الإدارة.",
    safeDefault: "true",
    tone: "blue" as Tone,
  },
];

function normalize(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getSettingStatus(setting?: SettingRow): SettingStatus {
  if (!setting) return "missing";
  const value = normalize(setting.setting_value);

  if (["true", "1", "yes", "enabled", "active", "on"].includes(value)) return "enabled";
  if (["false", "0", "no", "disabled", "inactive", "off"].includes(value)) return "disabled";
  return value ? "configured" : "missing";
}

function getStatusLabel(status: SettingStatus) {
  if (status === "enabled") return "مفعّل";
  if (status === "disabled") return "متوقف";
  if (status === "configured") return "مضبوط";
  return "غير موجود";
}

function formatDate(value?: string | null) {
  if (!value) return "غير متوفر";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متوفر";

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function AdminAiSettingsPage() {
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("ai_settings");

      if (!access.isAuthorized || !access.profile) {
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        router.replace("/admin/login");
        return;
      }

      if (access.profile.role === "program_admin") {
        setAdminEmail(access.profile.email || access.user?.email || "");
        setIsForbidden(true);
        setIsAuthorized(false);
        setIsCheckingAuth(false);
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsCheckingAuth(false);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) return;
    loadAiSettings();
  }, [isAuthorized]);

  async function loadAiSettings() {
    if (!supabase) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    setError("");
    setIsLoading(true);

    const keys = aiSettingDefinitions.map((setting) => setting.key);

    const { data, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .in("setting_key", keys);

    setIsLoading(false);

    if (settingsError) {
      setError("تعذر تحميل إعدادات الدعم الذكي. يرجى التأكد من صلاحيات قراءة جدول settings.");
      return;
    }

    setSettings((data || []) as SettingRow[]);
  }

  const settingsByKey = useMemo(() => {
    const map = new Map<string, SettingRow>();
    settings.forEach((setting) => {
      if (setting.setting_key) map.set(setting.setting_key, setting);
    });
    return map;
  }, [settings]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return aiSettingDefinitions
      .map((definition) => {
        const current = settingsByKey.get(definition.key);
        return {
          ...definition,
          current,
          status: getSettingStatus(current),
        };
      })
      .filter((item) => {
        if (!query) return true;
        return [
          item.key,
          item.title,
          item.description,
          item.current?.setting_value || item.safeDefault,
          getStatusLabel(item.status),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [search, settingsByKey]);

  const existingCount = aiSettingDefinitions.filter((item) => settingsByKey.has(item.key)).length;
  const enabledCount = rows.filter((item) => item.status === "enabled").length;
  const missingCount = aiSettingDefinitions.length - existingCount;
  const supportEnabled = getSettingStatus(settingsByKey.get("ai_support_enabled")) === "enabled";

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
          <h1 className="mt-3 text-3xl font-black">لا يمكن عرض إعدادات الدعم الذكي لهذا الحساب</h1>
          <p className="mt-4 leading-8 text-white/60">إعدادات الدعم الذكي مخصصة لحسابات السوبر أدمن ونائب السوبر أدمن فقط.</p>
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
            <div className="mb-3 inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-2 text-sm font-bold text-fuchsia-100">
              إعدادات الدعم الذكي
            </div>
            <h1 className="text-4xl font-black md:text-5xl">AI Settings</h1>
            <p className="mt-3 max-w-3xl leading-8 text-white/55">
              مركز متابعة مفاتيح تشغيل الدعم الذكي وتعليمات المساعد ورسائل التحويل إلى واتساب وربط قاعدة المعرفة.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadAiSettings}
              disabled={isLoading}
              className="rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-3 font-black text-white shadow-[0_0_30px_rgba(168,85,247,0.22)] disabled:opacity-60"
            >
              {isLoading ? "جاري التحديث..." : "تحديث الإعدادات"}
            </button>
            <Link href="/admin/settings" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              إعدادات الموقع
            </Link>
            <Link href="/admin" className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 font-bold text-white/75">
              لوحة الإدارة
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/55">
          حساب الإدارة: <span className="text-white">{adminEmail}</span>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-red-400/25 bg-red-500/10 p-5 leading-8 text-red-100">
            {error}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="مفاتيح الإعداد" value={aiSettingDefinitions.length} tone="purple" />
          <StatCard label="موجودة" value={existingCount} tone="green" />
          <StatCard label="مفعّلة" value={enabledCount} tone="cyan" />
          <StatCard label="غير مضافة" value={missingCount} tone="yellow" />
          <div className={`rounded-3xl border p-5 ${supportEnabled ? toneClass("green") : toneClass("red")}`}>
            <div className="text-sm font-bold opacity-75">حالة الدعم الذكي</div>
            <div className="mt-2 text-2xl font-black">{supportEnabled ? "مفعّل" : "متوقف"}</div>
          </div>
        </div>

        <section className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث في مفاتيح الدعم الذكي أو الوصف..."
            className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 text-white outline-none placeholder:text-white/35 focus:border-fuchsia-300/40"
          />
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          {rows.map((item) => (
            <article key={item.key} className={`rounded-[2rem] border p-5 ${toneClass(item.status === "missing" ? "red" : item.tone)}`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-3 inline-flex rounded-full border border-white/10 bg-black/20 px-4 py-1 text-sm font-black">
                    {getStatusLabel(item.status)}
                  </div>
                  <h2 className="text-2xl font-black">{item.title}</h2>
                  <p className="mt-3 leading-8 opacity-75">{item.description}</p>
                </div>

                <div className="text-sm opacity-75 md:text-left" dir="ltr">
                  {item.key}
                </div>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4">
                <div className="text-sm font-bold opacity-65">القيمة الحالية</div>
                <pre className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-white">
                  {item.current?.setting_value || item.safeDefault}
                </pre>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InfoBox label="المجموعة" value={item.current?.setting_group || item.group} />
                <InfoBox label="آخر تحديث" value={formatDate(item.current?.updated_at)} />
              </div>
            </article>
          ))}
        </section>

        {rows.length === 0 && (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-white/55">
            لا توجد إعدادات مطابقة للبحث.
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: Tone }) {
  return (
    <div className={`rounded-3xl border p-5 ${toneClass(tone)}`}>
      <div className="text-sm font-bold opacity-75">{label}</div>
      <div className="mt-2 text-4xl font-black" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs font-bold text-white/45">{label}</div>
      <div className="mt-2 break-words text-sm font-bold text-white/75">{value}</div>
    </div>
  );
}

function toneClass(tone: Tone) {
  const classes: Record<Tone, string> = {
    purple: "border-purple-400/20 bg-purple-500/10 text-purple-100",
    green: "border-green-400/20 bg-green-500/10 text-green-100",
    blue: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    yellow: "border-yellow-400/20 bg-yellow-500/10 text-yellow-100",
    red: "border-red-400/20 bg-red-500/10 text-red-100",
    cyan: "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  };

  return classes[tone];
}
