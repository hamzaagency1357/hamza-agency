-- HAMZA AGENCY PR105 workflow runtime evidence hardening.
-- Additive function replacement only; no business rows are changed.

create or replace function public.advance_workflow_runtime(
  p_tenant uuid,
  p_run uuid,
  p_success boolean,
  p_error_code text default null
)
returns text
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_run public.workflow_runs%rowtype;
  v_steps integer;
  v_event text;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  select * into v_run from public.workflow_runs
  where id=p_run and tenant_id=p_tenant for update;
  if v_run.id is null or v_run.status<>'running' then
    raise exception 'workflow_run_not_advanceable' using errcode='22023';
  end if;

  select count(*) into v_steps from public.workflow_steps
  where workflow_id=v_run.workflow_id and tenant_id=p_tenant;
  if v_steps<1 then raise exception 'workflow_has_no_steps' using errcode='22023'; end if;

  if p_success then
    update public.workflow_runs
    set current_step=current_step+1,
        status=case when current_step+1>=v_steps then 'completed' else 'running' end,
        finished_at=case when current_step+1>=v_steps then now() else null end,
        last_error_code=null
    where id=p_run returning * into v_run;
    v_event=case when v_run.status='completed' then 'completed' else 'started' end;
  else
    update public.workflow_runs
    set retry_count=retry_count+1,
        status=case when retry_count+1>=3 then 'failed' else 'waiting' end,
        finished_at=case when retry_count+1>=3 then now() else null end,
        last_error_code=left(coalesce(p_error_code,'unknown'),120)
    where id=p_run returning * into v_run;
    v_event=case when v_run.status='failed' then 'failed' else 'retried' end;
  end if;

  insert into public.workflow_events(
    tenant_id,run_id,event_type,idempotency_key,payload,error_code
  ) values(
    p_tenant,p_run,v_event,
    'advance:'||p_run||':'||v_run.retry_count||':'||v_run.current_step||':'||v_event,
    jsonb_build_object('status',v_run.status,'currentStep',v_run.current_step,'retryCount',v_run.retry_count),
    left(p_error_code,120)
  );

  insert into public.tenant_admin_audit(
    tenant_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    p_tenant,(select auth.uid()),'workflow.advance','workflow_run',p_run::text,
    jsonb_build_object('status',v_run.status,'event',v_event,'retryCount',v_run.retry_count,'currentStep',v_run.current_step)
  );

  if v_run.status in ('completed','failed') then
    insert into public.notifications(
      title,message,type,is_read,recipient_role,event_key,event_type,
      entity_type,entity_id,occurred_at,priority,metadata,tenant_id
    ) values(
      case when v_run.status='completed' then 'اكتمال سير العمل' else 'فشل سير العمل' end,
      case when v_run.status='completed' then 'اكتمل تنفيذ سير العمل بنجاح.' else 'توقف سير العمل بعد استنفاد محاولات إعادة التنفيذ.' end,
      'workflow',false,'admin','workflow:'||v_run.status||':'||p_run,v_run.status,
      'workflow_run',p_run::text,now(),case when v_run.status='failed' then 'critical' else 'normal' end,
      jsonb_build_object('tenant_id',p_tenant,'retry_count',v_run.retry_count,'current_step',v_run.current_step),p_tenant
    ) on conflict(event_key) where event_key is not null do nothing;
  end if;

  return v_run.status;
end
$$;

create or replace function public.resume_workflow_runtime(p_tenant uuid,p_run uuid)
returns text
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_run public.workflow_runs%rowtype;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  update public.workflow_runs set status='running',last_error_code=null
  where id=p_run and tenant_id=p_tenant and status='waiting'
  returning * into v_run;
  if v_run.id is null then raise exception 'workflow_run_not_resumable' using errcode='22023'; end if;

  insert into public.workflow_events(tenant_id,run_id,event_type,idempotency_key,payload)
  values(
    p_tenant,p_run,'retried','resume:'||p_run||':'||v_run.retry_count,
    jsonb_build_object('operation','resume','actorId',(select auth.uid()),'retryCount',v_run.retry_count)
  );
  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant,(select auth.uid()),'workflow.resume','workflow_run',p_run::text,jsonb_build_object('retryCount',v_run.retry_count));
  insert into public.notifications(
    title,message,type,is_read,recipient_role,event_key,event_type,
    entity_type,entity_id,occurred_at,priority,metadata,tenant_id
  ) values(
    'استئناف سير العمل','تم استئناف تنفيذ سير العمل.','workflow',false,'admin',
    'workflow:resumed:'||p_run||':'||v_run.retry_count,'resumed','workflow_run',p_run::text,now(),'normal',
    jsonb_build_object('tenant_id',p_tenant,'retry_count',v_run.retry_count),p_tenant
  ) on conflict(event_key) where event_key is not null do nothing;
  return v_run.status;
end
$$;

create or replace function public.workflow_runtime_evidence(p_tenant uuid,p_run uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private
as $$
declare v_result jsonb;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  select jsonb_build_object(
    'run',to_jsonb(r),
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]'::jsonb) from public.workflow_events e where e.run_id=r.id and e.tenant_id=p_tenant),
    'notificationCount',(select count(*) from public.notifications n where n.tenant_id=p_tenant and n.entity_type='workflow_run' and n.entity_id=r.id::text),
    'auditCount',(select count(*) from public.tenant_admin_audit a where a.tenant_id=p_tenant and a.entity_type='workflow_run' and a.entity_id=r.id::text)
  ) into v_result from public.workflow_runs r where r.id=p_run and r.tenant_id=p_tenant;
  if v_result is null then raise exception 'workflow_run_not_found' using errcode='22023'; end if;
  return v_result;
end
$$;

revoke all on function public.advance_workflow_runtime(uuid,uuid,boolean,text) from public;
revoke all on function public.resume_workflow_runtime(uuid,uuid) from public;
revoke all on function public.workflow_runtime_evidence(uuid,uuid) from public;
grant execute on function public.advance_workflow_runtime(uuid,uuid,boolean,text) to authenticated;
grant execute on function public.resume_workflow_runtime(uuid,uuid) to authenticated;
grant execute on function public.workflow_runtime_evidence(uuid,uuid) to authenticated;

do $contract$
begin
  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname in ('advance_workflow_runtime','resume_workflow_runtime','workflow_runtime_evidence')
      and p.prosecdef is not true
  ) then raise exception 'workflow_runtime_functions_must_be_security_definer'; end if;
end
$contract$;
