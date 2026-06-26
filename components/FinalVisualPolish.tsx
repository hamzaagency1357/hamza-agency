"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { requireAdminModuleAccess } from "@/lib/adminAccess";
import { supabase } from "@/lib/supabase";

const polishCards = [
  { label: "Creators", value: "إدارة صناع المحتوى" },
  { label: "Live", value: "برامج البث المباشر" },
  { label: "AI", value: "دعم ذكي" },
  { label: "Growth", value: "نمو واحتراف" },
];

type HomepageStatDefinition = {
  key: string;
  value: string;
  label: string;
  description: string;
  sortOrder: number;
};

type ExistingHomepageSetting = {
  id: number;
  setting_key: string;
  setting_value: string | null;
};

const homepageStatDefinitions: HomepageStatDefinition[] = [
  { key: "home_stat_1_number", value: "+7000", label: "رقم صناع المحتوى", description: "الرقم الأول الظاهر في الصفحة الرئيسية.", sortOrder: 50 },
  { key: "home_stat_1_label", value: "صانع محتوى", label: "تسمية صناع المحتوى", description: "تسمية الرقم الأول الظاهر في الصفحة الرئيسية.", sortOrder: 60 },
  { key: "home_stat_2_number", value: "+5", label: "رقم المنصات المتاحة", description: "الرقم الثاني الظاهر في الصفحة الرئيسية.", sortOrder: 70 },
  { key: "home_stat_2_label", value: "منصات متاحة", label: "تسمية المنصات المتاحة", description: "تسمية الرقم الثاني الظاهر في الصفحة الرئيسية.", sortOrder: 80 },
  { key: "home_stat_3_number", value: "24/7", label: "رقم الدعم والمتابعة", description: "الرقم الثالث الظاهر في الصفحة الرئيسية.", sortOrder: 90 },
  { key: "home_stat_3_label", value: "دعم ومتابعة", label: "تسمية الدعم والمتابعة", description: "تسمية الرقم الثالث الظاهر في الصفحة الرئيسية.", sortOrder: 100 },
  { key: "home_stat_4_number", value: "+500", label: "رقم فرص النجاح الشهرية", description: "الرقم الرابع الظاهر في الصفحة الرئيسية.", sortOrder: 110 },
  { key: "home_stat_4_label", value: "فرصة نجاح شهرية", label: "تسمية فرص النجاح الشهرية", description: "تسمية الرقم الرابع الظاهر في الصفحة الرئيسية.", sortOrder: 120 },
];

function buildDefaultValues() {
  return homepageStatDefinitions.reduce<Record<string, string>>((values, definition) => {
    values[definition.key] = definition.value;
    return values;
  }, {});
}

function toSettingsMap(data: ExistingHomepageSetting[]) {
  return data.reduce<Record<string, ExistingHomepageSetting>>((result, setting) => {
    result[setting.setting_key] = setting;
    return result;
  }, {});
}

export default function FinalVisualPolish() {
  const pathname = usePathname();

  if (pathname === "/admin/settings") return <HomepageStatsSettingsPanel />;
  if (pathname.startsWith("/admin") || pathname === "/maintenance") return null;

  return (
    <>
      <div aria-hidden="true" className="hamza-final-polish">
        <div className="hfp-glow hfp-glow-one" />
        <div className="hfp-glow hfp-glow-two" />
        <div className="hfp-orbit hfp-orbit-one" />
        <div className="hfp-orbit hfp-orbit-two" />
        <div className="hfp-shine hfp-shine-one" />
        <div className="hfp-shine hfp-shine-two" />
        <div className="hfp-card-stack">
          {polishCards.map((card, index) => (
            <div key={card.label} className={`hfp-mini-card hfp-mini-card-${index + 1}`}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hamza-final-polish {
          position: fixed;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          overflow: hidden;
          isolation: isolate;
        }

        .hamza-final-polish * {
          position: absolute;
          pointer-events: none;
        }

        .hfp-glow {
          border-radius: 999px;
          filter: blur(54px);
          mix-blend-mode: screen;
          opacity: 0.58;
        }

        .hfp-glow-one {
          width: 18rem;
          height: 18rem;
          left: -5rem;
          top: 18%;
          background: rgba(168, 85, 247, 0.22);
          animation: hfpFloatOne 16s ease-in-out infinite;
        }

        .hfp-glow-two {
          width: 16rem;
          height: 16rem;
          right: -6rem;
          bottom: 14%;
          background: rgba(250, 204, 21, 0.14);
          animation: hfpFloatTwo 19s ease-in-out infinite;
        }

        .hfp-orbit {
          border-radius: 999px;
          border: 1px solid rgba(216, 180, 254, 0.13);
          box-shadow: 0 0 40px rgba(168, 85, 247, 0.08);
          opacity: 0.42;
        }

        .hfp-orbit-one {
          width: 22rem;
          height: 22rem;
          left: 6%;
          bottom: 12%;
          animation: hfpOrbitPulse 10s ease-in-out infinite;
        }

        .hfp-orbit-two {
          width: 15rem;
          height: 15rem;
          right: 9%;
          top: 16%;
          animation: hfpOrbitPulse 13s ease-in-out infinite reverse;
        }

        .hfp-shine {
          height: 1px;
          width: 42vw;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.46), rgba(216, 180, 254, 0.22), transparent);
          opacity: 0.46;
          filter: blur(0.25px);
        }

        .hfp-shine-one {
          left: 4%;
          top: 30%;
          rotate: -8deg;
          animation: hfpShine 11s ease-in-out infinite;
        }

        .hfp-shine-two {
          right: 0;
          bottom: 28%;
          rotate: 7deg;
          animation: hfpShine 14s ease-in-out infinite reverse;
        }

        .hfp-card-stack {
          right: 1.2rem;
          top: 22%;
          width: 190px;
          height: 360px;
          opacity: 0.78;
        }

        .hfp-mini-card {
          right: 0;
          width: 168px;
          min-height: 74px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(124,58,237,0.08));
          box-shadow: 0 22px 70px rgba(9, 0, 15, 0.32), inset 0 1px 0 rgba(255,255,255,0.06);
          backdrop-filter: blur(12px);
          padding: 14px;
          transform: translate3d(0, 0, 0) rotate(var(--rotate, 0deg));
          animation: hfpCardFloat 8s ease-in-out infinite;
        }

        .hfp-mini-card span,
        .hfp-mini-card strong {
          position: static;
          display: block;
        }

        .hfp-mini-card span {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(250, 204, 21, 0.72);
        }

        .hfp-mini-card strong {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.84);
        }

        .hfp-mini-card-1 { top: 0; --rotate: 4deg; animation-delay: 0s; }
        .hfp-mini-card-2 { top: 82px; right: 22px; --rotate: -5deg; animation-delay: -1.5s; }
        .hfp-mini-card-3 { top: 164px; --rotate: 5deg; animation-delay: -3s; }
        .hfp-mini-card-4 { top: 246px; right: 18px; --rotate: -4deg; animation-delay: -4.5s; }

        @keyframes hfpFloatOne {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.42; }
          50% { transform: translate3d(2.5rem, -1.4rem, 0) scale(1.08); opacity: 0.68; }
        }

        @keyframes hfpFloatTwo {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.34; }
          50% { transform: translate3d(-2rem, 1.6rem, 0) scale(1.08); opacity: 0.56; }
        }

        @keyframes hfpOrbitPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.2; }
          50% { transform: scale(1.08); opacity: 0.48; }
        }

        @keyframes hfpShine {
          0%, 100% { transform: translateX(-8%); opacity: 0.22; }
          50% { transform: translateX(8%); opacity: 0.56; }
        }

        @keyframes hfpCardFloat {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--rotate, 0deg)); }
          50% { transform: translate3d(-8px, -10px, 0) rotate(calc(var(--rotate, 0deg) * -1)); }
        }

        @media (max-width: 1024px) {
          .hfp-card-stack { display: none; }
          .hfp-orbit-one, .hfp-orbit-two { opacity: 0.2; }
        }

        @media (prefers-reduced-motion: reduce) {
          .hamza-final-polish * { animation: none !important; }
        }
      `}</style>
    </>
  );
}

function HomepageStatsSettingsPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [savedSettings, setSavedSettings] = useState<Record<string, ExistingHomepageSetting>>({});
  const [values, setValues] = useState<Record<string, string>>(buildDefaultValues());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHomepageStatsSettings() {
      const access = await requireAdminModuleAccess("settings");
      const client = supabase;

      if (!access.isAuthorized || !access.profile || !client) {
        if (isMounted) {
          setIsAuthorized(false);
          setIsLoading(false);
        }
        return;
      }

      const keys = homepageStatDefinitions.map((definition) => definition.key);
      const { data, error: readError } = await client
        .from("settings")
        .select("id, setting_key, setting_value")
        .in("setting_key", keys);

      if (readError) {
        if (isMounted) {
          setIsAuthorized(true);
          setAdminEmail(access.profile.email || "");
          setError("تعذر تحميل إعدادات الإحصاءات من قاعدة البيانات.");
          setIsLoading(false);
        }
        return;
      }

      let records = (data || []) as ExistingHomepageSetting[];
      const existing = toSettingsMap(records);
      const missing = homepageStatDefinitions.filter((definition) => !existing[definition.key]);

      if (missing.length) {
        const now = new Date().toISOString();
        const payload = missing.map((definition) => ({
          setting_key: definition.key,
          setting_value: definition.value,
          setting_group: "homepage",
          group_name: "homepage",
          label_ar: definition.label,
          label_en: "",
          description: definition.description,
          input_type: "text",
          sort_order: definition.sortOrder,
          is_public: true,
          updated_at: now,
        }));

        const { error: insertError } = await client.from("settings").insert(payload);

        if (insertError) {
          if (isMounted) {
            setIsAuthorized(true);
            setAdminEmail(access.profile.email || "");
            setError("تعذر تجهيز بعض إحصاءات الصفحة الرئيسية. حاول إعادة فتح الصفحة قبل الحفظ.");
            setIsLoading(false);
          }
          return;
        }

        const { data: refreshedData, error: refreshError } = await client
          .from("settings")
          .select("id, setting_key, setting_value")
          .in("setting_key", keys);

        if (refreshError) {
          if (isMounted) {
            setIsAuthorized(true);
            setAdminEmail(access.profile.email || "");
            setError("تم تجهيز الإحصاءات، لكن تعذر تثبيت سجلاتها للحفظ. أعد فتح الصفحة قبل التعديل.");
            setIsLoading(false);
          }
          return;
        }

        records = (refreshedData || []) as ExistingHomepageSetting[];
      }

      const actualSettings = toSettingsMap(records);
      const nextValues = buildDefaultValues();
      Object.values(actualSettings).forEach((setting) => {
        if (setting.setting_value !== null) nextValues[setting.setting_key] = setting.setting_value;
      });

      if (isMounted) {
        setIsAuthorized(true);
        setAdminEmail(access.profile.email || "");
        setSavedSettings(actualSettings);
        setValues(nextValues);
        setMessage(
          missing.length
            ? "تم تجهيز الإحصاءات الناقصة بالقيم الافتراضية الجديدة. يمكنك تعديلها وحفظها في أي وقت."
            : "إحصاءات الصفحة الرئيسية جاهزة للتعديل في أي وقت."
        );
        setIsLoading(false);
      }
    }

    loadHomepageStatsSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function saveHomepageStats() {
    const client = supabase;
    if (!client) {
      setError("الاتصال بقاعدة البيانات غير مفعل.");
      return;
    }

    const missingSavedKeys = homepageStatDefinitions.filter((definition) => !savedSettings[definition.key]);
    if (missingSavedKeys.length) {
      setError("تعذر التحقق من سجلات الإحصاءات. حدّث صفحة Settings ثم حاول الحفظ مرة أخرى.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    setError("");

    const now = new Date().toISOString();
    const nextValues: Record<string, string> = {};

    for (const definition of homepageStatDefinitions) {
      const setting = savedSettings[definition.key];
      const value = values[definition.key]?.trim() || definition.value;
      nextValues[definition.key] = value;

      const { error: updateError } = await client
        .from("settings")
        .update({ setting_value: value, updated_at: now })
        .eq("id", setting.id);

      if (updateError) {
        setIsSaving(false);
        setError("فشل حفظ أحد الإعدادات. حدّث الصفحة قبل محاولة جديدة.");
        return;
      }
    }

    await client.from("activity_logs").insert({
      admin_email: adminEmail,
      action: "update_homepage_stats",
      entity_type: "settings",
      entity_id: "homepage_stats",
      old_data: "",
      new_data: JSON.stringify(nextValues),
      ip_address: "",
    });

    setValues(nextValues);
    setIsSaving(false);
    setMessage("تم حفظ أرقام وتسميات الصفحة الرئيسية. حدّث الصفحة الرئيسية لمشاهدة القيم الجديدة.");
  }

  if (isLoading || !isAuthorized) return null;

  const statPairs = [
    [homepageStatDefinitions[0], homepageStatDefinitions[1]],
    [homepageStatDefinitions[2], homepageStatDefinitions[3]],
    [homepageStatDefinitions[4], homepageStatDefinitions[5]],
    [homepageStatDefinitions[6], homepageStatDefinitions[7]],
  ];

  return (
    <aside
      dir="rtl"
      className="fixed bottom-5 left-4 right-4 z-[80] rounded-[1.75rem] border border-fuchsia-400/30 bg-[#170020]/95 p-4 text-white shadow-[0_0_55px_rgba(217,70,239,0.2)] backdrop-blur-xl md:left-auto md:right-6 md:w-[460px]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-black text-fuchsia-100">إحصاءات الصفحة الرئيسية</div>
          <p className="mt-1 text-sm leading-6 text-white/60">هذه القيم تظهر في البطاقات الأربع تحت هيرو الصفحة الرئيسية.</p>
        </div>
        <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1 text-xs font-bold text-fuchsia-100">No-Code</span>
      </div>

      {message && <div className="mt-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm leading-6 text-emerald-100">{message}</div>}
      {error && <div className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm leading-6 text-red-100">{error}</div>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {statPairs.map(([numberDefinition, labelDefinition]) => (
          <div key={numberDefinition.key} className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <label className="block text-xs font-bold text-white/60">{numberDefinition.label}</label>
            <input
              value={values[numberDefinition.key] || ""}
              onChange={(event) => updateValue(numberDefinition.key, event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-center text-lg font-black outline-none focus:border-fuchsia-300/60"
            />
            <label className="mt-3 block text-xs font-bold text-white/60">{labelDefinition.label}</label>
            <input
              value={values[labelDefinition.key] || ""}
              onChange={(event) => updateValue(labelDefinition.key, event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm outline-none focus:border-fuchsia-300/60"
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={saveHomepageStats}
        disabled={isSaving}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 py-3 font-black shadow-[0_0_28px_rgba(217,70,239,0.24)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSaving ? "جاري الحفظ..." : "حفظ أرقام الصفحة الرئيسية"}
      </button>
    </aside>
  );
}
