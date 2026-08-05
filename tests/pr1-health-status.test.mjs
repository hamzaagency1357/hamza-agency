import assert from "node:assert/strict";
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
