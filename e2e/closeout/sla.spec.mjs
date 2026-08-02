import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test("controlled timestamps create deduplicated SLA warning and breach evidence", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const started = "2026-01-01T09:00:00Z";
  const warning = await rpc(request, employee, "evaluate_sla_runtime", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: "SR-CLOSEOUT-WARN", p_started_at: started, p_now: "2026-01-01T09:55:00Z" });
  expect(warning.event).toBe("warning");
  const breach = await rpc(request, employee, "evaluate_sla_runtime", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: "SR-CLOSEOUT-BREACH", p_started_at: started, p_now: "2026-01-01T10:01:00Z" });
  expect(breach.event).toBe("breached");
  await rpc(request, employee, "evaluate_sla_runtime", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: "SR-CLOSEOUT-BREACH", p_started_at: started, p_now: "2026-01-01T10:02:00Z" });
  const rows = await rest(request, employee, "sla_events?entity_id=in.(SR-CLOSEOUT-WARN,SR-CLOSEOUT-BREACH)&select=entity_id,event_type,idempotency_key");
  expect(rows.filter((row) => row.entity_id === "SR-CLOSEOUT-BREACH")).toHaveLength(1);
  expect(rows.map((row) => row.event_type)).toEqual(expect.arrayContaining(["warning", "breached"]));
  annotations(testInfo, 6);
});

test("cross-tenant SLA evaluation is denied", async ({ request }, testInfo) => {
  const f = fixture();
  const other = await token(request, f.accounts.otherTenant);
  await rpc(request, other, "evaluate_sla_runtime", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: "SR-DENIED", p_started_at: "2026-01-01T09:00:00Z", p_now: "2026-01-01T10:01:00Z" }, 403);
  annotations(testInfo, 1);
});
