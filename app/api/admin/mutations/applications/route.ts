import { NextResponse } from "next/server";
import { authorizeAdminMutation } from "@/lib/server/adminMutationBoundary";
import {
  callPr116AdminOidcGateway,
  Pr116AdminGatewayError,
} from "@/lib/server/pr116AdminOidcGateway";

const APPLICATION_STATUSES = new Set([
  "new",
  "under_review",
  "contacted",
  "accepted",
  "rejected",
  "archived",
]);

type MutationBody =
  | { operation: "updateApplicationStatus"; applicationId: number; status: string }
  | { operation: "updateApplicationNotes"; applicationId: number; internalNotes: string };

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

function validId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseBody(value: unknown): MutationBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (!validId(row.applicationId)) return null;

  if (row.operation === "updateApplicationStatus") {
    if (typeof row.status !== "string" || !APPLICATION_STATUSES.has(row.status)) return null;
    return { operation: row.operation, applicationId: row.applicationId, status: row.status };
  }

  if (row.operation === "updateApplicationNotes") {
    if (typeof row.internalNotes !== "string" || row.internalNotes.length > 5000) return null;
    return {
      operation: row.operation,
      applicationId: row.applicationId,
      internalNotes: row.internalNotes.trim(),
    };
  }

  return null;
}

export async function POST(request: Request) {
  let payload: MutationBody | null = null;
  try {
    payload = parseBody(await request.json());
  } catch {
    payload = null;
  }
  if (!payload) return jsonError("بيانات التعديل غير صالحة.", 400);

  const authorization = await authorizeAdminMutation(request, "applications", "can_edit");
  if (!authorization.ok) return jsonError(authorization.message, authorization.status);

  try {
    const action = payload.operation === "updateApplicationStatus"
      ? "application_status_update"
      : "application_internal_notes_update";
    const data = await callPr116AdminOidcGateway<{ ok: true; data: unknown }>(
      authorization.actor.user.accessToken,
      action,
      payload.operation === "updateApplicationStatus"
        ? { applicationId: payload.applicationId, status: payload.status }
        : { applicationId: payload.applicationId, internalNotes: payload.internalNotes },
    );
    return NextResponse.json({ ok: true, data: data.data });
  } catch (error) {
    if (error instanceof Pr116AdminGatewayError) {
      if (error.reason === "preview_forbidden") {
        return jsonError("المعاينة مخصصة للعرض والتحقق فقط، ولا تحفظ تغييرات على البيانات الفعلية.", 403);
      }
      if (error.reason === "unauthorized") return jsonError("انتهت جلسة الإدارة. سجل الدخول مجددًا.", 401);
      if (error.reason === "forbidden") return jsonError("لا تملك صلاحية تنفيذ هذا الإجراء.", 403);
    }
    return jsonError("تعذر حفظ التعديل الآن. حاول مرة أخرى.", 503);
  }
}
