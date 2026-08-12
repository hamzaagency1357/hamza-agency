import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const ROOT = process.cwd();
const DISPATCH = path.join(ROOT, "supabase/functions/pr116-admin-oidc-gateway/generated-dispatch-base.ts");
const MIGRATION = path.join(ROOT, "supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql");

function deriveGeneratedContract(source) {
  const out = new Map();
  const actionRe = /^\s{2}"([^"]+)": \{\n([\s\S]*?)(?=^\s{2}"[^"]+": \{|\n\} as const;)/gm;
  for (const match of source.matchAll(actionRe)) {
    const action = match[1];
    const body = match[2];
    if (!/"kind": "entity"/.test(body)) continue;
    const table = body.match(/"table": "([^"]+)"/)?.[1];
    const method = body.match(/"method": "(insert|update|upsert|delete)"/)?.[1];
    assert(table && method, `Malformed generated entity contract: ${action}`);
    if (table === "tenant_admin_audit") continue;
    const methods = out.get(table) ?? new Set();
    methods.add(method);
    out.set(table, methods);
  }
  return out;
}

function deriveMigrationContract(sql) {
  const start = "-- PR116 GENERATED ENTITY PRIVILEGE CONTRACT BEGIN";
  const end = "-- PR116 GENERATED ENTITY PRIVILEGE CONTRACT END";
  const block = sql.slice(sql.indexOf(start), sql.indexOf(end));
  assert(block.includes(start), "Migration privilege contract start marker missing");
  const out = new Map();
  for (const match of block.matchAll(/\('([^']+)',\s*array\[([^\]]+)\]::text\[\]\)/g)) {
    const methods = [...match[2].matchAll(/'(insert|update|upsert|delete)'/g)].map((m) => m[1]);
    out.set(match[1], new Set(methods));
  }
  return out;
}

function normalized(map) {
  return Object.fromEntries([...map.entries()].sort(([a],[b]) => a.localeCompare(b))
    .map(([table, methods]) => [table, [...methods].sort()]));
}

const generatedSource = fs.readFileSync(DISPATCH, "utf8");
const migrationSql = fs.readFileSync(MIGRATION, "utf8");
const generated = deriveGeneratedContract(generatedSource);
const migration = deriveMigrationContract(migrationSql);

assert.equal(generated.size, 38, `Expected 38 runtime-reachable generated entity tables, got ${generated.size}`);
assert.equal(migration.size, generated.size, "Migration privilege table count drifted from generated dispatcher");
assert.deepEqual(normalized(migration), normalized(generated), "Migration #3 privilege contract drifted from generated dispatcher");
assert(!migration.has("tenant_admin_audit"), "Explicitly unreachable tenant_admin_audit must not receive gateway privileges");

for (const required of [
  "grant select on table public.%I to service_role",
  "pg_get_serial_sequence",
  "grant usage on sequence %s to service_role",
  "pr116_authenticated_dml_still_exposed",
  "pr116_service_role_select_missing",
  "pr116_service_role_insert_contract_mismatch",
  "pr116_service_role_update_contract_mismatch",
  "pr116_service_role_delete_contract_mismatch",
  "pr116_service_role_sequence_usage_missing",
]) assert(migrationSql.toLowerCase().includes(required.toLowerCase()), `Migration #3 is missing required fail-closed contract fragment: ${required}`);

assert(!/\bgrant\s+all\b/i.test(migrationSql), "Migration #3 must not use GRANT ALL");
console.log(`PR116 admin entity privilege contract PASS (${generated.size} tables)`);
for (const [table, methods] of Object.entries(normalized(generated))) {
  console.log(`${table}: SELECT + ${methods.join("/")}`);
}
