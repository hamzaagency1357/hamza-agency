import { NextResponse } from "next/server";
import { authorizeAdminMutation, writeServerAdminAudit } from "@/lib/server/adminMutationBoundary";

const SAFE_TOKEN = /^[a-z0-9_:-]{1,80}$/i;

type ActivityBody = {
  operation: "recordAdminActivity";
  action: string;
  module: string;
  recordId?: string | number | null;
  details?: unknown;
  oldData?: unknown;
  newData?: unknown;
};

function parseBody(value: unknown): ActivityBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.operation !== "recordAdminActivity") return null;
  if (typeof row.action !== "string" || !SAFE_TOKEN.test(row.action)) return null;
  if (typeof row.module !== "string" || !SAFE_TOKEN.test(row.module)) return null;
  if (row.recordId !== undefined && row.recordId !== null && typeof row.recordId !== "string" && typeof row.recordId !== "number") return null;
  return {
    operation: "recordAdminActivity",
    action: row.action,
    module: row.module,
    recordId: row.recordId as string | number | null | undefined,
    details: row.details,
    oldData: row.oldData,
    newData: row.newData,
  };
}

export async function POST(request: Request) {
  let body: ActivityBody | null = null;
  try { body = parseBody(await request.json()); } catch { body = null; }
  if (!body) return NextResponse.json({ ok: false, message: "بيانات سجل النشاط غير صالحة." }, { status: 400 });

  const authorization = await authorizeAdminMutation(request, "activity_logs", "can_create");
  if (!authorization.ok) {
    return NextResponse.json({ ok: false, message: authorization.message }, { status: authorization.status });
  }

  const result = await writeServerAdminAudit({
    actor: authorization.actor,
    action: body.action,
    entityType: body.module,
    entityId: body.recordId,
    oldData: body.oldData,
    newData: body.newData,
    metadata: { details: body.details ?? null, operation: body.operation },
    sourceRoute: "/api/admin/activity",
  });

  if (!result.ok) return NextResponse.json({ ok: false, message: "تعذر تسجيل النشاط الإداري." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
