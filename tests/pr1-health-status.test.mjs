import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  classifyOidcFailure,
  computeOverallHealth,
  passiveProviderStatus,
} from "../lib/server/productExpansionHealthStatus.mjs";

test("health exposes all required aggregate states", () => {
  assert.equal(computeOverallHealth("healthy", "healthy"), "healthy");
  assert.equal(computeOverallHealth("degraded", "healthy"), "degraded");
  assert.equal(computeOverallHealth("healthy", "disabled"), "degraded");
  assert.equal(computeOverallHealth("unavailable", "healthy"), "unavailable");
});

test("OIDC failures retain safe and precise severity", () => {
  assert.equal(classifyOidcFailure("unconfigured"), "disabled");
  assert.equal(classifyOidcFailure("timeout"), "degraded");
  assert.equal(classifyOidcFailure("database_permission_rejected"), "degraded");
  assert.equal(classifyOidcFailure("database_unavailable"), "unavailable");
  assert.equal(classifyOidcFailure("unauthorized"), "unavailable");
});

test("passive providers never claim healthy from configuration", () => {
  assert.equal(passiveProviderStatus("live", "unverified"), "configured");
  assert.equal(passiveProviderStatus("sandbox", "unverified"), "configured");
  assert.equal(passiveProviderStatus(undefined, "unverified"), "unverified");
  assert.notEqual(passiveProviderStatus("live", "unverified"), "healthy");
});

test("database health uses a real read-only Data API endpoint", () => {
  const route = fs.readFileSync("app/api/product-expansion/health/route.ts", "utf8");

  assert.doesNotMatch(route, /fetch\(`\$\{url\}\/rest\/v1\/`,\s*\{[\s\S]*?method:\s*"HEAD"/);
  assert.match(route, /\/rest\/v1\/marketplace_categories\?select=id&limit=1/);
  assert.match(route, /method:\s*"GET"/);
  assert.match(route, /reason:\s*"data_api_ok"/);
  assert.match(route, /reason:\s*"data_api_auth_rejected"/);
  assert.match(route, /reason:\s*"data_api_route_rejected"/);
  assert.match(route, /reason:\s*"data_api_unavailable"/);
  assert.doesNotMatch(route, /reason:\s*[^\n]*(?:NEXT_PUBLIC_SUPABASE|Bearer|apikey)/);
});
