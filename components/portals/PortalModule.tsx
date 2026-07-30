"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { PortalRole } from "@/lib/productExpansion/domain";

type Row = Record<string, unknown>;

function isRow(value: unknown): value is Row {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter(isRow) : [];
}

const roleModules: Record<PortalRole, Record<string, { title: string; table?: string; select?: string; userColumn?: string }>> = {
  creator: {
    profile: { title: "الملف الشخصي", table: "portal_profiles", select: "display_name,phone,locale,status,marketing_opt_in,ai_opt_out", userColumn: "user_id" },
    tracking: { title: "سجل الطلبات والتتبع", table: "agency_applications", select: "tracking_code,status,program_name,created_at", userColumn: "user_id" },
    tasks: { title: "المهام والإعلانات", table: "tasks", select: "id,title,status,priority,due_at,related_type" },
    support: { title: "الدعم والمعرفة", table: "knowledge_base", select: "id,title,category,status,updated_at" },
    privacy: { title: "مركز الخصوصية", table: "privacy_requests", select: "id,request_type,status,due_at,created_at", userColumn: "user_id" },
    sessions: { title: "الأجهزة والجلسات", table: "user_sessions", select: "id,device_label,platform,browser,last_active_at,suspicious,revoked_at", userColumn: "user_id" },
    notifications: { title: "الإشعارات", table: "notifications", select: "id,title,message,is_read,created_at", userColumn: "user_id" },
  },
  client: {
    requests: { title: "طلبات الخدمات", table: "service_requests", select: "tracking_code,status,service_name,created_at", userColumn: "user_id" },
    orders: { title: "الطلبات والمدفوعات", table: "marketplace_orders", select: "id,order_code,status,total,currency,payment_status,created_at", userColumn: "client_user_id" },
    files: { title: "الملفات الآمنة", table: "portal_files", select: "id,category,visibility,status,created_at", userColumn: "owner_user_id" },
    support: { title: "الدعم", table: "tasks", select: "id,title,status,priority,due_at" },
    privacy: { title: "مركز الخصوصية", table: "privacy_requests", select: "id,request_type,status,due_at,created_at", userColumn: "user_id" },
    sessions: { title: "الأجهزة والجلسات", table: "user_sessions", select: "id,device_label,platform,browser,last_active_at,suspicious,revoked_at", userColumn: "user_id" },
    notifications: { title: "الإشعارات", table: "notifications", select: "id,title,message,is_read,created_at", userColumn: "user_id" },
  },
  employee: {
    tasks: { title: "المهام المعينة", table: "tasks", select: "id,title,status,priority,due_at,related_type,related_id" },
    queue: { title: "قائمة الانتظار وSLA", table: "sla_events", select: "id,entity_type,entity_id,event_type,deadline_at,created_at" },
    escalations: { title: "التصعيدات", table: "sla_events", select: "id,entity_type,entity_id,event_type,deadline_at,created_at" },
    performance: { title: "ملخص الأداء", table: "task_status_history", select: "id,task_id,from_status,to_status,changed_at" },
    privacy: { title: "مركز الخصوصية", table: "privacy_requests", select: "id,request_type,status,due_at,created_at", userColumn: "user_id" },
    sessions: { title: "الأجهزة والجلسات", table: "user_sessions", select: "id,device_label,platform,browser,last_active_at,suspicious,revoked_at", userColumn: "user_id" },
    notifications: { title: "الإشعارات", table: "notifications", select: "id,title,message,is_read,created_at", userColumn: "user_id" },
  },
  partner: {
    profile: { title: "ملف الشريك", table: "portal_profiles", select: "display_name,phone,locale,status", userColumn: "user_id" },
    offers: { title: "البرامج والعروض", table: "marketplace_listings", select: "id,slug,listing_type,status,price_amount,currency,updated_at", userColumn: "partner_user_id" },
    referrals: { title: "الإحالات والعملاء المحتملون", table: "tasks", select: "id,title,status,priority,related_type,related_id" },
    reports: { title: "التقارير", table: "marketplace_orders", select: "id,order_code,status,total,currency,payment_status,created_at" },
    privacy: { title: "مركز الخصوصية", table: "privacy_requests", select: "id,request_type,status,due_at,created_at", userColumn: "user_id" },
    sessions: { title: "الأجهزة والجلسات", table: "user_sessions", select: "id,device_label,platform,browser,last_active_at,suspicious,revoked_at", userColumn: "user_id" },
    notifications: { title: "الإشعارات", table: "notifications", select: "id,title,message,is_read,created_at", userColumn: "user_id" },
  },
};

export default function PortalModule({ role, moduleKey }: { role: PortalRole; moduleKey: string }) {
  const router = useRouter();
  const config = roleModules[role]?.[moduleKey];
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "missing">(config ? "loading" : "missing");
  const [error, setError] = useState("");
  const fields = useMemo(() => rows.length ? Object.keys(rows[0]) : [], [rows]);

  useEffect(() => {
    if (!config || !supabase) return;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.replace(`/portal/login?next=/portal/${role}/${moduleKey}`);
      const membership = await supabase.from("tenant_memberships").select("tenant_id").eq("user_id", auth.user.id).eq("role", role).eq("status", "active").limit(1).maybeSingle();
      if (!membership.data) return setState("denied");
      if (!config.table) return setState("ready");
      let query = supabase.from(config.table).select(config.select ?? "*").eq("tenant_id", membership.data.tenant_id).limit(50);
      if (config.userColumn) query = query.eq(config.userColumn, auth.user.id);
      const result = await query;
      if (result.error) setError(result.error.message);
      setRows(normalizeRows(result.data));
      setState("ready");
    })();
  }, [config, moduleKey, role, router]);

  if (state === "missing") return <main className="min-h-screen p-24 text-center text-white">الوحدة غير موجودة.</main>;
  if (state === "loading") return <main className="min-h-screen p-24 text-center text-white">جارٍ التحميل…</main>;
  if (state === "denied") return <main className="min-h-screen p-24 text-center text-red-100">الحساب غير مصرح له بهذه البوابة.</main>;

  return <main className="min-h-screen bg-[#09050f] px-4 py-24 text-white" dir="rtl"><section className="mx-auto max-w-6xl rounded-3xl border border-violet-400/20 bg-white/5 p-6"><h1 className="text-3xl font-black">{config?.title}</h1>{error && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-red-100">{error}</p>}<div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr>{fields.map((field) => <th key={field} className="border-b border-white/10 p-3 text-right text-violet-200">{field}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)} className="border-b border-white/5">{fields.map((field) => <td key={field} className="p-3 text-white/80">{typeof row[field] === "object" ? JSON.stringify(row[field]) : String(row[field] ?? "—")}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="py-10 text-center text-white/50">لا توجد بيانات متاحة ضمن صلاحياتك حالياً.</p>}</div></section></main>;
}
