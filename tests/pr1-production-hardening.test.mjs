import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260804090000_pr1_production_hardening_closeout.sql";
const healthPath = "app/api/product-expansion/health/route.ts";
const gatewayPath = "supabase/functions/pr101-vercel-oidc-gateway/index.ts";

async function text(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("OIDC gateway grants remain least privilege", async () => {
  const migration = await text(migrationPath);
  assert.match(migration, /grant execute on function public\.pr101_oidc_gateway\([\s\S]*?\) to service_role;/i);
  assert.match(migration, /revoke all on function public\.pr101_oidc_gateway\([\s\S]*?\) from public,anon,authenticated;/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*?pr101_oidc_gateway[\s\S]*?to (anon|authenticated|public)/i);
});

test("published sections policy does not invoke admin authorization", async () => {
  const migration = await text(migrationPath);
  const policy = migration.match(/alter policy "public reads published visible sections"[\s\S]*?\n  \);/i)?.[0] || "";
  assert.ok(policy);
  assert.match(policy, /is_published=true/i);
  assert.doesNotMatch(policy, /current_user_is_admin|is_active_admin/i);
});

test("health performs a real read-only OIDC database probe", async () => {
  const [health, gateway, migration] = await Promise.all([
    text(healthPath),
    text(gatewayPath),
    text(migrationPath),
  ]);
  assert.match(health, /callPr101OidcGateway[^;]*\(request, "health_probe", \{\}\)/s);
  assert.doesNotMatch(health, /VERCEL_OIDC_TOKEN[^\n]*\? "healthy"/);
  assert.match(gateway, /action === "health_probe" \? "pr101_oidc_health_probe"/);
  assert.match(migration, /create or replace function public\.pr101_oidc_health_probe\(\)/i);
  assert.doesNotMatch(migration, /insert into|update public\.|delete from/i);
});
