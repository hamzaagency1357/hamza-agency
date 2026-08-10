import { NextResponse } from "next/server";
import { authorizeAdminMutation, privilegedSupabaseRest, writeServerAdminAudit } from "@/lib/server/adminMutationBoundary";

const SUPPORT_ACTIONS = new Set(["accept", "priority", "assign", "status", "reply", "note"]);
const KNOWLEDGE_STATUSES = new Set(["draft", "review", "published", "disabled", "archived"]);
const TRANSLATION_OPERATIONS = new Set(["saveTranslationCandidate", "reviewTranslationCandidate", "publishTranslationCandidate"]);

function error(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function text(value: unknown, max: number, nullable = false): string | null | undefined {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || value.length > max) return undefined;
  return value;
}

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function rpc(name: string, body: Record<string, unknown>) {
  return privilegedSupabaseRest<unknown>(`/rpc/${name}`, { method: "POST", body: JSON.stringify(body) });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return error("بيانات الإجراء غير صالحة.", 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return error("بيانات الإجراء غير صالحة.", 400);
  }

  const operation = typeof body.operation === "string" ? body.operation : "";

  if (operation === "supportAction") {
    const requestId = positiveInt(body.requestId);
    const action = text(body.action, 40);
    const value = text(body.value, 5000, true);
    const note = text(body.note, 5000, true);
    if (!requestId || !action || !SUPPORT_ACTIONS.has(action) || value === undefined || note === undefined) return error("بيانات إجراء الدعم غير صالحة.", 400);
    const auth = await authorizeAdminMutation(request, "ai_support", "can_edit");
    if (!auth.ok) return error(auth.message, auth.status);
    const result = await rpc("pr4_support_action", { p_request_id: requestId, p_action: action, p_value: value, p_note: note });
    if (!result.ok) return error("تعذر حفظ إجراء الدعم الآن.", result.status >= 500 ? 503 : 400);
    await writeServerAdminAudit({ actor: auth.actor, action: `support_${action}`, entityType: "pr4_support_requests", entityId: requestId, metadata: { operation }, sourceRoute: "/api/admin/mutations/workflows" });
    return NextResponse.json({ ok: true, data: result.data });
  }

  if (operation === "saveKnowledge") {
    const id = body.id === null ? null : positiveInt(body.id);
    const question = text(body.question, 800);
    const answer = text(body.answer, 12000);
    const language = text(body.language, 2);
    const category = text(body.category, 120);
    const sourceType = text(body.sourceType, 120);
    const status = text(body.status, 30);
    const alternatives = Array.isArray(body.alternatives) ? body.alternatives.filter((v): v is string => typeof v === "string" && v.length <= 1000).slice(0, 50) : null;
    const keywords = Array.isArray(body.keywords) ? body.keywords.filter((v): v is string => typeof v === "string" && v.length <= 200).slice(0, 100) : null;
    if ((body.id !== null && !id) || question === undefined || answer === undefined || !language || !["ar", "en", "tr"].includes(language) || !category || !sourceType || !status || !KNOWLEDGE_STATUSES.has(status) || !alternatives || !keywords) return error("بيانات المعرفة غير صالحة.", 400);
    const auth = await authorizeAdminMutation(request, "knowledge_base", "can_edit");
    if (!auth.ok) return error(auth.message, auth.status);
    const result = await rpc("pr4_save_knowledge", {
      p_id: id,
      p_question: question,
      p_answer: answer,
      p_alternatives: alternatives,
      p_keywords: keywords,
      p_language: language,
      p_program_slug: text(body.programSlug, 160, true),
      p_service_slug: text(body.serviceSlug, 160, true),
      p_page_path: text(body.pagePath, 500, true),
      p_category: category,
      p_source_type: sourceType,
      p_source_label: text(body.sourceLabel, 300, true),
      p_source_url: text(body.sourceUrl, 1500, true),
      p_priority: typeof body.priority === "number" && Number.isFinite(body.priority) && body.priority >= -100 && body.priority <= 100 ? body.priority : 0,
      p_start_at: text(body.startAt, 50, true),
      p_expires_at: text(body.expiresAt, 50, true),
      p_status: status,
    });
    if (!result.ok) return error("تعذر حفظ المعرفة الآن.", result.status >= 500 ? 503 : 400);
    await writeServerAdminAudit({ actor: auth.actor, action: "save_knowledge", entityType: "pr4_knowledge_base", entityId: id, metadata: { operation, status, language }, sourceRoute: "/api/admin/mutations/workflows" });
    return NextResponse.json({ ok: true, data: result.data });
  }

  if (operation === "promoteKnowledgeSuggestion") {
    const suggestionId = positiveInt(body.suggestionId);
    if (!suggestionId) return error("بيانات الاقتراح غير صالحة.", 400);
    const auth = await authorizeAdminMutation(request, "knowledge_base", "can_create");
    if (!auth.ok) return error(auth.message, auth.status);
    const result = await rpc("pr4_promote_suggestion", { p_suggestion_id: suggestionId });
    if (!result.ok) return error("تعذر إنشاء المسودة من الاقتراح الآن.", result.status >= 500 ? 503 : 400);
    await writeServerAdminAudit({ actor: auth.actor, action: "promote_knowledge_suggestion", entityType: "pr4_knowledge_suggestions", entityId: suggestionId, metadata: { operation }, sourceRoute: "/api/admin/mutations/workflows" });
    return NextResponse.json({ ok: true, data: result.data });
  }

  if (TRANSLATION_OPERATIONS.has(operation)) {
    const revisionId = text(body.revisionId, 100);
    if (!revisionId) return error("معرف إصدار الترجمة غير صالح.", 400);
    const auth = await authorizeAdminMutation(request, "settings", "can_edit");
    if (!auth.ok) return error(auth.message, auth.status);
    let result;
    if (operation === "saveTranslationCandidate") {
      const fields = body.fields;
      if (!fields || typeof fields !== "object" || Array.isArray(fields) || Object.keys(fields).length > 100 || Object.entries(fields as Record<string, unknown>).some(([k, v]) => !/^[a-z0-9_]{1,80}$/i.test(k) || typeof v !== "string" || v.length > 20000)) return error("حقول الترجمة غير صالحة.", 400);
      result = await rpc("save_translation_candidate_fields", { p_translation_revision_id: revisionId, p_translated_fields: fields });
    } else if (operation === "reviewTranslationCandidate") {
      const reviewNotes = text(body.reviewNotes, 5000, true);
      if (reviewNotes === undefined) return error("ملاحظات المراجعة غير صالحة.", 400);
      result = await rpc("review_translation_candidate", { p_translation_revision_id: revisionId, p_review_notes: reviewNotes });
    } else {
      result = await rpc("publish_translation_candidate", { p_translation_revision_id: revisionId });
    }
    if (!result.ok) return error("تعذر تنفيذ إجراء الترجمة الآن.", result.status >= 500 ? 503 : 400);
    await writeServerAdminAudit({ actor: auth.actor, action: operation, entityType: "content_translation_revisions", entityId: revisionId, metadata: { operation }, sourceRoute: "/api/admin/mutations/workflows" });
    return NextResponse.json({ ok: true, data: result.data });
  }

  return error("العملية المطلوبة غير مدعومة.", 400);
}
