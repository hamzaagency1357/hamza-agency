import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import { getTranslationCorrectionSuggestions } from "../lib/i18n/translationCorrectionSuggestions.ts";
import { dispatchGeneratedAdminAction } from "../supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts";
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

test("only the scoped Turkish fields receive exact-match candidate edits",()=>{
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

test("Yaahlan's published FAQ stays intact when proposing the summary correction", () => {
 const summary = "HAMZA AGENCY aracılığıyla YAAHLAN programına katılın";
 const faq = "Program kamera karşısına geçmeyi gerektiriyor mu?\nHayır, Yaahlan programı yalnızca sesli yayına dayanır.";
 const original = Object.freeze({ title: "Yaahlan", summary, faq });
 assert.deepEqual(getTranslationCorrectionSuggestions("programs", "3", "tr", original), {
  fields: { ...original, summary: "Hamza Ajansı aracılığıyla Yaahlan programına katılın." },
  correctedFields: ["summary"],
 });
 assert.equal(original.summary, summary);
 for (const [type, id, language] of [["programs", "2", "tr"], ["programs", "3", "en"], ["pages", "3", "tr"]]) {
  assert.deepEqual(getTranslationCorrectionSuggestions(type, id, language, original), {
   fields: original, correctedFields: [],
  });
 }
});

test("gateway dispatch uses the verified user's token only for creation and preserves existing service RPCs", async (t) => {
 const calls = [];
 t.mock.method(globalThis, "fetch", async (url, init) => {
  calls.push({ url: new URL(url), headers: new Headers(init.headers), args: JSON.parse(init.body) });
  return Response.json({ fixture: true });
 });
 const admin = { id: 1, email: "owner@example.test", role: "super_admin", assignedProgram: null };
 const user = { id: "10000000-0000-4000-8000-000000000001", email: admin.email };
 const input = { supabaseUrl: "https://isolated.example.test", serviceRole: "test-service", anonKey: "test-anon", userToken: "test-user", admin, user };
 const dispatch = (rpc, args, context = input) => dispatchGeneratedAdminAction({
  ...context, action: `pr116_translations_revisions_page_rpc_${rpc}_call`, payload: { args },
 });
 const draft = "10000000-0000-4000-8000-000000000002";
 const fields = { title: "Yaahlan", summary: "Hamza Ajansı aracılığıyla Yaahlan programına katılın." };
 const create = "create_translation_candidate_draft";
 const createArgs = {
  p_source_type: "programs", p_source_id: "3", p_language: "tr",
  p_source_fingerprint: "isolated", p_source_snapshot: { title: "Yaahlan", summary: "ملخص" }, p_translated_fields: fields,
 };
 assert.equal((await dispatch(create, createArgs, { ...input, userToken: undefined })).status, 403);
 assert.equal((await dispatch(create, createArgs, { ...input, admin: { ...admin, role: "program_admin" } })).status, 403);
 assert.equal((await dispatch(create, { ...createArgs, p_actor: user.id })).status, 400);
 assert.equal(calls.length, 0);

 assert.equal((await dispatch(create, createArgs)).ok, true);
 assert.equal(calls[0].url.pathname, `/rest/v1/rpc/${create}`);
 assert.equal(calls[0].headers.get("authorization"), "Bearer test-user");
 assert.equal(calls[0].headers.get("apikey"), "test-anon");
 assert.equal(calls[0].headers.has("x-pr116-admin-user-id"), false);
 assert.equal(calls[0].headers.has("x-pr116-admin-email"), false);
 assert.deepEqual(calls[0].args, createArgs);

 for (const [rpc, args] of [
  ["save_translation_candidate_fields", { p_translation_revision_id: draft, p_translated_fields: fields }],
  ["review_translation_candidate", { p_translation_revision_id: draft, p_review_notes: "Reviewed" }],
  ["publish_translation_candidate", { p_translation_revision_id: draft }],
 ]) {
  assert.equal((await dispatch(rpc, args)).ok, true);
  const call = calls.at(-1);
  assert.equal(call.url.pathname, `/rest/v1/rpc/${rpc}`);
  assert.equal(call.headers.get("authorization"), "Bearer test-service");
  assert.equal(call.headers.get("x-pr116-admin-user-id"), user.id);
  assert.equal(call.headers.get("x-pr116-admin-email"), admin.email);
  assert.deepEqual(call.args, args);
 }
});
