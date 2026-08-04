import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

test.describe.configure({ mode: "serial" });
const businessEntity = `SR-BUSINESS-${(process.env.CLOSEOUT_EXPECTED_SHA || "local").slice(0, 8)}`;

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

test("business hours pause resume warning breach escalation notifications and KPIs persist", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const started = await rpc(request, employee, "manage_sla_runtime_state", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: businessEntity, p_action: "start", p_at: "2026-01-05T06:00:00Z" });
  expect(started.status).toBe("active");
  const active = await rpc(request, employee, "evaluate_sla_business_runtime", { p_tenant: f.tenants.a, p_entity_type: "service_request", p_entity_id: businessEntity, p_now: "2026-01-05T06:30:00Z" });
  expect(active).toMatchObject({ event: "active", businessMinutes: 30 });
  const paused = await rpc(request, employee, "manage_sla_runtime_state", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: businessEntity, p_action: "pause", p_at: "2026-01-05T06:30:00Z" });
  expect(paused.status).toBe("paused");
  const pausedEvaluation = await rpc(request, employee, "evaluate_sla_business_runtime", { p_tenant: f.tenants.a, p_entity_type: "service_request", p_entity_id: businessEntity, p_now: "2026-01-05T07:30:00Z" });
  expect(pausedEvaluation).toMatchObject({ event: "paused", businessMinutes: 30 });
  const resumed = await rpc(request, employee, "manage_sla_runtime_state", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: businessEntity, p_action: "resume", p_at: "2026-01-05T07:30:00Z" });
  expect(resumed.status).toBe("active");
  expect(Number(resumed.paused_seconds)).toBe(3600);
  const warning = await rpc(request, employee, "evaluate_sla_business_runtime", { p_tenant: f.tenants.a, p_entity_type: "service_request", p_entity_id: businessEntity, p_now: "2026-01-05T07:48:00Z" });
  expect(warning).toMatchObject({ event: "warning", businessMinutes: 48 });
  const breached = await rpc(request, employee, "evaluate_sla_business_runtime", { p_tenant: f.tenants.a, p_entity_type: "service_request", p_entity_id: businessEntity, p_now: "2026-01-05T08:01:00Z" });
  expect(breached).toMatchObject({ event: "breached", businessMinutes: 61 });
  const escalated = await rpc(request, employee, "manage_sla_runtime_state", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: businessEntity, p_action: "escalate", p_at: "2026-01-05T08:02:00Z" });
  expect(escalated.status).toBe("breached");
  expect(Number(escalated.escalation_count)).toBe(1);
  const breachedKpis = await rpc(request, employee, "sla_runtime_kpis", { p_tenant: f.tenants.a });
  expect(Number(breachedKpis.total)).toBe(1);
  expect(Number(breachedKpis.breached)).toBe(1);
  expect(Number(breachedKpis.escalations)).toBe(1);
  const resolved = await rpc(request, employee, "manage_sla_runtime_state", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: businessEntity, p_action: "resolve", p_at: "2026-01-05T08:05:00Z" });
  expect(resolved.status).toBe("resolved");
  const resolvedKpis = await rpc(request, employee, "sla_runtime_kpis", { p_tenant: f.tenants.a });
  expect(Number(resolvedKpis.resolved)).toBe(1);
  expect(Number(resolvedKpis.breached)).toBe(0);
  expect(Number(resolvedKpis.escalations)).toBe(1);
  const events = await rest(request, employee, `sla_events?entity_id=eq.${businessEntity}&select=event_type,idempotency_key&order=created_at.asc`);
  expect(events.map((row) => row.event_type)).toEqual(["warning", "breached"]);
  const notifications = await rest(request, employee, `notifications?tenant_id=eq.${f.tenants.a}&entity_type=eq.service_request&entity_id=eq.${businessEntity}&select=event_type,priority&order=created_at.asc`);
  expect(notifications.map((row) => row.event_type)).toEqual(expect.arrayContaining(["warning", "breached", "escalated"]));
  expect(notifications.find((row) => row.event_type === "breached")?.priority).toBe("critical");
  annotations(testInfo, 25);
});

test("cross-tenant SLA evaluation state and KPI access are denied", async ({ request }, testInfo) => {
  const f = fixture();
  const other = await token(request, f.accounts.otherTenant);
  await rpc(request, other, "evaluate_sla_runtime", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: "SR-DENIED", p_started_at: "2026-01-01T09:00:00Z", p_now: "2026-01-01T10:01:00Z" }, 403);
  await rpc(request, other, "manage_sla_runtime_state", { p_tenant: f.tenants.a, p_policy: f.macro.sla, p_entity_type: "service_request", p_entity_id: "SR-DENIED-STATE", p_action: "start", p_at: "2026-01-05T06:00:00Z" }, 403);
  await rpc(request, other, "sla_runtime_kpis", { p_tenant: f.tenants.a }, 403);
  annotations(testInfo, 3);
});
