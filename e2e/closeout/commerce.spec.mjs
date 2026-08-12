import { test, expect } from "@playwright/test";
import { adminAction, annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

const run = `${(process.env.CLOSEOUT_EXPECTED_SHA || "local").slice(0, 8)}-${Date.now()}`;
let orderId = "";
let refundId = "";
let disputeId = "";

test.describe.configure({ mode: "serial" });

test("PR116 generated entity gateway proves INSERT, UPDATE, UPSERT, DELETE, filters, representation, and Browser denial", async ({ request }, testInfo) => {
  const f = fixture();
  const admin = await token(request, f.accounts.employee);
  const client = await token(request, f.accounts.client);
  const suffix = `${Date.now()}-${testInfo.project.name}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  const direct = await request.post(`${f.apiUrl}/rest/v1/jobs`, {
    headers: {
      apikey: process.env.ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${admin}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    data: { title: `Blocked ${suffix}`, slug: `blocked-${suffix}` },
  });
  expect([401, 403], await direct.text()).toContain(direct.status());

  const forbidden = await request.post("/api/admin/mutations/entities", {
    headers: { Authorization: `Bearer ${client}`, "Content-Type": "application/json" },
    data: {
      action: "pr116_jobs_page_entity_jobs_insert",
      payload: { values: { title: `Forbidden ${suffix}`, slug: `forbidden-${suffix}` } },
    },
  });
  expect(forbidden.status()).toBe(403);

  const jobs = await adminAction(request, admin, "pr116_jobs_page_entity_jobs_insert", {
    values: { title: `Gateway ${suffix}`, slug: `gateway-${suffix}`, status: "open", is_visible: false },
  });
  expect(Array.isArray(jobs)).toBeTruthy();
  expect(jobs.length).toBe(1);
  const jobId = jobs[0].id;
  expect(jobId).toBeTruthy();

  const updatedJobs = await adminAction(request, admin, "pr116_jobs_page_entity_jobs_update", {
    values: { status: "closed", is_visible: false },
    filters: [{ field: "id", op: "eq", value: jobId }],
  });
  expect(Array.isArray(updatedJobs)).toBeTruthy();
  expect(updatedJobs[0]?.id).toBe(jobId);

  const sourceId = `pr116-${suffix}`;
  const upsert = await adminAction(request, admin, "pr116_admin_cms_translation_upsert", {
    values: {
      source_type: "pr116_gateway_qa",
      source_id: sourceId,
      field_name: "title",
      language: "en",
      translated_value: "PR116 local isolated gateway proof",
      status: "approved",
      reviewed: true,
      is_published: false,
    },
    options: { onConflict: "source_type,source_id,field_name,language", ignoreDuplicates: false },
  });
  expect(Array.isArray(upsert)).toBeTruthy();
  expect(upsert.length).toBe(1);

  const incident = await adminAction(request, admin, "pr116_component_productoperationsconsole_entity_incidents_insert", {
    values: {
      tenant_id: f.tenants.a,
      title: `PR116 ${suffix}`,
      severity: "low",
      status: "investigating",
    },
    select: "id",
    returnMode: "single",
  });
  expect(incident?.id).toBeTruthy();

  const incidentUpdate = await adminAction(request, admin, "pr116_component_productoperationsconsole_entity_incidents_update", {
    values: { status: "resolved", resolved_at: new Date().toISOString() },
    filters: [
      { field: "id", op: "eq", value: incident.id },
      { field: "tenant_id", op: "eq", value: f.tenants.a },
    ],
  });
  expect(Array.isArray(incidentUpdate)).toBeTruthy();

  const media = await adminAction(request, admin, "pr116_media_cinematic_page_entity_media_insert", {
    values: {
      name: `PR116 ${suffix}`,
      file_url: `https://example.invalid/${suffix}.png`,
      file_type: "image",
      is_active: false,
    },
  });
  expect(Array.isArray(media)).toBeTruthy();
  expect(media[0]?.id).toBeTruthy();

  const deleted = await adminAction(request, admin, "pr116_media_cinematic_page_entity_media_delete", {
    filters: [{ field: "id", op: "eq", value: media[0].id }],
  });
  expect(Array.isArray(deleted)).toBeTruthy();
  expect(deleted[0]?.id).toBe(media[0].id);

  annotations(testInfo, 24);
});

test("client favorites, carts, checks out idempotently, and cannot cross tenants", async ({ request }, testInfo) => {
  const f = fixture();
  const client = await token(request, f.accounts.client);
  expect(await rpc(request, client, "toggle_marketplace_favorite", { p_tenant: f.tenants.a, p_listing: f.macro.listing, p_favorite: true })).toBe(true);
  const cart = await rpc(request, client, "upsert_marketplace_cart_item", { p_tenant: f.tenants.a, p_listing: f.macro.listing, p_quantity: 2 });
  expect(Number(cart.total)).toBe(251);
  const first = await rpc(request, client, "checkout_marketplace_cart", { p_tenant: f.tenants.a, p_idempotency_key: `checkout_${run}` });
  const duplicate = await rpc(request, client, "checkout_marketplace_cart", { p_tenant: f.tenants.a, p_idempotency_key: `checkout_${run}` });
  orderId = first.orderId;
  expect(first.duplicate).toBe(false);
  expect(duplicate.duplicate).toBe(true);
  expect(duplicate.orderId).toBe(orderId);
  await rpc(request, client, "upsert_marketplace_cart_item", { p_tenant: f.tenants.b, p_listing: f.macro.otherListing, p_quantity: 1 }, [400, 403]);
  const orders = await rest(request, client, `marketplace_orders?id=eq.${orderId}&select=id,status,total,client_user_id`);
  expect(orders).toHaveLength(1);
  expect(Number(orders[0].total)).toBe(251);
  annotations(testInfo, 10);
});

test("staff and the related partner see only safe same-tenant order events", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const partner = await token(request, f.accounts.partner);
  const client = await token(request, f.accounts.client);
  const otherTenant = await token(request, f.accounts.otherTenant);

  await rpc(request, employee, "transition_marketplace_order", { p_tenant: f.tenants.a, p_order: orderId, p_status: "confirmed" });
  await rpc(request, employee, "transition_marketplace_order", { p_tenant: f.tenants.a, p_order: orderId, p_status: "in_progress" });
  await rpc(request, employee, "transition_marketplace_order", { p_tenant: f.tenants.a, p_order: orderId, p_status: "fulfilled" });
  await rpc(request, employee, "transition_marketplace_order", { p_tenant: f.tenants.a, p_order: orderId, p_status: "confirmed" }, [400, 403]);
  const reviewId = await rpc(request, client, "create_marketplace_review", { p_tenant: f.tenants.a, p_order: orderId, p_listing: f.macro.listing, p_rating: 5, p_body: "Verified local journey" });
  expect(reviewId).toMatch(/^[0-9a-f-]{36}$/i);
  await rpc(request, client, "create_marketplace_review", { p_tenant: f.tenants.a, p_order: orderId, p_listing: f.macro.listing, p_rating: 4, p_body: "duplicate" }, [400, 409]);
  refundId = await rpc(request, client, "request_marketplace_refund", { p_tenant: f.tenants.a, p_order: orderId, p_amount: 50, p_reason: "Offline manual review" });
  expect(await rpc(request, employee, "review_marketplace_refund", { p_tenant: f.tenants.a, p_refund: refundId, p_decision: "approved", p_note: "Approved without provider call" })).toBe("approved");
  disputeId = await rpc(request, client, "open_marketplace_dispute", { p_tenant: f.tenants.a, p_order: orderId, p_reason: "Need operational review" });
  const messageId = await rpc(request, client, "add_marketplace_dispute_message", { p_tenant: f.tenants.a, p_dispute: disputeId, p_body: "Client evidence" });
  expect(messageId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(await rpc(request, employee, "resolve_marketplace_dispute", { p_tenant: f.tenants.a, p_dispute: disputeId, p_status: "resolved", p_resolution: "Resolved manually" })).toBe("resolved");

  const employeeEvents = await rpc(request, employee, "pr105_list_commerce_events", { p_tenant: f.tenants.a, p_order: orderId });
  expect(employeeEvents.map((row) => row.eventType)).toContain("order.created");
  expect(employeeEvents.map((row) => row.eventType)).toContain("order.status_changed");
  const partnerEvents = await rpc(request, partner, "pr105_list_commerce_events", { p_tenant: f.tenants.a, p_order: orderId });
  expect(partnerEvents).toEqual(employeeEvents);

  await rpc(request, client, "pr105_list_commerce_events", { p_tenant: f.tenants.a, p_order: orderId }, [400, 403]);
  await rpc(request, otherTenant, "pr105_list_commerce_events", { p_tenant: f.tenants.a, p_order: orderId }, [400, 403]);
  await rest(request, employee, `commerce_events?order_id=eq.${orderId}&select=event_type`, [401, 403]);
  annotations(testInfo, 20);
});
