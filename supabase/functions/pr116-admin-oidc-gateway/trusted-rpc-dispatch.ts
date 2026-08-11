type Admin = { id: number; email: string; role: string; assignedProgram: string | null };
type User = { id: string; email: string };
type Input = { action: string; payload: Record<string, unknown>; supabaseUrl: string; serviceRole: string; admin: Admin; user: User };
type Result = { status: number; body: Record<string, unknown>; ok: boolean } | null;
type Contract = { rpcName: string; allowedFields: readonly string[]; legacy?: "support" | "knowledge" | "promote" | "translation" };

const CONTRACTS: Record<string, Contract> = {
  pr116_admin_backup_create: { rpcName: "pr99_create_private_backup", allowedFields: ["p_mode", "p_notes", "p_scope"] },
  pr116_admin_backup_dry_run: { rpcName: "pr99_backup_dry_run", allowedFields: ["p_backup", "p_scope"] },
  pr116_admin_backup_restore: { rpcName: "pr99_restore_backup", allowedFields: ["p_backup", "p_scope"] },
  pr116_admin_blog_publish: { rpcName: "pr3_publish_blog_post", allowedFields: ["p_post_id"] },
  pr116_admin_blog_save: { rpcName: "pr3_save_blog_post", allowedFields: ["p_category", "p_featured_image_url", "p_post_id", "p_scheduled_at", "p_slug", "p_status", "p_tags", "p_translations"] },
  pr116_admin_blog_unpublish: { rpcName: "pr3_unpublish_blog_post", allowedFields: ["p_post_id"] },
  pr116_admin_notification_action: { rpcName: "pr4_notification_action", allowedFields: ["p_action", "p_ids"] },
  pr116_admin_notifications_mark_read: { rpcName: "pr99_mark_notifications_read", allowedFields: ["p_ids"] },
  pr116_admin_page_builder_publish: { rpcName: "publish_page_builder_page", allowedFields: ["p_language", "p_notes", "p_page_id"] },
  pr116_admin_page_builder_save: { rpcName: "save_page_builder_draft", allowedFields: ["p_language", "p_page_id", "p_page_patch", "p_sections"] },
  pr116_admin_page_builder_unpublish: { rpcName: "pr99_unpublish_page", allowedFields: ["p_language", "p_page_id"] },
  pr116_admin_review_moderate: { rpcName: "pr116_moderate_review_submission", allowedFields: ["p_decision", "p_submission_id"] },
  pr116_admin_trash_permanent_delete: { rpcName: "pr99_permanent_delete_trash", allowedFields: ["p_confirmation", "p_trash_id"] },
  pr116_admin_trash_restore: { rpcName: "pr99_restore_trash", allowedFields: ["p_trash_id"] },
  pr116_ai_support_page_rpc_pr4_support_action_call: { rpcName: "pr4_support_action", allowedFields: ["p_action", "p_note", "p_request_id", "p_value"] },
  pr116_component_productanalyticsconsole_rpc_refresh_product_kpis_call: { rpcName: "refresh_product_kpis", allowedFields: ["p_metric_date", "p_tenant"] },
  pr116_knowledge_base_page_rpc_pr4_promote_suggestion_call: { rpcName: "pr4_promote_suggestion", allowedFields: ["p_suggestion_id"] },
  pr116_knowledge_base_page_rpc_pr4_save_knowledge_call: { rpcName: "pr4_save_knowledge", allowedFields: ["p_alternatives", "p_answer", "p_category", "p_expires_at", "p_id", "p_keywords", "p_language", "p_page_path", "p_priority", "p_program_slug", "p_question", "p_service_slug", "p_source_label", "p_source_type", "p_source_url", "p_start_at", "p_status"] },
  pr116_translations_revisions_page_rpc_publish_translation_candidate_call: { rpcName: "publish_translation_candidate", allowedFields: ["p_translation_revision_id"] },
  pr116_translations_revisions_page_rpc_review_translation_candidate_call: { rpcName: "review_translation_candidate", allowedFields: ["p_review_notes", "p_translation_revision_id"] },
  pr116_translations_revisions_page_rpc_save_translation_candidate_fields_call: { rpcName: "save_translation_candidate_fields", allowedFields: ["p_translated_fields", "p_translation_revision_id"] },

  support_action: { rpcName: "pr4_support_action", allowedFields: ["p_action", "p_note", "p_request_id", "p_value"], legacy: "support" },
  knowledge_save: { rpcName: "pr4_save_knowledge", allowedFields: ["p_alternatives", "p_answer", "p_category", "p_expires_at", "p_id", "p_keywords", "p_language", "p_page_path", "p_priority", "p_program_slug", "p_question", "p_service_slug", "p_source_label", "p_source_type", "p_source_url", "p_start_at", "p_status"], legacy: "knowledge" },
  knowledge_promote: { rpcName: "pr4_promote_suggestion", allowedFields: ["p_suggestion_id"], legacy: "promote" },
  translation_save: { rpcName: "save_translation_candidate_fields", allowedFields: ["p_translated_fields", "p_translation_revision_id"], legacy: "translation" },
  translation_review: { rpcName: "review_translation_candidate", allowedFields: ["p_review_notes", "p_translation_revision_id"], legacy: "translation" },
  translation_publish: { rpcName: "publish_translation_candidate", allowedFields: ["p_translation_revision_id"], legacy: "translation" },
};

export const TRUSTED_RPC_ACTIONS = Object.keys(CONTRACTS);
export const TRUSTED_RPC_PERMISSIONS: Record<string, { module: string; permission: string }> = {
  support_action: { module: "ai_support", permission: "can_edit" },
  knowledge_save: { module: "knowledge_base", permission: "can_edit" },
  knowledge_promote: { module: "knowledge_base", permission: "can_create" },
  translation_save: { module: "settings", permission: "can_edit" },
  translation_review: { module: "settings", permission: "can_edit" },
  translation_publish: { module: "settings", permission: "can_edit" },
};

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function keysAllowed(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}
function positiveInt(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}
function text(value: unknown, max: number, nullable = false): string | null | undefined {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || value.length > max) return undefined;
  return value;
}
function legacyArgs(input: Input, contract: Contract): Record<string, unknown> | null {
  if (!contract.legacy) return record(input.payload.args) ? input.payload.args : input.payload.args === undefined ? {} : null;
  if (contract.legacy === "support") {
    const requestId = positiveInt(input.payload.requestId);
    const action = text(input.payload.action, 40);
    const value = text(input.payload.value, 5000, true);
    const note = text(input.payload.note, 5000, true);
    if (!requestId || !action || !["accept", "priority", "assign", "status", "reply", "note"].includes(action) || value === undefined || note === undefined) return null;
    return { p_request_id: requestId, p_action: action, p_value: value, p_note: note };
  }
  if (contract.legacy === "knowledge") return record(input.payload.rpc) ? input.payload.rpc : null;
  if (contract.legacy === "promote") {
    const suggestionId = positiveInt(input.payload.suggestionId);
    return suggestionId ? { p_suggestion_id: suggestionId } : null;
  }
  return record(input.payload.rpc) ? input.payload.rpc : null;
}

export async function dispatchTrustedRpcAction(input: Input): Promise<Result> {
  const contract = CONTRACTS[input.action];
  if (!contract) return null;
  if (input.admin.role === "program_admin") return { status: 403, body: { ok: false, code: "forbidden" }, ok: false };
  const args = legacyArgs(input, contract);
  if (!args || !keysAllowed(args, contract.allowedFields) || JSON.stringify(args).length > 12_000_000) {
    return { status: 400, body: { ok: false, code: "invalid_request" }, ok: false };
  }
  const actorEmail = (input.admin.email || input.user.email || "").trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.user.id) || !actorEmail || actorEmail.length > 320) {
    return { status: 403, body: { ok: false, code: "forbidden" }, ok: false };
  }
  const response = await fetch(`${input.supabaseUrl}/rest/v1/rpc/${contract.rpcName}`, {
    method: "POST",
    headers: {
      apikey: input.serviceRole,
      Authorization: `Bearer ${input.serviceRole}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      "x-pr116-admin-user-id": input.user.id,
      "x-pr116-admin-email": actorEmail,
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8_000),
  });
  const bodyText = await response.text();
  let data: unknown = null;
  try { data = bodyText ? JSON.parse(bodyText) : null; } catch { data = null; }
  return response.ok
    ? { status: 200, body: { ok: true, data }, ok: true }
    : { status: 502, body: { ok: false, code: "database_contract_rejected" }, ok: false };
}
