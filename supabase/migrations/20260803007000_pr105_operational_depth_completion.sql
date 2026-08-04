-- HAMZA AGENCY PR105 operational depth completion
-- Additive-only runtime contracts for task collaboration, SLA state, and workflow resume evidence.

create table if not exists public.sla_runtime_states (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  policy_id uuid not null references public.sla_policies(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  status text not null default 'active' check (status in ('active','paused','warning','breached','resolved')),
  started_at timestamptz not null,
  paused_at timestamptz,
  paused_seconds bigint not null default 0 check (paused_seconds >= 0),
  warning_at timestamptz,
  breached_at timestamptz,
  resolved_at timestamptz,
  escalation_count integer not null default 0 check (escalation_count >= 0),
  updated_at timestamptz not null default now(),
  unique (tenant_id,entity_type,entity_id)
);

alter table public.sla_runtime_states enable row level security;
drop policy if exists "sla staff read runtime states" on public.sla_runtime_states;
create policy "sla staff read runtime states" on public.sla_runtime_states
for select to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['employee','tenant_admin','super_admin']));

create or replace function private.sla_business_minutes(
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_business_hours jsonb
)
returns integer
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $$
declare
  v_timezone text:=coalesce(nullif(p_business_hours->>'timezone',''),'UTC');
  v_start_text text:=coalesce(nullif(p_business_hours->>'start',''),'00:00');
  v_end_text text:=coalesce(nullif(p_business_hours->>'end',''),'23:59');
  v_days integer[];
  v_date date;
  v_last date;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_overlap_start timestamptz;
  v_overlap_end timestamptz;
  v_seconds numeric:=0;
begin
  select coalesce(array_agg(value::integer),array[1,2,3,4,5,6,7])
  into v_days
  from jsonb_array_elements_text(coalesce(p_business_hours->'days','[1,2,3,4,5,6,7]'::jsonb)) as day(value);

  if p_ended_at<=p_started_at then return 0; end if;
  v_date=(p_started_at at time zone v_timezone)::date;
  v_last=(p_ended_at at time zone v_timezone)::date;
  while v_date<=v_last loop
    if extract(isodow from v_date)::integer=any(v_days) then
      v_window_start=((v_date::text||' '||v_start_text)::timestamp at time zone v_timezone);
      v_window_end=((v_date::text||' '||v_end_text)::timestamp at time zone v_timezone);
      if v_window_end<=v_window_start then v_window_end=v_window_end+interval '1 day'; end if;
      v_overlap_start=greatest(p_started_at,v_window_start);
      v_overlap_end=least(p_ended_at,v_window_end);
      if v_overlap_end>v_overlap_start then
        v_seconds=v_seconds+extract(epoch from (v_overlap_end-v_overlap_start));
      end if;
    end if;
    v_date=v_date+1;
  end loop;
  return floor(v_seconds/60)::integer;
end $$;

revoke all on function private.sla_business_minutes(timestamptz,timestamptz,jsonb) from public;

create or replace function public.manage_task_collaboration(
  p_tenant uuid,
  p_task uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_id uuid;
  v_user uuid;
  v_assignment text;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  if not exists(select 1 from public.tasks where id=p_task and tenant_id=p_tenant) then
    raise exception 'task_not_found' using errcode='22023';
  end if;

  if p_action in ('assign','watch') then
    v_user=(p_payload->>'userId')::uuid;
    v_assignment=case when p_action='watch' then 'watcher' else 'assignee' end;
    if not exists(
      select 1 from public.tenant_memberships
      where tenant_id=p_tenant and user_id=v_user and status='active'
    ) then raise exception 'task_participant_not_in_tenant' using errcode='42501'; end if;
    insert into public.task_assignments(tenant_id,task_id,user_id,assignment_type)
    values(p_tenant,p_task,v_user,v_assignment)
    on conflict do nothing;
    v_id=p_task;
  elsif p_action='comment' then
    if char_length(trim(coalesce(p_payload->>'body',''))) not between 1 and 5000 then
      raise exception 'invalid_task_comment' using errcode='22023';
    end if;
    insert into public.task_comments(tenant_id,task_id,author_id,body,is_internal)
    values(p_tenant,p_task,(select auth.uid()),trim(p_payload->>'body'),coalesce((p_payload->>'internal')::boolean,true))
    returning id into v_id;
  elsif p_action='attachment' then
    if char_length(trim(coalesce(p_payload->>'fileName',''))) not between 1 and 255
       or char_length(trim(coalesce(p_payload->>'mimeType',''))) not between 1 and 120
       or coalesce((p_payload->>'sizeBytes')::bigint,0) not between 1 and 10485760 then
      raise exception 'invalid_task_attachment_metadata' using errcode='22023';
    end if;
    insert into public.task_attachments(
      tenant_id,task_id,file_name,mime_type,size_bytes,uploaded_by
    ) values(
      p_tenant,p_task,trim(p_payload->>'fileName'),trim(p_payload->>'mimeType'),
      (p_payload->>'sizeBytes')::bigint,(select auth.uid())
    ) returning id into v_id;
  else
    raise exception 'unsupported_task_collaboration_action' using errcode='22023';
  end if;

  insert into public.tenant_admin_audit(
    tenant_id,actor_id,action,entity_type,entity_id,after_data
  ) values(
    p_tenant,(select auth.uid()),'task.'||p_action,'task',p_task::text,p_payload
  );

  return jsonb_build_object('id',v_id,'action',p_action);
end $$;

create or replace function public.manage_sla_runtime_state(
  p_tenant uuid,
  p_policy uuid,
  p_entity_type text,
  p_entity_id text,
  p_action text,
  p_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_state public.sla_runtime_states%rowtype;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  if not exists(select 1 from public.sla_policies where id=p_policy and tenant_id=p_tenant and active=true) then
    raise exception 'sla_policy_not_found' using errcode='22023';
  end if;

  if p_action='start' then
    insert into public.sla_runtime_states(
      tenant_id,policy_id,entity_type,entity_id,status,started_at
    ) values(
      p_tenant,p_policy,p_entity_type,p_entity_id,'active',p_at
    )
    on conflict(tenant_id,entity_type,entity_id) do update
    set policy_id=excluded.policy_id,status='active',started_at=excluded.started_at,
        paused_at=null,paused_seconds=0,warning_at=null,breached_at=null,
        resolved_at=null,escalation_count=0,updated_at=now()
    returning * into v_state;
  else
    select * into v_state from public.sla_runtime_states
    where tenant_id=p_tenant and entity_type=p_entity_type and entity_id=p_entity_id
    for update;
    if v_state.id is null then raise exception 'sla_runtime_state_not_found' using errcode='22023'; end if;

    if p_action='pause' then
      if v_state.status not in ('active','warning','breached') or v_state.paused_at is not null then
        raise exception 'sla_pause_not_allowed' using errcode='22023';
      end if;
      update public.sla_runtime_states set status='paused',paused_at=p_at,updated_at=now()
      where id=v_state.id returning * into v_state;
    elsif p_action='resume' then
      if v_state.status<>'paused' or v_state.paused_at is null or p_at<v_state.paused_at then
        raise exception 'sla_resume_not_allowed' using errcode='22023';
      end if;
      update public.sla_runtime_states
      set status='active',
          paused_seconds=paused_seconds+extract(epoch from (p_at-paused_at))::bigint,
          paused_at=null,updated_at=now()
      where id=v_state.id returning * into v_state;
    elsif p_action='resolve' then
      update public.sla_runtime_states
      set status='resolved',resolved_at=p_at,paused_at=null,updated_at=now()
      where id=v_state.id and status<>'resolved'
      returning * into v_state;
      if v_state.id is null then raise exception 'sla_resolve_not_allowed' using errcode='22023'; end if;
    elsif p_action='escalate' then
      update public.sla_runtime_states
      set escalation_count=escalation_count+1,updated_at=now()
      where id=v_state.id and status='breached'
      returning * into v_state;
      if v_state.id is null then raise exception 'sla_escalation_not_allowed' using errcode='22023'; end if;
      insert into public.notifications(
        title,message,type,is_read,recipient_role,event_key,event_type,
        entity_type,entity_id,occurred_at,priority,metadata,tenant_id
      ) values(
        'تصعيد SLA','تم تصعيد حالة تجاوز اتفاقية مستوى الخدمة.','sla',false,'admin',
        'sla:escalation:'||p_tenant||':'||p_entity_type||':'||p_entity_id||':'||v_state.escalation_count,
        'escalated',p_entity_type,p_entity_id,p_at,'critical',
        jsonb_build_object('tenant_id',p_tenant,'policy_id',p_policy,'count',v_state.escalation_count),p_tenant
      ) on conflict(event_key) where event_key is not null do nothing;
    else
      raise exception 'unsupported_sla_action' using errcode='22023';
    end if;
  end if;

  return to_jsonb(v_state);
end $$;

create or replace function public.evaluate_sla_business_runtime(
  p_tenant uuid,
  p_entity_type text,
  p_entity_id text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_state public.sla_runtime_states%rowtype;
  v_policy public.sla_policies%rowtype;
  v_effective_now timestamptz;
  v_minutes integer;
  v_event text;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  select * into v_state from public.sla_runtime_states
  where tenant_id=p_tenant and entity_type=p_entity_type and entity_id=p_entity_id
  for update;
  if v_state.id is null then raise exception 'sla_runtime_state_not_found' using errcode='22023'; end if;
  select * into v_policy from public.sla_policies where id=v_state.policy_id and tenant_id=p_tenant;
  v_effective_now=case when v_state.paused_at is not null then v_state.paused_at else p_now end;
  v_minutes=greatest(
    0,
    private.sla_business_minutes(v_state.started_at,v_effective_now,v_policy.business_hours)
      - floor(v_state.paused_seconds/60)::integer
  );

  if v_state.status='resolved' then
    v_event='resolved';
  elsif v_state.status='paused' then
    v_event='paused';
  elsif v_minutes>=v_policy.resolution_minutes then
    v_event='breached';
    update public.sla_runtime_states
    set status='breached',breached_at=coalesce(breached_at,p_now),updated_at=now()
    where id=v_state.id;
  elsif v_minutes>=greatest(1,floor(v_policy.resolution_minutes*0.8)::integer) then
    v_event='warning';
    update public.sla_runtime_states
    set status='warning',warning_at=coalesce(warning_at,p_now),updated_at=now()
    where id=v_state.id;
  else
    v_event='active';
  end if;

  if v_event in ('warning','breached') then
    insert into public.sla_events(
      tenant_id,policy_id,entity_type,entity_id,event_type,deadline_at,idempotency_key
    ) values(
      p_tenant,v_policy.id,p_entity_type,p_entity_id,v_event,p_now,
      'business:'||p_entity_type||':'||p_entity_id||':'||v_event
    ) on conflict do nothing;
    insert into public.notifications(
      title,message,type,is_read,recipient_role,event_key,event_type,
      entity_type,entity_id,occurred_at,priority,metadata,tenant_id
    ) values(
      case when v_event='breached' then 'تجاوز SLA' else 'تحذير SLA' end,
      case when v_event='breached' then 'تم تجاوز وقت المعالجة المحدد.' else 'اقتربت مهلة المعالجة من الانتهاء.' end,
      'sla',false,'admin',
      'sla:'||p_tenant||':'||p_entity_type||':'||p_entity_id||':'||v_event,
      v_event,p_entity_type,p_entity_id,p_now,
      case when v_event='breached' then 'critical' else 'high' end,
      jsonb_build_object('tenant_id',p_tenant,'policy_id',v_policy.id,'business_minutes',v_minutes),p_tenant
    ) on conflict(event_key) where event_key is not null do nothing;
  end if;

  return jsonb_build_object(
    'event',v_event,
    'businessMinutes',v_minutes,
    'pausedSeconds',v_state.paused_seconds,
    'resolutionMinutes',v_policy.resolution_minutes
  );
end $$;

create or replace function public.sla_runtime_kpis(p_tenant uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private
as $$
declare
  v_result jsonb;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  select jsonb_build_object(
    'total',count(*),
    'active',count(*) filter(where status='active'),
    'paused',count(*) filter(where status='paused'),
    'warning',count(*) filter(where status='warning'),
    'breached',count(*) filter(where status='breached'),
    'resolved',count(*) filter(where status='resolved'),
    'escalations',coalesce(sum(escalation_count),0)
  ) into v_result
  from public.sla_runtime_states where tenant_id=p_tenant;
  return v_result;
end $$;

create or replace function public.resume_workflow_runtime(p_tenant uuid,p_run uuid)
returns text
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_status text;
  v_resume_count integer;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  update public.workflow_runs
  set status='running',last_error_code=null
  where id=p_run and tenant_id=p_tenant and status='waiting'
  returning status into v_status;
  if v_status is null then raise exception 'workflow_run_not_resumable' using errcode='22023'; end if;

  select count(*)+1 into v_resume_count
  from public.workflow_events where run_id=p_run and tenant_id=p_tenant and event_type='retried';
  insert into public.workflow_events(
    tenant_id,run_id,event_type,idempotency_key,payload
  ) values(
    p_tenant,p_run,'retried','resume:'||p_run||':'||v_resume_count,
    jsonb_build_object('actor_id',(select auth.uid()),'resume_count',v_resume_count)
  );

  insert into public.notifications(
    title,message,type,is_read,recipient_role,event_key,event_type,
    entity_type,entity_id,occurred_at,priority,metadata,tenant_id
  ) values(
    'استئناف سير العمل','تم استئناف تنفيذ سير العمل.','workflow',false,'admin',
    'workflow:resumed:'||p_run,'resumed','workflow_run',p_run::text,now(),'normal',
    jsonb_build_object('tenant_id',p_tenant),p_tenant
  ) on conflict(event_key) where event_key is not null do nothing;

  return v_status;
end $$;

create or replace function public.workflow_runtime_evidence(p_tenant uuid,p_run uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private
as $$
declare
  v_result jsonb;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  select jsonb_build_object(
    'run',to_jsonb(r),
    'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at,e.id),'[]'::jsonb) from public.workflow_events e where e.run_id=r.id and e.tenant_id=p_tenant),
    'notificationCount',(select count(*) from public.notifications n where n.tenant_id=p_tenant and n.entity_type='workflow_run' and n.entity_id=r.id::text)
  ) into v_result
  from public.workflow_runs r where r.id=p_run and r.tenant_id=p_tenant;
  if v_result is null then raise exception 'workflow_run_not_found' using errcode='22023'; end if;
  return v_result;
end $$;

revoke all on function public.manage_task_collaboration(uuid,uuid,text,jsonb) from public;
revoke all on function public.manage_sla_runtime_state(uuid,uuid,text,text,text,timestamptz) from public;
revoke all on function public.evaluate_sla_business_runtime(uuid,text,text,timestamptz) from public;
revoke all on function public.sla_runtime_kpis(uuid) from public;
revoke all on function public.resume_workflow_runtime(uuid,uuid) from public;
revoke all on function public.workflow_runtime_evidence(uuid,uuid) from public;

grant execute on function public.manage_task_collaboration(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.manage_sla_runtime_state(uuid,uuid,text,text,text,timestamptz) to authenticated;
grant execute on function public.evaluate_sla_business_runtime(uuid,text,text,timestamptz) to authenticated;
grant execute on function public.sla_runtime_kpis(uuid) to authenticated;
grant execute on function public.resume_workflow_runtime(uuid,uuid) to authenticated;
grant execute on function public.workflow_runtime_evidence(uuid,uuid) to authenticated;
