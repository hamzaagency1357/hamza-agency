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
  pageMobile: 910006,
  trashRestorePage: 910002,
  trashDeletePage: 910003,
  trashRestorePageMobile: 910004,
  trashDeletePageMobile: 910005,
  trashRestore: 920001,
  trashDelete: 920002,
  trashRestoreMobile: 920003,
  trashDeleteMobile: 920004,
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

const pageIds = [ids.page, ids.pageMobile, ids.trashRestorePage, ids.trashDeletePage, ids.trashRestorePageMobile, ids.trashDeletePageMobile];
const trashIds = [ids.trashRestore, ids.trashDelete, ids.trashRestoreMobile, ids.trashDeleteMobile];
const notificationIds = [ids.notificationOne, ids.notificationTwo];

psql(`
begin;

delete from public.notifications where id in (${notificationIds.join(",")});
delete from public.trash_items where id in (${trashIds.join(",")});
delete from public.page_builder_sections where page_id in (${pageIds.join(",")});
delete from public.pages where id in (${pageIds.join(",")});
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
 (${ids.pageMobile},'Closeout Runtime Mobile Page','fixture-page-mobile','Closeout runtime mobile page',false,'draft'),
 (${ids.trashRestorePage},'Restore Desktop','restore-desktop','Restore desktop content',false,'draft'),
 (${ids.trashDeletePage},'Delete Desktop','delete-desktop','Delete desktop content',false,'draft'),
 (${ids.trashRestorePageMobile},'Restore Mobile','restore-mobile','Restore mobile content',false,'draft'),
 (${ids.trashDeletePageMobile},'Delete Mobile','delete-mobile','Delete mobile content',false,'draft');

insert into public.page_builder_sections(page_id,section_type,section_key,title,body,sort_order,language,is_visible,settings)
values
 (${ids.page},'text','hero','عنوان عربي حقيقي','محتوى عربي حقيقي من قاعدة البيانات',1,'ar',true,'{}'),
 (${ids.page},'text','hero','Real English title','Real English database content',1,'en',true,'{}'),
 (${ids.page},'text','hero','Gerçek Türkçe başlık','Gerçek Türkçe veritabanı içeriği',1,'tr',true,'{}'),
 (${ids.pageMobile},'text','hero','عنوان عربي حقيقي للجوال','محتوى عربي حقيقي للجوال من قاعدة البيانات',1,'ar',true,'{}'),
 (${ids.pageMobile},'text','hero','Real mobile English title','Real mobile English database content',1,'en',true,'{}'),
 (${ids.pageMobile},'text','hero','Gerçek mobil Türkçe başlık','Gerçek mobil Türkçe veritabanı içeriği',1,'tr',true,'{}');

insert into public.trash_items(id,item_type,item_id,title,data,item_data,restore_status,deleted_by_email)
select ${ids.trashRestore},'pages',id::text,title,to_jsonb(p),to_jsonb(p),'restorable',${q(fixture.accounts.employee.email)}
from public.pages p where id=${ids.trashRestorePage};

insert into public.trash_items(id,item_type,item_id,title,data,item_data,restore_status,deleted_by_email)
select ${ids.trashDelete},'pages',id::text,title,to_jsonb(p),to_jsonb(p),'restorable',${q(fixture.accounts.employee.email)}
from public.pages p where id=${ids.trashDeletePage};

insert into public.trash_items(id,item_type,item_id,title,data,item_data,restore_status,deleted_by_email)
select ${ids.trashRestoreMobile},'pages',id::text,title,to_jsonb(p),to_jsonb(p),'restorable',${q(fixture.accounts.employee.email)}
from public.pages p where id=${ids.trashRestorePageMobile};

insert into public.trash_items(id,item_type,item_id,title,data,item_data,restore_status,deleted_by_email)
select ${ids.trashDeleteMobile},'pages',id::text,title,to_jsonb(p),to_jsonb(p),'restorable',${q(fixture.accounts.employee.email)}
from public.pages p where id=${ids.trashDeletePageMobile};

delete from public.pages where id in (${ids.trashRestorePage},${ids.trashRestorePageMobile});

insert into public.notifications(id,title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,priority,metadata,tenant_id)
values
 (${ids.notificationOne},'Closeout admin desktop','Unread desktop notification','system',false,'admin','closeout:admin:desktop','created','page',${q(String(ids.page))},'normal','{}',${q(fixture.tenants.a)}::uuid),
 (${ids.notificationTwo},'Closeout admin mobile','Unread mobile notification','system',false,'admin','closeout:admin:mobile','created','page',${q(String(ids.pageMobile))},'high','{}',${q(fixture.tenants.a)}::uuid);

do $core_contract$
begin
  if not exists(select 1 from public.admin_users where lower(email)=lower(${q(fixture.accounts.employee.email)}) and role='super_admin' and is_active=true) then raise exception 'core_admin_fixture_invalid'; end if;
  if not exists(select 1 from public.agency_applications where tracking_code=${q(applicationCode)} and status='new') then raise exception 'core_application_fixture_invalid'; end if;
  if not exists(select 1 from public.service_requests where request_code=${q(serviceCode)} and status='new') then raise exception 'core_service_fixture_invalid'; end if;
  if (select count(*) from public.page_builder_sections where page_id in(${ids.page},${ids.pageMobile}) and language in('ar','en','tr') and section_type='text') <> 6 then raise exception 'core_page_translations_invalid'; end if;
  if exists(select 1 from public.pages where id in(${ids.trashRestorePage},${ids.trashRestorePageMobile})) then raise exception 'core_trash_restore_source_not_deleted'; end if;
  if (select count(*) from public.trash_items where id in(${trashIds.join(",")}) and restore_status='restorable') <> 4 then raise exception 'core_trash_items_invalid'; end if;
  if (select count(*) from public.notifications where id in(${notificationIds.join(",")}) and is_read=false) <> 2 then raise exception 'core_notifications_invalid'; end if;
end
$core_contract$;

commit;
`);

fixture.core = {
  ...ids,
  applicationCode,
  serviceCode,
  projects: {
    desktopChromium: {
      page: ids.page,
      slug: "fixture-page",
      copies: { ar: "محتوى عربي حقيقي من قاعدة البيانات", en: "Real English database content", tr: "Gerçek Türkçe veritabanı içeriği" },
      trashRestorePage: ids.trashRestorePage,
      trashDeletePage: ids.trashDeletePage,
      trashRestore: ids.trashRestore,
      trashDelete: ids.trashDelete,
      notification: ids.notificationOne,
      notificationTitle: "Closeout admin desktop",
    },
    mobileChromium: {
      page: ids.pageMobile,
      slug: "fixture-page-mobile",
      copies: { ar: "محتوى عربي حقيقي للجوال من قاعدة البيانات", en: "Real mobile English database content", tr: "Gerçek mobil Türkçe veritabanı içeriği" },
      trashRestorePage: ids.trashRestorePageMobile,
      trashDeletePage: ids.trashDeletePageMobile,
      trashRestore: ids.trashRestoreMobile,
      trashDelete: ids.trashDeleteMobile,
      notification: ids.notificationTwo,
      notificationTitle: "Closeout admin mobile",
    },
  },
};
await writeFile(fixturePath, JSON.stringify(fixture), { mode: 0o600 });
console.log(JSON.stringify({ ok: true, pages: [ids.page, ids.pageMobile], applicationCode, serviceCode, applicationStatus: "new", serviceStatus: "new", pageSectionType: "text", projectFixtures: 2 }));
