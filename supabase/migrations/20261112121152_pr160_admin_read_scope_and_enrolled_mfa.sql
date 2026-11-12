-- Apply atomically after the PR160 translation and legacy RPC authorization fix.
-- A deputy needs an explicit permission for private reads. Program admins keep
-- their own profile and assigned-program workflows.
create or replace function public.current_admin_has_module_permission(p_module text, p_action text default 'can_view')
returns boolean
language sql
stable security definer
set search_path = pg_catalog, public
as $scope$
  select exists (
    select 1
    from public.admin_users as admin
    where admin.user_id = (select auth.uid())
      and admin.is_active is true
      and (
        admin.role = 'super_admin'
        or (
          (
            admin.role = 'deputy_super_admin'
            or (admin.role = 'program_admin' and p_module in ('dashboard','applications','programs'))
          )
          and exists (
            select 1
            from public.admin_permissions as permission
            where permission.admin_user_id = admin.id
              and permission.module_key = p_module
              and (
                permission.can_manage is true
                or case p_action
                  when 'can_view' then permission.can_view
                  when 'can_create' then permission.can_create
                  when 'can_edit' then permission.can_edit
                  when 'can_delete' then permission.can_delete
                  when 'can_export' then permission.can_export
                  when 'can_manage' then permission.can_manage
                  else false
                end is true
              )
          )
        )
      )
  );
$scope$;

alter policy "Active platform admins can read admin users" on public.admin_users
  using (user_id = (select auth.uid()) or (select public.current_admin_has_module_permission('permissions')));

alter policy "allow_admins_activity_logs_select" on public.activity_logs
  using ((select public.current_admin_has_module_permission('activity_logs')));

alter policy "Admins can view backups" on public.backups
  using ((select public.current_admin_has_module_permission('backups')));

drop policy if exists "Admins manage job applications" on public.job_applications;
create policy "Admin jobs module reads applications" on public.job_applications
  for select to authenticated using ((select public.current_admin_has_module_permission('jobs')));

alter policy "Admins can read service requests" on public.service_requests
  using ((select public.current_admin_has_module_permission('service_requests')));

alter policy "allow_admins_media_select" on public.media
  using ((select public.current_admin_has_module_permission('media')));

drop policy if exists "Admins can read all pages" on public.pages;
alter policy "admins read all pages" on public.pages
  using ((select public.current_admin_has_module_permission('pages') or public.current_admin_has_module_permission('settings')));

drop policy if exists "Admins manage sections" on public.sections;
alter policy "Admins can read all sections" on public.sections
  using ((select public.current_admin_has_module_permission('pages') or public.current_admin_has_module_permission('settings')));

drop policy if exists "Admins manage version history" on public.version_history;
alter policy "Admins can read version history" on public.version_history
  using ((select public.current_admin_has_module_permission('version_history')));

-- Keep the existing operation and schedule behavior behind explicit module access.
create or replace function public.pr99_log_operation_failure(p_event_type text,p_entity_type text,p_entity_id text,p_safe_message text,p_route text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_key text;
begin
 if not public.current_admin_has_module_permission('activity_logs', 'can_manage') then
   raise exception 'Administrative module permission required' using errcode = '42501';
 end if;
 if p_event_type not in('publish_failure','backup_failure','restore_failure','permission_denied','notification_failure') then raise exception 'Unsupported failure event';end if;
 v_key:=p_event_type||':'||coalesce(p_entity_type,'operation')||':'||coalesce(p_entity_id,'unknown')||':'||to_char(now(),'YYYYMMDDHH24MI');
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome)
 values(v_actor,auth.uid(),p_event_type,coalesce(p_entity_type,'operation'),coalesce(p_entity_id,'unknown'),jsonb_build_object('safe_message',left(coalesce(p_safe_message,''),500)),left(coalesce(p_route,''),500),'failed');
 insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,metadata)
 values(case p_event_type when 'publish_failure' then 'فشل النشر' when 'backup_failure' then 'فشل النسخ الاحتياطي' when 'restore_failure' then 'فشل الاستعادة' when 'permission_denied' then 'رفض إجراء حساس' else 'فشل إشعار' end,left(coalesce(p_safe_message,'تعذر إكمال العملية بأمان.'),500),p_event_type,false,'admin',v_key,'failed',p_entity_type,p_entity_id,now(),case when p_event_type in('backup_failure','restore_failure','permission_denied') then 'critical' else 'high' end,jsonb_build_object('route',p_route)) on conflict(event_key) where event_key is not null do nothing;
end $$;

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
 if not public.current_admin_has_module_permission('launch_checklist', 'can_view') then
   raise exception 'Administrative module permission required' using errcode = '42501';
 end if;
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

-- System Health needs a summary while restore and snapshot payloads stay private.
create or replace function public.pr160_backup_health_status()
returns jsonb
language plpgsql
stable security definer
set search_path = pg_catalog, public
as $health$
begin
  if not exists (
    select 1 from public.admin_users as admin
    where admin.user_id = (select auth.uid()) and admin.is_active is true and admin.role = 'super_admin'
  ) then
    raise exception 'Backup health requires an authorized owner' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'restore', (
      select jsonb_build_object('mode', operation.mode, 'status', operation.status)
      from public.restore_operations as operation
      order by operation.created_at desc limit 1
    ),
    'snapshot', (
      select jsonb_build_object('migration_key', backup.migration_key, 'checksum_prefix', left(backup.checksum, 16))
      from public.operations_preflight_backups as backup
      order by backup.created_at desc limit 1
    )
  );
end;
$health$;

revoke all on function public.pr160_backup_health_status() from public, anon;
grant execute on function public.pr160_backup_health_status() to authenticated;

-- Supabase Auth supplies the signed AAL claim. Check it before the existing
-- trusted actor bridge can replace request claims for an allowlisted service RPC.
create or replace function public.pr160_admin_data_api_pre_request()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $mfa$
declare
  v_claims jsonb := auth.jwt();
  v_user_id uuid;
begin
  if v_claims ->> 'role' = 'authenticated'
    and v_claims ->> 'aal' is distinct from 'aal2'
  then
    v_user_id := auth.uid();
    if exists (
      select 1 from public.admin_users as admin
      where admin.user_id = v_user_id and admin.is_active is true
    )
    and exists (
      select 1 from auth.mfa_factors as factor
      where factor.user_id = v_user_id and factor.status = 'verified'
    )
    then
      raise exception 'Admin multi-factor authentication is required' using errcode = '42501';
    end if;
  end if;

  perform public.pr116_apply_trusted_admin_actor_context();
end;
$mfa$;

revoke all on function public.pr160_admin_data_api_pre_request() from public;
grant execute on function public.pr160_admin_data_api_pre_request() to anon, authenticated, service_role;
alter role authenticator set pgrst.db_pre_request = 'public.pr160_admin_data_api_pre_request';
notify pgrst, 'reload config';
