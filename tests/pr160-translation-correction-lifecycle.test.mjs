import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("published revisions offer only an authorized correction draft, never an in-place edit",()=>{
 const ui=read("app/admin/translations/revisions/page.tsx");
 assert.ok(ui.includes('selected.workflow_status !== "published"'));
 assert.ok(ui.includes('revision.updated_at!==selected.updated_at'));
 assert.ok(ui.includes('selected.source_revision_id'));
 assert.ok(ui.includes('JSON.stringify(Object.entries(currentValues).sort())'));
 assert.ok(ui.includes("createCorrectionDraft()"));
 assert.ok(ui.includes("إنشاء مسودة تصحيحية من المنشور"));
 assert.ok(ui.includes("adminBoundaryMutation"));
 assert.ok(ui.includes("pr116_translations_revisions_page_rpc_create_translation_candidate_draft_call"));
 assert.doesNotMatch(ui,/\.from\("content_translation_revision_fields"\)[\s\S]{0,120}\.(?:update|upsert|insert)\(/u);
 assert.ok(ui.includes("supabase.from(\"content_translation_revisions\")"));
 assert.ok(ui.includes('source_fingerprint'));
});

test("candidate creation is contracted identically by Next server and OIDC trusted gateway",()=>{
 const server=read("lib/server/pr116AdminActionContracts.ts");
 const gateway=read("supabase/functions/pr116-admin-oidc-gateway/trusted-rpc-dispatch.ts");
 const wrapper=read("supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts");
 const entry=read("supabase/functions/pr116-admin-oidc-gateway/index.ts");
 for(const s of [server,gateway]) {
   assert.ok(s.includes('pr116_translations_revisions_page_rpc_create_translation_candidate_draft_call'));
   assert.ok(s.includes('create_translation_candidate_draft'));
   for(const k of ["p_source_type","p_source_id","p_language","p_source_fingerprint","p_source_snapshot","p_translated_fields"])assert.ok(s.includes(k),k);
 }
 assert.ok(server.includes('"module": "settings"'));
 assert.ok(gateway.includes('module: "settings", permission: "can_edit"'));
 assert.ok(gateway.includes('input.admin.role === "program_admin"'));
 assert.ok(wrapper.includes("userToken?: string; anonKey?: string"));
 assert.ok(entry.includes("dispatchGeneratedAdminAction({ action, payload, supabaseUrl, serviceRole, admin, user, userToken, anonKey })"));
});

test("candidate creation uses user JWT, while existing review/save/publish keep verified service actor context",()=>{
 const gateway=read("supabase/functions/pr116-admin-oidc-gateway/trusted-rpc-dispatch.ts");
 const migration=read("supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql");
 assert.ok(gateway.includes('const createCandidate = contract.rpcName === "create_translation_candidate_draft"'));
 assert.ok(gateway.includes("Authorization: `Bearer ${input.userToken!}`"));
 assert.ok(gateway.includes("Authorization: `Bearer ${input.serviceRole}`"));
 assert.ok(gateway.includes('"x-pr116-admin-user-id": input.user.id'));
 assert.ok(gateway.includes('"x-pr116-admin-email": actorEmail'));
 assert.ok(gateway.includes("const headers = createCandidate ?"));
 assert.ok(migration.includes("'publish_translation_candidate'"));
 assert.ok(migration.includes("'review_translation_candidate'"));
 assert.ok(migration.includes("'save_translation_candidate_fields'"));
 // Pre-request enforces that actor headers are never attached to a normal user JWT.
 assert.ok(migration.includes("pr116_untrusted_actor_headers"));
 assert.ok(gateway.includes('if (createCandidate && (!input.userToken || !input.anonKey'));
});

test("candidate lifecycle preserves published originals and requires explicit review and publish",()=>{
 const ui=read("app/admin/translations/revisions/page.tsx");
 assert.ok(ui.includes('const editableStatuses: Status[] = ["draft", "needs_review", "reviewed"]'));
 assert.ok(ui.includes('kind === "publish"'));
 assert.ok(ui.includes('window.confirm("سيتم نشر هذه النسخة يدوياً'));
 assert.ok(ui.includes('selected.workflow_status !== "reviewed"'));
 assert.ok(ui.includes("createCorrectionDraft"));
 assert.ok(ui.includes("setSelectedId"));
});

test("only the two exact historically broken Turkish fields receive proposed candidate edits",()=>{
 const suggestions=read("lib/i18n/translationCorrectionSuggestions.ts");
 const ui=read("app/admin/translations/revisions/page.tsx");
 for(const term of [
  'sourceType: "programs"',
  'sourceId: "2"',
  'sourceId: "3"',
  'language: "tr"',
  'fieldName: "summary"',
  'fieldName: "faq"',
  'BIGO LIVE programına Hamza Ajansı ara',
  'BIGO LIVE programına Hamza Ajansı aracılığıyla katılın.',
  'Program kamera karşısına geçmeyi gerektiriyor mu?',
  'Yaahlan programı yalnızca sesli yayına dayanır.',
  'if (fields[rule.fieldName] !== rule.previous) continue'
 ]) assert.ok(suggestions.includes(term),term);
 assert.ok(ui.includes('getTranslationCorrectionSuggestions(selected.source_type,selected.source_id,selected.language,originalFields)'));
 assert.ok(ui.includes('p_translated_fields:translatedFields'));
 assert.ok(ui.includes('correctedFields.length'));
 assert.ok(ui.includes('إنشاء مسودة تصحيحية من المنشور'));
 assert.ok(ui.includes('selected.workflow_status !== "reviewed"'));
});
