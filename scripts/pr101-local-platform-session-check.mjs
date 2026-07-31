import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const fixturePath = process.env.PR101_FIXTURE_FILE || "/tmp/pr101-local-fixtures.json";
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const appUrl = process.env.PR101_APP_URL || "http://127.0.0.1:3000";

function sql(query) {
  return execFileSync("psql", [fixture.dbUrl, "-v", "ON_ERROR_STOP=1", "-Atq", "-c", query], { encoding: "utf8" }).trim();
}

async function access(host, sessionId) {
  return fetch(`${appUrl}/api/product-expansion/tenant-access?role=creator`, {
    headers: {
      Authorization: `Bearer ${fixture.users.invited.accessToken}`,
      "x-forwarded-host": host,
      "x-platform-session-id": sessionId,
    },
  });
}

const sessionA = sql(`select id from public.user_sessions where tenant_id='${fixture.tenants.a}' and user_id='${fixture.users.invited.id}' order by created_at desc limit 1`);
const sessionB = sql(`select id from public.user_sessions where tenant_id='${fixture.tenants.b}' and user_id='${fixture.users.invited.id}' order by created_at desc limit 1`);
assert.ok(sessionA && sessionB, "platform_session_fixture_missing");

const deniedA = await access(fixture.hosts.a, sessionA);
const allowedB = await access(fixture.hosts.b, sessionB);
assert.equal(deniedA.status, 403, "revoked_tenant_a_platform_session_not_denied");
assert.equal(allowedB.status, 200, "active_tenant_b_platform_session_not_allowed");

console.log(JSON.stringify({ tenant_a_revoked_session_denied: true, tenant_b_active_session_allowed: true }));
