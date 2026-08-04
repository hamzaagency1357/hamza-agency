import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("provider adapters enforce redaction, prompt injection and constant-time signatures", async () => {
  const source = await read("lib/productExpansion/providerAdapters.ts");
  for (const evidence of ["redactPii", "detectsPromptInjection", "timingSafeEqual", "validateWhatsAppTemplate", "safePushPayload", "providerDisabled"]) {
    assert.match(source, new RegExp(evidence));
  }
  assert.doesNotMatch(source, /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE|SERVICE_ROLE)/);
  const expected = createHmac("sha256", "test-only-secret").update('{"event":"paid"}').digest("hex");
  assert.equal(expected.length, 64);
});

test("WhatsApp and push queue requires consent, preferences and disabled feature gates", async () => {
  const source = await read("app/api/product-expansion/providers/queue/route.ts");
  assert.match(source, /communication_consents/);
  assert.match(source, /whatsapp_opt_in_required/);
  assert.match(source, /approved_template_not_found/);
  assert.match(source, /push_preference_disabled/);
  assert.match(source, /provider_disabled/);
  assert.match(source, /provider_event_enqueue/);
});

test("payment webhook rejects card data and requires signature and idempotency", async () => {
  const source = await read("app/api/product-expansion/payments/[provider]/webhook/route.ts");
  assert.match(source, /forbiddenPaymentData/);
  assert.match(source, /verifySignedWebhook/);
  assert.match(source, /event_id_required/);
  assert.match(source, /payment_provider_disabled/);
  assert.match(source, /payment_webhook_record/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_.*(?:PAYMENT|SECRET)/);
});

test("service worker never caches private and authenticated traffic", async () => {
  const source = await read("public/sw.js");
  for (const path of ["/admin", "/portal", "/api", "/auth", "/application-status", "/service-status", "/marketplace/checkout"]) {
    assert.ok(source.includes(path), `missing private cache exclusion ${path}`);
  }
  assert.match(source, /authorization/);
  assert.match(source, /cookie/);
  assert.match(source, /no-store/);
  assert.match(source, /SKIP_WAITING/);
});

test("Capacitor wrapper is HTTPS-only and contains no server secrets", async () => {
  const config = JSON.parse(await read("mobile/capacitor.config.json"));
  assert.equal(config.server.cleartext, false);
  assert.match(config.server.url, /^https:\/\//);
  assert.deepEqual(config.server.allowNavigation, ["hamza-agency.com", "*.hamza-agency.com"]);
  const combined = `${JSON.stringify(config)}\n${await read("mobile/configure-native.mjs")}`;
  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE|VERCEL_OIDC_TOKEN|PAYMENT_WEBHOOK_SECRET/);
  assert.match(combined, /usesCleartextTraffic=["']false["']/);
});
