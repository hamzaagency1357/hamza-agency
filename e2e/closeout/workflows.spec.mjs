import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

const key = `workflow_${(process.env.CLOSEOUT_EXPECTED_SHA || "local").slice(0, 8)}_${Date.now()}`;

test("published workflow runs idempotently and completes ordered steps", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const first = await rpc(request, employee, "start_workflow_runtime", { p_tenant: f.tenants.a, p_workflow: f.macro.workflow, p_idempotency_key: key, p_context: { source: "closeout" } });
  const duplicate = await rpc(request, employee, "start_workflow_runtime", { p_tenant: f.tenants.a, p_workflow: f.macro.workflow, p_idempotency_key: key, p_context: { source: "duplicate" } });
  expect(first.duplicate).toBe(false);
  expect(duplicate.duplicate).toBe(true);
  expect(duplicate.runId).toBe(first.runId);
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: first.runId, p_success: true, p_error_code: null })).toBe("running");
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: first.runId, p_success: true, p_error_code: null })).toBe("completed");
  const rows = await rest(request, employee, `workflow_runs?id=eq.${first.runId}&select=status,current_step,retry_count,last_error_code`);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ status: "completed", current_step: 2, retry_count: 0, last_error_code: null });
  annotations(testInfo, 9);
});

test("bounded retries end in failure and cross-tenant execution is denied", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const other = await token(request, f.accounts.otherTenant);
  const failed = await rpc(request, employee, "start_workflow_runtime", { p_tenant: f.tenants.a, p_workflow: f.macro.workflow, p_idempotency_key: `${key}_fail`, p_context: {} });
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: failed.runId, p_success: false, p_error_code: "transient" })).toBe("waiting");
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: failed.runId, p_success: false, p_error_code: "transient" })).toBe("waiting");
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: failed.runId, p_success: false, p_error_code: "terminal" })).toBe("failed");
  const rows = await rest(request, employee, `workflow_runs?id=eq.${failed.runId}&select=status,retry_count,last_error_code`);
  expect(rows[0]).toMatchObject({ status: "failed", retry_count: 3, last_error_code: "terminal" });
  await rpc(request, other, "start_workflow_runtime", { p_tenant: f.tenants.a, p_workflow: f.macro.workflow, p_idempotency_key: `${key}_denied`, p_context: {} }, 403);
  annotations(testInfo, 7);
});
