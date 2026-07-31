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

function functionBlock(source, schema, name) {
  const marker = `create or replace function ${schema}.${name}`;
  const matches = [...source.matchAll(new RegExp(`${marker.replaceAll(".", "\\.")}\\s*\\(`, "g"))];
  assert.ok(matches.length > 0, `${schema}.${name} missing`);
  const start = matches.at(-1).index;
  const nextPublic = source.indexOf("create or replace function public.", start + 1);
  const nextPrivate = source.indexOf("create or replace function private.", start + 1);
  const candidates = [nextPublic, nextPrivate].filter((value) => value !== -1);
  const next = candidates.length ? Math.min(...candidates) : -1;
  return source.slice(start, next === -1 ? start + 5000 : next);
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
    ["session auth binding", /auth_session_id uuid/],
    ["session revocation", /revoked_at timestamptz/],
  ]) requireBoth(label, pattern);
});

test("bounded membership, account and uniqueness states cannot drift", () => {
  for (const value of ["creator", "client", "employee", "partner", "tenant_admin", "super_admin"])
    requireBoth(`role ${value}`, new RegExp(`'${value}'`));
  for (const value of ["invited", "active", "suspended", "revoked"])
    requireBoth(`membership status ${value}`, new RegExp(`'${value}'`));
  for (const value of ["active", "suspended", "pending_deletion"])
    requireBoth(`account status ${value}`, new RegExp(`'${value}'`));

  assert.match(real, /unique\s*\(\s*tenant_id\s*,\s*user_id(?:\s*,\s*role)?\s*\)|unique index[^;]*tenant_id[^;]*user_id/);
  assert.match(local, /unique\s*\(\s*tenant_id\s*,\s*user_id\s*\)/);
  assert.match(real, /auth_session_id/);
  assert.match(local, /unique\s*\(\s*tenant_id\s*,\s*user_id\s*,\s*auth_session_id\s*\)/);
});

test("bounded RPC signatures and execution modes match real migrations", () => {
  const contracts = [
    ["resolve_public_tenant_runtime", ["p_hostname text"], /returns jsonb/, "invoker"],
    ["register_platform_session", ["p_tenant uuid", "p_auth_session uuid", "p_device_label text", "p_platform text", "p_browser text", "p_ip_hash text", "p_suspicious boolean"], /returns uuid/, "invoker"],
    ["revoke_own_platform_session", ["p_session uuid", "p_reason text"], /returns boolean/, "invoker"],
    ["revoke_all_own_platform_sessions", ["p_tenant uuid", "p_reason text"], /returns integer/, "invoker"],
  ];
  for (const [name, args, returns, mode] of contracts) {
    for (const block of [functionBlock(real, "public", name), functionBlock(local, "public", name)]) {
      for (const arg of args) assert.match(block, new RegExp(arg.replace(" ", "\\s+")), `${name} missing ${arg}`);
      assert.match(block, returns, `${name} return type drift`);
      assert.match(block, new RegExp(`security ${mode}`), `${name} must be SECURITY ${mode.toUpperCase()}`);
      assert.match(block, /set search_path\s*=\s*(?:pg_catalog,\s*)?(?:public|private|''|private,\s*public)/, `${name} must pin search_path`);
    }
  }
  for (const source of [real, local]) {
    const privateResolver = functionBlock(source, "private", "public_tenant_runtime");
    assert.match(privateResolver, /returns jsonb/);
    assert.match(privateResolver, /security definer/);
    assert.match(privateResolver, /set search_path\s*=\s*(?:pg_catalog,\s*)?public/);
  }
});

test("bounded RLS, policies and grants remain aligned with real migrations", () => {
  const tables = ["tenant_memberships", "portal_profiles", "privacy_requests", "portal_notification_preferences", "communication_consents", "user_sessions", "security_alerts"];
  assert.match(real, /enable row level security/);
  assert.match(local, /enable row level security/);
  for (const table of tables) {
    assert.match(real, new RegExp(`public\\.${table}|['\"]${table}['\"]`), `${table} absent from real RLS contract`);
    assert.match(local, new RegExp(`alter table public\\.${table} enable row level security`), `${table} absent from local RLS contract`);
    assert.match(real, new RegExp(`create policy[\\s\\S]{0,1600}(?:on public\\.${table}|${table})`), `${table} needs a real policy`);
    assert.match(local, new RegExp(`create policy[\\s\\S]{0,500}on public\\.${table}`), `${table} needs a local policy`);
  }
  for (const name of ["register_platform_session", "revoke_own_platform_session", "revoke_all_own_platform_sessions"])
    requireBoth(`${name} authenticated grant`, new RegExp(`grant execute on function public\\.${name}\\([^;]+\\) to authenticated`));
});

test("platform sessions remain bound to authenticated users and auth session identifiers", () => {
  for (const source of [real, local]) {
    assert.match(source, /create table(?: if not exists)? public\.user_sessions[\s\S]{0,1800}user_id uuid not null/);
    assert.match(source, /create table(?: if not exists)? public\.user_sessions[\s\S]{0,1800}auth_session_id uuid/);
    const register = functionBlock(source, "public", "register_platform_session");
    assert.match(register, /actor uuid\s*:=\s*\(select auth\.uid\(\)\)/);
    assert.match(register, /p_auth_session/);
    const revokeOne = functionBlock(source, "public", "revoke_own_platform_session");
    assert.match(revokeOne, /actor uuid\s*:=\s*\(select auth\.uid\(\)\)/);
    assert.match(revokeOne, /user_id\s*=\s*actor/);
    const revokeAll = functionBlock(source, "public", "revoke_all_own_platform_sessions");
    assert.match(revokeAll, /actor uuid\s*:=\s*\(select auth\.uid\(\)\)/);
    assert.match(revokeAll, /tenant_id\s*=\s*p_tenant/);
    assert.match(revokeAll, /user_id\s*=\s*actor/);
  }
});
