"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

type SettingRow = {
  id: number;
  setting_key: string;
  setting_value: string | null;
};

type HomepageField = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  sortOrder: number;
};

const homepageFields: HomepageField[] = [
  { key: "home_stat_1_number", label: "رقم صناع المحتوى", description: "الرقم الأول الظاهر في بطاقات الصفحة الرئيسية.", defaultValue: "+7000", sortOrder: 50 },
  { key: "home_stat_1_label", label: "تسمية صناع المحتوى", description: "النص تحت رقم صناع المحتوى.", defaultValue: "صانع محتوى", sortOrder: 60 },
  { key: "home_stat_2_number", label: "رقم المنصات المتاحة", description: "الرقم الثاني الظاهر في بطاقات الصفحة الرئيسية.", defaultValue: "+5", sortOrder: 70 },
  { key: "home_stat_2_label", label: "تسمية المنصات المتاحة", description: "النص تحت رقم المنصات المتاحة.", defaultValue: "منصات متاحة", sortOrder: 80 },
  { key: "home_stat_3_number", label: "رقم الدعم والمتابعة", description: "الرقم الثالث الظاهر في بطاقات الصفحة الرئيسية.", defaultValue: "24/7", sortOrder: 90 },
  { key: "home_stat_3_label", label: "تسمية الدعم والمتابعة", description: "النص تحت رقم الدعم والمتابعة.", defaultValue: "دعم ومتابعة", sortOrder: 100 },
  { key: "home_stat_4_number", label: "رقم فرص النجاح الشهرية", description: "الرقم الرابع الظاهر في بطاقات الصفحة الرئيسية.", defaultValue: "+500", sortOrder: 110 },
  { key: "home_stat_4_label", label: "تسمية فرص النجاح الشهرية", description: "النص تحت رقم فرص النجاح الشهرية.", defaultValue: "فرصة نجاح شهرية", sortOrder: 120 },
];

function defaultValues() {
  return homepageFields.reduce<Record<string, string>>((result, field) => {
    result[field.key] = field.defaultValue;
    return result;
  }, {});
}

function toRowMap(rows: SettingRow[]) {
  return rows.reduce<Record<string, SettingRow>>((result, row) => {
    result[row.setting_key] = row;
    return result;
  }, {});
}

export default function HomepageSettingsPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [rows, setRows] = useState<Record<string, SettingRow>>({});
  const [values, setValues] = useState<Record<string, string>>(defaultValues());
  const [isLoading, setIsLoading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fieldKeys = useMemo(() => homepageFields.map((field) => field.key), []);
  const missingFields = homepageFields.filter((field) => !rows[field.key]);

  useEffect(() => {
    async function checkAccess() {
      const access = await requireAdminModuleAccess("settings");
      if (!access.isAuthorized || !access.profile) {
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(access.profile.email || access.user?.email || "");
      setIsAuthorized(true);
      setIsChecking(false);
    }

    checkAccess();
  }, [router]);

  const loadHomepageSettings = useCallback(async () => {
    if (!supabase) return;

    setIsLoading(true);
    setError("");

    const { data, error: readError } = await supabase
      .from("settings")
      .select("id, setting_key, setting_value")
      .in("setting_key", fieldKeys);

    setIsLoading(false);

    if (readError) {
      setError("تعذر تحميل إعدادات الصفحة الرئيسية. تحقق من صلاحيات جدول settings.");
      return;
    }

    const rowMap = toRowMap((data || []) as SettingRow[]);
    const nextValues = defaultValues();

    Object.values(rowMap).forEach((row) => {
      if (row.setting_value !== null) nextValues[row.setting_key] = row.setting_value;
    });

    setRows(rowMap);
    setValues(nextValues);
  }, [fieldKeys]);

  useEffect(() => {
    if (!isAuthorized) return;
    void loadHomepageSettings();
  }, [isAuthorized, loadHomepageSettings]);

  async function prepareHomepageSettings() {
    if (!supabase) return;

    setMessage("");
    setError("");
    setIsPreparing(true);

    const { data, error: readError } = await supabase
      .from("settings")
      .select("id, setting_key, setting_value")
      .in("setting_key", fieldKeys);

    if (readError) {
      setIsPreparing(false);
      setError("تعذر التحقق من الإعدادات الموجودة قبل التجهيز.");
      return;
    }

    const existing = toRowMap((data || []) as SettingRow[]);
    const missing = homepageFields.filter((field) => !existing[field.key]);

    if (!missing.length) {
      setIsPreparing(false);
      setMessage("كل إعدادات إحصاءات الصفحة الرئيسية موجودة بالفعل ويمكن تعديلها وحفظها الآن.");
      await loadHomepageSettings();
      return;
    }

    const now = new Date().toISOString();
    const payload = missing.map((field) => ({
      setting_key: field.key,
      setting_value: field.defaultValue,
      setting_group: "homepage",
      group_name: "homepage",
      label_ar: field.label,
      label_en: "",
      description: field.description,
      input_type: "text",
      sort_order: field.sortOrder,
      is_public: true,
      updated_at: now,
    }));

    const { error: insertError } = await supabase.from("settings").insert(payload);
    setIsPreparing(false);

    if (insertError) {
      setError("فشل تجهيز الإعدادات الناقصة. لم يتم تغيير أي قيمة موجودة.");
      return;
    }

    await supabase.from("activity_logs").insert({
      admin_email: adminEmail,
      action: "create_homepage_statistics_settings",
      entity_type: "settings",
      entity_id: "homepage_statistics",
      old_data: "",
      new_data: JSON.stringify(payload),
      ip_address: "",
    });

    setMessage(`تم تجهيز ${payload.length} إعدادات ناقصة فقط. القيم الموجودة سابقاً لم تتغير.`);
    await loadHomepageSettings();
  }

  async function saveHomepageSettings() {
    if (!supabase) return;

    setMessage("");
    setError("");

    if (missingFields.length) {
      setError("توجد إعدادات ناقصة. اضغط تجهيز الإعدادات أولاً، ثم عدّل واحفظ.");
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();

    for (const field of homepageFields) {
      const row = rows[field.key];
      const value = values[field.key]?.trim() || field.defaultValue;
      const { error: saveError } = await supabase
        .from("settings")
        .update({ setting_value: value, updated_at: now })
        .eq("id", row.id);

      if (saveError) {
        setIsSaving(false);
        setError("فشل حفظ أحد الإعدادات. لم يتم إنشاء أي سجل جديد.");
        return;
      }
    }

    await supabase.from("activity_logs").insert({
      admin_email: adminEmail,
      action: "update_homepage_statistics",
      entity_type: "settings",
      entity_id: "homepage_statistics",
      old_data: "",
      new_data: JSON.stringify(values),
      ip_address: "",
    });

    setIsSaving(false);
    setMessage("تم حفظ الإحصاءات. حدّث الصفحة الرئيسية لتشاهد القيم الجديدة.");
    await loadHomepageSettings();
  }

  if (isChecking) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-[#070009] px-4 text-white">
        <div className="rounded-[2rem] border border-purple-400/25 bg-black/45 p-8 text-center shadow-[0_0_80px_rgba(124,58,237,0.22)]">
          جاري التحقق من صلاحية الدخول...
        </div>
      </main>
    );
  }

  if (!isAuthorized) return null;

  const pairs = [
    [homepageFields[0], homepageFields[1]],
    [homepageFields[2], homepageFields[3]],
    [homepageFields[4], homepageFields[5]],
    [homepageFields[6], homepageFields[7]],
  ];

  return (
    <main dir="rtl" className="min-h-screen overflow-x-hidden bg-[#070009] px-4 py-5 text-white md:px-6 md:py-8">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,#4c0a77_0%,#120018_34%,#040006_72%,#000_100%)]" />
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] border border-fuchsia-400/25 bg-black/45 shadow-[0_0_90px_rgba(168,85,247,0.18)] backdrop-blur-xl">
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-8">
            <div>
              <div className="mb-4 flex flex-wrap gap-3">
                <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-4 py-2 text-sm font-black text-fuchsia-100">Settings CMS</span>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100">تحكم دائم</span>
              </div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">إعدادات الصفحة الرئيسية</h1>
              <p className="mt-4 max-w-3xl leading-8 text-white/65">
                عدّل أرقام وتسميات بطاقات الإحصاءات الظاهرة تحت هيرو الصفحة الرئيسية. الحفظ يعدّل السجلات الموجودة فقط، ولا ينشئ نسخاً مكررة.
              </p>
              <p className="mt-3 text-sm text-white/45">الإعدادات المتوفرة: {homepageFields.length - missingFields.length} من {homepageFields.length}</p>
            </div>
            <Link href="/admin/settings" className="h-fit rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center font-bold text-white/85 transition hover:border-purple-300/50 hover:bg-white/10">
              العودة إلى الإعدادات
            </Link>
          </div>
        </section>

        {message && <div className="mt-6 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4 leading-7 text-emerald-100">{message}</div>}
        {error && <div className="mt-6 rounded-3xl border border-red-400/30 bg-red-500/10 p-4 leading-7 text-red-100">{error}</div>}

        <section className="mt-6 rounded-[2rem] border border-fuchsia-400/20 bg-fuchsia-500/10 p-5 md:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black">تجهيز الإعدادات الناقصة</h2>
              <p className="mt-2 leading-7 text-white/60">ينشئ فقط المفاتيح غير الموجودة بالقيم الافتراضية الصحيحة. لا يغيّر أي قيمة قديمة موجودة عندك.</p>
            </div>
            <button type="button" onClick={prepareHomepageSettings} disabled={isPreparing || isLoading} className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-6 py-4 font-black text-white shadow-[0_0_35px_rgba(217,70,239,0.2)] disabled:cursor-not-allowed disabled:opacity-60">
              {isPreparing ? "جاري التجهيز..." : `تجهيز ${missingFields.length} إعداد ناقص`}
            </button>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {pairs.map(([numberField, labelField]) => (
            <article key={numberField.key} className="rounded-[1.8rem] border border-white/10 bg-black/35 p-5 shadow-[0_0_45px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <div className="mb-5">
                <h2 className="text-xl font-black">{numberField.label.replace("رقم ", "")}</h2>
                <p className="mt-2 text-sm leading-7 text-white/55">{numberField.description}</p>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white/70">{numberField.label}</span>
                <input value={values[numberField.key] || ""} onChange={(event) => setValues((current) => ({ ...current, [numberField.key]: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 text-center text-2xl font-black outline-none focus:border-fuchsia-300" />
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-bold text-white/70">{labelField.label}</span>
                <input value={values[labelField.key] || ""} onChange={(event) => setValues((current) => ({ ...current, [labelField.key]: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-black/35 p-4 outline-none focus:border-fuchsia-300" />
              </label>
            </article>
          ))}
        </section>

        <button type="button" onClick={saveHomepageSettings} disabled={isSaving || isLoading || Boolean(missingFields.length)} className="mt-6 w-full rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-cyan-500 px-6 py-4 text-lg font-black text-white shadow-[0_0_40px_rgba(16,185,129,0.2)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {isSaving ? "جاري الحفظ..." : "حفظ إحصاءات الصفحة الرئيسية"}
        </button>
      </div>
    </main>
  );
}
