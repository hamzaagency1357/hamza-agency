"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";
import { fetchPortalAccess, isPortalRole } from "@/lib/productExpansion/portalAccessClient";
import { portalApi } from "@/lib/productExpansion/portalApiClient";

type Locale = "ar" | "en" | "tr";
type Row = Record<string, unknown>;
const moduleTitles: Record<PortalRole, Record<string, Record<Locale, string>>> = {
  creator: {
    tracking: { ar: "سجل الطلبات والتتبع", en: "Requests and tracking", tr: "Başvurular ve takip" },
    tasks: { ar: "المهام والإعلانات", en: "Tasks and announcements", tr: "Görevler ve duyurular" },
  },
  client: {
    requests: { ar: "طلبات الخدمات", en: "Service requests", tr: "Hizmet talepleri" },
    orders: { ar: "الطلبات والمدفوعات", en: "Orders and payments", tr: "Siparişler ve ödemeler" },
    files: { ar: "الملفات الآمنة", en: "Secure files", tr: "Güvenli dosyalar" },
  },
  employee: {
    tasks: { ar: "المهام المعينة", en: "Assigned tasks", tr: "Atanan görevler" },
    queue: { ar: "قائمة الانتظار وSLA", en: "Queue and SLA", tr: "Kuyruk ve SLA" },
    escalations: { ar: "التصعيدات", en: "Escalations", tr: "Eskalasyonlar" },
    performance: { ar: "ملخص الأداء", en: "Performance summary", tr: "Performans özeti" },
  },
  partner: {
    offers: { ar: "البرامج والعروض", en: "Programs and offers", tr: "Programlar ve teklifler" },
    referrals: { ar: "الإحالات والعملاء المحتملون", en: "Referrals and leads", tr: "Yönlendirmeler ve fırsatlar" },
    reports: { ar: "التقارير", en: "Reports", tr: "Raporlar" },
  },
};
const copy = {
  ar: { loading: "جارٍ التحميل…", denied: "الحساب غير مصرح له بهذه البوابة.", missing: "الوحدة غير موجودة.", error: "تعذر تحميل البيانات.", empty: "لا توجد بيانات متاحة ضمن صلاحياتك حالياً." },
  en: { loading: "Loading…", denied: "This account is not authorized for this portal.", missing: "Module not found.", error: "Data could not be loaded.", empty: "No data is currently available within your permissions." },
  tr: { loading: "Yükleniyor…", denied: "Bu hesap bu portal için yetkili değil.", missing: "Modül bulunamadı.", error: "Veriler yüklenemedi.", empty: "Yetkileriniz dahilinde şu anda veri yok." },
} satisfies Record<Locale, Record<string, string>>;

function currentLocale(): Locale {
  if (typeof document === "undefined") return "ar";
  return document.documentElement.lang === "en" || document.documentElement.lang === "tr" ? document.documentElement.lang : "ar";
}
function normalizeRows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }

export default function PortalModule({ role, moduleKey }: { role: PortalRole; moduleKey: string }) {
  const router = useRouter();
  const config = moduleTitles[role]?.[moduleKey];
  const [locale, setLocale] = useState<Locale>("ar");
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "missing" | "error">(config ? "loading" : "missing");
  const fields = useMemo(() => rows.length ? Object.keys(rows[0]).filter((field) => field !== "marketplace_order_items") : [], [rows]);
  const strings = copy[locale];

  useEffect(() => {
    if (!config) return;
    let active = true;
    const next = `/portal/${role}/${moduleKey}`;
    void (async () => {
      setLocale(currentLocale());
      if (!supabase) return router.replace(`/portal/login?next=${encodeURIComponent(next)}`);
      const access = await fetchPortalAccess(supabase);
      if (!active) return;
      if (!access.ok) {
        if (access.code === "authentication_required") return router.replace(`/portal/login?next=${encodeURIComponent(next)}`);
        setState("denied"); return;
      }
      if (!isPortalRole(access.role)) return router.replace("/admin");
      if (access.role !== role) return router.replace(`/portal/${access.role}/${moduleKey}`);
      const result = await portalApi<{ rows?: unknown }>(supabase, role, moduleKey);
      if (!active) return;
      if (!result.ok) { setState(result.status === 404 ? "missing" : result.status === 403 ? "denied" : "error"); return; }
      setRows(normalizeRows(result.data?.rows));
      setState("ready");
    })();
    return () => { active = false; };
  }, [config, moduleKey, role, router]);

  if (state === "missing") return <main className="min-h-screen p-24 text-center text-white">{strings.missing}</main>;
  if (state === "loading") return <main className="min-h-screen p-24 text-center text-white">{strings.loading}</main>;
  if (state === "denied") return <main className="min-h-screen p-24 text-center text-red-100">{strings.denied}</main>;
  if (state === "error") return <main className="min-h-screen p-24 text-center text-red-100">{strings.error}</main>;

  return <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir={locale === "ar" ? "rtl" : "ltr"}><section className="mx-auto max-w-6xl rounded-3xl border border-violet-400/20 bg-white/5 p-6"><h1 className="text-3xl font-black">{config?.[locale]}</h1><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr>{fields.map((field) => <th key={field} className="border-b border-white/10 p-3 text-start text-violet-200">{field}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? row.tracking_code ?? index)} className="border-b border-white/5">{fields.map((field) => <td key={field} className="p-3 text-white/80">{typeof row[field] === "object" ? JSON.stringify(row[field]) : String(row[field] ?? "—")}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="py-10 text-center text-white/50">{strings.empty}</p>}</div></section></main>;
}
