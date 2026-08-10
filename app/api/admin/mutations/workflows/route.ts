import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/server/adminMutationBoundary";
import {
  callPr116AdminOidcGateway,
  Pr116AdminGatewayError,
  type Pr116AdminGatewayAction,
} from "@/lib/server/pr116AdminOidcGateway";

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

async function invoke(
  request: Request,
  token: string,
  action: Pr116AdminGatewayAction,
  payload: Record<string, unknown>,
) {
  try {
    const result = await callPr116AdminOidcGateway<{ ok: true; data: unknown }>(request, token, action, payload);
    return { ok: true as const, data: result.data };
  } catch (gatewayError) {
    if (gatewayError instanceof Pr116AdminGatewayError) {
      if (gatewayError.reason === "preview_forbidden") return { ok: false as const, status: 403, message: "المعاينة مخصصة للعرض والتحقق فقط، ولا تحفظ تغييرات على البيانات الفعلية." };
      if (gatewayError.reason === "unauthorized") return { ok: false as const, status: 401, message: "انتهت جلسة الإدارة. سجل الدخول مجددًا." };
      if (gatewayError.reason === "forbidden") return { ok: false as const, status: 403, message: "لا تملك صلاحية تنفيذ هذا الإجراء." };
    }
    return { ok: false as const, status: 503, message: "تعذر تنفيذ الإجراء الآن. حاول مرة أخرى." };
  }
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
    const result = await invoke(request, auth.actor.user.accessToken, "support_action", { requestId, action, value, note });
    return result.ok ? NextResponse.json({ ok: true, data: result.data }) : error(result.message, result.status);
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
    const programSlug = text(body.programSlug, 160, true);
    const serviceSlug = text(body.serviceSlug, 160, true);
    const pagePath = text(body.pagePath, 500, true);
    const sourceLabel = text(body.sourceLabel, 300, true);
    const sourceUrl = text(body.sourceUrl, 1500, true);
    const startAt = text(body.startAt, 50, true);
    const expiresAt = text(body.expiresAt, 50, true);
    if ((body.id !== null && !id) || question === undefined || answer === undefined || !language || !["ar", "en", "tr"].includes(language) || !category || !sourceType || !status || !KNOWLEDGE_STATUSES.has(status) || !alternatives || !keywords || programSlug === undefined || serviceSlug === undefined || pagePath === undefined || sourceLabel === undefined || sourceUrl === undefined || startAt === undefined || expiresAt === undefined) return error("بيانات المعرفة غير صالحة.", 400);
    const auth = await authorizeAdminMutation(request, "knowledge_base", "can_edit");
    if (!auth.ok) return error(auth.message, auth.status);
    const rpc = {
      p_id: id,
      p_question: question,
      p_answer: answer,
      p_alternatives: alternatives,
      p_keywords: keywords,
      p_language: language,
      p_program_slug: programSlug,
      p_service_slug: serviceSlug,
      p_page_path: pagePath,
      p_category: category,
      p_source_type: sourceType,
      p_source_label: sourceLabel,
      p_source_url: sourceUrl,
      p_priority: typeof body.priority === "number" && Number.isFinite(body.priority) && body.priority >= -100 && body.priority <= 100 ? body.priority : 0,
      p_start_at: startAt,
      p_expires_at: expiresAt,
      p_status: status,
    };
    const result = await invoke(request, auth.actor.user.accessToken, "knowledge_save", { rpc });
    return result.ok ? NextResponse.json({ ok: true, data: result.data }) : error(result.message, result.status);
  }

  if (operation === "promoteKnowledgeSuggestion") {
    const suggestionId = positiveInt(body.suggestionId);
    if (!suggestionId) return error("بيانات الاقتراح غير صالحة.", 400);
    const auth = await authorizeAdminMutation(request, "knowledge_base", "can_create");
    if (!auth.ok) return error(auth.message, auth.status);
    const result = await invoke(request, auth.actor.user.accessToken, "knowledge_promote", { suggestionId });
    return result.ok ? NextResponse.json({ ok: true, data: result.data }) : error(result.message, result.status);
  }

  if (TRANSLATION_OPERATIONS.has(operation)) {
    const revisionId = text(body.revisionId, 100);
    if (!revisionId) return error("معرف إصدار الترجمة غير صالح.", 400);
    const auth = await authorizeAdminMutation(request, "settings", "can_edit");
    if (!auth.ok) return error(auth.message, auth.status);
    let action: Pr116AdminGatewayAction;
    let rpc: Record<string, unknown>;
    if (operation === "saveTranslationCandidate") {
      const fields = body.fields;
      if (!fields || typeof fields !== "object" || Array.isArray(fields) || Object.keys(fields).length > 100 || Object.entries(fields as Record<string, unknown>).some(([k, v]) => !/^[a-z0-9_]{1,80}$/i.test(k) || typeof v !== "string" || v.length > 20000)) return error("حقول الترجمة غير صالحة.", 400);
      action = "translation_save";
      rpc = { p_translation_revision_id: revisionId, p_translated_fields: fields };
    } else if (operation === "reviewTranslationCandidate") {
      const reviewNotes = text(body.reviewNotes, 5000, true);
      if (reviewNotes === undefined) return error("ملاحظات المراجعة غير صالحة.", 400);
      action = "translation_review";
      rpc = { p_translation_revision_id: revisionId, p_review_notes: reviewNotes };
    } else {
      action = "translation_publish";
      rpc = { p_translation_revision_id: revisionId };
    }
    const result = await invoke(request, auth.actor.user.accessToken, action, { rpc });
    return result.ok ? NextResponse.json({ ok: true, data: result.data }) : error(result.message, result.status);
  }

  return error("العملية المطلوبة غير مدعومة.", 400);
}
