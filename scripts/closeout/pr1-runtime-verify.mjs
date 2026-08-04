import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";

const required = ["DB_URL", "API_URL", "ANON_KEY", "SERVICE_ROLE_KEY", "JWT_SECRET"];
for (const key of required) assert.ok(process.env[key], `${key} is required`);

const DB_URL = process.env.DB_URL;
const API_URL = process.env.API_URL.replace(/\/+$/, "");
const ANON_KEY = process.env.ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const TENANT_ID = "00000000-0000-4000-8000-000000000107";
const GATEWAY_SIGNATURE =
  "public.pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)";

function psql(sql) {
  return execFileSync(
    "psql",
    [DB_URL, "--no-psqlrc", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
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
    sub: "00000000-0000-4000-8000-000000000108",
  }));
  const signingInput = `${header}.${payload}`;
  const signature = createHmac("sha256", JWT_SECRET).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

async function dataApi(path, { key, bearer = key, method = "GET", body } = {}) {
  return fetch(`${API_URL}${path}`, {
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
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function forceStats() {
  psql("select pg_stat_force_next_flush();");
  return psql(
    "select coalesce(sum(n_tup_ins+n_tup_upd+n_tup_del),0)::text from pg_stat_user_tables where schemaname='public';"
  );
}

const fixtureSql = `
  delete from public.sections where tenant_id='${TENANT_ID}'::uuid;
  delete from public.tenants where id='${TENANT_ID}'::uuid;
  insert into public.tenants(id,slug,name,status,is_primary)
  values('${TENANT_ID}'::uuid,'pr1-runtime','PR 1 Runtime','active',false);
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

  const metadata = psql(`
    select p.provolatile||':'||p.prosecdef::text
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
    { key: ANON_KEY }
  );
  assert.equal(sectionResponse.status, 200);
  assert.deepEqual(await responseJson(sectionResponse), [{ section_key: "pr1-published" }]);

  const authenticatedToken = authenticatedJwt();
  const authenticatedSections = await dataApi(
    `/rest/v1/sections?select=section_key&tenant_id=eq.${TENANT_ID}&order=section_key.asc`,
    { key: ANON_KEY, bearer: authenticatedToken }
  );
  assert.equal(authenticatedSections.status, 200);
  assert.deepEqual(await responseJson(authenticatedSections), [{ section_key: "pr1-published" }]);

  const anonProbe = await dataApi("/rest/v1/rpc/pr101_oidc_health_probe", {
    key: ANON_KEY,
    method: "POST",
    body: {},
  });
  assert.ok(!anonProbe.ok, "anon must not execute the OIDC health probe through Data API");

  const authenticatedProbe = await dataApi("/rest/v1/rpc/pr101_oidc_health_probe", {
    key: ANON_KEY,
    bearer: authenticatedToken,
    method: "POST",
    body: {},
  });
  assert.ok(!authenticatedProbe.ok, "authenticated must not execute the OIDC health probe through Data API");

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
  const anonGateway = await dataApi("/rest/v1/rpc/pr101_oidc_gateway", {
    key: ANON_KEY,
    method: "POST",
    body: gatewayBody,
  });
  assert.ok(!anonGateway.ok, "anon must not execute the OIDC gateway through Data API");
  const authenticatedGateway = await dataApi("/rest/v1/rpc/pr101_oidc_gateway", {
    key: ANON_KEY,
    bearer: authenticatedToken,
    method: "POST",
    body: gatewayBody,
  });
  assert.ok(!authenticatedGateway.ok, "authenticated must not execute the OIDC gateway through Data API");

  const readOnlyProbe = psql("begin read only; set local role service_role; select public.pr101_oidc_health_probe(); rollback;");
  assert.match(readOnlyProbe, /healthy/);

  forceStats();
  const mutationCountBefore = forceStats();
  const serviceProbe = await dataApi("/rest/v1/rpc/pr101_oidc_health_probe", {
    key: SERVICE_ROLE_KEY,
    method: "POST",
    body: {},
  });
  assert.equal(serviceProbe.status, 200);
  const probePayload = await responseJson(serviceProbe);
  assert.deepEqual(probePayload, { ok: true, status: "healthy" });
  assert.doesNotMatch(JSON.stringify(probePayload), /service_role|authenticated|anon|acl|grant/i);
  const mutationCountAfter = forceStats();
  assert.equal(mutationCountAfter, mutationCountBefore, "health probe must not mutate public data");

  console.log(JSON.stringify({
    schema: "snapshot_plus_six_migrations_plus_pr1",
    oidcProbe: "healthy_as_service_role",
    oidcPublicExecution: "denied",
    sectionsRls: "published_only",
    healthProbeWrites: 0,
  }));
} finally {
  psql(`
    delete from public.sections where tenant_id='${TENANT_ID}'::uuid;
    delete from public.tenants where id='${TENANT_ID}'::uuid;
  `);
}
