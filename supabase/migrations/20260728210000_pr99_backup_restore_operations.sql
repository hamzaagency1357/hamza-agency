begin;

create or replace function public.pr99_operations_allowlist() returns text[] language sql immutable set search_path=pg_catalog as $$
 select array['settings','pages','sections','page_builder_sections','content_translations','programs','announcements','jobs','reviews','success_stories','partners','gallery_items','faqs','knowledge_base','media']::text[]
$$;

create or replace function public.pr99_build_backup_payload(p_scope text[] default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_scope text[];v_table text;v_entities jsonb:='{}'::jsonb;v_rows jsonb;
begin
 v_scope:=coalesce(p_scope,public.pr99_operations_allowlist());
 if exists(select 1 from unnest(v_scope) x where not(x=any(public.pr99_operations_allowlist()))) then raise exception 'Unsupported backup scope';end if;
 foreach v_table in array v_scope loop
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by t.id),''[]''::jsonb) from public.%I t',v_table) into v_rows;
  v_entities:=v_entities||jsonb_build_object(v_table,coalesce(v_rows,'[]'::jsonb));
 end loop;
 return jsonb_build_object('format','hamza-agency-private-backup','schema_version',1,'project_ref','fvaurkfnsvsfohpzguho','created_at',now(),'created_by',v_actor,'scope',to_jsonb(v_scope),'entities',v_entities);
end $$;
revoke all on function public.pr99_build_backup_payload(text[]) from public,anon;
grant execute on function public.pr99_build_backup_payload(text[]) to authenticated;

create or replace function public.pr99_create_private_backup(p_scope text[] default null,p_mode text default 'manual',p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_payload jsonb;v_checksum text;v_code text;v_id bigint;v_scope text[];
begin
 v_scope:=coalesce(p_scope,public.pr99_operations_allowlist());v_payload:=public.pr99_build_backup_payload(v_scope);
 v_checksum:=encode(digest(convert_to((v_payload-'checksum')::text,'UTF8'),'sha256'),'hex');v_payload:=v_payload||jsonb_build_object('checksum',v_checksum);
 v_code:='BKP-'||to_char(now(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,8));
 insert into public.backups(backup_name,backup_type,notes,created_by,backup_code,title,file_name,status,mode,size_bytes,details,project_ref,schema_version,checksum,scope,started_at,completed_at)
 values('HAMZA AGENCY private backup',p_mode,p_notes,v_actor,v_code,'نسخة احتياطية خاصة',null,'completed',p_mode,octet_length(v_payload::text),v_payload,'fvaurkfnsvsfohpzguho',1,v_checksum,v_scope,now(),now()) returning id into v_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'backup_create','backup',v_id::text,'',jsonb_build_object('code',v_code,'scope',v_scope,'checksum',v_checksum),'/admin/backups','success');
 return jsonb_build_object('id',v_id,'backup_code',v_code,'checksum',v_checksum,'payload',v_payload);
exception when others then
 insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,occurred_at,priority,metadata) values('فشل النسخ الاحتياطي','تعذر إنشاء نسخة احتياطية خاصة.','backup_failure',false,'admin','backup-failure:'||extract(epoch from clock_timestamp())::bigint,'failed','backup',now(),'critical',jsonb_build_object('safe_error',sqlstate)) on conflict(event_key) where event_key is not null do nothing;
 raise;
end $$;
revoke all on function public.pr99_create_private_backup(text[],text,text) from public,anon;
grant execute on function public.pr99_create_private_backup(text[],text,text) to authenticated;

create or replace function public.pr99_backup_dry_run(p_backup jsonb,p_scope text[] default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_payload jsonb:=p_backup-'checksum';v_expected text:=coalesce(p_backup->>'checksum','');v_actual text;v_scope text[];v_table text;v_before bigint;v_after bigint;v_summary jsonb:='{}'::jsonb;v_operation uuid;
begin
 if p_backup->>'format'<>'hamza-agency-private-backup' or p_backup->>'project_ref'<>'fvaurkfnsvsfohpzguho' or coalesce((p_backup->>'schema_version')::integer,0)<>1 then raise exception 'Backup identity or schema is invalid';end if;
 v_actual:=encode(digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');if v_expected='' or v_expected<>v_actual then raise exception 'Backup checksum is invalid';end if;
 select coalesce(array_agg(value),public.pr99_operations_allowlist()) into v_scope from jsonb_array_elements_text(coalesce(to_jsonb(p_scope),p_backup->'scope'));
 if exists(select 1 from unnest(v_scope)x where not(x=any(public.pr99_operations_allowlist()))) then raise exception 'Unsupported restore scope';end if;
 foreach v_table in array v_scope loop
  execute format('select count(*) from public.%I',v_table) into v_before;
  select jsonb_array_length(coalesce(p_backup->'entities'->v_table,'[]'::jsonb)) into v_after;
  v_summary:=v_summary||jsonb_build_object(v_table,jsonb_build_object('before',v_before,'backup',v_after,'delta',v_after-v_before));
 end loop;
 insert into public.restore_operations(project_ref,backup_code,mode,status,scope,summary,checksum,created_by,completed_at) values('fvaurkfnsvsfohpzguho',p_backup->>'backup_code','dry_run','validated',v_scope,v_summary,v_actual,v_actor,now()) returning id into v_operation;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'restore_dry_run','restore_operation',v_operation::text,'',jsonb_build_object('scope',v_scope,'summary',v_summary),'/admin/backups','success');
 return jsonb_build_object('valid',true,'operation_id',v_operation,'scope',v_scope,'summary',v_summary,'checksum',v_actual);
end $$;
revoke all on function public.pr99_backup_dry_run(jsonb,text[]) from public,anon;
grant execute on function public.pr99_backup_dry_run(jsonb,text[]) to authenticated;

create or replace function public.pr99_restore_entity_rows(p_table text,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_row jsonb;v_filtered jsonb;v_insert_columns text;v_select_columns text;v_updates text;v_count integer:=0;
begin
 if not(p_table=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported restore entity';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 then raise exception 'Invalid restore rows';end if;
 select string_agg(format('%I',column_name),',' order by ordinal_position),
        string_agg(format('x.%I',column_name),',' order by ordinal_position),
        string_agg(format('%1$I=excluded.%1$I',column_name),',' order by ordinal_position) filter(where column_name<>'id')
 into v_insert_columns,v_select_columns,v_updates
 from information_schema.columns
 where table_schema='public' and table_name=p_table and is_generated='NEVER' and (is_identity='NO' or identity_generation='BY DEFAULT');
 if v_insert_columns is null or v_updates is null then raise exception 'Restore schema unavailable';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  if not(v_row?'id') then raise exception 'Restore row has no id';end if;
  select jsonb_object_agg(e.key,e.value) into v_filtered
  from jsonb_each(v_row)e
  join information_schema.columns c on c.table_schema='public' and c.table_name=p_table and c.column_name=e.key and c.is_generated='NEVER' and (c.is_identity='NO' or c.identity_generation='BY DEFAULT');
  execute format('insert into public.%1$I(%2$s) select %3$s from jsonb_populate_record(null::public.%1$I,$1) x on conflict (id) do update set %4$s',p_table,v_insert_columns,v_select_columns,v_updates) using coalesce(v_filtered,'{}'::jsonb);
  v_count:=v_count+1;
 end loop;
 return jsonb_build_object('table',p_table,'restored',v_count,'actor',v_actor);
end $$;
revoke all on function public.pr99_restore_entity_rows(text,jsonb) from public,anon;
grant execute on function public.pr99_restore_entity_rows(text,jsonb) to authenticated;

create or replace function public.pr99_restore_backup(p_backup jsonb,p_scope text[])
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_validation jsonb;v_pre jsonb;v_table text;v_results jsonb:='{}'::jsonb;v_operation uuid;
begin
 v_validation:=public.pr99_backup_dry_run(p_backup,p_scope);
 v_pre:=public.pr99_create_private_backup(p_scope,'pre_restore','Automatic private backup before restore');
 insert into public.restore_operations(project_ref,backup_code,mode,status,scope,summary,checksum,created_by) values('fvaurkfnsvsfohpzguho',p_backup->>'backup_code','restore','pending',p_scope,'{}',p_backup->>'checksum',v_actor) returning id into v_operation;
 foreach v_table in array p_scope loop v_results:=v_results||jsonb_build_object(v_table,public.pr99_restore_entity_rows(v_table,coalesce(p_backup->'entities'->v_table,'[]'::jsonb)));end loop;
 update public.restore_operations set status='completed',summary=jsonb_build_object('validation',v_validation,'results',v_results,'pre_restore_backup',v_pre->>'backup_code'),completed_at=now() where id=v_operation;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'backup_restore','restore_operation',v_operation::text,'',jsonb_build_object('scope',p_scope,'pre_restore_backup',v_pre->>'backup_code'),'/admin/backups','success');
 insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,metadata) values('اكتملت الاستعادة','اكتملت استعادة الكيانات المحددة بعد إنشاء نسخة تلقائية.','restore_completed',false,'admin','restore:'||v_operation,'completed','restore_operation',v_operation::text,now(),'high',jsonb_build_object('scope',p_scope,'pre_restore_backup',v_pre->>'backup_code')) on conflict(event_key) where event_key is not null do nothing;
 return jsonb_build_object('completed',true,'operation_id',v_operation,'results',v_results,'pre_restore_backup',v_pre->>'backup_code');
exception when others then
 raise;
end $$;
revoke all on function public.pr99_restore_backup(jsonb,text[]) from public,anon;
grant execute on function public.pr99_restore_backup(jsonb,text[]) to authenticated;

create or replace function public.pr99_soft_delete(p_table text,p_id text,p_title text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_data jsonb;v_published boolean:=false;v_trash bigint;
begin
 if not(p_table=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported trash entity';end if;
 execute format('select to_jsonb(t),coalesce((to_jsonb(t)->>''is_published'')::boolean,false) from public.%I t where t.id::text=$1',p_table) into v_data,v_published using p_id;
 if v_data is null then raise exception 'Entity not found';end if;
 insert into public.trash_items(item_type,item_id,title,data,deleted_by_email,restore_status,deleted_at,deleted_by,item_data,item_title) values(p_table,p_id,coalesce(p_title,v_data->>'title',v_data->>'name'),v_data,v_actor,'restorable',now(),v_actor,v_data,coalesce(p_title,v_data->>'title',v_data->>'name')) returning id into v_trash;
 begin execute format('update public.%I set is_visible=false where id::text=$1',p_table) using p_id; exception when undefined_column then execute format('update public.%I set status=''archived'' where id::text=$1',p_table) using p_id; end;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,old_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_soft_delete',p_table,p_id,v_data::text,jsonb_build_object('trash_id',v_trash,'was_published',v_published),'/admin/trash','success');
 return jsonb_build_object('trash_id',v_trash,'was_published',v_published,'warning',case when v_published then 'published_content' else null end);
end $$;
revoke all on function public.pr99_soft_delete(text,text,text) from public,anon;
grant execute on function public.pr99_soft_delete(text,text,text) to authenticated;

create or replace function public.pr99_restore_trash(p_trash_id bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_item public.trash_items%rowtype;v_result jsonb;
begin
 select * into v_item from public.trash_items where id=p_trash_id and restore_status='restorable' for update;if not found then raise exception 'Trash item unavailable';end if;
 v_result:=public.pr99_restore_entity_rows(v_item.item_type,jsonb_build_array(coalesce(v_item.item_data,v_item.data)));
 update public.trash_items set restore_status='restored',restored_at=now() where id=p_trash_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_restore',v_item.item_type,v_item.item_id,'',jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success');
 return v_result||jsonb_build_object('trash_id',p_trash_id);
end $$;
revoke all on function public.pr99_restore_trash(bigint) from public,anon;
grant execute on function public.pr99_restore_trash(bigint) to authenticated;

create or replace function public.pr99_permanent_delete_trash(p_trash_id bigint,p_confirmation text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_role text;v_item public.trash_items%rowtype;
begin
 select role into v_role from public.admin_users where lower(email)=v_actor and is_active=true;
 if v_role not in('super_admin','deputy_super_admin') then insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_permanent_delete_denied','trash_item',p_trash_id::text,jsonb_build_object('role',v_role),'/admin/trash','denied');raise exception 'Not authorized';end if;
 if p_confirmation<>'DELETE PERMANENTLY' then raise exception 'Second confirmation is invalid';end if;
 select * into v_item from public.trash_items where id=p_trash_id and restore_status='restorable' for update;if not found then raise exception 'Trash item unavailable';end if;
 if not(v_item.item_type=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported trash entity';end if;
 execute format('delete from public.%I where id::text=$1',v_item.item_type) using v_item.item_id;
 update public.trash_items set restore_status='permanently_deleted',item_data=null,data='{}'::jsonb where id=p_trash_id and restore_status='restorable';
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_permanent_delete',v_item.item_type,v_item.item_id,jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success');
 return jsonb_build_object('deleted',true,'trash_id',p_trash_id);
end $$;
revoke all on function public.pr99_permanent_delete_trash(bigint,text) from public,anon;
grant execute on function public.pr99_permanent_delete_trash(bigint,text) to authenticated;

create or replace function public.pr99_mark_notifications_read(p_ids bigint[] default null)
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_count integer;
begin
 update public.notifications set is_read=true,read=true,updated_at=now() where coalesce(is_deleted,false)=false and (p_ids is null or id=any(p_ids));get diagnostics v_count=row_count;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'notifications_mark_read','notifications',coalesce(array_to_string(p_ids,','),'all'),jsonb_build_object('count',v_count),'/admin/notifications','success');return v_count;
end $$;
revoke all on function public.pr99_mark_notifications_read(bigint[]) from public,anon;
grant execute on function public.pr99_mark_notifications_read(bigint[]) to authenticated;

create or replace function public.pr99_scheduled_private_backup() returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_payload jsonb;v_checksum text;v_code text;
begin
 v_payload:=jsonb_build_object('format','hamza-agency-private-backup','schema_version',1,'project_ref','fvaurkfnsvsfohpzguho','created_at',now(),'created_by','system','scope',to_jsonb(public.pr99_operations_allowlist()),'entities','{}'::jsonb);
 foreach v_code in array public.pr99_operations_allowlist() loop execute format('select jsonb_set($1,array[''entities'',%L],coalesce(jsonb_agg(to_jsonb(t) order by t.id),''[]''::jsonb),true) from public.%I t',v_code,v_code) into v_payload using v_payload;end loop;
 v_checksum:=encode(digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');v_payload:=v_payload||jsonb_build_object('checksum',v_checksum);v_code:='AUTO-'||to_char(now(),'YYYYMMDD-HH24MISS');
 insert into public.backups(backup_name,backup_type,created_by,backup_code,title,status,mode,size_bytes,details,project_ref,schema_version,checksum,scope,started_at,completed_at) values('Scheduled private backup','scheduled','system',v_code,'نسخة تلقائية خاصة','completed','auto',octet_length(v_payload::text),v_payload,'fvaurkfnsvsfohpzguho',1,v_checksum,public.pr99_operations_allowlist(),now(),now());
end $$;
revoke all on function public.pr99_scheduled_private_backup() from public,anon,authenticated;

do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.unschedule(jobid) from cron.job where jobname='pr99-private-daily-backup';
  perform cron.schedule('pr99-private-daily-backup','17 2 * * *','select public.pr99_scheduled_private_backup();');
 end if;
end $$;

comment on function public.pr99_backup_dry_run is 'Validates project, schema, checksum and reports per-entity before/backup counts without writing entity data.';
comment on function public.pr99_restore_backup is 'Transactional entity-scoped restore with automatic private pre-restore backup, audit and notification.';
comment on function public.pr99_scheduled_private_backup is 'Free private scheduled backup stored under RLS; no repository or public artifact.';

commit;
