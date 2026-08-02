import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const action = process.argv[2] || "setup";
const apiUrl = process.env.API_URL;
const dbUrl = process.env.DB_URL;
const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-macro-fixtures.json";
const envPath = process.env.CLOSEOUT_SUPABASE_ENV_FILE || "/tmp/hamza-macro-supabase.env";
if (!apiUrl || !dbUrl) throw new Error("missing_local_supabase_environment");

const env = Object.fromEntries(
  (await readFile(envPath, "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^"|"$/g, "")];
    }),
);
const serviceKey = env.SERVICE_ROLE_KEY;
if (!serviceKey) throw new Error("missing_step_scoped_local_service_key");

const tenants = {
  a: "c10e0000-0000-4000-8000-000000000001",
  b: "c10e0000-0000-4000-8000-000000000002",
};
const prefix = `closeout-${process.env.CLOSEOUT_SUITE || "macro"}-${(process.env.CLOSEOUT_EXPECTED_SHA || "local").slice(0, 8)}`;
const accounts = {
  client: { email: `${prefix}-client@example.test`, password: "LocalOnly-Client-2026!", role: "client", tenant: "a" },
  employee: { email: `${prefix}-employee@example.test`, password: "LocalOnly-Employee-2026!", role: "employee", tenant: "a" },
  partner: { email: `${prefix}-partner@example.test`, password: "LocalOnly-Partner-2026!", role: "partner", tenant: "a" },
  creator: { email: `${prefix}-creator@example.test`, password: "LocalOnly-Creator-2026!", role: "creator", tenant: "a" },
  otherTenant: { email: `${prefix}-other@example.test`, password: "LocalOnly-Other-2026!", role: "client", tenant: "b" },
};

const sql = (text) =>
  execFileSync("psql", [dbUrl, "--no-psqlrc", "-X", "-v", "ON_ERROR_STOP=1", "-q"], {
    input: text,
    stdio: ["pipe", "inherit", "inherit"],
  });

async function admin(path, init = {}) {
  const response = await fetch(`${apiUrl}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`local_auth_admin_failed:${response.status}`);
  return body;
}

if (action === "cleanup") {
  const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
  const ids = Object.values(fixture.accounts).map((account) => account.id);
  sql(`delete from public.tenants where id in ('${tenants.a}'::uuid,'${tenants.b}'::uuid);`);
  for (const id of ids) await admin(`/users/${id}`, { method: "DELETE" });

  const remaining = execFileSync(
    "psql",
    [dbUrl, "-Atqc", `select count(*) from auth.users where email like '${prefix}-%@example.test'`],
    { encoding: "utf8" },
  ).trim();
  if (remaining !== "0") throw new Error(`macro_auth_cleanup_failed:${remaining}`);

  await rm(fixturePath, { force: true });
  console.log(JSON.stringify({ ok: true, remaining: 0 }));
  process.exit(0);
}

const created = {};
for (const [name, account] of Object.entries(accounts)) {
  const body = await admin("/users", {
    method: "POST",
    body: JSON.stringify({ email: account.email, password: account.password, email_confirm: true }),
  });
  if (!body?.id) throw new Error(`local_auth_user_create_failed:${name}`);
  created[name] = { ...account, id: body.id };
}

sql(`
begin;

update public.tenants
set is_primary=false
where is_primary=true;

insert into public.tenants(id,slug,name,status,is_primary,default_locale,supported_locales)
values
 ('${tenants.a}','${prefix}-tenant-a','Closeout Tenant A','active',true,'ar',array['ar','en','tr']),
 ('${tenants.b}','${prefix}-tenant-b','Closeout Tenant B','active',false,'ar',array['ar','en','tr'])
on conflict(id) do update
set status=excluded.status,
    name=excluded.name,
    slug=excluded.slug,
    is_primary=excluded.is_primary,
    default_locale=excluded.default_locale,
    supported_locales=excluded.supported_locales;

insert into public.tenant_domains(tenant_id,hostname,status,is_primary,verified_at)
values
 ('${tenants.a}','127.0.0.1','active',true,now()),
 ('${tenants.b}','tenant-b.closeout.test','active',true,now())
on conflict(hostname) do update
set tenant_id=excluded.tenant_id,
    status=excluded.status,
    is_primary=excluded.is_primary,
    verified_at=excluded.verified_at;

${Object.values(created)
  .map(
    (account) =>
      `insert into public.tenant_memberships(tenant_id,user_id,role,status,permissions,mfa_required)
       values ('${tenants[account.tenant]}','${account.id}','${account.role}','active','{}',false)
       on conflict(tenant_id,user_id) do update set role=excluded.role,status='active';`,
  )
  .join("\n")}

insert into public.portal_profiles(user_id,display_name,locale,status,marketing_opt_in,ai_opt_out)
select user_id,'Closeout '||role,'ar','active',false,false
from public.tenant_memberships
where tenant_id in ('${tenants.a}','${tenants.b}')
on conflict(user_id) do update set status='active';

do $fixture_contract$
begin
  if (select count(*) from public.tenants where status='active' and is_primary=true) <> 1 then
    raise exception 'macro_primary_tenant_count_invalid';
  end if;
  if not exists (
    select 1 from public.tenants
    where id='${tenants.a}'::uuid and status='active' and is_primary=true
  ) then
    raise exception 'macro_primary_tenant_invalid';
  end if;
  if not exists (
    select 1 from public.tenant_domains
    where hostname='127.0.0.1' and tenant_id='${tenants.a}'::uuid
      and status='active' and is_primary=true
  ) then
    raise exception 'macro_local_host_tenant_invalid';
  end if;
  if (select count(*) from public.tenant_memberships where tenant_id='${tenants.a}'::uuid and status='active') <> 4 then
    raise exception 'macro_primary_membership_count_invalid';
  end if;
  if (select count(*) from public.tenant_memberships where tenant_id='${tenants.b}'::uuid and status='active') <> 1 then
    raise exception 'macro_cross_tenant_membership_count_invalid';
  end if;
  if exists (
    select 1
    from public.tenant_memberships
    where user_id='${created.otherTenant.id}'::uuid
      and tenant_id<>'${tenants.b}'::uuid
  ) then
    raise exception 'macro_cross_tenant_membership_leak';
  end if;
  if exists (
    select 1
    from public.tenant_memberships
    where user_id in (
      '${created.client.id}'::uuid,
      '${created.employee.id}'::uuid,
      '${created.partner.id}'::uuid,
      '${created.creator.id}'::uuid
    )
      and tenant_id<>'${tenants.a}'::uuid
  ) then
    raise exception 'macro_primary_tenant_membership_leak';
  end if;
end
$fixture_contract$;

commit;
`);

const fixture = { prefix, apiUrl, tenants, accounts: created };
await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
await chmod(fixturePath, 0o600);
console.log(JSON.stringify({ ok: true, users: Object.keys(created).length, tenants: 2, primaryTenant: tenants.a }));
