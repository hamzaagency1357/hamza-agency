-- Apply the read-scope migration first. Test rows are rolled back in this isolated database.
begin;

do $browser_acl$
declare
  table_name text;
  operation text;
begin
  foreach table_name in array array['public.activity_logs','public.backups','public.version_history'] loop
    foreach operation in array array['INSERT','UPDATE','DELETE'] loop
      if has_table_privilege('authenticated', table_name, operation)
         or has_table_privilege('anon', table_name, operation) then
        raise exception 'Direct browser write still granted on %: %', table_name, operation;
      end if;
    end loop;
  end loop;
  if not has_table_privilege('service_role', 'public.activity_logs', 'INSERT') then
    raise exception 'Trusted route lost audit logging';
  end if;
end
$browser_acl$;

insert into auth.users (id, email) values
  ('16010000-0000-4000-8000-000000000001', 'pr160-scope-owner@example.test'),
  ('16010000-0000-4000-8000-000000000002', 'pr160-scope-program@example.test'),
  ('16010000-0000-4000-8000-000000000003', 'pr160-scope-deputy@example.test');

insert into public.admin_users (user_id, email, role, is_active, assigned_program) values
  ('16010000-0000-4000-8000-000000000001', 'pr160-scope-owner@example.test', 'super_admin', true, null),
  ('16010000-0000-4000-8000-000000000002', 'pr160-scope-program@example.test', 'program_admin', true, 'tiktok'),
  ('16010000-0000-4000-8000-000000000003', 'pr160-scope-deputy@example.test', 'deputy_super_admin', true, null);

insert into public.admin_permissions (admin_email, admin_user_id, module_key, can_view)
select email, id, permitted.module_key, true
from public.admin_users cross join (values ('applications'), ('activity_logs')) as permitted(module_key)
where user_id = '16010000-0000-4000-8000-000000000002';

insert into public.pages (title, slug, publishing_status, is_published, tenant_id)
select item.title, item.slug, item.status, item.status = 'published', tenant.id
from public.tenants tenant cross join (
  values ('Isolated draft', 'pr160-scope-private', 'draft'), ('Isolated page', 'pr160-scope-public', 'published')
) as item(title, slug, status)
where tenant.is_primary and tenant.status = 'active';

insert into public.activity_logs (action, entity_type, entity_id, outcome, tenant_id)
select 'pr160_scope_fixture', 'page', 'private', 'success', id
from public.tenants where is_primary and status = 'active';

-- Owner policy: MFA enrollment is optional. A linked, active super_admin with
-- NO verified factor must retain AAL1 access to authorized owner-only scopes.
-- Once a factor is verified below, the same AAL1 session MUST be rejected.
set local role authenticated;
do $optional_unenrolled_owner$
begin
  perform set_config('request.jwt.claims',
    '{"role":"authenticated","sub":"16010000-0000-4000-8000-000000000001","aal":"aal1"}', true);
  perform public.pr160_admin_data_api_pre_request();
  if not exists (select 1 from public.pages where slug = 'pr160-scope-private')
     or not exists (select 1 from public.activity_logs where action = 'pr160_scope_fixture')
     or not (public.pr160_backup_health_status() ? 'restore')
     or public.current_admin_has_module_permission('permissions') is distinct from true
  then
    raise exception 'Unenrolled owner lost authorized AAL1 administration';
  end if;
end
$optional_unenrolled_owner$;
reset role;

insert into auth.mfa_factors (id, user_id, factor_type, status, secret, created_at, updated_at)
values ('16010000-0000-4000-8000-000000000010', '16010000-0000-4000-8000-000000000001',
  'totp', 'verified', 'ISOLATED_TEST_FACTOR', now(), now());

set local role authenticated;
do $scope$
declare
  person uuid;
begin
  foreach person in array array[
    '16010000-0000-4000-8000-000000000002'::uuid,
    '16010000-0000-4000-8000-000000000003'::uuid
  ] loop
    perform set_config('request.jwt.claims', jsonb_build_object('role','authenticated','sub',person,'aal','aal1')::text, true);
    perform public.pr160_admin_data_api_pre_request();
    if exists(select 1 from public.pages where slug = 'pr160-scope-private')
       or not exists(select 1 from public.pages where slug = 'pr160-scope-public')
       or exists(select 1 from public.activity_logs where action = 'pr160_scope_fixture')
       or exists(select 1 from public.admin_users where user_id = '16010000-0000-4000-8000-000000000001')
       or not exists(select 1 from public.admin_users where user_id = person)
       or public.current_admin_has_module_permission('contact')
       or public.current_admin_has_module_permission('activity_logs') then
      raise exception 'Platform admin read scope is too broad or denied public/self access';
    end if;
    if person = '16010000-0000-4000-8000-000000000002'
       and not public.current_admin_has_module_permission('applications') then
      raise exception 'Assigned program permission was lost';
    end if;
    begin
      perform public.pr160_backup_health_status();
      raise exception 'A non-owner read private backup health';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.pr99_log_operation_failure('backup_failure', 'backup', 'scope-check', 'Fixture', '/admin/backups');
      raise exception 'Unscoped administrator wrote a failure event';
    exception when insufficient_privilege then null;
    end;
    begin
      perform public.pr99_backup_schedule_status();
      raise exception 'Unscoped administrator read the backup schedule';
    exception when insufficient_privilege then null;
    end;
  end loop;

  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"16010000-0000-4000-8000-000000000001","aal":"aal1"}', true);
  begin
    perform public.pr160_admin_data_api_pre_request();
    raise exception 'Enrolled owner passed the Data API hook at AAL1';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"16010000-0000-4000-8000-000000000001","aal":"aal2"}', true);
  perform public.pr160_admin_data_api_pre_request();
  if not exists(select 1 from public.pages where slug = 'pr160-scope-private')
     or not exists(select 1 from public.activity_logs where action = 'pr160_scope_fixture')
     or not (public.pr160_backup_health_status() ? 'restore')
     or has_table_privilege('authenticated', 'public.operations_preflight_backups', 'SELECT') then
    raise exception 'Verified owner lost authorized Data API access';
  end if;
end
$scope$;

reset role;
insert into public.admin_permissions (admin_email, admin_user_id, module_key, can_view)
select email, id, 'pages', true
from public.admin_users where user_id = '16010000-0000-4000-8000-000000000003';

set local role authenticated;
do $deputy$
begin
  perform set_config('request.jwt.claims', '{"role":"authenticated","sub":"16010000-0000-4000-8000-000000000003","aal":"aal1"}', true);
  if not exists(select 1 from public.pages where slug = 'pr160-scope-private')
     or exists(select 1 from public.activity_logs where action = 'pr160_scope_fixture')
     or public.current_admin_has_module_permission('pages', 'can_edit') then
    raise exception 'Deputy Pages view does not match its explicit grant';
  end if;
end
$deputy$;

rollback;
select 'PR160 scoped administration reads and enrolled MFA: PASS' as result;
