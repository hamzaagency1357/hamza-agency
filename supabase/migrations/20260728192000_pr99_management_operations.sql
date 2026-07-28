begin;

-- PR #99 management and operations foundation. Additive and non-destructive.
alter table public.activity_logs add column if not exists actor_user_id uuid;
alter table public.activity_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.activity_logs add column if not exists source_route text;
alter table public.activity_logs add column if not exists outcome text not null default 'success';

alter table public.backups add column if not exists project_ref text;
alter table public.backups add column if not exists schema_version integer not null default 1;
alter table public.backups add column if not exists checksum text;
alter table public.backups add column if not exists scope text[] not null default '{}';
alter table public.backups add column if not exists started_at timestamptz;
alter table public.backups add column if not exists completed_at timestamptz;
alter table public.backups add column if not exists restore_tested_at timestamptz;

alter table public.sections add column if not exists language text not null default 'ar';
update public.sections set language = case when settings->>'language' in ('ar','en','tr') then settings->>'language' else 'ar' end;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='sections_language_check') then
    alter table public.sections add constraint sections_language_check check (language in ('ar','en','tr')) not valid;
    alter table public.sections validate constraint sections_language_check;
  end if;
end $$;
drop index if exists public.sections_page_key_unique_idx;
create unique index if not exists sections_page_language_key_uidx on public.sections(page_id,language,section_key);

alter table public.version_history add column if not exists page_id bigint;
alter table public.version_history add column if not exists operation text not null default 'publish';
alter table public.version_history add column if not exists page_snapshot jsonb not null default '{}'::jsonb;
alter table public.version_history add column if not exists sections_snapshot jsonb not null default '[]'::jsonb;
alter table public.version_history add column if not exists locale text;
create index if not exists version_history_page_created_idx on public.version_history(page_id,created_at desc) where page_id is not null;

alter table public.notifications add column if not exists event_key text;
alter table public.notifications add column if not exists event_type text;
alter table public.notifications add column if not exists entity_type text;
alter table public.notifications add column if not exists entity_id text;
alter table public.notifications add column if not exists occurred_at timestamptz not null default now();
create unique index if not exists notifications_event_key_uidx on public.notifications(event_key) where event_key is not null;
create index if not exists notifications_inbox_idx on public.notifications(is_deleted,is_archived,is_read,occurred_at desc);

create table if not exists public.public_submission_guards(
 id uuid primary key default gen_random_uuid(), form_type text not null check(form_type in ('application','service_request','contact','ai_support','password_reset')),
 identity_hash text not null,payload_hash text not null,accepted boolean not null default false,reason text,created_at timestamptz not null default now()
);
alter table public.public_submission_guards enable row level security;
revoke all on public.public_submission_guards from anon,authenticated;
create index if not exists public_submission_guards_identity_idx on public.public_submission_guards(form_type,identity_hash,created_at desc);
create index if not exists public_submission_guards_payload_idx on public.public_submission_guards(form_type,payload_hash,created_at desc);

create table if not exists public.restore_operations(
 id uuid primary key default gen_random_uuid(),project_ref text not null,backup_code text,mode text not null check(mode in ('dry_run','restore_test','restore')),
 status text not null check(status in ('pending','validated','completed','failed')),scope text[] not null default '{}',summary jsonb not null default '{}'::jsonb,
 checksum text,created_by text,created_at timestamptz not null default now(),completed_at timestamptz
);
alter table public.restore_operations enable row level security;
revoke all on public.restore_operations from anon,authenticated;

drop policy if exists "submission guards readable by admins" on public.public_submission_guards;
create policy "submission guards readable by admins" on public.public_submission_guards for select to authenticated using(public.current_user_is_admin());
drop policy if exists "restore operations readable by admins" on public.restore_operations;
create policy "restore operations readable by admins" on public.restore_operations for select to authenticated using(public.current_user_is_admin());

create or replace function public.pr99_require_admin() returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_email text:=lower(coalesce(auth.jwt()->>'email',''));
begin
 if v_email='' or not exists(select 1 from public.admin_users a where lower(a.email)=v_email and a.is_active=true) then raise exception 'Not authorized' using errcode='42501'; end if;
 return v_email;
end $$;
revoke all on function public.pr99_require_admin() from public,anon;
grant execute on function public.pr99_require_admin() to authenticated;

create or replace function public.pr99_sanitize_text(p_value text,p_max integer default 5000) returns text language sql immutable set search_path=pg_catalog as $$
 select left(regexp_replace(regexp_replace(coalesce(p_value,''),'<\s*(script|iframe|object|embed|style)[^>]*>.*?<\s*/\s*\1\s*>','','gis'),'on[a-z]+\s*=|javascript:|data:text/html','','gi'),greatest(1,least(coalesce(p_max,5000),50000)))
$$;

create or replace function public.pr99_create_page_version(p_page_id bigint,p_operation text,p_locale text default null,p_summary text default null)
returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_page jsonb;v_sections jsonb;v_version integer;v_id bigint;
begin
 select to_jsonb(p) into v_page from public.pages p where p.id=p_page_id;
 if v_page is null then raise exception 'Page not found'; end if;
 select coalesce(jsonb_agg(to_jsonb(s) order by s.language,s.sort_order,s.id),'[]'::jsonb) into v_sections from public.sections s where s.page_id=p_page_id;
 select coalesce(max(version_number),0)+1 into v_version from public.version_history where page_id=p_page_id or (page_id is null and item_type='page' and item_id=p_page_id::text);
 insert into public.version_history(item_type,item_id,version_number,data,changed_by_email,change_summary,entity_type,entity_id,action,title,summary,metadata,changed_by,page_id,operation,page_snapshot,sections_snapshot,locale)
 values('page',p_page_id::text,v_version,jsonb_build_object('page',v_page,'sections',v_sections),v_actor,p_summary,'page',p_page_id::text,coalesce(p_operation,'publish'),v_page->>'title',p_summary,jsonb_build_object('locale',p_locale),v_actor,p_page_id,coalesce(p_operation,'publish'),v_page,v_sections,p_locale) returning id into v_id;
 delete from public.version_history where id in(select id from public.version_history where page_id=p_page_id order by created_at desc,id desc offset 30);
 return v_id;
end $$;
revoke all on function public.pr99_create_page_version(bigint,text,text,text) from public,anon;
grant execute on function public.pr99_create_page_version(bigint,text,text,text) to authenticated;

create or replace function public.save_page_builder_draft(p_page_id bigint,p_language text,p_sections jsonb,p_page_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_item jsonb;v_index integer:=0;v_type text;v_allowed text[]:=array['hero','rich_text','text','text_image','cards','programs','stats','cta','faq','gallery','partners','reviews','success_stories','contact','spacer','divider'];
begin
 if p_language not in('ar','en','tr') then raise exception 'Unsupported language'; end if;
 if jsonb_typeof(p_sections)<>'array' or jsonb_array_length(p_sections)>80 then raise exception 'Invalid sections payload'; end if;
 if not exists(select 1 from public.pages where id=p_page_id) then raise exception 'Page not found'; end if;
 for v_item in select value from jsonb_array_elements(p_sections) loop
  v_type:=coalesce(v_item->>'section_type',v_item->>'type','');
  if not(v_type=any(v_allowed)) then raise exception 'Unsupported section type'; end if;
  if length(coalesce(v_item->>'title',''))>300 or length(coalesce(v_item->>'body',''))>50000 then raise exception 'Section content exceeds allowed size'; end if;
 end loop;
 delete from public.page_builder_sections where page_id=p_page_id and language=p_language;
 for v_item in select value from jsonb_array_elements(p_sections) loop
  v_index:=v_index+1;v_type:=coalesce(v_item->>'section_type',v_item->>'type','text');
  insert into public.page_builder_sections(page_id,section_type,section_key,title,body,button_label,button_url,media_url,settings,sort_order,language,is_visible,created_by,updated_by)
  values(p_page_id,v_type,left(coalesce(nullif(v_item->>'section_key',''),nullif(v_item->>'id',''),'section-'||v_index),120),public.pr99_sanitize_text(v_item->>'title',300),public.pr99_sanitize_text(v_item->>'body',50000),nullif(public.pr99_sanitize_text(v_item->>'button_label',120),''),nullif(public.pr99_sanitize_text(v_item->>'button_url',1000),''),nullif(public.pr99_sanitize_text(v_item->>'media_url',1000),''),case when jsonb_typeof(v_item->'settings')='object' then v_item->'settings' else '{}'::jsonb end,v_index,p_language,coalesce((v_item->>'is_visible')::boolean,true),v_actor,v_actor);
 end loop;
 update public.pages set title=case when p_page_patch?'title' then nullif(public.pr99_sanitize_text(p_page_patch->>'title',300),'') else title end,slug=case when p_page_patch?'slug' then nullif(lower(regexp_replace(p_page_patch->>'slug','[^a-zA-Z0-9/_-]','','g')),'') else slug end,seo_title=case when p_page_patch?'seo_title' then public.pr99_sanitize_text(p_page_patch->>'seo_title',300) else seo_title end,seo_description=case when p_page_patch?'seo_description' then public.pr99_sanitize_text(p_page_patch->>'seo_description',1000) else seo_description end,canonical_url=case when p_page_patch?'canonical_url' then nullif(public.pr99_sanitize_text(p_page_patch->>'canonical_url',1000),'') else canonical_url end,og_image_url=case when p_page_patch?'og_image_url' then nullif(public.pr99_sanitize_text(p_page_patch->>'og_image_url',1000),'') else og_image_url end,publishing_status=case when p_page_patch->>'publishing_status' in('draft','review','published','unpublished','scheduled') then p_page_patch->>'publishing_status' else publishing_status end,updated_at=now() where id=p_page_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'save_page_builder_draft','page',p_page_id::text,'',jsonb_build_object('language',p_language,'sections',jsonb_array_length(p_sections)),'/admin/page-builder','success');
 return jsonb_build_object('page_id',p_page_id,'language',p_language,'sections',jsonb_array_length(p_sections),'saved_at',now());
end $$;
revoke all on function public.save_page_builder_draft(bigint,text,jsonb,jsonb) from public,anon;
grant execute on function public.save_page_builder_draft(bigint,text,jsonb,jsonb) to authenticated;

create or replace function public.publish_page_builder_page(p_page_id bigint,p_language text,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_page public.pages%rowtype;v_row public.page_builder_sections%rowtype;v_keys text[]:='{}';v_version bigint;v_count integer:=0;
begin
 if p_language not in('ar','en','tr') then raise exception 'Unsupported language'; end if;
 select * into v_page from public.pages where id=p_page_id for update;if not found then raise exception 'Page not found';end if;
 if coalesce(trim(v_page.title),'')='' or coalesce(trim(v_page.slug),'')='' then raise exception 'Page title and slug are required';end if;
 if not exists(select 1 from public.page_builder_sections where page_id=p_page_id and language=p_language and is_visible=true and trim(title)<>'' and trim(body)<>'') then raise exception 'Published language requires complete content';end if;
 if p_language<>'ar' and exists(select 1 from public.page_builder_sections where page_id=p_page_id and language=p_language and is_visible=true and(trim(title)='' or trim(body)='')) then raise exception 'Translation is incomplete';end if;
 v_version:=public.pr99_create_page_version(p_page_id,'publish',p_language,p_notes);
 for v_row in select * from public.page_builder_sections where page_id=p_page_id and language=p_language order by sort_order,id loop
  v_keys:=array_append(v_keys,v_row.section_key);
  insert into public.sections(page_id,page_slug,language,section_key,section_type,title,subtitle,content,media_url,sort_order,is_visible,is_published,settings,publishing_status,last_published_at,updated_at)
  values(p_page_id,v_page.slug,p_language,v_row.section_key,v_row.section_type,v_row.title,'',v_row.body,v_row.media_url,v_row.sort_order,v_row.is_visible,true,coalesce(v_row.settings,'{}'::jsonb)||jsonb_build_object('language',p_language,'source','page_builder','button_label',v_row.button_label,'button_url',v_row.button_url),'published',now(),now())
  on conflict(page_id,language,section_key) do update set page_slug=excluded.page_slug,section_type=excluded.section_type,title=excluded.title,subtitle=excluded.subtitle,content=excluded.content,media_url=excluded.media_url,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_published=true,settings=excluded.settings,publishing_status='published',last_published_at=now(),updated_at=now();v_count:=v_count+1;
 end loop;
 update public.sections set is_visible=false,publishing_status='unpublished',updated_at=now() where page_id=p_page_id and language=p_language and not(section_key=any(v_keys));
 update public.pages set is_published=true,publishing_status='published',last_published_at=now(),publishing_notes=p_notes,updated_at=now() where id=p_page_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'publish_page','page',p_page_id::text,'',jsonb_build_object('language',p_language,'sections',v_count,'version_id',v_version),'/admin/page-builder','success');
 return jsonb_build_object('page_id',p_page_id,'language',p_language,'sections',v_count,'version_id',v_version,'published_at',now());
end $$;
revoke all on function public.publish_page_builder_page(bigint,text,text) from public,anon;
grant execute on function public.publish_page_builder_page(bigint,text,text) to authenticated;

create or replace function public.restore_page_version(p_version_id bigint) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_version public.version_history%rowtype;v_page_id bigint;v_page jsonb;v_sections jsonb;v_item jsonb;v_new_version bigint;v_language text;
begin
 select * into v_version from public.version_history where id=p_version_id;if not found then raise exception 'Version not found';end if;
 v_page_id:=coalesce(v_version.page_id,case when v_version.item_type='page' and v_version.item_id~'^[0-9]+$' then v_version.item_id::bigint end);v_page:=coalesce(nullif(v_version.page_snapshot,'{}'::jsonb),v_version.data->'page');v_sections:=coalesce(nullif(v_version.sections_snapshot,'[]'::jsonb),v_version.data->'sections','[]'::jsonb);
 if v_page_id is null or v_page is null then raise exception 'Invalid page version';end if;
 v_new_version:=public.pr99_create_page_version(v_page_id,'pre_restore',v_version.locale,'Automatic snapshot before restore');
 update public.pages set title=coalesce(v_page->>'title',title),slug=coalesce(v_page->>'slug',slug),content=v_page->>'content',seo_title=v_page->>'seo_title',seo_description=v_page->>'seo_description',canonical_url=v_page->>'canonical_url',og_image_url=coalesce(v_page->>'og_image_url',v_page->>'og_image'),publishing_status='draft',is_published=false,updated_at=now() where id=v_page_id;
 update public.sections set is_visible=false,publishing_status='unpublished',updated_at=now() where page_id=v_page_id;
 for v_item in select value from jsonb_array_elements(v_sections) loop
  v_language:=case when v_item->>'language' in('ar','en','tr') then v_item->>'language' when v_item->'settings'->>'language' in('ar','en','tr') then v_item->'settings'->>'language' else 'ar' end;
  insert into public.sections(page_id,page_slug,program_slug,language,section_key,title,subtitle,content,media_url,background_type,background_value,sort_order,is_visible,is_published,section_type,settings,publishing_status,updated_at)
  values(v_page_id,v_item->>'page_slug',v_item->>'program_slug',v_language,v_item->>'section_key',v_item->>'title',v_item->>'subtitle',coalesce(v_item->>'content',''),v_item->>'media_url',v_item->>'background_type',v_item->>'background_value',coalesce((v_item->>'sort_order')::integer,0),coalesce((v_item->>'is_visible')::boolean,true),false,v_item->>'section_type',coalesce(v_item->'settings','{}'::jsonb),'draft',now())
  on conflict(page_id,language,section_key) do update set title=excluded.title,subtitle=excluded.subtitle,content=excluded.content,media_url=excluded.media_url,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_published=false,section_type=excluded.section_type,settings=excluded.settings,publishing_status='draft',updated_at=now();
 end loop;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'restore_page_version','page',v_page_id::text,'',jsonb_build_object('restored_version_id',p_version_id,'pre_restore_version_id',v_new_version),'/admin/version-history','success');
 return jsonb_build_object('page_id',v_page_id,'restored_version_id',p_version_id,'pre_restore_version_id',v_new_version,'status','draft');
end $$;
revoke all on function public.restore_page_version(bigint) from public,anon;
grant execute on function public.restore_page_version(bigint) to authenticated;

create or replace function public.pr99_guard_submission(p_form_type text,p_identity text,p_payload jsonb,p_started_at timestamptz,p_honeypot text default '') returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_identity_hash text;v_payload_hash text;v_recent integer;v_duplicate integer;v_reason text;
begin
 if p_form_type not in('application','service_request','contact','ai_support','password_reset') then raise exception 'Invalid form type';end if;
 if length(coalesce(p_payload::text,''))>30000 then v_reason:='payload_too_large';elsif coalesce(trim(p_honeypot),'')<>'' then v_reason:='honeypot';elsif p_started_at is null or p_started_at>now() or now()-p_started_at<interval '2 seconds' then v_reason:='submitted_too_fast';end if;
 v_identity_hash:=encode(digest(convert_to(lower(trim(coalesce(p_identity,'')))||':'||p_form_type,'UTF8'),'sha256'),'hex');v_payload_hash:=encode(digest(convert_to(coalesce(p_payload,'{}'::jsonb)::text,'UTF8'),'sha256'),'hex');
 select count(*) into v_recent from public.public_submission_guards where form_type=p_form_type and identity_hash=v_identity_hash and accepted=true and created_at>now()-interval '15 minutes';select count(*) into v_duplicate from public.public_submission_guards where form_type=p_form_type and payload_hash=v_payload_hash and accepted=true and created_at>now()-interval '24 hours';
 if v_reason is null and v_recent>=3 then v_reason:='cooldown';end if;if v_reason is null and v_duplicate>=1 then v_reason:='duplicate';end if;
 insert into public.public_submission_guards(form_type,identity_hash,payload_hash,accepted,reason) values(p_form_type,v_identity_hash,v_payload_hash,v_reason is null,v_reason);
 return jsonb_build_object('allowed',v_reason is null,'code',case when v_reason is null then 'ok' else 'try_again_later' end);
end $$;
revoke all on function public.pr99_guard_submission(text,text,jsonb,timestamptz,text) from public;
grant execute on function public.pr99_guard_submission(text,text,jsonb,timestamptz,text) to anon,authenticated;

create or replace function public.pr99_enqueue_notification() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_id text:=new.id::text;v_status text:=coalesce(to_jsonb(new)->>'status','new');v_event text:=case when tg_op='INSERT' then 'created' else 'status_changed' end;v_key text:=tg_table_name||':'||new.id::text||':'||v_event||':'||v_status;
begin
 if tg_op='UPDATE' and coalesce(to_jsonb(old)->>'status','')=v_status then return new;end if;
 insert into public.notifications(title,message,type,is_read,recipient_role,notification_key,metadata,is_archived,is_deleted,updated_at,event_key,event_type,entity_type,entity_id,occurred_at,href,source_table,source_id,priority)
 values(case tg_table_name when 'agency_applications' then 'طلب انضمام' when 'service_requests' then 'طلب خدمة' else 'طلب وظيفة' end,case when tg_op='INSERT' then 'تم استلام سجل جديد.' else 'تم تغيير حالة السجل إلى '||v_status||'.' end,tg_table_name,false,'admin',v_key,jsonb_build_object('operation',tg_op,'status',v_status),false,false,now(),v_key,v_event,tg_table_name,v_id,now(),case tg_table_name when 'agency_applications' then '/admin/applications' when 'service_requests' then '/admin/service-requests' else '/admin/jobs' end,tg_table_name,v_id,case when tg_op='INSERT' then 'high' else 'normal' end)
 on conflict(event_key) where event_key is not null do nothing;return new;
end $$;
revoke all on function public.pr99_enqueue_notification() from public,anon,authenticated;
drop trigger if exists pr99_application_notification on public.agency_applications;create trigger pr99_application_notification after insert or update of status on public.agency_applications for each row execute function public.pr99_enqueue_notification();
drop trigger if exists pr99_service_notification on public.service_requests;create trigger pr99_service_notification after insert or update of status on public.service_requests for each row execute function public.pr99_enqueue_notification();
drop trigger if exists pr99_job_application_notification on public.job_applications;create trigger pr99_job_application_notification after insert or update of status on public.job_applications for each row execute function public.pr99_enqueue_notification();

drop policy if exists "sections_public_read" on public.sections;drop policy if exists "Public can view sections" on public.sections;drop policy if exists "Allow public read sections" on public.sections;drop policy if exists "public reads published visible sections" on public.sections;
create policy "public reads published visible sections" on public.sections for select to anon,authenticated using((is_visible=true and is_published=true and publishing_status='published' and(scheduled_publish_at is null or scheduled_publish_at<=now()) and(scheduled_unpublish_at is null or scheduled_unpublish_at>now())) or public.current_user_is_admin());

comment on function public.save_page_builder_draft is 'Transactional Page Builder draft save with allowlisted fields and server-side validation.';
comment on function public.publish_page_builder_page is 'Transactional multilingual publish, version creation, activity audit, and safe hiding of removed sections.';
comment on function public.restore_page_version is 'Restores a historical page snapshot into a new draft and preserves history.';
comment on function public.pr99_guard_submission is 'Privacy-preserving server-side spam and duplicate guard; stores only SHA-256 hashes.';
commit;
