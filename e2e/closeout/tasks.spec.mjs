import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test.describe.configure({ mode: "serial" });
let taskId = "";

test("employee creates, edits, transitions, and audits a tenant task", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const created = await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: null, p_action: "create", p_payload: { title: "Closeout task", description: "Real local DB", priority: "high", dueAt: "2030-01-01T10:00:00Z" } });
  taskId = created.taskId;
  expect(taskId).toMatch(/^[0-9a-f-]{36}$/i);
  await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "update", p_payload: { title: "Closeout task updated", priority: "urgent" } });
  await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "status", p_payload: { status: "in_progress" } });
  await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "status", p_payload: { status: "resolved" } });
  await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "status", p_payload: { status: "closed" } });
  const rows = await rest(request, employee, `tasks?id=eq.${taskId}&select=id,title,status,priority,completed_at`);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ title: "Closeout task updated", status: "closed", priority: "urgent" });
  expect(rows[0].completed_at).toBeTruthy();
  const history = await rest(request, employee, `task_status_history?task_id=eq.${taskId}&select=from_status,to_status&order=changed_at.asc`);
  expect(history.map((row) => row.to_status)).toEqual(expect.arrayContaining(["open", "in_progress", "resolved", "closed"]));
  const evidence = await rpc(request, employee, "task_runtime_evidence", { p_tenant: f.tenants.a, p_task: taskId });
  expect(Number(evidence.historyCount)).toBeGreaterThanOrEqual(4);
  expect(Number(evidence.auditCount)).toBeGreaterThanOrEqual(5);
  annotations(testInfo, 13);
});

test("client and other tenant cannot mutate staff task", async ({ request }, testInfo) => {
  const f = fixture();
  const client = await token(request, f.accounts.client);
  const other = await token(request, f.accounts.otherTenant);
  await rpc(request, client, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "update", p_payload: { title: "forbidden" } }, [400, 403]);
  await rpc(request, other, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "update", p_payload: { title: "cross tenant" } }, [400, 403]);
  annotations(testInfo, 2);
});
