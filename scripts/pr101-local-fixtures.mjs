import { chmod, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const apiUrl = process.env.API_URL || process.env.SUPABASE_LOCAL_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
const dbUrl = process.env.DB_URL || process.env.SUPABASE_LOCAL_DB_URL;
if (!apiUrl || !serviceRoleKey || !dbUrl) throw new Error("missing_local_supabase_environment");

const tenants = {
  a: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  b: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};
const hosts = { a: "tenant-a.pr101.test", b: "tenant-b.pr101.test" };
const users = {
  admin: { email: "pr101-admin@example.test", password: "LocalOnly-Admin-2026!" },
  invited: { email: "pr101-invited@example.test", password: "LocalOnly-Invited-2026!" },
};

async function adminCreateUser(account) {
  const response = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: account.email, password: account.password, email_confirm: true }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) throw new Error(`local_auth_user_create_failed:${response.status}`);
  return body.id;
}

async function passwordGrant(account) {
  const response = await fetch(`${apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: serviceRoleKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: account.password }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token) throw new Error(`local_auth_login_failed:${response.status}`);
  return body.access_token;
}

const adminId = await adminCreateUser(users.admin);
const invitedId = await adminCreateUser(users.invited);

const sql = `
begin;
insert into public.tenants(id,slug,name,status,is_primary,default_locale,supported_locales)
values
  ('${tenants.a}'::uuid,'pr101-tenant-a','PR101 Tenant A','active',false,'ar',array['ar','en','tr']),
  ('${tenants.b}'::uuid,'pr101-tenant-b','PR101 Tenant B','active',false,'ar',array['ar','en','tr'])
on conflict (id) do update set status='active',name=excluded.name;

insert into public.tenant_domains(tenant_id,hostname,status,is_primary,verified_at)
values
  ('${tenants.a}'::uuid,'${hosts.a}','active',true,now()),
  ('${tenants.b}'::uuid,'${hosts.b}','active',true,now())
on conflict (hostname) do update set tenant_id=excluded.tenant_id,status='active',is_primary=true,verified_at=now();

insert into public.tenant_memberships(tenant_id,user_id,role,status,permissions,mfa_required)
values
  ('${tenants.a}'::uuid,'${adminId}'::uuid,'super_admin','active','{}'::jsonb,true),
  ('${tenants.b}'::uuid,'${adminId}'::uuid,'super_admin','active','{}'::jsonb,true),
  ('${tenants.b}'::uuid,'${invitedId}'::uuid,'client','active','{}'::jsonb,false)
on conflict (tenant_id,user_id) do update
set role=excluded.role,status='active',permissions=excluded.permissions,mfa_required=excluded.mfa_required,updated_at=now();
commit;
`;
execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });

const fixture = {
  apiUrl,
  dbUrl,
  serviceRoleKey,
  tenants,
  hosts,
  users: {
    admin: { ...users.admin, id: adminId, accessToken: await passwordGrant(users.admin) },
    invited: { ...users.invited, id: invitedId, accessToken: await passwordGrant(users.invited) },
  },
};
const fixturePath = process.env.PR101_FIXTURE_FILE || "/tmp/pr101-local-fixtures.json";
await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
await chmod(fixturePath, 0o600);
console.log(JSON.stringify({ ok: true, synthetic_users: 2, synthetic_tenants: 2 }));
