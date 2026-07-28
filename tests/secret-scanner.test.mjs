import test from "node:test";
import assert from "node:assert/strict";
import { isCommittedRuntimeEnvFile, scanText } from "../scripts/secret-scan-core.mjs";

test("env templates are allowed and runtime env files fail", () => {
  for (const file of [".env.example", ".env.template", ".env.sample"]) assert.equal(isCommittedRuntimeEnvFile(file), false, file);
  for (const file of [".env", ".env.local", ".env.production", ".env.preview", "apps/web/.env.development"]) assert.equal(isCommittedRuntimeEnvFile(file), true, file);
});

test("names in workflows scripts tests and documentation are allowed", () => {
  const samples = [
    [".github/workflows/check.yml", "SUPABASE_SERVICE_ROLE: ${{ secrets.SUPABASE_SERVICE_ROLE }}"],
    ["scripts/check.mjs", "const name = 'SUPABASE_SERVICE_ROLE';"],
    ["tests/check.test.mjs", "assert.match(source, /SUPABASE_SERVICE_ROLE/);"],
    ["docs/security.md", "Never expose SUPABASE_SERVICE_ROLE through NEXT_PUBLIC variables."],
  ];
  for (const [file, text] of samples) assert.deepEqual(scanText(file, text), [], file);
});

test("JWT-shaped values and concrete service role assignments fail", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.c2lnbmF0dXJlX3BheWxvYWRfZm9yX3Rlc3Q";
  assert.ok(scanText("config.ts", `const token = '${jwt}'`).some((error) => error.includes("JWT-like")));
  assert.ok(scanText("config.yml", "SUPABASE_SERVICE_ROLE=super-secret-production-value").some((error) => error.includes("service-role")));
});

test("client exposure and privileged NEXT_PUBLIC names fail", () => {
  assert.ok(scanText("app/client.tsx", "const x = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE").length > 0);
  assert.ok(scanText("app/client.tsx", `'use client';\nimport { admin } from '@/lib/supabase-admin';`).length > 0);
});
