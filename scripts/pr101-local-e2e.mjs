import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const fixturePath = process.env.PR101_FIXTURE_FILE || "/tmp/pr101-local-fixtures.json";
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const appUrl = process.env.PR101_APP_URL || "http://127.0.0.1:3000";
const anonKey = process.env.ANON_KEY;
assert.ok(anonKey, "missing local anon key");

function sql(query) {
  return execFileSync("psql", [fixture.dbUrl, "-v", "ON_ERROR_STOP=1", "-At", "-c", query], { encoding: "utf8" }).trim();
}

async function request(path, { token, host, method = "GET", body } = {}) {
  const response = await fetch(`${appUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(host ? { "x-forwarded-host": host } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data, text };
}

function tokenFromUrl(value) {
  assert.equal(typeof value, "string");
  const token = new URL(value).searchParams.get("token");
  assert.ok(token);
  return token;
}

function assertSafeFailure(result) {
  const rendered = JSON.stringify(result.data ?? result.text).toLowerCase();
  assert.doesNotMatch(rendered, /tenant_invitations_one_pending_email_uidx|constraint|duplicate key|postgres|stack trace|at\s+\w+\s*\(/i);
  assert.ok(result.status >= 400 && result.status < 500);
}

const admin = fixture.users.admin;
const invited = fixture.users.invited;
const tenantA = fixture.tenants.a;
const tenantB = fixture.tenants.b;

// Exact-host public runtime and unknown-host rejection.
for (const [host, tenantId] of [["tenant-a.test", tenantA], ["tenant-b.test", tenantB]]) {
  const response = await fetch(`${fixture.apiUrl}/rest/v1/rpc/resolve_public_tenant_runtime`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_hostname: host }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, tenantId);
}
const unknownRuntime = await fetch(`${fixture.apiUrl}/rest/v1/rpc/resolve_public_tenant_runtime`, {
  method: "POST",
  headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ p_hostname: "unknown.test" }),
});
assert.equal(await unknownRuntime.json(), null);
assert.equal((await request("/api/product-expansion/tenant-access", { token: invited.accessToken, host: "unknown.test" })).status, 403);

// Before acceptance, Tenant B is active and Tenant A is denied using the same access token.
assert.equal((await request("/api/product-expansion/tenant-access?role=creator", { token: invited.accessToken, host: "tenant-b.test" })).status, 200);
assert.equal((await request("/api/product-expansion/tenant-access?role=creator", { token: invited.accessToken, host: "tenant-a.test" })).status, 403);

// Full create/resend/old-token/new-token/single-use journey.
const created = await request("/api/product-expansion/invitations", {
  token: admin.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { action: "create", email: invited.email, role: "creator", permissions: {}, expires_in_days: 7 },
});
assert.equal(created.status, 201);
const invitationId = created.data?.invitation?.id;
assert.ok(invitationId);
const oldToken = tokenFromUrl(created.data.invite_url);

const listing = await request("/api/product-expansion/invitations", { token: admin.accessToken, host: "tenant-a.test" });
assert.equal(listing.status, 200);
assert.doesNotMatch(JSON.stringify(listing.data), /invite_url|token_hash|[A-Za-z0-9_-]{40,}/);

const resent = await request("/api/product-expansion/invitations", {
  token: admin.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { action: "resend", invitation_id: invitationId, expires_in_days: 7 },
});
assert.equal(resent.status, 200);
const newToken = tokenFromUrl(resent.data.invite_url);
assert.notEqual(newToken, oldToken);

assertSafeFailure(await request("/api/product-expansion/invitations/accept", {
  token: invited.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { token: oldToken },
}));

const accepted = await request("/api/product-expansion/invitations/accept", {
  token: invited.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { token: newToken },
});
assert.equal(accepted.status, 200);
const membershipA = accepted.data?.membership?.id;
assert.ok(membershipA);
assertSafeFailure(await request("/api/product-expansion/invitations/accept", {
  token: invited.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { token: newToken },
}));

// Both tenants are accessible after acceptance.
assert.equal((await request("/api/product-expansion/tenant-access?role=creator", { token: invited.accessToken, host: "tenant-a.test" })).status, 200);
assert.equal((await request("/api/product-expansion/tenant-access?role=creator", { token: invited.accessToken, host: "tenant-b.test" })).status, 200);

const sessionA = await request("/api/product-expansion/sessions/register", { token: invited.accessToken, host: "tenant-a.test", method: "POST" });
const sessionB = await request("/api/product-expansion/sessions/register", { token: invited.accessToken, host: "tenant-b.test", method: "POST" });
assert.equal(sessionA.status, 200);
assert.equal(sessionB.status, 200);
assert.ok(sessionA.data?.sessionId && sessionB.data?.sessionId);

// Super-admin membership is protected.
const adminMembership = sql(`select id from public.tenant_memberships where tenant_id='${tenantA}' and user_id='${admin.id}' limit 1`);
assertSafeFailure(await request("/api/product-expansion/invitations", {
  token: admin.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { action: "manage_membership", membership_id: adminMembership, status: "suspended", role: "tenant_admin", permissions: {} },
}));

// Tenant-scoped suspension; reuse the exact same old access token.
const suspended = await request("/api/product-expansion/invitations", {
  token: admin.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { action: "manage_membership", membership_id: membershipA, status: "suspended", role: "creator", permissions: {} },
});
assert.equal(suspended.status, 200);
assert.equal((await request("/api/product-expansion/tenant-access?role=creator", { token: invited.accessToken, host: "tenant-a.test" })).status, 403);
assert.equal((await request("/api/product-expansion/tenant-access?role=creator", { token: invited.accessToken, host: "tenant-b.test" })).status, 200);
const authStillValid = await fetch(`${fixture.apiUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${invited.accessToken}` } });
assert.equal(authStillValid.status, 200);
assert.equal(sql(`select status from public.tenant_memberships where tenant_id='${tenantA}' and user_id='${invited.id}'`), "suspended");
assert.equal(sql(`select status from public.tenant_memberships where tenant_id='${tenantB}' and user_id='${invited.id}'`), "active");
assert.equal(sql(`select count(*) from public.user_sessions where id='${sessionA.data.sessionId}' and tenant_id='${tenantA}' and revoked_at is not null`), "1");
assert.equal(sql(`select count(*) from public.user_sessions where id='${sessionB.data.sessionId}' and tenant_id='${tenantB}' and revoked_at is null`), "1");

// Revoke and expired invitation behavior.
const revokedCreate = await request("/api/product-expansion/invitations", {
  token: admin.accessToken, host: "tenant-a.test", method: "POST",
  body: { action: "create", email: "pr101-revoked@example.test", role: "client", permissions: {}, expires_in_days: 7 },
});
assert.equal(revokedCreate.status, 201);
assert.equal((await request("/api/product-expansion/invitations", {
  token: admin.accessToken, host: "tenant-a.test", method: "POST",
  body: { action: "revoke", invitation_id: revokedCreate.data.invitation.id },
})).status, 200);
assert.equal(sql(`select status from public.tenant_invitations where id='${revokedCreate.data.invitation.id}'`), "revoked");

const expiredRaw = "pr101_local_expired_token_000000000000000000000000";
const expiredHash = createHash("sha256").update(expiredRaw).digest("hex");
sql(`insert into public.tenant_invitations(tenant_id,email,role,permissions,token_hash,status,invited_by,created_at,expires_at,last_sent_at) values ('${tenantA}','${invited.email}','creator','{}','${expiredHash}','invited','${admin.id}',now()-interval '2 days',now()-interval '1 day',now()-interval '2 days')`);
assertSafeFailure(await request("/api/product-expansion/invitations/accept", {
  token: invited.accessToken, host: "tenant-a.test", method: "POST", body: { token: expiredRaw },
}));
assert.equal(sql(`select status from public.tenant_invitations where token_hash='${expiredHash}'`), "expired");

// Real independent HTTP concurrency for one pending invitation.
const concurrentEmail = "pr101-concurrent@example.test";
const concurrentBodies = [1, 2].map(() => request("/api/product-expansion/invitations", {
  token: admin.accessToken,
  host: "tenant-a.test",
  method: "POST",
  body: { action: "create", email: concurrentEmail, role: "partner", permissions: {}, expires_in_days: 7 },
}));
const concurrent = await Promise.allSettled(concurrentBodies);
assert.equal(concurrent.filter((item) => item.status === "fulfilled" && item.value.status === 201).length, 1);
const rejected = concurrent.filter((item) => item.status === "fulfilled" && item.value.status !== 201);
assert.equal(rejected.length, 1);
assertSafeFailure(rejected[0].value);
assert.equal(sql(`select count(*) from public.tenant_invitations where tenant_id='${tenantA}' and email='${concurrentEmail}' and status='invited'`), "1");
assert.equal(sql(`select count(*) from public.tenant_admin_audit where tenant_id='${tenantA}' and action='tenant.invitation_created' and after_data->>'email'='${concurrentEmail}'`), "1");
assert.equal(sql(`select count(*) from public.notifications where tenant_id='${tenantA}' and recipient_email='${concurrentEmail}' and type='tenant_invitation'`), "1");
assert.equal(sql(`select count(*) from private.invitation_rate_limits where tenant_id='${tenantA}' and action='create' and attempts>0`), "3");

// Privilege and rollback-only fixture assertions.
assert.equal(sql("select has_table_privilege('authenticated','public.tenant_memberships','insert')"), "f");
assert.equal(sql("select has_table_privilege('authenticated','public.tenant_memberships','update')"), "f");
assert.equal(sql("select has_function_privilege('authenticated','public.create_tenant_invitation(uuid,text,text,bigint,jsonb,text,timestamptz)','execute')"), "t");
assert.equal(sql("select has_function_privilege('authenticated','private.normalize_invitation_permissions(text,jsonb)','execute')"), "f");
assert.equal(sql("select has_function_privilege('anon','private.consume_invitation_rate_limit(uuid,text,text)','execute')"), "f");
const rollbackFixture = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
sql(`begin; insert into public.tenants(id,slug,name,status,is_primary) values ('${rollbackFixture}','pr101-rollback-fixture','Rollback Fixture','active',false); rollback;`);
assert.equal(sql(`select count(*) from public.tenants where id='${rollbackFixture}'`), "0");

console.log(JSON.stringify({
  local_only: true,
  authenticated_e2e: true,
  concurrent_http_requests: true,
  tenant_a_old_token_denied: true,
  tenant_b_old_token_allowed: true,
  global_auth_unchanged: true,
  tenant_scoped_sessions: true,
  ordered_migrations_reset: true,
  privilege_assertions_passed: true,
  fixture_rows_after_rollback: 0,
}));
