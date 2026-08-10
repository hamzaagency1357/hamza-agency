"use client";


import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { requireTenantAdmin } from "@/lib/productExpansion/tenantAccess";

type Row = Record<string, unknown>;
type Tab = "tasks" | "sla" | "workflows" | "marketplace" | "orders" | "privacy" | "incidents" | "providers";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "tasks", label: "المهام" },
  { key: "sla", label: "SLA" },
  { key: "workflows", label: "Workflows" },
  { key: "marketplace", label: "Marketplace" },
  { key: "orders", label: "الطلبات" },
  { key: "privacy", label: "الخصوصية" },
  { key: "incidents", label: "الحوادث" },
  { key: "providers", label: "المزودون" },
];

const emptyTask = { title: "", description: "", priority: "normal", due_at: "", assignee: "" };
const emptySla = { name: "", entity_type: "service_request", first_response_minutes: "60", resolution_minutes: "1440" };
const emptyWorkflow = { name: "", trigger_type: "request.status_changed" };
const emptyListing = { category_id: "", listing_type: "service", slug: "", title_ar: "", title_en: "", title_tr: "", price_amount: "", currency: "USD" };
const emptyIncident = { title: "", severity: "medium" };

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export default function ProductOperationsConsole() {
  const [authorized, setAuthorized] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [actorId, setActorId] = useState("");
  const [tab, setTab] = useState<Tab>("tasks");
  const [data, setData] = useState<Record<Tab, Row[]>>({ tasks: [], sla: [], workflows: [], marketplace: [], orders: [], privacy: [], incidents: [], providers: [] });
  const [categories, setCategories] = useState<Row[]>([]);
  const [taskDraft, setTaskDraft] = useState(emptyTask);
  const [slaDraft, setSlaDraft] = useState(emptySla);
  const [workflowDraft, setWorkflowDraft] = useState(emptyWorkflow);
  const [listingDraft, setListingDraft] = useState(emptyListing);
  const [incidentDraft, setIncidentDraft] = useState(emptyIncident);
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setMessage("");
    const access = await requireTenantAdmin();
    if (!access.authorized || !access.membership || !access.user) {
      setAuthorized(false);
      setMessage("لا تملك صلاحية إدارة عمليات المستأجر.");
      setLoading(false);
      return;
    }
    const id = text(access.membership.tenant_id);
    setAuthorized(true);
    setTenantId(id);
    setActorId(access.user.id);
    const [tasks, sla, workflows, listings, orderRows, privacy, incidents, health, categoryRows] = await Promise.all([
      supabase.from("tasks").select("id,title,description,status,priority,due_at,related_type,related_id,created_at,task_assignments(user_id,assignment_type),task_status_history(from_status,to_status,changed_at)").eq("tenant_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("sla_policies").select("id,name,entity_type,first_response_minutes,resolution_minutes,business_hours,pause_statuses,active,created_at").eq("tenant_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("workflow_definitions").select("id,name,trigger_type,version,status,definition,created_at,workflow_steps(id,step_key,step_type,position,configuration)").eq("tenant_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("marketplace_listings").select("id,slug,listing_type,status,category_id,price_amount,currency,availability,updated_at,marketplace_listing_translations(locale,title,summary)").eq("tenant_id", id).order("updated_at", { ascending: false }).limit(100),
      supabase.from("marketplace_orders").select("id,order_code,status,payment_status,total,currency,client_user_id,created_at,marketplace_order_items(id,quantity,unit_price,total_price,title_snapshot)").eq("tenant_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("privacy_requests").select("id,user_id,request_type,status,due_at,created_at,completed_at,admin_notes").eq("tenant_id", id).order("created_at", { ascending: false }).limit(100),
      supabase.from("incidents").select("id,title,severity,status,started_at,resolved_at,postmortem,incident_updates(id,status,message,is_public,created_at)").eq("tenant_id", id).order("started_at", { ascending: false }).limit(100),
      supabase.from("provider_health_checks").select("id,provider_type,provider_key,status,latency_ms,checked_at,detail").eq("tenant_id", id).order("checked_at", { ascending: false }).limit(100),
      supabase.from("marketplace_categories").select("id,slug,translations,active").eq("tenant_id", id).order("slug").limit(100),
    ]);
    setData({ tasks: rows(tasks.data), sla: rows(sla.data), workflows: rows(workflows.data), marketplace: rows(listings.data), orders: rows(orderRows.data), privacy: rows(privacy.data), incidents: rows(incidents.data), providers: rows(health.data) });
    setCategories(rows(categoryRows.data));
    const firstError = [tasks, sla, workflows, listings, orderRows, privacy, incidents, health, categoryRows].find((result) => result.error)?.error;
    if (firstError) setMessage(firstError.message);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function audit(action: string, entityType: string, entityId: string | null, afterData?: Row) {
    if (!supabase || !tenantId || !actorId) return;
    await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_tenant_admin_audit_insert", { values: { tenant_id: tenantId, actor_id: actorId, action, entity_type: entityType, entity_id: entityId, after_data: afterData ?? null }, filters: [], select: undefined, returnMode: "many", options: undefined });
  }

  async function createTask() {
    if (!supabase || !tenantId || !taskDraft.title.trim()) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_tasks_insert", { values: { tenant_id: tenantId, title: taskDraft.title.trim(), description: taskDraft.description.trim() || null, priority: taskDraft.priority, due_at: taskDraft.due_at ? new Date(taskDraft.due_at).toISOString() : null, created_by: actorId }, filters: [], select: "id", returnMode: "single", options: undefined });
    if (result.error) return setMessage(result.error.message);
    const taskId = text((result.data as Row | null)?.id);
    if (taskDraft.assignee && /^[0-9a-f-]{36}$/i.test(taskDraft.assignee)) await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_task_assignments_insert", { values: { tenant_id: tenantId, task_id: taskId, user_id: taskDraft.assignee, assignment_type: "assignee" }, filters: [], select: undefined, returnMode: "many", options: undefined });
    await audit("task.created", "task", taskId, { title: taskDraft.title, priority: taskDraft.priority });
    setTaskDraft(emptyTask); setMessage("تم إنشاء المهمة."); await load();
  }

  async function updateTaskStatus(id: string, status: string) {
    if (!supabase) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_tasks_update", { values: { status, updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "tenant_id", value: tenantId }, { op: "eq", field: "id", value: id }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await audit("task.status_updated", "task", id, { status }); setMessage("تم تحديث المهمة."); await load();
  }

  async function addTaskComment(id: string) {
    if (!supabase || !commentDraft[id]?.trim()) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_task_comments_insert", { values: { tenant_id: tenantId, task_id: id, author_id: actorId, body: commentDraft[id].trim(), is_internal: true }, filters: [], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    setCommentDraft((current) => ({ ...current, [id]: "" })); await audit("task.comment_added", "task", id); setMessage("تمت إضافة التعليق.");
  }

  async function createSla() {
    if (!supabase || !slaDraft.name.trim()) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_sla_policies_insert", { values: { tenant_id: tenantId, name: slaDraft.name.trim(), entity_type: slaDraft.entity_type, first_response_minutes: Number(slaDraft.first_response_minutes), resolution_minutes: Number(slaDraft.resolution_minutes), business_hours: { timezone: "Europe/Istanbul", days: [1,2,3,4,5], start: "09:00", end: "18:00" }, pause_statuses: ["waiting_customer"], active: true }, filters: [], select: "id", returnMode: "single", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await audit("sla.created", "sla_policy", text((result.data as Row | null)?.id), { name: slaDraft.name }); setSlaDraft(emptySla); setMessage("تم إنشاء سياسة SLA."); await load();
  }

  async function createWorkflow() {
    if (!supabase || !workflowDraft.name.trim()) return;
    const definition = { trigger: workflowDraft.trigger_type, steps: [{ key: "create_task", type: "create_task" }, { key: "notify", type: "notify" }], arbitraryCode: false };
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_workflow_definitions_insert", { values: { tenant_id: tenantId, name: workflowDraft.name.trim(), trigger_type: workflowDraft.trigger_type, status: "draft", version: 1, definition, created_by: actorId }, filters: [], select: "id", returnMode: "single", options: undefined });
    if (result.error) return setMessage(result.error.message);
    const workflowId = text((result.data as Row | null)?.id);
    await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_workflow_steps_insert", { values: [
      { tenant_id: tenantId, workflow_id: workflowId, step_key: "create_task", step_type: "create_task", position: 0, configuration: {}, retry_limit: 3 },
      { tenant_id: tenantId, workflow_id: workflowId, step_key: "notify", step_type: "notify", position: 1, configuration: {}, retry_limit: 3 },
    ], filters: [], select: undefined, returnMode: "many", options: undefined });
    await audit("workflow.created", "workflow", workflowId, { name: workflowDraft.name }); setWorkflowDraft(emptyWorkflow); setMessage("تم إنشاء Workflow آمن كمسودة."); await load();
  }

  async function publishWorkflow(id: string) {
    if (!supabase) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_workflow_definitions_update", { values: { status: "published", updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "tenant_id", value: tenantId }, { op: "eq", field: "id", value: id }, { op: "eq", field: "status", value: "draft" }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await audit("workflow.published", "workflow", id); setMessage("تم نشر Workflow."); await load();
  }

  async function createCategory() {
    if (!supabase) return;
    const slug = prompt("Category slug")?.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (!slug) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_marketplace_categories_insert", { values: { tenant_id: tenantId, slug, translations: { ar: { title: slug }, en: { title: slug }, tr: { title: slug } }, active: true }, filters: [], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await audit("marketplace.category_created", "marketplace_category", slug); await load();
  }

  async function createListing() {
    if (!supabase || !listingDraft.slug.trim() || !listingDraft.title_ar.trim()) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_marketplace_listings_insert", { values: { tenant_id: tenantId, category_id: listingDraft.category_id || null, listing_type: listingDraft.listing_type, status: "draft", slug: listingDraft.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"), translations: {}, media_ids: [], price_amount: listingDraft.price_amount ? Number(listingDraft.price_amount) : null, currency: listingDraft.currency || null, availability: { mode: "on_request" } }, filters: [], select: "id", returnMode: "single", options: undefined });
    if (result.error) return setMessage(result.error.message);
    const listingId = text((result.data as Row | null)?.id);
    const translations = (["ar","en","tr"] as const).map((locale) => ({ listing_id: listingId, tenant_id: tenantId, locale, title: listingDraft[`title_${locale}`], summary: null, description: null })).filter((item) => item.title.trim());
    if (translations.length) await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_marketplace_listing_translations_insert", { values: translations, filters: [], select: undefined, returnMode: "many", options: undefined });
    await audit("marketplace.listing_created", "marketplace_listing", listingId, { slug: listingDraft.slug }); setListingDraft(emptyListing); setMessage("تم إنشاء العنصر كمسودة."); await load();
  }

  async function setListingStatus(id: string, status: string) {
    if (!supabase) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_marketplace_listings_update", { values: { status, updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "tenant_id", value: tenantId }, { op: "eq", field: "id", value: id }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await audit("marketplace.listing_status", "marketplace_listing", id, { status }); await load();
  }

  async function setOrderStatus(id: string, status: string) {
    if (!supabase) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_marketplace_orders_update", { values: { status, updated_at: new Date().toISOString() }, filters: [{ op: "eq", field: "tenant_id", value: tenantId }, { op: "eq", field: "id", value: id }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await audit("marketplace.order_status", "marketplace_order", id, { status }); await load();
  }

  async function setPrivacyStatus(id: string, status: string) {
    if (!supabase) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_privacy_requests_update", { values: { status, completed_at: status === "completed" ? new Date().toISOString() : null }, filters: [{ op: "eq", field: "tenant_id", value: tenantId }, { op: "eq", field: "id", value: id }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await audit("privacy.request_status", "privacy_request", id, { status }); await load();
  }

  async function createIncident() {
    if (!supabase || !incidentDraft.title.trim()) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_incidents_insert", { values: { tenant_id: tenantId, title: incidentDraft.title.trim(), severity: incidentDraft.severity, status: "investigating", owner_id: actorId }, filters: [], select: "id", returnMode: "single", options: undefined });
    if (result.error) return setMessage(result.error.message);
    const incidentId = text((result.data as Row | null)?.id);
    await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_incident_updates_insert", { values: { tenant_id: tenantId, incident_id: incidentId, status: "investigating", message: "بدأ فريق التشغيل التحقق من الحالة.", is_public: true, created_by: actorId }, filters: [], select: undefined, returnMode: "many", options: undefined });
    await audit("incident.created", "incident", incidentId, { severity: incidentDraft.severity }); setIncidentDraft(emptyIncident); await load();
  }

  async function setIncidentStatus(id: string, status: string) {
    if (!supabase) return;
    const result = await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_incidents_update", { values: { status, resolved_at: status === "resolved" ? new Date().toISOString() : null }, filters: [{ op: "eq", field: "tenant_id", value: tenantId }, { op: "eq", field: "id", value: id }], select: undefined, returnMode: "many", options: undefined });
    if (result.error) return setMessage(result.error.message);
    await adminBoundaryMutation("pr116_component_productoperationsconsole_entity_incident_updates_insert", { values: { tenant_id: tenantId, incident_id: id, status, message: status === "resolved" ? "تم حل الحالة ومراقبة الاستقرار." : `تحديث الحالة: ${status}`, is_public: true, created_by: actorId }, filters: [], select: undefined, returnMode: "many", options: undefined });
    await audit("incident.status_updated", "incident", id, { status }); await load();
  }

  const currentRows = useMemo(() => data[tab], [data, tab]);
  if (loading) return <div className="p-8 text-white">جارٍ تحميل العمليات…</div>;
  if (!authorized) return <div className="p-8 text-red-100">{message || "غير مصرح."}</div>;

  return (
    <main className="min-h-screen bg-[#09050f] p-4 text-white md:p-8" dir="rtl">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-violet-300/20 bg-white/5 p-6"><p className="text-sm text-violet-200">PR101 Operations</p><h1 className="mt-2 text-3xl font-black">إدارة التشغيل المتكاملة</h1><div className="mt-5 flex flex-wrap gap-2">{tabs.map((item) => <button key={item.key} type="button" onClick={() => setTab(item.key)} className={`min-h-11 rounded-xl px-4 ${tab === item.key ? "bg-violet-600" : "border border-white/10 bg-black/30"}`}>{item.label}</button>)}</div></header>
        {message && <p role="status" className="rounded-xl border border-violet-300/20 bg-violet-500/10 p-3">{message}</p>}

        {tab === "tasks" && <section className="space-y-4"><div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2 lg:grid-cols-3"><input placeholder="عنوان المهمة" value={taskDraft.title} onChange={(event) => setTaskDraft({ ...taskDraft, title: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input placeholder="الوصف" value={taskDraft.description} onChange={(event) => setTaskDraft({ ...taskDraft, description: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><select value={taskDraft.priority} onChange={(event) => setTaskDraft({ ...taskDraft, priority: event.target.value })} className="min-h-11 rounded-xl bg-black/60 px-3"><option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option></select><input type="datetime-local" value={taskDraft.due_at} onChange={(event) => setTaskDraft({ ...taskDraft, due_at: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input placeholder="Assignee UUID اختياري" value={taskDraft.assignee} onChange={(event) => setTaskDraft({ ...taskDraft, assignee: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><button type="button" onClick={() => void createTask()} className="min-h-11 rounded-xl bg-violet-600 px-4 font-bold">إنشاء مهمة</button></div>{currentRows.map((row) => <article key={text(row.id)} className="rounded-2xl border border-white/10 bg-white/5 p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{text(row.title)}</h2><p className="text-sm text-white/55">{text(row.priority)} · {text(row.status)}</p></div><select value={text(row.status)} onChange={(event) => void updateTaskStatus(text(row.id), event.target.value)} className="min-h-10 rounded-xl bg-black/60 px-3"><option value="open">open</option><option value="in_progress">in_progress</option><option value="blocked">blocked</option><option value="resolved">resolved</option><option value="closed">closed</option><option value="cancelled">cancelled</option></select></div><div className="mt-4 flex gap-2"><input value={commentDraft[text(row.id)] ?? ""} onChange={(event) => setCommentDraft((current) => ({ ...current, [text(row.id)]: event.target.value }))} placeholder="تعليق داخلي" className="min-h-10 flex-1 rounded-xl bg-black/40 px-3"/><button type="button" onClick={() => void addTaskComment(text(row.id))} className="rounded-xl border border-white/10 px-4">إضافة</button></div></article>)}</section>}

        {tab === "sla" && <section className="space-y-4"><div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2 lg:grid-cols-5"><input placeholder="اسم السياسة" value={slaDraft.name} onChange={(event) => setSlaDraft({ ...slaDraft, name: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input value={slaDraft.entity_type} onChange={(event) => setSlaDraft({ ...slaDraft, entity_type: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input type="number" value={slaDraft.first_response_minutes} onChange={(event) => setSlaDraft({ ...slaDraft, first_response_minutes: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input type="number" value={slaDraft.resolution_minutes} onChange={(event) => setSlaDraft({ ...slaDraft, resolution_minutes: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><button type="button" onClick={() => void createSla()} className="rounded-xl bg-violet-600">إنشاء</button></div><DataGrid rows={currentRows}/></section>}
        {tab === "workflows" && <section className="space-y-4"><div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-3"><input placeholder="اسم Workflow" value={workflowDraft.name} onChange={(event) => setWorkflowDraft({ ...workflowDraft, name: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><select value={workflowDraft.trigger_type} onChange={(event) => setWorkflowDraft({ ...workflowDraft, trigger_type: event.target.value })} className="min-h-11 rounded-xl bg-black/60 px-3"><option value="request.status_changed">request.status_changed</option><option value="task.created">task.created</option><option value="order.created">order.created</option><option value="sla.warning">sla.warning</option></select><button type="button" onClick={() => void createWorkflow()} className="rounded-xl bg-violet-600">إنشاء مسودة</button></div>{currentRows.map((row) => <div key={text(row.id)} className="flex items-center justify-between rounded-2xl border border-white/10 p-5"><div><strong>{text(row.name)}</strong><p className="text-sm text-white/50">{text(row.trigger_type)} · {text(row.status)}</p></div>{row.status === "draft" && <button type="button" onClick={() => void publishWorkflow(text(row.id))} className="rounded-xl bg-violet-600 px-4 py-3">نشر</button>}</div>)}</section>}
        {tab === "marketplace" && <section className="space-y-4"><div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2 lg:grid-cols-4"><select value={listingDraft.category_id} onChange={(event) => setListingDraft({ ...listingDraft, category_id: event.target.value })} className="min-h-11 rounded-xl bg-black/60 px-3"><option value="">بدون تصنيف</option>{categories.map((row) => <option key={text(row.id)} value={text(row.id)}>{text(row.slug)}</option>)}</select><input placeholder="slug" value={listingDraft.slug} onChange={(event) => setListingDraft({ ...listingDraft, slug: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input placeholder="العنوان العربي" value={listingDraft.title_ar} onChange={(event) => setListingDraft({ ...listingDraft, title_ar: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input placeholder="English title" value={listingDraft.title_en} onChange={(event) => setListingDraft({ ...listingDraft, title_en: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input placeholder="Türkçe başlık" value={listingDraft.title_tr} onChange={(event) => setListingDraft({ ...listingDraft, title_tr: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><input type="number" placeholder="السعر" value={listingDraft.price_amount} onChange={(event) => setListingDraft({ ...listingDraft, price_amount: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><button type="button" onClick={() => void createCategory()} className="rounded-xl border border-white/10">تصنيف جديد</button><button type="button" onClick={() => void createListing()} className="rounded-xl bg-violet-600">إنشاء عنصر</button></div>{currentRows.map((row) => <div key={text(row.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-5"><div><strong>{text(row.slug)}</strong><p className="text-sm text-white/50">{text(row.listing_type)} · {text(row.status)} · {text(row.price_amount)} {text(row.currency)}</p></div><select value={text(row.status)} onChange={(event) => void setListingStatus(text(row.id), event.target.value)} className="min-h-10 rounded-xl bg-black/60 px-3"><option value="draft">draft</option><option value="review">review</option><option value="published">published</option><option value="archived">archived</option></select></div>)}</section>}
        {tab === "orders" && <section className="space-y-3">{currentRows.map((row) => <div key={text(row.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-5"><div><strong>{text(row.order_code)}</strong><p className="text-sm text-white/50">{text(row.total)} {text(row.currency)} · {text(row.payment_status)}</p></div><select value={text(row.status)} onChange={(event) => void setOrderStatus(text(row.id), event.target.value)} className="min-h-10 rounded-xl bg-black/60 px-3"><option value="pending">pending</option><option value="confirmed">confirmed</option><option value="in_progress">in_progress</option><option value="fulfilled">fulfilled</option><option value="cancelled">cancelled</option><option value="refunded">refunded</option><option value="disputed">disputed</option></select></div>)}</section>}
        {tab === "privacy" && <section className="space-y-3">{currentRows.map((row) => <div key={text(row.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-5"><div><strong>{text(row.request_type)}</strong><p className="text-sm text-white/50">{text(row.user_id)} · {text(row.status)}</p></div><select value={text(row.status)} onChange={(event) => void setPrivacyStatus(text(row.id), event.target.value)} className="min-h-10 rounded-xl bg-black/60 px-3"><option value="submitted">submitted</option><option value="verification_required">verification_required</option><option value="verified">verified</option><option value="in_progress">in_progress</option><option value="completed">completed</option><option value="rejected">rejected</option></select></div>)}</section>}
        {tab === "incidents" && <section className="space-y-4"><div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:grid-cols-3"><input placeholder="عنوان الحادثة" value={incidentDraft.title} onChange={(event) => setIncidentDraft({ ...incidentDraft, title: event.target.value })} className="min-h-11 rounded-xl bg-black/40 px-3"/><select value={incidentDraft.severity} onChange={(event) => setIncidentDraft({ ...incidentDraft, severity: event.target.value })} className="min-h-11 rounded-xl bg-black/60 px-3"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select><button type="button" onClick={() => void createIncident()} className="rounded-xl bg-violet-600">فتح حادثة</button></div>{currentRows.map((row) => <div key={text(row.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-5"><div><strong>{text(row.title)}</strong><p className="text-sm text-white/50">{text(row.severity)} · {text(row.status)}</p></div><select value={text(row.status)} onChange={(event) => void setIncidentStatus(text(row.id), event.target.value)} className="min-h-10 rounded-xl bg-black/60 px-3"><option value="investigating">investigating</option><option value="identified">identified</option><option value="monitoring">monitoring</option><option value="resolved">resolved</option></select></div>)}</section>}
        {tab === "providers" && <section><div className="mb-4 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm">جميع مزودي الدفع وWhatsApp والذكاء الاصطناعي والإرسال الحقيقي معطّلون افتراضياً. تعرض الصفحة أدلة الصحة المنقحة فقط.</div><DataGrid rows={currentRows}/></section>}
      </div>
    </main>
  );
}

function DataGrid({ rows: dataRows }: { rows: Row[] }) {
  const fields = dataRows.length ? Object.keys(dataRows[0]).slice(0, 8) : [];
  return <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[760px] text-sm"><thead><tr>{fields.map((field) => <th key={field} className="p-3 text-right text-violet-200">{field}</th>)}</tr></thead><tbody>{dataRows.map((row, index) => <tr key={text(row.id) || index} className="border-t border-white/10">{fields.map((field) => <td key={field} className="p-3 text-white/70">{typeof row[field] === "object" ? JSON.stringify(row[field]) : text(row[field]) || "—"}</td>)}</tr>)}</tbody></table>{!dataRows.length && <p className="p-8 text-center text-white/45">لا توجد بيانات.</p>}</div>;
}
