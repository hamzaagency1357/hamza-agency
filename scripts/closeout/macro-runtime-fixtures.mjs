import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const action = process.argv[2] || "setup";
const dbUrl = process.env.DB_URL;
const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-macro-fixtures.json";
if (!dbUrl) throw new Error("missing_local_database_url");

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const ids = {
  category: "c10e2000-0000-4000-8000-000000000001",
  listing: "c10e2000-0000-4000-8000-000000000002",
  otherListing: "c10e2000-0000-4000-8000-000000000003",
  sla: "c10e2000-0000-4000-8000-000000000004",
  workflow: "c10e2000-0000-4000-8000-000000000005",
  stepOne: "c10e2000-0000-4000-8000-000000000006",
  stepTwo: "c10e2000-0000-4000-8000-000000000007",
};

function psql(sql) {
  execFileSync("psql", [dbUrl, "--no-psqlrc", "-X", "-v", "ON_ERROR_STOP=1", "-q"], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
}
function scalar(sql) {
  return execFileSync("psql", [dbUrl, "--no-psqlrc", "-X", "-Atqc", sql], { encoding: "utf8" }).trim();
}

if (action === "cleanup") {
  psql(`
    do $cleanup$
    declare table_list text;
    begin
      select string_agg(format('%I.%I', schemaname, tablename), ',')
      into table_list
      from pg_tables
      where schemaname='public';
      if table_list is not null then
        execute 'truncate table ' || table_list || ' restart identity cascade';
      end if;
    end
    $cleanup$;
  `);
  const remaining = scalar(`select count(*) from public.tenants where id in (${q(fixture.tenants.a)}::uuid,${q(fixture.tenants.b)}::uuid)`);
  if (remaining !== "0") throw new Error(`macro_fixture_cleanup_failed:${remaining}`);
  console.log(JSON.stringify({ ok: true, tenantRowsRemaining: 0 }));
  process.exit(0);
}

psql(`
begin;
insert into public.marketplace_categories(id,tenant_id,slug,translations,active)
values (${q(ids.category)}::uuid,${q(fixture.tenants.a)}::uuid,${q(`${fixture.prefix}-category`)},'{"ar":{"title":"اختبار"},"en":{"title":"Test"},"tr":{"title":"Test"}}',true)
on conflict (id) do update set tenant_id=excluded.tenant_id,slug=excluded.slug,active=true;

insert into public.marketplace_listings(id,tenant_id,partner_user_id,category_id,listing_type,status,slug,translations,price_amount,currency,availability)
values
 (${q(ids.listing)}::uuid,${q(fixture.tenants.a)}::uuid,${q(fixture.accounts.partner.id)}::uuid,${q(ids.category)}::uuid,'service','published',${q(`${fixture.prefix}-listing`)},'{"ar":{"title":"خدمة محلية"},"en":{"title":"Local service"}}',125.50,'USD','{"available":true,"quantitySupported":true}'),
 (${q(ids.otherListing)}::uuid,${q(fixture.tenants.b)}::uuid,${q(fixture.accounts.otherTenant.id)}::uuid,null,'service','published',${q(`${fixture.prefix}-other-listing`)},'{"en":{"title":"Other tenant"}}',10,'USD','{"available":true}')
on conflict (id) do update
set tenant_id=excluded.tenant_id,
    partner_user_id=excluded.partner_user_id,
    category_id=excluded.category_id,
    status='published',
    slug=excluded.slug,
    price_amount=excluded.price_amount,
    availability=excluded.availability;

insert into public.sla_policies(id,tenant_id,name,entity_type,first_response_minutes,resolution_minutes,business_hours,pause_statuses,active)
values (${q(ids.sla)}::uuid,${q(fixture.tenants.a)}::uuid,'Closeout SLA','service_request',10,60,'{"timezone":"Europe/Istanbul","days":[1,2,3,4,5],"start":"09:00","end":"18:00"}',array['waiting_customer'],true)
on conflict (id) do update
set tenant_id=excluded.tenant_id,
    first_response_minutes=excluded.first_response_minutes,
    resolution_minutes=excluded.resolution_minutes,
    business_hours=excluded.business_hours,
    pause_statuses=excluded.pause_statuses,
    active=true;

insert into public.workflow_definitions(id,tenant_id,name,trigger_type,version,status,definition,created_by)
values (${q(ids.workflow)}::uuid,${q(fixture.tenants.a)}::uuid,'Closeout Workflow','request.status_changed',1,'published','{"arbitraryCode":false}',${q(fixture.accounts.employee.id)}::uuid)
on conflict (id) do update
set tenant_id=excluded.tenant_id,
    status='published',
    definition=excluded.definition,
    created_by=excluded.created_by;

insert into public.workflow_steps(id,tenant_id,workflow_id,step_key,step_type,position,configuration,retry_limit)
values
 (${q(ids.stepOne)}::uuid,${q(fixture.tenants.a)}::uuid,${q(ids.workflow)}::uuid,'create_task','create_task',0,'{}',3),
 (${q(ids.stepTwo)}::uuid,${q(fixture.tenants.a)}::uuid,${q(ids.workflow)}::uuid,'notify','notify',1,'{}',3)
on conflict (id) do update
set tenant_id=excluded.tenant_id,
    workflow_id=excluded.workflow_id,
    position=excluded.position,
    retry_limit=excluded.retry_limit;

do $runtime_contract$
begin
  if not exists (
    select 1 from public.marketplace_listings
    where id=${q(ids.listing)}::uuid and tenant_id=${q(fixture.tenants.a)}::uuid
      and partner_user_id=${q(fixture.accounts.partner.id)}::uuid and status='published'
  ) then raise exception 'macro_listing_tenant_contract_invalid'; end if;
  if not exists (
    select 1 from public.marketplace_listings
    where id=${q(ids.otherListing)}::uuid and tenant_id=${q(fixture.tenants.b)}::uuid
      and partner_user_id=${q(fixture.accounts.otherTenant.id)}::uuid and status='published'
  ) then raise exception 'macro_cross_tenant_listing_contract_invalid'; end if;
  if not exists (
    select 1 from public.sla_policies
    where id=${q(ids.sla)}::uuid and tenant_id=${q(fixture.tenants.a)}::uuid and active=true
  ) then raise exception 'macro_sla_tenant_contract_invalid'; end if;
  if not exists (
    select 1 from public.workflow_definitions
    where id=${q(ids.workflow)}::uuid and tenant_id=${q(fixture.tenants.a)}::uuid
      and status='published' and coalesce((definition->>'arbitraryCode')::boolean,false)=false
  ) then raise exception 'macro_workflow_tenant_contract_invalid'; end if;
  if (select count(*) from public.workflow_steps where workflow_id=${q(ids.workflow)}::uuid and tenant_id=${q(fixture.tenants.a)}::uuid) <> 2 then raise exception 'macro_workflow_steps_contract_invalid'; end if;
end
$runtime_contract$;
commit;
`);

fixture.macro = ids;
await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
console.log(JSON.stringify({ ok: true, listing: ids.listing, sla: ids.sla, workflow: ids.workflow }));
