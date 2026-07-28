begin;

create or replace function public.pr99_backup_schedule_status()
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 v_actor text:=public.pr99_require_admin();
 v_available boolean:=false;
 v_job_id bigint:=null;
 v_job_active boolean:=false;
 v_schedule text:=null;
 v_last_run timestamptz:=null;
 v_last_status text:=null;
 v_last_code text:=null;
 v_last_success timestamptz:=null;
 v_last_success_code text:=null;
begin
 select exists(select 1 from pg_extension where extname='pg_cron') into v_available;
 if v_available then
  select jobid,active,schedule into v_job_id,v_job_active,v_schedule from cron.job where jobname='pr99-private-daily-backup' limit 1;
 end if;
 select created_at,status,backup_code into v_last_run,v_last_status,v_last_code from public.backups where mode='auto' order by created_at desc limit 1;
 select created_at,backup_code into v_last_success,v_last_success_code from public.backups where mode='auto' and status in('completed','success','completed_with_warnings') order by created_at desc limit 1;
 return jsonb_build_object(
  'actor',v_actor,
  'available',v_available,
  'scheduled',v_available and v_job_id is not null and coalesce(v_job_active,false),
  'schedule',case when v_available then v_schedule else null end,
  'last_run',v_last_run,
  'last_status',v_last_status,
  'last_code',v_last_code,
  'last_success',v_last_success,
  'last_success_code',v_last_success_code
 );
end $$;

revoke all on function public.pr99_backup_schedule_status() from public,anon;
grant execute on function public.pr99_backup_schedule_status() to authenticated;

comment on function public.pr99_backup_schedule_status is
 'Reports pg_cron availability and backup status safely even when pg_cron or prior auto backups are unavailable.';

commit;
