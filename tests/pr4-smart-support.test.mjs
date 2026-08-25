import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const ai=read("app/api/ai-support/route.ts");
const knowledge=read("lib/server/pr4Knowledge.ts");
const track=read("app/api/track/route.ts");
const handoff=read("app/api/support-request/route.ts");
const panel=read("components/SmartSupportPanel.tsx");
const publicSupport=read("components/PublicAiSupport.tsx");
const kbAdmin=read("app/admin/knowledge-base/page.tsx");
const supportAdmin=read("app/admin/ai-support/page.tsx");
const inbox=read("components/AdminNotificationsInbox.tsx");
const macroFixtures=read("scripts/closeout/macro-runtime-fixtures.mjs");
const core=read("supabase/migrations/20260808210000_pr4_smart_support_notifications.sql");
const integration=read("supabase/migrations/20260808211000_pr4_support_notification_integrations.sql");
const marketplace=read("supabase/migrations/20260808212000_pr4_marketplace_notification_hardening.sql");

test("PR4 answers only from active published sources or natural safe fallback",()=>{
  assert.match(ai,/pr4_knowledge_base/);assert.match(ai,/\.eq\("status","published"\)/);assert.match(ai,/start_at\.is\.null/);assert.match(ai,/expires_at\.is\.null/);assert.match(ai,/findPublishedKnowledgeAnswer/);assert.match(knowledge,/status !== "published"/);assert.match(ai,/sitemap\.xml/);assert.match(ai,/cache:\s*"no-store"/);assert.match(ai,/rules_fallback/);assert.match(ai,/safe_fallback/);assert.match(ai,/وعليكم السلام ورحمة الله وبركاته/);assert.match(ai,/Hello and welcome to HAMZA AGENCY/);assert.match(ai,/HAMZA AGENCY'ye hoş geldiniz/);assert.doesNotMatch(ai,/BUILT_IN_KNOWLEDGE/);assert.doesNotMatch(ai,/service_role/i);
});

test("PR4 human handoff requires disclosure and consent and uses the trusted server path",()=>{
  assert.match(panel,/90 يوم/);assert.match(panel,/Privacy policy|سياسة الخصوصية/);assert.match(panel,/consent/);assert.match(panel,/WhatsApp \(optional\)|واتساب \(اختياري\)/);assert.match(panel,/backendUnavailable/);assert.match(handoff,/consent_required/);assert.match(handoff,/support_request_create/);assert.doesNotMatch(handoff,/\.rpc\s*\(\s*["'`]pr4_create_support_request/);
});

test("SUP tracking requires a second secret and never exposes internal notes",()=>{
  assert.match(track,/SUP-\[A-Z0-9\]/);assert.match(track,/verification_required/);assert.match(track,/pr4_track_support_request/);assert.match(core,/verification_hash/);assert.match(core,/pr4_support_internal_notes/);assert.doesNotMatch(track,/internal_notes|pr4_support_internal_notes/);
});

test("local-isolated stateful CI applies the real PR4 migrations without production access",()=>{
  for(const migration of ["20260808210000_pr4_smart_support_notifications.sql","20260808211000_pr4_support_notification_integrations.sql","20260808211500_pr4_permission_hardening.sql","20260808212000_pr4_marketplace_notification_hardening.sql"])assert.match(macroFixtures,new RegExp(migration));
  assert.match(macroFixtures,/CLOSEOUT_EXECUTION_MODE !== "local-isolated"/);assert.doesNotMatch(macroFixtures,/SUPABASE_ACCESS_TOKEN|HAMZA_PRODUCTION_READONLY_URL/);
});

test("mobile support is viewport-safe above the dock at Owner QA widths",()=>{
  assert.match(publicSupport,/fixed inset-x-2/);assert.match(publicSupport,/safe-area-inset-top/);assert.match(publicSupport,/safe-area-inset-bottom/);assert.match(publicSupport,/5\.75rem/);assert.match(publicSupport,/z-\[260\]/);assert.match(panel,/min-h-0 flex-1 overflow-y-auto/);assert.match(panel,/max-w-full/);assert.match(panel,/min-w-0/);
  for(const width of [320,360,375,390,412,430])assert.ok(width>=320&&width<=430);
});

test("Knowledge lifecycle is draft-first, publication-gated and expiration-aware",()=>{
  assert.match(core,/status text not null default 'draft'/);assert.match(core,/status='published'/);assert.match(core,/expires_at is null or expires_at>now\(\)/);assert.match(core,/start_at is null or start_at<=now\(\)/);assert.match(core,/question_redacted/);assert.match(core,/values\(v_suggestion\.question_redacted,''/);assert.match(kbAdmin,/إنشاء مسودة/);assert.match(kbAdmin,/لا يمكن نشر معرفة بلا جواب/);
});

test("Support workflow is professional, explicit-save and keeps private notes private",()=>{
  for(const state of ["new","awaiting_acceptance","accepted","responding","awaiting_user","resolved","closed","cancelled"])assert.match(core,new RegExp(state));
  assert.match(core,/pr4_support_history/);assert.match(integration,/close reason required/);assert.match(integration,/assigned_admin_id/);assert.match(supportAdmin,/ملاحظات داخلية — لفريق العمل فقط/);assert.match(supportAdmin,/حفظ التعيين/);assert.match(supportAdmin,/حفظ الحالة/);assert.match(supportAdmin,/حفظ الأولوية/);assert.match(supportAdmin,/الزائر/);assert.match(supportAdmin,/فريق الدعم/);assert.doesNotMatch(supportAdmin,/setMsg\(error\.message\)/);assert.doesNotMatch(supportAdmin,/>Human Handoff</);
});

test("Notifications preserve legacy read compatibility while adding PR4 workflow through the trusted Admin boundary",()=>{
  assert.match(inbox,/pr4_notification_inbox/);assert.match(inbox,/notifications/);assert.match(inbox,/pr116_admin_notifications_mark_read/);assert.match(inbox,/pr116_admin_notification_action/);assert.doesNotMatch(inbox,/\.rpc\s*\(\s*["'`]pr99_mark_notifications_read/);assert.match(inbox,/تم تعليم الإشعار كمقروء/);assert.match(inbox,/مركز متابعة العمليات/);assert.doesNotMatch(inbox,/setMessage\(error\.message\)/);assert.doesNotMatch(inbox,/>Operations Inbox</);
});

test("Notifications are deduplicated, permission-filtered, deep-linked, marketplace-aware and SLA-aware",()=>{
  assert.match(core,/dedupe_key/);assert.match(core,/pr4_notification_inbox/);assert.match(core,/pr4_admin_can_module/);assert.match(inbox,/فتح التفاصيل/);assert.match(integration,/application_new/);assert.match(integration,/service_request_new/);assert.match(integration,/job_application_new/);assert.match(integration,/contact_request_new/);assert.match(integration,/privacy_request/);assert.match(integration,/dispute_refund/);assert.match(integration,/membership_review/);assert.match(integration,/pr4_escalate_overdue_support/);assert.match(integration,/sla_policies/);assert.match(marketplace,/marketplace_orders/);assert.match(marketplace,/marketplace_followup/);assert.match(marketplace,/nullif\(v_data->>'tenant_id',''\)::uuid/);
});

test("PR4 migrations remain additive and RLS protected",()=>{
  for(const sql of [core,integration,marketplace]){assert.doesNotMatch(sql,/\bdrop\s+(table|column|schema)\b/i);assert.doesNotMatch(sql,/\btruncate\b/i);assert.doesNotMatch(sql,/\bdelete\s+from\b/i)}
  for(const table of ["pr4_knowledge_base","pr4_knowledge_suggestions","pr4_support_requests","pr4_support_messages","pr4_support_internal_notes","pr4_support_history"])assert.match(core,new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(core,/security_invoker=true/);assert.match(core,/fixed search_path|set search_path=pg_catalog,public/);
});
