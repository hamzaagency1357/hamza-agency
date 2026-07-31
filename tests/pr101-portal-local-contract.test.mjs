import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationDir = "supabase/migrations";
const baselinePath = "supabase/portal-closeout-contract/baseline.sql";
const baseline = fs.readFileSync(baselinePath, "utf8").toLowerCase();
const migrations = fs.readdirSync(migrationDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => fs.readFileSync(path.join(migrationDir, name), "utf8"))
  .join("\n")
  .toLowerCase();

function compact(value) {
  return value.replace(/--.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\s+/g, " ");
}
const real = compact(migrations);
const local = compact(baseline);

function requireBoth(label, pattern) {
  assert.match(real, pattern, `${label} missing from real migrations`);
  assert.match(local, pattern, `${label} missing from bounded local contract`);
}

test("bounded portal tables and critical columns match real migration contracts", () => {
  for (const table of [
    "tenants", "tenant_domains", "tenant_memberships", "portal_profiles",
    "privacy_requests", "portal_notification_preferences", "communication_consents",
    "user_sessions", "security_alerts",
  ]) requireBoth(`table ${table}`, new RegExp(`create table(?: if not exists)? public\\.${table}\\b`));

  for (const [label, pattern] of [
    ["membership tenant", /tenant_id uuid not null/],
    ["membership user", /user_id uuid not null/],
    ["membership role", /role text not null/],
    ["membership status", /status text not null/],
    ["membership permissions", /permissions jsonb not null/],
    ["membership MFA", /mfa_required boolean not null/],
    ["profile locale", /locale text not null/],
    ["profile status", /status text not null/],
    ["session auth binding", /auth_session_id uuid not null/],
    ["session revocation", /revoked_at timestamptz/],
    ["privacy ownership", /privacy_requests[\s\S]{0,800}user_id uuid not null/],
  ]) requireBoth(label, pattern);
});

test("bounded membership, account and uniqueness states cannot drift", () => {
  for (const value of ["creator", "client", "employee", "partner", "tenant_admin", "super_admin"])
    requireBoth(`role ${value}`, new RegExp(`'${value}'`));
  for (const value of ["invited", "active", "suspended", "revoked"])
    requireBoth(`membership status ${value}`, new RegExp(`'${value}'`));

  assert.match(real, /unique\s*\(\s*tenant_id\s*,\s*user_id\s*\)|unique index[^;]*tenant_id[^;]*user_id/);
  assert.match(local, /unique\s*\(\s*tenant_id\s*,\s*user_id\s*\)/);
  assert.match(real, /unique\s*\(\s*tenant_id\s*,\s*user_id\s*,\s*auth_session_id\s*\)|unique index[^;]*auth_session_id/);
  assert.match(local, /unique\s*\(\s*tenant_id\s*,\s*user_id\s*,\s*auth_session_id\s*\)/);

  const authorization = fs.readFileSync("lib/server/tenantAuthorization.ts", "utf8");
  for (const status of ["suspended", "pending_deletion"]) {
    assert.match(authorization, new RegExp(`profile\\?\\.status === ["']${status}["']`));
    assert.match(real, new RegExp(`'${status}'`), `account status ${status} missing from real migrations`);
    assert.match(local, new RegExp(`'${status}'`), `account status ${status} missing from local contract`);
  }
});

test("bounded RPC signatures and security properties match real migrations", () => {
  const contracts = [
    ["resolve_public_tenant_runtime", ["p_hostname text"], "returns table"],
    ["register_platform_session", ["p_tenant uuid", "p_auth_session uuid", "p_device_label text", "p_platform text", "p_browser text", "p_ip_hash text", "p_suspicious boolean"], "returns uuid"],
    ["revoke_own_platform_session", ["p_session uuid", "p_reason text"], "returns boolean"],
    ["revoke_all_own_platform_sessions", ["p_tenant uuid", "p_reason text"], "returns integer"],
  ];
  for (const [name, args, returns] of contracts) {
    requireBoth(`RPC ${name}`, new RegExp(`function public\\.${name}\\s*\\(`));
    for (const arg of args) requireBoth(`${name} ${arg}`, new RegExp(arg.replace(" ", "\\s+")));
    requireBoth(`${name} ${returns}`, new RegExp(returns.replace(" ", "\\s+")));
  }
  for (const source of [real, local]) {
    for (const name of contracts.map(([name]) => name)) {
      const start = source.indexOf(`function public.${name}`);
      assert.notEqual(start, -1);
      const body = source.slice(start, start + 1800);
      assert.match(body, /security definer/, `${name} must be SECURITY DEFINER`);
      assert.match(body, /set search_path\s*=\s*(?:public|''|private,\s*public)/, `${name} must pin search_path`);
    }
  }
});

test("bounded RLS and grants remain aligned with the real schema", () => {
  const tables = ["tenant_memberships", "portal_profiles", "privacy_requests", "portal_notification_preferences", "communication_consents", "user_sessions", "security_alerts"];
  for (const table of tables) {
    requireBoth(`${table} RLS`, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(real, new RegExp(`create policy[\\s\\S]{0,500}on public\\.${table}`), `${table} needs a real RLS policy`);
    assert.match(local, new RegExp(`create policy[\\s\\S]{0,500}on public\\.${table}`), `${table} needs a local RLS policy`);
  }
  for (const name of ["register_platform_session", "revoke_own_platform_session", "revoke_all_own_platform_sessions"])
    requireBoth(`${name} authenticated grant`, new RegExp(`grant execute on function public\\.${name}\\([^;]+\\) to authenticated`));
});

test("platform session remains bound to authenticated user and Supabase auth session", () => {
  for (const source of [real, local]) {
    assert.match(source, /user_sessions[\s\S]{0,1200}user_id uuid not null/);
    assert.match(source, /user_sessions[\s\S]{0,1200}auth_session_id uuid not null/);
    assert.match(source, /register_platform_session[\s\S]{0,2400}auth\.uid\(\)/);
    assert.match(source, /register_platform_session[\s\S]{0,2400}p_auth_session/);
    assert.match(source, /revoke_own_platform_session[\s\S]{0,1800}user_id\s*=\s*auth\.uid\(\)/);
    assert.match(source, /revoke_all_own_platform_sessions[\s\S]{0,1800}tenant_id\s*=\s*p_tenant[\s\S]{0,300}user_id\s*=\s*auth\.uid\(\)/);
  }
});
