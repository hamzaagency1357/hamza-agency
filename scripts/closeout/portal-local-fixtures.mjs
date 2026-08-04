import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const action = process.argv[2] || "setup";
const apiUrl = process.env.API_URL;
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
const dbUrl = process.env.DB_URL;
const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-portal-fixtures.json";
if (!apiUrl || !serviceRoleKey || !dbUrl) throw new Error("missing_local_supabase_environment");

const tenants = { a: "c10e0000-0000-4000-8000-000000000001", b: "c10e0000-0000-4000-8000-000000000002" };
const records = { clientAlert: "c10e1000-0000-4000-8000-000000000001", employeeAlert: "c10e1000-0000-4000-8000-000000000002" };
const prefix = `closeout-${(process.env.CLOSEOUT_EXPECTED_SHA || "local").slice(0, 8)}`;
const accounts = {
  authProbe: { email: `${prefix}-auth-probe@example.test`, password: "LocalOnly-Auth-Probe-2026!", role: "creator", status: "active" },
  creator: { email: `${prefix}-creator@example.test`, password: "LocalOnly-Creator-2026!", role: "creator", status: "active" },
  revokeOne: { email: `${prefix}-revoke-one@example.test`, password: "LocalOnly-Revoke-One-2026!", role: "creator", status: "active" },
  revokeAll: { email: `${prefix}-revoke-all@example.test`, password: "LocalOnly-Revoke-All-2026!", role: "creator", status: "active" },
  client: { email: `${prefix}-client@example.test`, password: "LocalOnly-Client-2026!", role: "client", status: "active" },
  employee: { email: `${prefix}-employee@example.test`, password: "LocalOnly-Employee-2026!", role: "employee", status: "active" },
  partner: { email: `${prefix}-partner@example.test`, password: "LocalOnly-Partner-2026!", role: "partner", status: "active" },
  pending: { email: `${prefix}-pending@example.test`, password: "LocalOnly-Pending-2026!", role: "creator", status: "invited" },
  suspended: { email: `${prefix}-suspended@example.test`, password: "LocalOnly-Suspended-2026!", role: "creator", status: "suspended" },
  revoked: { email: `${prefix}-revoked@example.test`, password: "LocalOnly-Revoked-2026!", role: "creator", status: "revoked" },
  accountSuspended: { email: `${prefix}-account-suspended@example.test`, password: "LocalOnly-Account-Suspended-2026!", role: "creator", status: "active" },
  disabled: { email: `${prefix}-disabled@example.test`, password: "LocalOnly-Disabled-2026!", role: "creator", status: "active" },
  otherTenant: { email: `${prefix}-other@example.test`, password: "LocalOnly-Other-2026!", role: "client", status: "active" },
};

function psql(sql) { execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "inherit", "inherit"] }); }
async function admin(path, init = {}) {
  const response = await fetch(`${apiUrl}/auth/v1/admin${path}`, { ...init, headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", ...(init.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`local_auth_admin_failed:${response.status}`);
  return body;
}
async function createUser(account) {
  const body = await admin("/users", { method: "POST", body: JSON.stringify({ email: account.email, password: account.password, email_confirm: true }) });
  if (!body?.id) throw new Error("local_auth_user_create_failed");
  return body.id;
}

if (action === "cleanup") {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const ids = Object.values(fixture.accounts).map((account) => account.id);
  if (ids.length) psql(`delete from public.tenant_memberships where user_id = any(array[${ids.map((id) => `'${id}'::uuid`).join(",")}]); delete from public.portal_profiles where user_id = any(array[${ids.map((id) => `'${id}'::uuid`).join(",")}]);`);
  for (const id of ids) await admin(`/users/${id}`, { method: "DELETE" });
  const count = execFileSync("psql", [dbUrl, "-Atqc", `select count(*) from auth.users where email like '${prefix}-%@example.test'`], { encoding: "utf8" }).trim();
  if (count !== "0") throw new Error(`portal_fixture_cleanup_failed:${count}`);
  await rm(fixturePath, { force: true });
  console.log(JSON.stringify({ ok: true, remaining: 0 }));
  process.exit(0);
}

const created = {};
for (const [key, account] of Object.entries(accounts)) created[key] = { ...account, id: await createUser(account) };

psql(`
begin;
insert into public.tenants(id,slug,name,status,is_primary,default_locale,supported_locales)
values ('${tenants.a}'::uuid,'${prefix}-tenant-a','Closeout Tenant A','active',false,'ar',array['ar','en','tr']), ('${tenants.b}'::uuid,'${prefix}-tenant-b','Closeout Tenant B','active',false,'ar',array['ar','en','tr'])
on conflict (id) do update set status='active',name=excluded.name;
insert into public.tenant_domains(tenant_id,hostname,status,is_primary,verified_at)
values ('${tenants.a}'::uuid,'127.0.0.1','active',true,now()),('${tenants.b}'::uuid,'tenant-b.closeout.test','active',true,now())
on conflict (hostname) do update set tenant_id=excluded.tenant_id,status='active',verified_at=now();
insert into public.tenant_memberships(tenant_id,user_id,role,status,permissions,mfa_required)
values
 ('${tenants.a}'::uuid,'${created.creator.id}'::uuid,'creator','active','{}',false),
 ('${tenants.a}'::uuid,'${created.revokeOne.id}'::uuid,'creator','active','{}',false),
 ('${tenants.a}'::uuid,'${created.revokeAll.id}'::uuid,'creator','active','{}',false),
 ('${tenants.a}'::uuid,'${created.client.id}'::uuid,'client','active','{}',false),
 ('${tenants.a}'::uuid,'${created.employee.id}'::uuid,'employee','active','{}',false),
 ('${tenants.a}'::uuid,'${created.partner.id}'::uuid,'partner','active','{}',false),
 ('${tenants.a}'::uuid,'${created.pending.id}'::uuid,'creator','invited','{}',false),
 ('${tenants.a}'::uuid,'${created.suspended.id}'::uuid,'creator','suspended','{}',false),
 ('${tenants.a}'::uuid,'${created.revoked.id}'::uuid,'creator','revoked','{}',false),
 ('${tenants.a}'::uuid,'${created.accountSuspended.id}'::uuid,'creator','active','{}',false),
 ('${tenants.a}'::uuid,'${created.disabled.id}'::uuid,'creator','active','{}',false),
 ('${tenants.b}'::uuid,'${created.otherTenant.id}'::uuid,'client','active','{}',false)
on conflict (tenant_id,user_id) do update set role=excluded.role,status=excluded.status;
insert into public.portal_profiles(user_id,display_name,locale,status,marketing_opt_in,ai_opt_out)
select user_id,'Closeout '||role,'ar','active',false,false from public.tenant_memberships
on conflict (user_id) do update set status='active';
insert into public.portal_profiles(user_id,display_name,locale,status) values
 ('${created.accountSuspended.id}'::uuid,'Account Suspended','ar','suspended'),
 ('${created.disabled.id}'::uuid,'Disabled','ar','pending_deletion')
on conflict (user_id) do update set status=excluded.status;
insert into public.security_alerts(id,tenant_id,user_id,alert_type,severity,metadata)
values ('${records.clientAlert}'::uuid,'${tenants.a}'::uuid,'${created.client.id}'::uuid,'client_owned','low','{"fixture":true}'), ('${records.employeeAlert}'::uuid,'${tenants.a}'::uuid,'${created.employee.id}'::uuid,'employee_private','high','{"fixture":true}')
on conflict (id) do update set acknowledged_at=null;
commit;
`);

const fixture = { prefix, apiUrl, tenants, records, accounts: created };
await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
await chmod(fixturePath, 0o600);
console.log(JSON.stringify({ ok: true, users: Object.keys(created).length, tenants: 2, privateRecords: Object.keys(records).length }));
