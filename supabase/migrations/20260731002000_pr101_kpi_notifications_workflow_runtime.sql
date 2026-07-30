-- HAMZA AGENCY PR101 KPI, notification and workflow runtime
-- Additive and transactional. Replaces only PR101 triggers that have not been applied to Production.
begin;

create unique index if not exists notifications_tenant_event_uidx
on public.notifications(tenant_id,event_key)
where tenant_id is not null and event_key is not null;

-- Correct task lifecycle: completion timestamp is set before the row write,
-- while immutable history is recorded after the parent row exists.
drop trigger if exists tasks_status_history_trigger on public.tasks;
drop function if exists public.record_task_status_history();

create or replace function public.set_task_completion_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status in ('resolved','closed') and new.completed_at is null then new.completed_at=now(); end if;
  if new.status not in ('resolved','closed') and old.status in ('resolved','closed') then new.completed_at=null; end if;
  return new;
end;
$$;

drop trigger if exists tasks_completion_timestamp_trigger on public.tasks;
create trigger tasks_completion_timestamp_trigger
before update of status on public.tasks
for each row execute function public.set_task_completion_timestamp();

create or replace function private.capture_task_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.task_status_history(task_id,tenant_id,from_status,to_status,changed_by)
    values(new.id,new.tenant_id,case when tg_op='INSERT' then null else old.status end,new.status,(select auth.uid()));
  end if;
  return new;
end;
$$;
revoke all on function private.capture_task_status_history() from public,anon,authenticated;
drop trigger if exists tasks_status_history_after_trigger on public.tasks;
create trigger tasks_status_history_after_trigger
after insert or update of status on public.tasks
for each row execute function private.capture_task_status_history();

create or replace function private.emit_product_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_tenant uuid;
  target_user uuid;
  target_role text;
  event_name text;
  notification_title text;
  notification_message text;
  entity_kind text;
  entity_value text;
begin
  if tg_table_name='task_assignments' then
    target_tenant=new.tenant_id; target_user=new.user_id; event_name='task.assigned:'||new.task_id||':'||new.user_id;
    notification_title='مهمة جديدة'; notification_message='تم تعيين مهمة جديدة لك داخل بوابة التشغيل.'; entity_kind='task'; entity_value=new.task_id::text;
  elsif tg_table_name='sla_events' and new.event_type in ('warning','breached') then
    target_tenant=new.tenant_id; target_role='tenant_admin'; event_name='sla.'||new.event_type||':'||new.id;
    notification_title=case when new.event_type='breached' then 'تجاوز SLA' else 'تنبيه SLA' end;
    notification_message='يوجد حدث SLA يحتاج متابعة فريق التشغيل.'; entity_kind='sla_event'; entity_value=new.id::text;
  elsif tg_table_name='privacy_requests' then
    target_tenant=new.tenant_id; target_role='tenant_admin'; event_name='privacy.request.created:'||new.id;
    notification_title='طلب خصوصية جديد'; notification_message='تم استلام طلب خصوصية جديد يحتاج التحقق والمعالجة.'; entity_kind='privacy_request'; entity_value=new.id::text;
  elsif tg_table_name='security_alerts' then
    target_tenant=new.tenant_id; target_user=new.user_id; event_name='security.alert:'||new.id;
    notification_title='تنبيه أمان'; notification_message='تم تسجيل حدث أمان جديد على حسابك. راجع الأجهزة والجلسات.'; entity_kind='security_alert'; entity_value=new.id::text;
  elsif tg_table_name='incident_updates' then
    target_tenant=new.tenant_id; target_role='tenant_admin'; event_name='incident.update:'||new.id;
    notification_title='تحديث حادثة تشغيلية'; notification_message='تمت إضافة تحديث جديد إلى سجل الحوادث.'; entity_kind='incident_update'; entity_value=new.id::text;
  elsif tg_table_name='marketplace_orders' then
    target_tenant=new.tenant_id; target_user=new.client_user_id; event_name='marketplace.order.'||lower(new.status)||':'||new.id;
    notification_title='تحديث طلب السوق'; notification_message='تغيرت حالة طلبك داخل Marketplace.'; entity_kind='marketplace_order'; entity_value=new.id::text;
  else
    return new;
  end if;

  insert into public.notifications(
    title,message,type,is_read,recipient_role,recipient_user_id,notification_key,metadata,
    event_key,event_type,entity_type,entity_id,tenant_id,occurred_at
  ) values(
    notification_title,notification_message,'product_expansion',false,target_role,target_user,event_name,
    jsonb_build_object('entityType',entity_kind,'entityId',entity_value),
    event_name,split_part(event_name,':',1),entity_kind,entity_value,target_tenant,now()
  ) on conflict (tenant_id,event_key) where tenant_id is not null and event_key is not null do nothing;
  return new;
end;
$$;
revoke all on function private.emit_product_notification() from public,anon,authenticated;

foreach -- marker intentionally omitted: explicit triggers provide auditable coverage.

drop trigger if exists task_assignment_notification_trigger on public.task_assignments;
create trigger task_assignment_notification_trigger after insert on public.task_assignments
for each row execute function private.emit_product_notification();
drop trigger if exists sla_event_notification_trigger on public.sla_events;
create trigger sla_event_notification_trigger after insert on public.sla_events
for each row when (new.event_type in ('warning','breached')) execute function private.emit_product_notification();
drop trigger if exists privacy_request_notification_trigger on public.privacy_requests;
create trigger privacy_request_notification_trigger after insert on public.privacy_requests
for each row execute function private.emit_product_notification();
drop trigger if exists security_alert_notification_trigger on public.security_alerts;
create trigger security_alert_notification_trigger after insert on public.security_alerts
for each row execute function private.emit_product_notification();
drop trigger if exists incident_update_notification_trigger on public.incident_updates;
create trigger incident_update_notification_trigger after insert on public.incident_updates
for each row execute function private.emit_product_notification();
drop trigger if exists marketplace_order_notification_trigger on public.marketplace_orders;
create trigger marketplace_order_notification_trigger after insert or update of status on public.marketplace_orders
for each row execute function private.emit_product_notification();

create policy "tenant staff insert KPI" on public.product_kpi_daily
for insert to authenticated
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));
create policy "tenant staff update KPI" on public.product_kpi_daily
for update to authenticated
using (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']))
with check (public.current_user_has_tenant_role(tenant_id,array['super_admin','tenant_admin','employee']));

create or replace function public.refresh_product_kpis(p_tenant uuid,p_metric_date date default current_date)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare affected integer;
begin
  if not public.current_user_has_tenant_role(p_tenant,array['super_admin','tenant_admin','employee']) then raise exception 'forbidden'; end if;

  with metrics(metric_key,metric_value,dimensions) as (
    select 'portal.users.active',count(*)::numeric,jsonb_build_object('scope','all') from public.tenant_memberships where tenant_id=p_tenant and status='active' and role in ('creator','client','employee','partner')
    union all select 'tasks.open',count(*)::numeric,jsonb_build_object('status','open') from public.tasks where tenant_id=p_tenant and status in ('open','in_progress','blocked')
    union all select 'sla.breached',count(*)::numeric,jsonb_build_object('event','breached') from public.sla_events where tenant_id=p_tenant and event_type='breached' and created_at::date=p_metric_date
    union all select 'marketplace.orders',count(*)::numeric,jsonb_build_object('scope','all') from public.marketplace_orders where tenant_id=p_tenant and created_at::date=p_metric_date
    union all select 'marketplace.order_value',coalesce(sum(total),0)::numeric,jsonb_build_object('scope','all') from public.marketplace_orders where tenant_id=p_tenant and created_at::date=p_metric_date and status not in ('cancelled')
    union all select 'payments.succeeded',count(*)::numeric,jsonb_build_object('status','succeeded') from public.payment_intents where tenant_id=p_tenant and status='succeeded' and created_at::date=p_metric_date
    union all select 'ai.events',count(*)::numeric,jsonb_build_object('provider','rules') from public.provider_message_events where tenant_id=p_tenant and provider_type='ai' and created_at::date=p_metric_date
    union all select 'whatsapp.delivered',count(*)::numeric,jsonb_build_object('status','delivered') from public.provider_message_events where tenant_id=p_tenant and provider_type='whatsapp' and status='delivered' and created_at::date=p_metric_date
    union all select 'push.delivered',count(*)::numeric,jsonb_build_object('status','delivered') from public.provider_message_events where tenant_id=p_tenant and provider_type='push' and status='delivered' and created_at::date=p_metric_date
    union all select 'privacy.open',count(*)::numeric,jsonb_build_object('scope','open') from public.privacy_requests where tenant_id=p_tenant and status not in ('completed','rejected','cancelled')
    union all select 'incidents.active',count(*)::numeric,jsonb_build_object('scope','active') from public.incidents where tenant_id=p_tenant and status<>'resolved'
    union all select 'sessions.suspicious',count(*)::numeric,jsonb_build_object('suspicious',true) from public.user_sessions where tenant_id=p_tenant and suspicious=true and revoked_at is null
  )
  insert into public.product_kpi_daily(tenant_id,metric_date,metric_key,dimensions_hash,metric_value,dimensions,updated_at)
  select p_tenant,p_metric_date,metric_key,md5(dimensions::text),metric_value,dimensions,now() from metrics
  on conflict (tenant_id,metric_date,metric_key,dimensions_hash)
  do update set metric_value=excluded.metric_value,dimensions=excluded.dimensions,updated_at=now();
  get diagnostics affected=row_count;
  return affected;
end;
$$;
revoke all on function public.refresh_product_kpis(uuid,date) from public,anon;
grant execute on function public.refresh_product_kpis(uuid,date) to authenticated;

create or replace function public.start_workflow_run(
  p_workflow uuid,
  p_idempotency_key text,
  p_context jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare definition public.workflow_definitions%rowtype; run public.workflow_runs%rowtype;
begin
  select * into definition from public.workflow_definitions where id=p_workflow and status='published';
  if definition.id is null or not public.current_user_has_tenant_role(definition.tenant_id,array['super_admin','tenant_admin','employee']) then raise exception 'forbidden'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9_.:-]{8,160}$' then raise exception 'invalid_idempotency_key'; end if;
  insert into public.workflow_runs(tenant_id,workflow_id,idempotency_key,status,context,started_at)
  values(definition.tenant_id,definition.id,p_idempotency_key,'queued',coalesce(p_context,'{}'::jsonb),null)
  on conflict (tenant_id,idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into run;
  insert into public.workflow_events(tenant_id,run_id,event_type,idempotency_key,payload)
  values(run.tenant_id,run.id,'queued','run:'||run.id||':queued',jsonb_build_object('workflowId',definition.id))
  on conflict (tenant_id,idempotency_key) do nothing;
  return jsonb_build_object('id',run.id,'status',run.status,'duplicate',run.created_at < now()-interval '1 second');
end;
$$;
revoke all on function public.start_workflow_run(uuid,text,jsonb) from public,anon;
grant execute on function public.start_workflow_run(uuid,text,jsonb) to authenticated;

create index if not exists product_kpi_daily_metric_idx on public.product_kpi_daily(tenant_id,metric_date desc,metric_key);
create index if not exists notifications_tenant_unread_idx on public.notifications(tenant_id,recipient_user_id,is_read,created_at desc) where is_deleted=false;

commit;
