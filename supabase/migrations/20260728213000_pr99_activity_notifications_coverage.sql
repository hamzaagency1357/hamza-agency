begin;

create or replace function public.pr99_audit_mutation() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_email text:=lower(coalesce(auth.jwt()->>'email','system'));v_entity_id text;v_action text;v_old jsonb;v_new jsonb;
begin
 v_old:=case when tg_op in('UPDATE','DELETE') then to_jsonb(old) else null end;
 v_new:=case when tg_op in('INSERT','UPDATE') then to_jsonb(new) else null end;
 v_entity_id:=coalesce(v_new->>'id',v_old->>'id','unknown');
 v_action:=lower(tg_op)||'_'||tg_table_name;
 if tg_table_name='pages' and tg_op='UPDATE' and coalesce(v_old->>'publishing_status','')<>coalesce(v_new->>'publishing_status','') then v_action:='page_status_changed';end if;
 if tg_table_name in('agency_applications','service_requests','job_applications') and tg_op='UPDATE' and coalesce(v_old->>'status','')<>coalesce(v_new->>'status','') then v_action:='request_status_changed';end if;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,old_data,new_data,metadata,source_route,outcome)
 values(v_email,auth.uid(),v_action,tg_table_name,v_entity_id,coalesce(v_old,'{}'::jsonb)::text,coalesce(v_new,'{}'::jsonb)::text,jsonb_build_object('operation',tg_op),'database','success');
 return coalesce(new,old);
end $$;
revoke all on function public.pr99_audit_mutation() from public,anon,authenticated;

do $$ declare v_table text; begin
 foreach v_table in array array['settings','admin_permissions','notifications','trash_items','backups','restore_operations','agency_applications','service_requests','job_applications','pages','sections','content_translations'] loop
  execute format('drop trigger if exists pr99_audit_mutation on public.%I',v_table);
  execute format('create trigger pr99_audit_mutation after insert or update or delete on public.%I for each row execute function public.pr99_audit_mutation()',v_table);
 end loop;
end $$;

create or replace function public.pr99_log_operation_failure(p_event_type text,p_entity_type text,p_entity_id text,p_safe_message text,p_route text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_key text;
begin
 if p_event_type not in('publish_failure','backup_failure','restore_failure','permission_denied','notification_failure') then raise exception 'Unsupported failure event';end if;
 v_key:=p_event_type||':'||coalesce(p_entity_type,'operation')||':'||coalesce(p_entity_id,'unknown')||':'||to_char(now(),'YYYYMMDDHH24MI');
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome)
 values(v_actor,auth.uid(),p_event_type,coalesce(p_entity_type,'operation'),coalesce(p_entity_id,'unknown'),jsonb_build_object('safe_message',left(coalesce(p_safe_message,''),500)),left(coalesce(p_route,''),500),'failed');
 insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,metadata)
 values(case p_event_type when 'publish_failure' then 'فشل النشر' when 'backup_failure' then 'فشل النسخ الاحتياطي' when 'restore_failure' then 'فشل الاستعادة' when 'permission_denied' then 'رفض إجراء حساس' else 'فشل إشعار' end,left(coalesce(p_safe_message,'تعذر إكمال العملية بأمان.'),500),p_event_type,false,'admin',v_key,'failed',p_entity_type,p_entity_id,now(),case when p_event_type in('backup_failure','restore_failure','permission_denied') then 'critical' else 'high' end,jsonb_build_object('route',p_route)) on conflict(event_key) where event_key is not null do nothing;
end $$;
revoke all on function public.pr99_log_operation_failure(text,text,text,text,text) from public,anon;
grant execute on function public.pr99_log_operation_failure(text,text,text,text,text) to authenticated;

create or replace function public.pr99_unanswered_support_notifications() returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_record record;v_key text;
begin
 for v_record in
  select 'service_requests'::text entity_type,id::text entity_id,created_at,'/admin/service-requests' href from public.service_requests where status in('new','pending') and created_at<now()-interval '24 hours'
  union all select 'contact_messages',id::text,created_at,'/admin/contact' from public.contact_messages where status='new' and created_at<now()-interval '24 hours'
  union all select 'ai_unanswered_questions',id::text,created_at,'/admin/ai-support' from public.ai_unanswered_questions where status='new' and created_at<now()-interval '24 hours'
 loop
  v_key:='unanswered:'||v_record.entity_type||':'||v_record.entity_id||':'||to_char(v_record.created_at,'YYYYMMDD');
  insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,href,metadata)
  values('طلب دعم دون إجابة','يوجد طلب دعم تجاوز 24 ساعة دون متابعة.','unanswered_support',false,'admin',v_key,'overdue',v_record.entity_type,v_record.entity_id,now(),'high',v_record.href,jsonb_build_object('created_at',v_record.created_at)) on conflict(event_key) where event_key is not null do nothing;
 end loop;
end $$;
revoke all on function public.pr99_unanswered_support_notifications() from public,anon,authenticated;

do $$ begin
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.unschedule(jobid) from cron.job where jobname='pr99-unanswered-support';
  perform cron.schedule('pr99-unanswered-support','23 * * * *','select public.pr99_unanswered_support_notifications();');
 end if;
end $$;

comment on function public.pr99_audit_mutation is 'Central audit coverage for settings, permissions, requests, content, backups, trash and notifications.';
commit;
