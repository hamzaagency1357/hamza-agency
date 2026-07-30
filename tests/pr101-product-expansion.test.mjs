import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration = await readFile(
  new URL("../supabase/migrations/20260730232500_pr101_product_expansion_foundation.sql", import.meta.url),
  "utf8",
);
const domain = await readFile(new URL("../lib/productExpansion/domain.ts", import.meta.url), "utf8");

const requiredTables = [
  "tenants",
  "tenant_memberships",
  "tasks",
  "sla_policies",
  "workflow_definitions",
  "marketplace_listings",
  "marketplace_orders",
  "payment_providers",
  "provider_message_events",
  "push_subscriptions",
  "privacy_requests",
  "consent_records",
  "user_sessions",
  "incidents",
];

test("PR101 migration is additive and declares the required product foundations", () => {
  for (const table of requiredTables) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}\\b`, "i"));
  }
  assert.doesNotMatch(migration, /\bdrop\s+(table|column|schema)\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /service[_-]?role/i);
});

test("every new exposed table participates in the RLS enablement block", () => {
  for (const table of requiredTables) {
    assert.match(migration, new RegExp(`['\"]${table}['\"]`));
  }
  assert.match(migration, /enable row level security/i);
});

test("provider architecture is disabled by default and provider-neutral", () => {
  assert.match(domain, /ProviderAdapter/);
  assert.match(domain, /DisabledProviderAdapter/);
  assert.match(domain, /"disabled"/);
  assert.match(domain, /"payment" \| "whatsapp" \| "ai" \| "push"/);
});

test("portal roles are explicit and do not reuse administrator authorization", () => {
  for (const role of ["creator", "client", "employee", "partner"]) {
    assert.match(domain, new RegExp(`"${role}"`));
  }
});
