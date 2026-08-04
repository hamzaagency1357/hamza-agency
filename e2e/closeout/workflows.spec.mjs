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
  const evidence = await rpc(request, employee, "workflow_runtime_evidence", { p_tenant: f.tenants.a, p_run: first.runId });
  expect(evidence.run).toMatchObject({ status: "completed", current_step: 2, retry_count: 0, last_error_code: null });
  expect(evidence.events.map((event) => event.event_type)).toEqual(expect.arrayContaining(["started", "completed"]));
  expect(Number(evidence.notificationCount)).toBe(1);
  expect(Number(evidence.auditCount)).toBeGreaterThanOrEqual(2);
  annotations(testInfo, 11);
});

test("waiting workflow must resume and records event audit and notifications", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const run = await rpc(request, employee, "start_workflow_runtime", { p_tenant: f.tenants.a, p_workflow: f.macro.workflow, p_idempotency_key: `${key}_resume`, p_context: { source: "resume-test" } });
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: run.runId, p_success: false, p_error_code: "transient" })).toBe("waiting");
  await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: run.runId, p_success: true, p_error_code: null }, 400);
  expect(await rpc(request, employee, "resume_workflow_runtime", { p_tenant: f.tenants.a, p_run: run.runId })).toBe("running");
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: run.runId, p_success: true, p_error_code: null })).toBe("running");
  expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: run.runId, p_success: true, p_error_code: null })).toBe("completed");
  const evidence = await rpc(request, employee, "workflow_runtime_evidence", { p_tenant: f.tenants.a, p_run: run.runId });
  expect(evidence.run).toMatchObject({ status: "completed", retry_count: 1, current_step: 2, last_error_code: null });
  expect(evidence.events.some((event) => event.event_type === "retried" && event.payload?.operation === "resume")).toBe(true);
  expect(evidence.events.map((event) => event.event_type)).toEqual(expect.arrayContaining(["started", "retried", "completed"]));
  expect(Number(evidence.notificationCount)).toBe(2);
  expect(Number(evidence.auditCount)).toBeGreaterThanOrEqual(4);
  const notifications = await rest(request, employee, `notifications?tenant_id=eq.${f.tenants.a}&entity_type=eq.workflow_run&entity_id=eq.${run.runId}&select=event_type,priority&order=created_at.asc`);
  expect(notifications.map((row) => row.event_type)).toEqual(expect.arrayContaining(["resumed", "completed"]));
  annotations(testInfo, 15);
});

test("bounded retries require resume and terminate after the third failure", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const other = await token(request, f.accounts.otherTenant);
  const failed = await rpc(request, employee, "start_workflow_runtime", { p_tenant: f.tenants.a, p_workflow: f.macro.workflow, p_idempotency_key: `${key}_fail`, p_context: {} });
  for (const [attempt, expectedStatus] of [[1, "waiting"], [2, "waiting"], [3, "failed"]]) {
    expect(await rpc(request, employee, "advance_workflow_runtime", { p_tenant: f.tenants.a, p_run: failed.runId, p_success: false, p_error_code: attempt === 3 ? "terminal" : "transient" })).toBe(expectedStatus);
    if (expectedStatus === "waiting") {
      expect(await rpc(request, employee, "resume_workflow_runtime", { p_tenant: f.tenants.a, p_run: failed.runId })).toBe("running");
    }
  }
  const evidence = await rpc(request, employee, "workflow_runtime_evidence", { p_tenant: f.tenants.a, p_run: failed.runId });
  expect(evidence.run).toMatchObject({ status: "failed", retry_count: 3, last_error_code: "terminal" });
  expect(evidence.events.filter((event) => event.event_type === "retried").length).toBeGreaterThanOrEqual(4);
  expect(evidence.events.at(-1)?.event_type).toBe("failed");
  expect(Number(evidence.notificationCount)).toBe(3);
  expect(Number(evidence.auditCount)).toBeGreaterThanOrEqual(5);
  await rpc(request, employee, "resume_workflow_runtime", { p_tenant: f.tenants.a, p_run: failed.runId }, 400);
  await rpc(request, other, "start_workflow_runtime", { p_tenant: f.tenants.a, p_workflow: f.macro.workflow, p_idempotency_key: `${key}_denied`, p_context: {} }, 403);
  await rpc(request, other, "workflow_runtime_evidence", { p_tenant: f.tenants.a, p_run: failed.runId }, 403);
  annotations(testInfo, 17);
});
