import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const action = process.argv[2] || "setup";
const dbUrl = process.env.DB_URL;
const fixturePath = process.env.CLOSEOUT_PORTAL_FIXTURE_FILE || "/tmp/hamza-macro-fixtures.json";
if (!dbUrl) throw new Error("missing_local_database_url");

const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const ids = {
  page: 910001,
  trashRestorePage: 910002,
  trashDeletePage: 910003,
  trashRestore: 920001,
  trashDelete: 920002,
  notificationOne: 930001,
  notificationTwo: 930002,
};
const applicationCode = "APP-2026-A1B2C3D4E5";
const serviceCode = "SR-2026-A1B2C3D4E5";

function psql(sql) {
  execFileSync("psql", [dbUrl, "--no-psqlrc", "-X", "-v", "ON_ERROR_STOP=1", "-q"], {
    input: sql,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

if (action === "cleanup") {
  console.log(JSON.stringify({ ok: true, delegatedToMacroCleanup: true }));
  process.exit(0);
}

psql(`
begin;

-- The database is disposable and isolated. Delete by deterministic fixture keys
-- instead of assuming uniqueness constraints that are not part of the runtime contract.
delete from public.notifications where id in (${ids.notificationOne},${ids.notificationTwo});
delete from public.trash_items where id in (${ids.trashRestore},${ids.trashDelete});
delete from public.page_builder_sections where page_id in (${ids.page},${ids.trashRestorePage},${ids.trashDeletePage});
delete from public.pages where id in (${ids.page},${ids.trashRestorePage},${ids.trashDeletePage});
delete from public.service_requests where request_code=${q(serviceCode)};
delete from public.agency_applications where tracking_code=${q(applicationCode)};
delete from public.admin_users where lower(email)=lower(${q(fixture.accounts.employee.email)});

insert into public.admin_users(email,role,is_active)
values (${q(fixture.accounts.employee.email)},'super_admin',true);

insert into public.agency_applications(full_name,country,whatsapp,platform,status,tracking_code)
values ('Closeout Applicant','TR','+900000000001','tiktok','new',${q(applicationCode)});

insert into public.service_requests(request_code,full_name,country,whatsapp,service_type,platform,status)
values (${q(serviceCode)},'Closeout Service','TR','+900000000002','account_management','tiktok','new');

insert into public.pages(id,title,slug,content,is_published,publishing_status)
values
 (${ids.page},'Closeout Runtime Page','fixture-page','Closeout runtime page',false,'draft'),
 (${ids.trashRestorePage},'Restore Me','restore-me','Restore content',false,'draft'),
 (${ids.trashDeletePage},'Delete Me','delete-me','Delete content',false,'draft');

insert into public.page_builder_sections(page_id,section_type,section_key,title,body,sort_order,language,is_visible,settings)
values
 (${ids.page},'rich_text','hero','عنوان عربي حقيقي','محتوى عربي حقيقي من قاعدة البيانات',1,'ar',true,'{}'),
 (${ids.page},'rich_text','hero','Real English title','Real English database content',1,'en',true,'{}'),
 (${ids.page},'rich_text','hero','Gerçek Türkçe başlık','Gerçek Türkçe veritabanı içeriği',1,'tr',true,'{}');

insert into public.trash_items(id,item_type,item_id,title,data,item_data,restore_status,deleted_by_email)
select ${ids.trashRestore},'pages',id::text,title,to_jsonb(p),to_jsonb(p),'restorable',${q(fixture.accounts.employee.email)}
from public.pages p where id=${ids.trashRestorePage};

insert into public.trash_items(id,item_type,item_id,title,data,item_data,restore_status,deleted_by_email)
select ${ids.trashDelete},'pages',id::text,title,to_jsonb(p),to_jsonb(p),'restorable',${q(fixture.accounts.employee.email)}
from public.pages p where id=${ids.trashDeletePage};

delete from public.pages where id=${ids.trashRestorePage};

insert into public.notifications(id,title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,priority,metadata,tenant_id)
values
 (${ids.notificationOne},'Closeout notification 1','Unread real notification','system',false,'admin','closeout:notification:1','created','page',${q(String(ids.page))},'normal','{}',${q(fixture.tenants.a)}::uuid),
 (${ids.notificationTwo},'Closeout notification 2','Unread real notification','system',false,'admin','closeout:notification:2','created','page',${q(String(ids.page))},'high','{}',${q(fixture.tenants.a)}::uuid);

do $core_contract$
begin
  if not exists(select 1 from public.admin_users where lower(email)=lower(${q(fixture.accounts.employee.email)}) and role='super_admin' and is_active=true) then
    raise exception 'core_admin_fixture_invalid';
  end if;
  if not exists(select 1 from public.agency_applications where tracking_code=${q(applicationCode)} and status='new') then
    raise exception 'core_application_fixture_invalid';
  end if;
  if not exists(select 1 from public.service_requests where request_code=${q(serviceCode)} and status='new') then
    raise exception 'core_service_fixture_invalid';
  end if;
  if (select count(*) from public.page_builder_sections where page_id=${ids.page} and language in('ar','en','tr')) <> 3 then
    raise exception 'core_page_translations_invalid';
  end if;
  if exists(select 1 from public.pages where id=${ids.trashRestorePage}) then
    raise exception 'core_trash_restore_source_not_deleted';
  end if;
  if (select count(*) from public.notifications where id in(${ids.notificationOne},${ids.notificationTwo}) and is_read=false) <> 2 then
    raise exception 'core_notifications_invalid';
  end if;
end
$core_contract$;

commit;
`);

fixture.core = { ...ids, applicationCode, serviceCode };
await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
console.log(JSON.stringify({ ok: true, page: ids.page, applicationCode, serviceCode, applicationStatus: "new", serviceStatus: "new" }));
