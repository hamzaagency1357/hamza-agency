import { NextResponse } from "next/server";
import { authorizeAdminMutation, PREVIEW_READ_ONLY_MESSAGE } from "@/lib/server/adminMutationBoundary";
import { PR116_ADMIN_ACTION_CONTRACTS, type Pr116AdminActionContract } from "@/lib/server/pr116AdminActionContracts";
import { callPr116AdminOidcGateway, Pr116AdminGatewayError } from "@/lib/server/pr116AdminOidcGateway";
import type { AdminModule, AdminPermissionAction } from "@/lib/adminAccess";

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function keysAllowed(value: unknown, allowed: readonly string[]) {
  const rows = Array.isArray(value) ? value : [value];
  return rows.every((row) => isRecord(row) && Object.keys(row).every((key) => allowed.includes(key)));
}
function validatePayload(contract: Pr116AdminActionContract, payload: Record<string, unknown>) {
  if (JSON.stringify(payload).length > 12_000_000) return false;
  if (contract.kind === "entity") {
    if (contract.method !== "delete" && !keysAllowed(payload.values, contract.allowedFields)) return false;
    const filters = Array.isArray(payload.filters) ? payload.filters : [];
    if ((contract.method === "update" || contract.method === "delete") && filters.length === 0) return false;
    if (!filters.every((item) => isRecord(item) && ["eq","neq","in","is"].includes(String(item.op)) && typeof item.field === "string" && contract.allowedFilters.includes(item.field))) return false;
    if (payload.select !== undefined && (typeof payload.select !== "string" || !contract.allowedSelects.includes(payload.select))) return false;
    return true;
  }
  if (contract.kind === "rpc") return payload.args === undefined || keysAllowed(payload.args, contract.allowedFields);
  if (contract.kind === "auth") return keysAllowed(payload.values, contract.allowedFields);
  if (contract.kind === "storage") return Array.isArray(payload.args) && payload.args.length <= 4;
  if (contract.kind === "trash") return Object.keys(payload).every((key) => contract.allowedFields.includes(key));
  return false;
}

function localDiagnostic(reason: string) {
  return process.env.CLOSEOUT_EXECUTION_MODE === "local-isolated" ? { closeoutDiagnostic: reason } : {};
}

export async function POST(request: Request) {
  let body: { action?: unknown; payload?: unknown } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "بيانات الحفظ غير صالحة." }, { status: 400 }); }
  if (typeof body.action !== "string" || !Object.prototype.hasOwnProperty.call(PR116_ADMIN_ACTION_CONTRACTS, body.action) || !isRecord(body.payload)) {
    return NextResponse.json({ ok: false, message: "عملية الحفظ غير معتمدة." }, { status: 400 });
  }
  const contract = PR116_ADMIN_ACTION_CONTRACTS[body.action as keyof typeof PR116_ADMIN_ACTION_CONTRACTS] as Pr116AdminActionContract;
  if (contract.kind === "entity" && contract.table === "tenant_admin_audit") {
    return NextResponse.json({ ok: false, message: "سجل التدقيق يُنشأ تلقائيًا من البوابة الموثوقة ولا يقبل إدخالًا من المتصفح." }, { status: 400 });
  }
  if (!validatePayload(contract, body.payload)) return NextResponse.json({ ok: false, message: "بيانات الحفظ لا تطابق العقد المعتمد." }, { status: 400 });
  const requiredRole = contract.kind === "entity" && contract.table === "admin_permissions" ? "super_admin" : null;
  const auth = await authorizeAdminMutation(
    request,
    contract.module as AdminModule,
    contract.permission as AdminPermissionAction,
    requiredRole,
  );
  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });
  try {
    const result = await callPr116AdminOidcGateway<{ ok?: boolean; data?: unknown }>(auth.actor.user.accessToken, body.action, body.payload);
    return NextResponse.json({ ok: true, data: result.data ?? null });
  } catch (error) {
    if (error instanceof Pr116AdminGatewayError && error.reason === "preview_forbidden") return NextResponse.json({ ok: false, message: PREVIEW_READ_ONLY_MESSAGE }, { status: 403 });
    if (error instanceof Pr116AdminGatewayError && (error.reason === "unauthorized" || error.reason === "forbidden")) return NextResponse.json({ ok: false, message: "لا تملك صلاحية تنفيذ هذا التغيير.", ...localDiagnostic(error.reason) }, { status: 403 });
    return NextResponse.json({ ok: false, message: "تعذر حفظ التغيير الإداري بأمان.", ...(error instanceof Pr116AdminGatewayError ? localDiagnostic(error.reason) : {}) }, { status: 503 });
  }
}
