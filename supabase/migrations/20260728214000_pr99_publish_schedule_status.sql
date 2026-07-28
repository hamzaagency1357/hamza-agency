begin;

create or replace function public.pr99_unpublish_page(p_page_id bigint,p_language text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_version bigint;v_count integer;
begin
 if p_language not in('ar','en','tr') then raise exception 'Unsupported language';end if;
 perform 1 from public.pages where id=p_page_id for update;if not found then raise exception 'Page not found';end if;
 v_version:=public.pr99_create_page_version(p_page_id,'unpublish',p_language,'Snapshot before unpublish');
 update public.sections set is_visible=false,is_published=false,publishing_status='unpublished',updated_at=now() where page_id=p_page_id and language=p_language and is_published=true;
 get diagnostics v_count=row_count;
 if not exists(select 1 from public.sections where page_id=p_page_id and is_published=true and publishing_status='published') then update public.pages set is_published=false,publishing_status='unpublished',updated_at=now() where id=p_page_id;end if;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'unpublish_page','page',p_page_id::text,jsonb_build_object('language',p_language,'sections',v_count,'version_id',v_version),'/admin/page-builder','success');
 return jsonb_build_object('page_id',p_page_id,'language',p_language,'sections',v_count,'version_id',v_version,'status','unpublished');
end $$;
revoke all on function public.pr99_unpublish_page(bigint,text) from public,anon;
grant execute on function public.pr99_unpublish_page(bigint,text) to authenticated;

create or replace function public.pr99_backup_schedule_status()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_available boolean;v_job record;v_last record;v_success record;
begin
 select exists(select 1 from pg_extension where extname='pg_cron') into v_available;
 if v_available then select jobid,active,schedule into v_job from cron.job where jobname='pr99-private-daily-backup' limit 1;end if;
 select created_at,status,backup_code into v_last from public.backups where mode='auto' order by created_at desc limit 1;
 select created_at,status,backup_code into v_success from public.backups where mode='auto' and status in('completed','success','completed_with_warnings') order by created_at desc limit 1;
 return jsonb_build_object('actor',v_actor,'available',v_available,'scheduled',v_job.jobid is not null and coalesce(v_job.active,false),'schedule',v_job.schedule,'last_run',v_last.created_at,'last_status',v_last.status,'last_code',v_last.backup_code,'last_success',v_success.created_at,'last_success_code',v_success.backup_code);
end $$;
revoke all on function public.pr99_backup_schedule_status() from public,anon;
grant execute on function public.pr99_backup_schedule_status() to authenticated;

comment on function public.pr99_unpublish_page is 'Unpublishes one locale transactionally after preserving a version snapshot.';
comment on function public.pr99_backup_schedule_status is 'Reports pg_cron availability, schedule state and last private backup run without exposing secrets.';
commit;
