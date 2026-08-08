begin;

create or replace function public.pr4_emit_internal_notification()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_data jsonb:=to_jsonb(new);
  v_event text:=tg_argv[0];
  v_module text:=tg_argv[1];
  v_href text:=tg_argv[2];
  v_priority text:=coalesce(nullif(tg_argv[3],''),'normal');
  v_entity text:=tg_table_name;
  v_id text:=coalesce(v_data->>'id',v_data->>'tracking_code',v_data->>'request_code','unknown');
  v_reference text:=coalesce(v_data->>'tracking_code',v_data->>'request_code',v_data->>'reference_code',v_data->>'code',v_id);
  v_name text:=coalesce(v_data->>'full_name',v_data->>'name',v_data->>'applicant_name',v_data->>'contact_name');
  v_context text:=coalesce(v_data->>'program_name',v_data->>'program_slug',v_data->>'service_name',v_data->>'service_slug',v_data->>'subject');
  v_key text:='pr4:'||v_event||':'||v_entity||':'||v_id;
  v_tenant uuid:=coalesce(nullif(v_data->>'tenant_id','')::uuid,public.pr4_primary_tenant_id());
begin
  insert into public.notifications(tenant_id,title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,href,metadata,workflow_status,reference_code,resource_module,dedupe_key)
  values(
    v_tenant,
    case v_event
      when 'application_new' then 'طلب انضمام جديد'
      when 'service_request_new' then 'طلب خدمة جديد'
      when 'job_application_new' then 'طلب توظيف جديد'
      when 'contact_request_new' then 'رسالة تواصل جديدة'
      when 'marketplace_followup' then 'طلب Marketplace يحتاج متابعة'
      when 'privacy_request' then 'طلب خصوصية/حذف'
      when 'operational_incident' then 'حادث تشغيلي'
      when 'dispute_refund' then 'نزاع/استرداد يحتاج متابعة'
      when 'membership_review' then 'مراجعة عضوية/دعوة'
      else 'طلب جديد يحتاج متابعة' end,
    case when v_name is not null and v_context is not null then left(v_name||' · '||v_context,500)
         when v_context is not null then left(v_context,500)
         else 'يوجد مورد جديد يحتاج متابعة من الموظف المصرح له.' end,
    v_event,false,'admin',v_key,v_event,v_entity,v_id,now(),v_priority,
    replace(replace(v_href,'{id}',v_id),'{ref}',v_reference),
    jsonb_strip_nulls(jsonb_build_object('reference',v_reference,'name',v_name,'context',v_context)),
    'new',v_reference,v_module,v_key
  ) on conflict(dedupe_key) where dedupe_key is not null do nothing;
  return new;
end $$;
revoke all on function public.pr4_emit_internal_notification() from public,anon,authenticated;

do $$
begin
  if to_regclass('public.marketplace_orders') is not null
     and not exists(select 1 from pg_trigger where tgrelid=to_regclass('public.marketplace_orders') and tgname='pr4_notify_insert' and not tgisinternal) then
    create trigger pr4_notify_insert
      after insert on public.marketplace_orders
      for each row execute function public.pr4_emit_internal_notification('marketplace_followup','marketplace','/admin/marketplace?request={id}','normal');
  end if;
end $$;

comment on function public.pr4_emit_internal_notification is 'Creates deduplicated tenant-aware internal notifications for operational resources, including Marketplace orders, with permission filtering enforced by the inbox view.';
commit;
