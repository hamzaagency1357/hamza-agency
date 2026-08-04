import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";

const REQUIRED_ENV_NAMES = ["DB_URL", "API_URL", "ANON_KEY", "SERVICE_ROLE_KEY", "JWT_SECRET"];
assert.equal(REQUIRED_ENV_NAMES[3], "SERVICE_ROLE_KEY");
assert.ok(REQUIRED_ENV_NAMES.every((name) => !name.startsWith("NEXT_PUBLIC_")), "runtime credentials must be server-only");
for (const name of REQUIRED_ENV_NAMES) assert.ok(process.env[name], `${name} is required`);

const runtime = Object.freeze({
  dbUrl: process.env[REQUIRED_ENV_NAMES[0]],
  apiUrl: process.env[REQUIRED_ENV_NAMES[1]].replace(/\/+$/, ""),
  anonymousCredential: process.env[REQUIRED_ENV_NAMES[2]],
  serviceCredential: process.env[REQUIRED_ENV_NAMES[3]],
  jwtSecret: process.env[REQUIRED_ENV_NAMES[4]],
});
assert.ok(runtime.serviceCredential, "isolated service credential is required");

const TENANT_ID = "00000000-0000-4000-8000-000000000107";
const AUTH_USER_ID = "00000000-0000-4000-8000-000000000108";
const GATEWAY_SIGNATURE =
  "public.pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)";
const WRITE_SENSITIVE_TABLES = [
  "activity_logs",
  "consent_records",
  "payment_webhook_events",
  "provider_health_checks",
  "provider_message_events",
];

function psql(sql) {
  return execFileSync(
    "psql",
    [runtime.dbUrl, "--no-psqlrc", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  ).trim();
}

function expectSqlDenied(role, expression) {
  try {
    psql(`set role ${role}; ${expression};`);
    assert.fail(`${role} unexpectedly executed a protected OIDC function`);
  } catch (error) {
    const stderr = error && typeof error === "object" && "stderr" in error ? String(error.stderr) : String(error);
    assert.match(stderr, /permission denied/i, `${role} denial must be privilege-based`);
  }
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function authenticatedJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    aud: "authenticated",
    exp: now + 600,
    iat: now,
    iss: "supabase-local",
    role: "authenticated",
    sub: AUTH_USER_ID,
  }));
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", runtime.jwtSecret).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

async function dataApi(path, { key, bearer = key, method = "GET", body } = {}) {
  return fetch(`${runtime.apiUrl}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${bearer}`,
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

async function responseJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return null; }
}

function listBusinessTables() {
  const rows = psql(`
    select quote_ident(n.nspname)||'.'||quote_ident(c.relname)
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','private') and c.relkind in ('r','p')
    order by n.nspname,c.relname;
  `);
  return rows ? rows.split("\n") : [];
}

function countRows(tableName) {
  return psql(`select count(*)::text from ${tableName};`);
}

function allTableCountFingerprint() {
  const material = listBusinessTables().map((tableName) => `${tableName}:${countRows(tableName)}`).join("\n");
  return createHash("sha256").update(material).digest("hex");
}

function tableContentFingerprint(tableName) {
  return psql(`
    select md5(coalesce(string_agg(row_value,'|' order by row_value),''))
    from (select row_to_json(t)::text as row_value from public.${tableName} t) rows;
  `);
}

function writeSensitiveFingerprint() {
  const material = WRITE_SENSITIVE_TABLES
    .map((tableName) => `${tableName}:${countRows(`public.${tableName}`)}:${tableContentFingerprint(tableName)}`)
    .join("\n");
  return createHash("sha256").update(material).digest("hex");
}

const fixtureSql = `
  delete from public.sections where tenant_id='${TENANT_ID}'::uuid;
  delete from public.activity_logs where tenant_id='${TENANT_ID}'::uuid;
  delete from public.tenants where id='${TENANT_ID}'::uuid;
  insert into public.tenants(id,slug,name,status,is_primary)
  values('${TENANT_ID}'::uuid,'pr1-runtime','PR 1 Runtime','active',true);
  insert into public.sections(
    tenant_id,section_key,page_slug,language,content,is_visible,is_published,publishing_status,
    scheduled_publish_at,scheduled_unpublish_at
  ) values
    ('${TENANT_ID}'::uuid,'pr1-published','pr1-runtime','ar','{}',true,true,'published',null,null),
    ('${TENANT_ID}'::uuid,'pr1-draft','pr1-runtime','ar','{}',true,false,'draft',null,null),
    ('${TENANT_ID}'::uuid,'pr1-unpublished','pr1-runtime','ar','{}',true,false,'unpublished',null,null),
    ('${TENANT_ID}'::uuid,'pr1-future','pr1-runtime','ar','{}',true,true,'published',now()+interval '1 day',null),
    ('${TENANT_ID}'::uuid,'pr1-hidden','pr1-runtime','ar','{}',false,true,'published',null,null),
    ('${TENANT_ID}'::uuid,'pr1-expired','pr1-runtime','ar','{}',true,true,'published',null,now()-interval '1 second');
  select pg_notify('pgrst','reload schema');
`;

try {
  psql(fixtureSql);

  assert.equal(psql(`select has_function_privilege('service_role','${GATEWAY_SIGNATURE}','EXECUTE');`), "t");
  assert.equal(psql(`select has_function_privilege('anon','${GATEWAY_SIGNATURE}','EXECUTE');`), "f");
  assert.equal(psql(`select has_function_privilege('authenticated','${GATEWAY_SIGNATURE}','EXECUTE');`), "f");
  assert.equal(psql("select has_function_privilege('service_role','public.pr101_oidc_health_probe()','EXECUTE');"), "t");
  assert.equal(psql("select has_function_privilege('anon','public.pr101_oidc_health_probe()','EXECUTE');"), "f");
  assert.equal(psql("select has_function_privilege('authenticated','public.pr101_oidc_health_probe()','EXECUTE');"), "f");

  const policy = psql(`
    select lower(pg_get_expr(polqual,polrelid))
    from pg_policy
    where polrelid='public.sections'::regclass
      and polname='public reads published visible sections';
  `);
  assert.match(policy, /is_visible/);
  assert.match(policy, /is_published/);
  assert.match(policy, /scheduled_publish_at/);
  assert.match(policy, /scheduled_unpublish_at/);
  assert.doesNotMatch(policy, /current_user_is_admin|current_admin_is_super_admin/);

  const managementPolicies = Number(psql(`
    select count(*)
    from pg_policy
    where polrelid='public.sections'::regclass
      and polroles @> array[(select oid from pg_roles where rolname='authenticated')]
      and polname <> 'public reads published visible sections'
      and (polcmd in ('a','w','d') or polcmd='*');
  `));
  assert.ok(managementPolicies >= 3, "section administration policies must remain separate from public reads");

  const metadata = psql(`
    select p.provolatile::text||':'||p.prosecdef::text
    from pg_proc p
    where p.oid=to_regprocedure('public.pr101_oidc_health_probe()');
  `);
  assert.equal(metadata, "s:false");

  expectSqlDenied("anon", "select public.pr101_oidc_health_probe()");
  expectSqlDenied("authenticated", "select public.pr101_oidc_health_probe()");
  const gatewayCall = `select public.pr101_oidc_gateway(
    null::text,null::bigint,null::text,null::text,null::text,null::text,null::text,
    null::text,null::text,null::text,null::text,null::text,null::bigint,null::bigint
  )`;
  expectSqlDenied("anon", gatewayCall);
  expectSqlDenied("authenticated", gatewayCall);

  await new Promise((resolve) => setTimeout(resolve, 1_000));

  const sectionResponse = await dataApi(
    `/rest/v1/sections?select=section_key&tenant_id=eq.${TENANT_ID}&order=section_key.asc`,
    { key: runtime.anonymousCredential }
  );
  assert.equal(sectionResponse.status, 200);
  assert.deepEqual(await responseJson(sectionResponse), [{ section_key: "pr1-published" }]);

  const authenticatedToken = authenticatedJwt();
  const authenticatedSections = await dataApi(
    `/rest/v1/sections?select=section_key&tenant_id=eq.${TENANT_ID}&order=section_key.asc`,
    { key: runtime.anonymousCredential, bearer: authenticatedToken }
  );
  assert.equal(authenticatedSections.status, 200);
  assert.deepEqual(await responseJson(authenticatedSections), [{ section_key: "pr1-published" }]);

  const unauthorizedInsert = await dataApi("/rest/v1/sections", {
    key: runtime.anonymousCredential,
    bearer: authenticatedToken,
    method: "POST",
    body: {
      tenant_id: TENANT_ID,
      section_key: "pr1-forbidden",
      page_slug: "pr1-runtime",
      language: "ar",
      content: {},
      is_visible: true,
      is_published: true,
      publishing_status: "published",
    },
  });
  assert.ok(!unauthorizedInsert.ok, "authenticated without admin membership must not manage sections");

  for (const [path, bearer] of [
    ["/rest/v1/rpc/pr101_oidc_health_probe", runtime.anonymousCredential],
    ["/rest/v1/rpc/pr101_oidc_health_probe", authenticatedToken],
  ]) {
    const denied = await dataApi(path, { key: runtime.anonymousCredential, bearer, method: "POST", body: {} });
    assert.ok(!denied.ok, "public roles must not execute the OIDC health probe through Data API");
  }

  const gatewayBody = {
    p_action: "consent_record",
    p_timestamp: Math.floor(Date.now() / 1000),
    p_nonce: "runtime_contract_nonce_00000001",
    p_body: "{}",
    p_body_digest: "0".repeat(64),
    p_oidc_issuer: "runtime",
    p_oidc_subject: "runtime",
    p_oidc_audience: "runtime",
    p_oidc_team_id: "runtime",
    p_oidc_project_id: "runtime",
    p_oidc_project: "runtime",
    p_oidc_environment: "preview",
    p_oidc_issued_at: Math.floor(Date.now() / 1000),
    p_oidc_expires_at: Math.floor(Date.now() / 1000) + 60,
  };
  for (const bearer of [runtime.anonymousCredential, authenticatedToken]) {
    const denied = await dataApi("/rest/v1/rpc/pr101_oidc_gateway", {
      key: runtime.anonymousCredential,
      bearer,
      method: "POST",
      body: gatewayBody,
    });
    assert.ok(!denied.ok, "public roles must not execute the OIDC gateway through Data API");
  }

  const readOnlyProbe = psql("begin read only; set local role service_role; select public.pr101_oidc_health_probe(); rollback;");
  assert.match(readOnlyProbe, /healthy/);

  const tableCountsBefore = allTableCountFingerprint();
  const sensitiveBefore = writeSensitiveFingerprint();
  const serviceProbe = await dataApi("/rest/v1/rpc/pr101_oidc_health_probe", {
    key: runtime.serviceCredential,
    method: "POST",
    body: {},
  });
  assert.equal(serviceProbe.status, 200);
  const probePayload = await responseJson(serviceProbe);
  assert.deepEqual(probePayload, { ok: true, status: "healthy" });
  assert.doesNotMatch(JSON.stringify(probePayload), /service_role|authenticated|anon|acl|grant|secret/i);
  const tableCountsAfter = allTableCountFingerprint();
  const sensitiveAfter = writeSensitiveFingerprint();
  assert.equal(tableCountsAfter, tableCountsBefore, "health probe must not alter any business-table row count");
  assert.equal(sensitiveAfter, sensitiveBefore, "health probe must not alter gateway-write or audit table contents");

  console.log(JSON.stringify({
    schema: "snapshot_plus_six_migrations_plus_pr1",
    tenantFixture: "primary_contract",
    oidcProbe: "healthy_as_service_role",
    oidcPublicExecution: "denied",
    sectionsRls: "published_only",
    unauthorizedManagement: "denied",
    healthProbeWrites: 0,
  }));
} finally {
  psql(`
    delete from public.sections where tenant_id='${TENANT_ID}'::uuid;
    delete from public.activity_logs where tenant_id='${TENANT_ID}'::uuid;
    delete from public.tenants where id='${TENANT_ID}'::uuid;
  `);
}
