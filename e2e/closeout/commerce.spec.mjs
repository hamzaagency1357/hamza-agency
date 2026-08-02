import { test, expect } from "@playwright/test";
import { annotations, fixture, rest, rpc, token } from "./real-runtime-helper.mjs";

const run = `${(process.env.CLOSEOUT_EXPECTED_SHA || "local").slice(0, 8)}-${Date.now()}`;
let orderId = "";
let refundId = "";
let disputeId = "";

test.describe.configure({ mode: "serial" });

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

test("staff enforces order lifecycle and client completes review refund and dispute journeys", async ({ request }, testInfo) => {
  const f = fixture();
  const employee = await token(request, f.accounts.employee);
  const client = await token(request, f.accounts.client);
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
  const events = await rest(request, employee, `commerce_events?order_id=eq.${orderId}&select=event_type`);
  expect(events.map((row) => row.event_type)).toContain("order.created");
  expect(events.map((row) => row.event_type)).toContain("order.status_changed");
  annotations(testInfo, 13);
});
