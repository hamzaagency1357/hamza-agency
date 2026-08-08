begin;

create or replace function public.pr4_primary_tenant_id()
returns uuid language sql stable security definer set search_path=pg_catalog,public as $$
  select id from public.tenants where is_primary=true order by created_at limit 1
$$;
revoke all on function public.pr4_primary_tenant_id() from public,anon,authenticated;

create or replace function public.pr4_create_support_request(p_language text,p_subject text,p_context text,p_contact_type text,p_contact_value text,p_consent boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare
  v_code text;v_secret text;v_id bigint;v_try integer:=0;
  v_context text:=left(trim(coalesce(p_context,'')),4000);
  v_contact text:=nullif(left(trim(coalesce(p_contact_value,'')),320),'');
  v_tenant uuid:=public.pr4_primary_tenant_id();v_policy public.sla_policies%rowtype;
begin
  if p_consent is not true then raise exception 'consent_required'; end if;
  if p_language not in('ar','en','tr') then p_language:='ar'; end if;
  if p_contact_type is not null and p_contact_type not in('email','phone','whatsapp','other') then raise exception 'invalid_contact_type'; end if;
  loop
    v_try:=v_try+1;v_code:='SUP-'||upper(substr(encode(gen_random_bytes(3),'hex'),1,4));
    exit when not exists(select 1 from public.pr4_support_requests where support_code=v_code);
    if v_try>12 then raise exception 'support_code_generation_failed'; end if;
  end loop;
  v_secret:=upper(substr(encode(gen_random_bytes(8),'hex'),1,10));
  insert into public.pr4_support_requests(support_code,verification_hash,language,subject,contact_type,contact_value,consented_at)
  values(v_code,encode(digest(v_secret,'sha256'),'hex'),p_language,left(coalesce(nullif(trim(p_subject),''),'طلب دعم'),300),p_contact_type,v_contact,now()) returning id into v_id;
  if v_context<>'' then insert into public.pr4_support_messages(request_id,role,body,public_visible) values(v_id,'visitor',v_context,true); end if;
  insert into public.pr4_support_history(request_id,action,to_status,metadata) values(v_id,'created','new',jsonb_build_object('source','smart_support'));
  insert into public.notifications(tenant_id,title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,href,metadata,workflow_status,reference_code,resource_module,dedupe_key)
  values(v_tenant,'طلب دعم بشري جديد','تم إنشاء طلب دعم يحتاج متابعة من موظف.','human_support',false,'admin','pr4:support:'||v_id,'human_support_request','pr4_support_requests',v_id::text,now(),'normal','/admin/ai-support?request='||v_id,jsonb_build_object('support_code',v_code),'new',v_code,'ai_support','pr4:support:'||v_id)
  on conflict(dedupe_key) where dedupe_key is not null do nothing;
  if v_tenant is not null then
    select * into v_policy from public.sla_policies where tenant_id=v_tenant and active=true and entity_type in('pr4_support_requests','support_request','human_support') order by created_at desc limit 1;
    if found and coalesce(v_policy.first_response_minutes,0)>0 then
      insert into public.sla_events(tenant_id,policy_id,entity_type,entity_id,event_type,deadline_at,idempotency_key)
      values(v_tenant,v_policy.id,'pr4_support_requests',v_id::text,'first_response_due',now()+make_interval(mins=>v_policy.first_response_minutes),'pr4:support:first-response:'||v_id)
      on conflict(idempotency_key) do nothing;
    end if;
  end if;
  return jsonb_build_object('supportCode',v_code,'verification',v_secret,'status','new','retentionDays',90);
end $$;

create or replace function public.pr4_request_support_deletion(p_code text,p_verification text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,extensions as $$
declare v_id bigint;v_tenant uuid:=public.pr4_primary_tenant_id();v_support_code text;
begin
  select id,support_code into v_id,v_support_code from public.pr4_support_requests where support_code=upper(trim(p_code)) and verification_hash=encode(digest(upper(trim(p_verification)),'sha256'),'hex');
  if v_id is null then return false; end if;
  update public.pr4_support_requests set deletion_requested_at=coalesce(deletion_requested_at,now()),updated_at=now() where id=v_id;
  insert into public.pr4_support_history(request_id,action,metadata) values(v_id,'deletion_requested',jsonb_build_object('source','public_tracking'));
  insert into public.notifications(tenant_id,title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,href,metadata,workflow_status,reference_code,resource_module,dedupe_key)
  values(v_tenant,'طلب خصوصية/حذف','يوجد طلب حذف بيانات متعلق بطلب دعم.','privacy_request',false,'admin','pr4:delete:'||v_id,'privacy_delete_request','pr4_support_requests',v_id::text,now(),'high','/admin/ai-support?request='||v_id,jsonb_build_object('support_code',v_support_code),'new',v_support_code,'ai_support','pr4:delete:'||v_id)
  on conflict(dedupe_key) where dedupe_key is not null do nothing;
  return true;
end $$;

create or replace function public.pr4_support_action(p_request_id bigint,p_action text,p_value text default null,p_note text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_admin bigint:=public.pr4_current_admin_id();v_old public.pr4_support_requests%rowtype;v_new_status text;v_assignee bigint;v_assignee_email text;
begin
  if v_admin is null or not public.pr4_admin_can_module('ai_support','can_edit') then raise exception 'forbidden'; end if;
  select * into v_old from public.pr4_support_requests where id=p_request_id for update;if not found then raise exception 'support request not found'; end if;
  if p_action='accept' then
    update public.pr4_support_requests set assigned_admin_id=coalesce(assigned_admin_id,v_admin),status='accepted',accepted_at=coalesce(accepted_at,now()),updated_at=now() where id=p_request_id;v_new_status:='accepted';
    update public.notifications set assigned_admin_id=coalesce(assigned_admin_id,v_admin),workflow_status='in_progress',is_read=true where entity_type='pr4_support_requests' and entity_id=p_request_id::text;
  elsif p_action='assign' then
    if not public.pr4_admin_can_module('ai_support','can_manage') then raise exception 'forbidden'; end if;
    select id::bigint,email into v_assignee,v_assignee_email from public.admin_users where is_active is not false and lower(email)=lower(trim(coalesce(p_value,''))) limit 1;
    if v_assignee is null then raise exception 'staff not found'; end if;
    update public.pr4_support_requests set assigned_admin_id=v_assignee,updated_at=now() where id=p_request_id;
    update public.notifications set assigned_admin_id=v_assignee,recipient_email=v_assignee_email where entity_type='pr4_support_requests' and entity_id=p_request_id::text;
  elsif p_action='priority' then
    if p_value not in('low','normal','high','urgent') then raise exception 'invalid priority'; end if;
    update public.pr4_support_requests set priority=p_value,updated_at=now() where id=p_request_id;
    update public.notifications set priority=p_value where entity_type='pr4_support_requests' and entity_id=p_request_id::text;
  elsif p_action='status' then
    if p_value not in('new','awaiting_acceptance','accepted','responding','awaiting_user','resolved','closed','cancelled') then raise exception 'invalid status'; end if;
    if p_value in('closed','cancelled') and length(trim(coalesce(p_note,'')))<3 then raise exception 'close reason required'; end if;
    update public.pr4_support_requests set status=p_value,close_reason=case when p_value in('closed','cancelled') then left(trim(p_note),500) else close_reason end,resolved_at=case when p_value='resolved' then coalesce(resolved_at,now()) else resolved_at end,closed_at=case when p_value in('closed','cancelled') then now() else closed_at end,updated_at=now() where id=p_request_id;v_new_status:=p_value;
    update public.notifications set workflow_status=case when p_value in('resolved','closed','cancelled') then 'actioned' when p_value in('accepted','responding','awaiting_user') then 'in_progress' else workflow_status end where entity_type='pr4_support_requests' and entity_id=p_request_id::text;
  elsif p_action='reply' then
    if length(trim(coalesce(p_value,'')))<1 then raise exception 'reply required'; end if;
    insert into public.pr4_support_messages(request_id,role,body,public_visible,actor_admin_id) values(p_request_id,'staff',left(trim(p_value),8000),true,v_admin);
    update public.pr4_support_requests set last_response=left(trim(p_value),2000),status=case when status in('resolved','closed','cancelled') then status else 'awaiting_user' end,updated_at=now() where id=p_request_id;v_new_status:='awaiting_user';
  elsif p_action='note' then
    if length(trim(coalesce(p_value,'')))<1 then raise exception 'note required'; end if;
    insert into public.pr4_support_internal_notes(request_id,note,actor_admin_id) values(p_request_id,left(trim(p_value),8000),v_admin);
  else raise exception 'unsupported action'; end if;
  insert into public.pr4_support_history(request_id,action,from_status,to_status,actor_admin_id,metadata) values(p_request_id,p_action,v_old.status,v_new_status,v_admin,jsonb_build_object('value',case when p_action in('reply','note') then null else left(coalesce(p_value,''),300) end,'note',case when p_action='status' then left(coalesce(p_note,''),500) else null end));
  return jsonb_build_object('ok',true,'requestId',p_request_id,'action',p_action);
end $$;

create or replace function public.pr4_emit_internal_notification()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_data jsonb:=to_jsonb(new);v_event text:=tg_argv[0];v_module text:=tg_argv[1];v_href text:=tg_argv[2];v_priority text:=coalesce(nullif(tg_argv[3],''),'normal');v_entity text:=tg_table_name;v_id text:=coalesce(v_data->>'id',v_data->>'tracking_code',v_data->>'request_code','unknown');v_reference text:=coalesce(v_data->>'tracking_code',v_data->>'request_code',v_data->>'reference_code',v_data->>'code',v_id);v_name text:=coalesce(v_data->>'full_name',v_data->>'name',v_data->>'applicant_name',v_data->>'contact_name');v_context text:=coalesce(v_data->>'program_name',v_data->>'program_slug',v_data->>'service_name',v_data->>'service_slug',v_data->>'subject');v_key text:='pr4:'||v_event||':'||v_entity||':'||v_id;v_tenant uuid:=coalesce((v_data->>'tenant_id')::uuid,public.pr4_primary_tenant_id());
begin
  insert into public.notifications(tenant_id,title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,href,metadata,workflow_status,reference_code,resource_module,dedupe_key)
  values(v_tenant,case v_event when 'application_new' then 'طلب انضمام جديد' when 'service_request_new' then 'طلب خدمة جديد' when 'job_application_new' then 'طلب توظيف جديد' when 'contact_request_new' then 'رسالة تواصل جديدة' when 'marketplace_followup' then 'طلب Marketplace يحتاج متابعة' when 'privacy_request' then 'طلب خصوصية/حذف' when 'operational_incident' then 'حادث تشغيلي' when 'dispute_refund' then 'نزاع/استرداد يحتاج متابعة' when 'membership_review' then 'مراجعة عضوية/دعوة' else 'طلب جديد يحتاج متابعة' end,case when v_name is not null and v_context is not null then left(v_name||' · '||v_context,500) when v_context is not null then left(v_context,500) else 'يوجد مورد جديد يحتاج متابعة من الموظف المصرح له.' end,v_event,false,'admin',v_key,v_event,v_entity,v_id,now(),v_priority,replace(replace(v_href,'{id}',v_id),'{ref}',v_reference),jsonb_strip_nulls(jsonb_build_object('reference',v_reference,'name',v_name,'context',v_context)),'new',v_reference,v_module,v_key)
  on conflict(dedupe_key) where dedupe_key is not null do nothing;return new;
end $$;
revoke all on function public.pr4_emit_internal_notification() from public,anon,authenticated;

do $$ declare r record;v_exists boolean;begin
  for r in select * from (values
    ('agency_applications','application_new','applications','/admin/applications?request={id}','normal'),
    ('service_requests','service_request_new','service_requests','/admin/service-requests?request={id}','normal'),
    ('job_applications','job_application_new','jobs','/admin/jobs/applications?request={id}','normal'),
    ('contact_messages','contact_request_new','contact','/admin/contact?request={id}','normal'),
    ('privacy_requests','privacy_request','privacy','/admin/privacy?request={id}','high'),
    ('marketplace_disputes','dispute_refund','marketplace','/admin/marketplace?request={id}','high'),
    ('tenant_invitations','membership_review','notifications','/admin/notifications','normal')
  ) as t(table_name,event_type,module_key,href,priority)
  loop
    if to_regclass('public.'||r.table_name) is not null then
      select exists(select 1 from pg_trigger where tgrelid=to_regclass('public.'||r.table_name) and tgname='pr4_notify_insert' and not tgisinternal) into v_exists;
      if not v_exists then execute format('create trigger pr4_notify_insert after insert on public.%I for each row execute function public.pr4_emit_internal_notification(%L,%L,%L,%L)',r.table_name,r.event_type,r.module_key,r.href,r.priority); end if;
    end if;
  end loop;
end $$;

create or replace function public.pr4_escalate_overdue_support()
returns integer language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_event record;v_count integer:=0;v_tenant uuid:=public.pr4_primary_tenant_id();begin
  for v_event in select se.id,se.entity_id,se.deadline_at,sr.support_code from public.sla_events se join public.pr4_support_requests sr on sr.id::text=se.entity_id where se.entity_type='pr4_support_requests' and se.event_type='first_response_due' and se.deadline_at<=now() and sr.accepted_at is null and sr.status not in('resolved','closed','cancelled') loop
    insert into public.notifications(tenant_id,title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,href,metadata,workflow_status,reference_code,resource_module,dedupe_key)
    values(v_tenant,'تصعيد SLA لطلب دعم','تجاوز طلب دعم مهلة الاستجابة الأولى المحددة بالسياسة.','sla_escalation',false,'admin','pr4:sla:'||v_event.id,'operational_incident','pr4_support_requests',v_event.entity_id,now(),'urgent','/admin/ai-support?request='||v_event.entity_id,jsonb_build_object('deadline_at',v_event.deadline_at,'support_code',v_event.support_code),'new',v_event.support_code,'ai_support','pr4:sla:'||v_event.id)
    on conflict(dedupe_key) where dedupe_key is not null do nothing;
    if found then v_count:=v_count+1;end if;
  end loop;return v_count;
end $$;
revoke all on function public.pr4_escalate_overdue_support() from public,anon,authenticated;

do $$ begin
  if exists(select 1 from pg_extension where extname='pg_cron') and not exists(select 1 from cron.job where jobname='pr4-support-sla-escalation') then
    perform cron.schedule('pr4-support-sla-escalation','17 * * * *','select public.pr4_escalate_overdue_support();');
  end if;
end $$;

revoke all on function public.pr4_create_support_request(text,text,text,text,text,boolean) from public;
revoke all on function public.pr4_request_support_deletion(text,text) from public;
revoke all on function public.pr4_support_action(bigint,text,text,text) from public,anon;
grant execute on function public.pr4_create_support_request(text,text,text,text,text,boolean) to anon,authenticated;
grant execute on function public.pr4_request_support_deletion(text,text) to anon,authenticated;
grant execute on function public.pr4_support_action(bigint,text,text,text) to authenticated;

comment on function public.pr4_escalate_overdue_support is 'Escalates only SUP requests covered by an active existing SLA policy and only after its stored first-response deadline.';
commit;
