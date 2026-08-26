-- HAMZA AGENCY — PR-A stage 2: final security ACL lockdown.
-- Apply only after the trusted support path introduced by stage 1 has been proven operational.

begin;

do $prerequisite$
declare
  gateway_oid oid := to_regprocedure('public.pr100_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint)');
begin
  if gateway_oid is null or position('support_request_create' in pg_get_functiondef(gateway_oid)) = 0 then
    raise exception 'pr_a_lockdown_preparation_missing';
  end if;
end
$prerequisite$;

revoke all on function public.pr4_create_support_request(text,text,text,text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.pr4_create_support_request(text,text,text,text,text,boolean)
  to service_role;

revoke all on function public.pr99_build_backup_payload(text[]) from public, anon, authenticated;
revoke all on function public.pr99_restore_entity_rows(text,jsonb) from public, anon, authenticated;
revoke all on function public.pr4_audit_kb() from public, anon, authenticated;
revoke all on function public.pr4_touch_kb() from public, anon, authenticated;

do $security_contract$
declare
  support_oid oid := to_regprocedure('public.pr4_create_support_request(text,text,text,text,text,boolean)');
  backup_helper_oid oid := to_regprocedure('public.pr99_build_backup_payload(text[])');
  restore_helper_oid oid := to_regprocedure('public.pr99_restore_entity_rows(text,jsonb)');
  audit_trigger_oid oid := to_regprocedure('public.pr4_audit_kb()');
  touch_trigger_oid oid := to_regprocedure('public.pr4_touch_kb()');
begin
  if support_oid is null
     or backup_helper_oid is null
     or restore_helper_oid is null
     or audit_trigger_oid is null
     or touch_trigger_oid is null then
    raise exception 'pr_a_lockdown_required_function_missing';
  end if;

  if has_function_privilege('anon', support_oid, 'EXECUTE')
     or has_function_privilege('authenticated', support_oid, 'EXECUTE')
     or not has_function_privilege('service_role', support_oid, 'EXECUTE') then
    raise exception 'pr_a_support_create_execute_contract_invalid';
  end if;

  if has_function_privilege('anon', backup_helper_oid, 'EXECUTE')
     or has_function_privilege('authenticated', backup_helper_oid, 'EXECUTE') then
    raise exception 'pr_a_backup_helper_execute_contract_invalid';
  end if;
  if has_function_privilege('anon', restore_helper_oid, 'EXECUTE')
     or has_function_privilege('authenticated', restore_helper_oid, 'EXECUTE') then
    raise exception 'pr_a_restore_helper_execute_contract_invalid';
  end if;
  if has_function_privilege('anon', audit_trigger_oid, 'EXECUTE')
     or has_function_privilege('authenticated', audit_trigger_oid, 'EXECUTE') then
    raise exception 'pr_a_kb_audit_trigger_execute_contract_invalid';
  end if;
  if has_function_privilege('anon', touch_trigger_oid, 'EXECUTE')
     or has_function_privilege('authenticated', touch_trigger_oid, 'EXECUTE') then
    raise exception 'pr_a_kb_touch_trigger_execute_contract_invalid';
  end if;
end
$security_contract$;

commit;
