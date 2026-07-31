import test from "node:test";
import assert from "node:assert/strict";
import { cleanTenantHostname, resolveTrustedTenantHostname } from "../lib/productExpansion/tenantHostname.ts";

const base = {
  requestUrl: "https://hamza-agency.com/api/product-expansion/invitations",
  forwardedHost: null,
  hostHeader: "hamza-agency.com",
  vercelDeploymentUrl: null,
  canonicalHostname: "hamza-agency.com",
  isVercel: false,
  isProduction: true,
};

test("custom tenant domain remains authoritative over Vercel deployment metadata", () => {
  assert.equal(resolveTrustedTenantHostname({
    ...base,
    requestUrl: "https://tenant-two.example/api/product-expansion/invitations",
    forwardedHost: "tenant-two.example",
    hostHeader: "tenant-two.example",
    vercelDeploymentUrl: "hamza-agency-preview.vercel.app",
    isVercel: true,
  }), "tenant-two.example");
});

test("primary tenant domain resolves to itself", () => {
  assert.equal(resolveTrustedTenantHostname(base), "hamza-agency.com");
});

test("verified Vercel preview may use documented canonical fallback", () => {
  assert.equal(resolveTrustedTenantHostname({
    ...base,
    requestUrl: "https://hamza-agency-preview.vercel.app/api",
    forwardedHost: "hamza-agency-preview.vercel.app",
    hostHeader: "hamza-agency-preview.vercel.app",
    vercelDeploymentUrl: "hamza-agency-preview.vercel.app",
    isVercel: true,
  }), "hamza-agency.com");
});

test("spoofed Vercel header is rejected", () => {
  assert.equal(resolveTrustedTenantHostname({
    ...base,
    requestUrl: "https://spoofed-preview.vercel.app/api",
    forwardedHost: "spoofed-preview.vercel.app",
    hostHeader: "spoofed-preview.vercel.app",
    vercelDeploymentUrl: "different-preview.vercel.app",
    isVercel: true,
  }), "");
});

test("unknown non-preview host is preserved for database lookup and cannot fall back to primary", () => {
  assert.equal(resolveTrustedTenantHostname({
    ...base,
    requestUrl: "https://unknown.example/api",
    forwardedHost: "unknown.example",
    hostHeader: "unknown.example",
  }), "unknown.example");
});

test("hostname normalization rejects malformed injected values", () => {
  assert.equal(cleanTenantHostname("good.example, attacker.example"), "good.example");
  assert.equal(cleanTenantHostname("good.example\nattacker.example"), "");
});
