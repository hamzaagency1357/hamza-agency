import { NextResponse } from "next/server";
import {
  authorizeAdminMutation,
  normalizeProgramScope,
  privilegedSupabaseRest,
  writeServerAdminAudit,
} from "@/lib/server/adminMutationBoundary";
import { supabaseRestAsUser } from "@/lib/server/supabaseUser";

const APPLICATION_STATUSES = new Set([
  "new",
  "under_review",
  "contacted",
  "accepted",
  "rejected",
  "archived",
]);

type ApplicationRow = {
  id: number;
  platform: string | null;
  status: string | null;
  internal_notes: string | null;
};

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
  const { actor } = authorization;

  // Read the exact target using the user's own bearer token. This preserves
  // row visibility and gives us the old value before the privileged write.
  const target = await supabaseRestAsUser<ApplicationRow[]>(
    `/agency_applications?select=id,platform,status,internal_notes&id=eq.${payload.applicationId}&limit=1`,
    actor.user,
  );
  const current = target.ok && Array.isArray(target.data) ? target.data[0] : null;
  if (!current) return jsonError("تعذر العثور على الطلب أو لا تملك صلاحية إدارته.", 404);

  if (actor.profile.role === "program_admin") {
    const assigned = normalizeProgramScope(actor.profile.assignedProgram);
    const targetProgram = normalizeProgramScope(current.platform);
    if (!assigned || !targetProgram.includes(assigned)) {
      return jsonError("هذا الطلب خارج البرنامج المسموح لهذا الحساب.", 403);
    }
  }

  const patch = payload.operation === "updateApplicationStatus"
    ? { status: payload.status }
    : { internal_notes: payload.internalNotes || null };

  const mutation = await privilegedSupabaseRest<ApplicationRow[]>(
    `/agency_applications?id=eq.${payload.applicationId}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
  if (!mutation.ok) return jsonError("تعذر حفظ التعديل الآن. حاول مرة أخرى.", mutation.status >= 500 ? 503 : 400);

  const updated = Array.isArray(mutation.data) ? mutation.data[0] || null : null;
  await writeServerAdminAudit({
    actor,
    action: payload.operation === "updateApplicationStatus" ? "update_application_status" : "update_application_notes",
    entityType: "agency_applications",
    entityId: payload.applicationId,
    oldData: current,
    newData: updated || { ...current, ...patch },
    metadata: { operation: payload.operation },
    sourceRoute: "/api/admin/mutations/applications",
  });

  return NextResponse.json({ ok: true, data: updated || patch });
}
