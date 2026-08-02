import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test.describe.configure({ mode: "serial" });
let taskId = "";

test("employee completes the real task lifecycle", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const created = await rpc(request, employee, "manage_task_runtime", {
    p_tenant: f.tenants.a,
    p_task: null,
    p_action: "create",
    p_payload: { title: "Closeout task", description: "Real local DB", priority: "high", dueAt: "2030-01-01T10:00:00Z" },
  });
  taskId = created.taskId;
  expect(taskId).toMatch(/^[0-9a-f-]{36}$/i);
  await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "update", p_payload: { title: "Closeout task updated", priority: "urgent" } });
  for (const status of ["in_progress", "resolved", "closed"]) {
    await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: taskId, p_action: "status", p_payload: { status } });
  }
  const rows = await rest(request, employee, `tasks?id=eq.${taskId}&select=id,title,status,priority,completed_at`);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ title: "Closeout task updated", status: "closed", priority: "urgent" });
  expect(rows[0].completed_at).toBeTruthy();
  const history = await rest(request, employee, `task_status_history?task_id=eq.${taskId}&select=from_status,to_status&order=changed_at.asc`);
  expect(history.map((row) => row.to_status)).toEqual(expect.arrayContaining(["open", "in_progress", "resolved", "closed"]));
  const evidence = await rpc(request, employee, "task_runtime_evidence", { p_tenant: f.tenants.a, p_task: taskId });
  expect(Number(evidence.historyCount)).toBeGreaterThanOrEqual(4);
  expect(Number(evidence.auditCount)).toBeGreaterThanOrEqual(5);
  annotations(testInfo, 12);
});

test("assignees watchers comments and attachment metadata persist", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  await rpc(request, employee, "manage_task_collaboration", { p_tenant: f.tenants.a, p_task: taskId, p_action: "assign", p_payload: { userId: f.accounts.employee.id } });
  await rpc(request, employee, "manage_task_collaboration", { p_tenant: f.tenants.a, p_task: taskId, p_action: "watch", p_payload: { userId: f.accounts.partner.id } });
  await rpc(request, employee, "manage_task_collaboration", { p_tenant: f.tenants.a, p_task: taskId, p_action: "comment", p_payload: { body: "Real operational comment", internal: true } });
  await rpc(request, employee, "manage_task_collaboration", { p_tenant: f.tenants.a, p_task: taskId, p_action: "attachment", p_payload: { fileName: "closeout.pdf", mimeType: "application/pdf", sizeBytes: 4096 } });

  const assignments = await rest(request, employee, `task_assignments?task_id=eq.${taskId}&select=user_id,assignment_type&order=assignment_type.asc`);
  expect(assignments).toEqual(expect.arrayContaining([
    expect.objectContaining({ user_id: f.accounts.employee.id, assignment_type: "assignee" }),
    expect.objectContaining({ user_id: f.accounts.partner.id, assignment_type: "watcher" }),
  ]));
  const comments = await rest(request, employee, `task_comments?task_id=eq.${taskId}&select=body,is_internal,author_id`);
  expect(comments).toHaveLength(1);
  expect(comments[0]).toMatchObject({ body: "Real operational comment", is_internal: true, author_id: f.accounts.employee.id });
  const attachments = await rest(request, employee, `task_attachments?task_id=eq.${taskId}&select=file_name,mime_type,size_bytes,uploaded_by`);
  expect(attachments).toHaveLength(1);
  expect(attachments[0]).toMatchObject({ file_name: "closeout.pdf", mime_type: "application/pdf", uploaded_by: f.accounts.employee.id });
  expect(Number(attachments[0].size_bytes)).toBe(4096);
  await rpc(request, employee, "manage_task_collaboration", { p_tenant: f.tenants.a, p_task: taskId, p_action: "attachment", p_payload: { fileName: "too-large.bin", mimeType: "application/octet-stream", sizeBytes: 10485761 } }, 400);
  annotations(testInfo, 13);
});

test("task pagination is stable and non-overlapping", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  for (let index = 1; index <= 3; index += 1) {
    await rpc(request, employee, "manage_task_runtime", { p_tenant: f.tenants.a, p_task: null, p_action: "create", p_payload: { title: `Pagination task ${index}`, priority: "normal" } });
  }
  const first = await rest(request, employee, `tasks?tenant_id=eq.${f.tenants.a}&select=id,title&order=created_at.asc,id.asc&limit=2&offset=0`);
  const second = await rest(request, employee, `tasks?tenant_id=eq.${f.tenants.a}&select=id,title&order=created_at.asc,id.asc&limit=2&offset=2`);
  expect(first).toHaveLength(2);
  expect(second.length).toBeGreaterThanOrEqual(1);
  const firstIds = new Set(first.map((row) => row.id));
  expect(second.some((row) => firstIds.has(row.id))).toBe(false);
  annotations(testInfo, 4);
});

test("client and another tenant are denied staff collaboration", async ({ request }, testInfo) => {
  const f = fixture();
  const client = await token(request, f.accounts.client);
  const other = await token(request, f.accounts.otherTenant);
  await rpc(request, client, "manage_task_collaboration", { p_tenant: f.tenants.a, p_task: taskId, p_action: "comment", p_payload: { body: "forbidden" } }, [400, 403]);
  await rpc(request, other, "manage_task_collaboration", { p_tenant: f.tenants.a, p_task: taskId, p_action: "assign", p_payload: { userId: f.accounts.otherTenant.id } }, [400, 403]);
  annotations(testInfo, 2);
});
