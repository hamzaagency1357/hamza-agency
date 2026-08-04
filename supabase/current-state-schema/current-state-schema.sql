-- HAMZA AGENCY sanitized current-state schema snapshot
-- Schema only. No rows, COPY, INSERT, setval, ownership, managed schemas, credentials, or large objects.
SET check_function_bodies = false;
SET client_min_messages = warning;
CREATE SCHEMA IF NOT EXISTS private;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION private.assign_primary_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from public.tenants where is_primary=true and status='active' limit 1;
  end if;
  if new.tenant_id is null then raise exception 'primary_tenant_not_configured'; end if;
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION private.can_manage_tenant_member(target_tenant uuid, target_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists(
    select 1 from public.tenant_memberships me
    where me.tenant_id=target_tenant and me.user_id=(select auth.uid()) and me.status='active'
      and (
        me.role='super_admin'
        or (me.role='tenant_admin' and target_role in ('creator','client','employee','partner'))
      )
  );
$function$


CREATE OR REPLACE FUNCTION private.capture_task_status_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op='INSERT' or old.status is distinct from new.status then
    insert into public.task_status_history(task_id,tenant_id,from_status,to_status,changed_by)
    values(new.id,new.tenant_id,case when tg_op='INSERT' then null else old.status end,new.status,(select auth.uid()));
  end if;
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION private.consume_invitation_rate_limit(p_tenant_id uuid, p_action text, p_subject_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'extensions'
AS $function$
declare v_bucket timestamptz; v_attempts integer; v_limit integer; v_window_seconds integer;
begin
  if auth.uid() is null or p_tenant_id is null or p_subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid_rate_limit'; end if;
  select limits.max_attempts,limits.window_seconds
  into v_limit,v_window_seconds
  from (values ('create',20,3600),('resend',10,3600),('accept',12,900)) as limits(action,max_attempts,window_seconds)
  where limits.action=p_action;
  if v_limit is null then raise exception 'invalid_rate_limit'; end if;
  if not exists(select 1 from public.tenants where id=p_tenant_id and status='active') then raise exception 'tenant_not_found'; end if;
  v_bucket:=to_timestamp(floor(extract(epoch from now())/v_window_seconds)*v_window_seconds);
  insert into private.invitation_rate_limits(tenant_id,action,subject_hash,bucket_started_at,attempts)
  values(p_tenant_id,p_action,p_subject_hash,v_bucket,1)
  on conflict(tenant_id,action,subject_hash,bucket_started_at)
  do update set attempts=private.invitation_rate_limits.attempts+1,updated_at=now()
  returning attempts into v_attempts;
  return v_attempts<=v_limit;
end;
$function$


CREATE OR REPLACE FUNCTION private.emit_product_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        if tg_table_name = 'task_assignments' then
          target_tenant := new.tenant_id;
          target_user := new.user_id;
          event_name := 'task.assigned:' || new.task_id || ':' || new.user_id;
          notification_title := 'مهمة جديدة';
          notification_message := 'تم تعيين مهمة جديدة لك داخل بوابة التشغيل.';
          entity_kind := 'task';
          entity_value := new.task_id::text;
        elsif tg_table_name = 'sla_events' then
          if new.event_type not in ('warning', 'breached') then
            return new;
          end if;
          target_tenant := new.tenant_id;
          target_role := 'tenant_admin';
          event_name := 'sla.' || new.event_type || ':' || new.id;
          notification_title := case when new.event_type = 'breached' then 'تجاوز SLA' else 'تنبيه SLA' end;
          notification_message := 'يوجد حدث SLA يحتاج متابعة فريق التشغيل.';
          entity_kind := 'sla_event';
          entity_value := new.id::text;
        elsif tg_table_name = 'privacy_requests' then
          target_tenant := new.tenant_id;
          target_role := 'tenant_admin';
          event_name := 'privacy.request.created:' || new.id;
          notification_title := 'طلب خصوصية جديد';
          notification_message := 'تم استلام طلب خصوصية جديد يحتاج التحقق والمعالجة.';
          entity_kind := 'privacy_request';
          entity_value := new.id::text;
        elsif tg_table_name = 'security_alerts' then
          target_tenant := new.tenant_id;
          target_user := new.user_id;
          event_name := 'security.alert:' || new.id;
          notification_title := 'تنبيه أمان';
          notification_message := 'تم تسجيل حدث أمان جديد على حسابك. راجع الأجهزة والجلسات.';
          entity_kind := 'security_alert';
          entity_value := new.id::text;
        elsif tg_table_name = 'incident_updates' then
          target_tenant := new.tenant_id;
          target_role := 'tenant_admin';
          event_name := 'incident.update:' || new.id;
          notification_title := 'تحديث حادثة تشغيلية';
          notification_message := 'تمت إضافة تحديث جديد إلى سجل الحوادث.';
          entity_kind := 'incident_update';
          entity_value := new.id::text;
        elsif tg_table_name = 'marketplace_orders' then
          target_tenant := new.tenant_id;
          target_user := new.client_user_id;
          event_name := 'marketplace.order.' || lower(new.status) || ':' || new.id;
          notification_title := 'تحديث طلب السوق';
          notification_message := 'تغيرت حالة طلبك داخل Marketplace.';
          entity_kind := 'marketplace_order';
          entity_value := new.id::text;
        else
          return new;
        end if;

        insert into public.notifications(
          title,message,type,is_read,recipient_role,recipient_user_id,notification_key,metadata,
          event_key,event_type,entity_type,entity_id,tenant_id,occurred_at
        ) values (
          notification_title,notification_message,'product_expansion',false,target_role,target_user,event_name,
          jsonb_build_object('entityType', entity_kind, 'entityId', entity_value),event_name,
          split_part(event_name, ':', 1),entity_kind,entity_value,target_tenant,now()
        )
        on conflict (tenant_id, event_key)
        where tenant_id is not null and event_key is not null
        do nothing;

        return new;
      end;
      $function$


CREATE OR REPLACE FUNCTION private.expire_all_tenant_invitations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare v_count integer;
begin
  update public.tenant_invitations set status='expired',updated_at=now()
  where status='invited' and expires_at<=now();
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$


CREATE OR REPLACE FUNCTION private.get_public_incident_status(p_hostname text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  resolved_tenant uuid;
  normalized_host text := lower(split_part(trim(coalesce(p_hostname,'')),':',1));
  incident_rows jsonb;
begin
  select t.id into resolved_tenant
  from public.tenants t
  left join public.tenant_domains d
    on d.tenant_id=t.id
   and d.hostname=normalized_host
   and d.status in ('verified','active')
  where t.status='active'
  order by (d.id is not null) desc,t.is_primary desc
  limit 1;

  if resolved_tenant is null then
    return jsonb_build_object('status','unknown','incidents','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,
    'title',i.title,
    'severity',i.severity,
    'status',i.status,
    'startedAt',i.started_at,
    'resolvedAt',i.resolved_at,
    'updates',coalesce((
      select jsonb_agg(jsonb_build_object(
        'status',u.status,
        'message',u.message,
        'createdAt',u.created_at
      ) order by u.created_at desc)
      from public.incident_updates u
      where u.incident_id=i.id and u.is_public=true
    ),'[]'::jsonb)
  ) order by i.started_at desc),'[]'::jsonb)
  into incident_rows
  from public.incidents i
  where i.tenant_id=resolved_tenant
    and (i.status<>'resolved' or i.resolved_at>=now()-interval '30 days');

  return jsonb_build_object(
    'status',case when exists(select 1 from public.incidents i where i.tenant_id=resolved_tenant and i.status<>'resolved') then 'degraded' else 'operational' end,
    'incidents',incident_rows
  );
end;
$function$


CREATE OR REPLACE FUNCTION private.has_tenant_role(target_tenant uuid, allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select (select auth.uid()) is not null and exists (
    select 1 from public.tenant_memberships tm
    where tm.tenant_id=target_tenant
      and tm.user_id=(select auth.uid())
      and tm.status='active'
      and tm.role=any(allowed_roles)
  );
$function$


CREATE OR REPLACE FUNCTION private.normalize_invitation_permissions(p_role text, p_permissions jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare v_allowed text[]; v_key text; v_value jsonb;
begin
  if p_permissions is null or jsonb_typeof(p_permissions)<>'object' then raise exception 'invalid_permissions'; end if;
  v_allowed:=case p_role
    when 'creator' then array['profile.edit','files.upload','support.create','applications.view','tasks.view']
    when 'client' then array['profile.edit','files.upload','support.create','services.view','orders.view']
    when 'employee' then array['tasks.view','tasks.comment','tasks.status','files.upload']
    when 'partner' then array['profile.edit','files.upload','listings.manage','orders.view','referrals.view']
    when 'tenant_admin' then array['tenant.manage','members.manage','tasks.manage','marketplace.manage','reports.view']
    else array[]::text[] end;
  for v_key,v_value in select key,value from jsonb_each(p_permissions) loop
    if not (v_key=any(v_allowed)) or jsonb_typeof(v_value)<>'boolean' then raise exception 'permission_not_allowed'; end if;
  end loop;
  return p_permissions;
end;
$function$


CREATE OR REPLACE FUNCTION private.public_tenant_runtime(target_hostname text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  normalized_host text := lower(split_part(split_part(trim(coalesce(target_hostname,'')),',',1),':',1));
  selected_tenant public.tenants%rowtype;
  result jsonb;
begin
  if normalized_host !~ '^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' then
    return null;
  end if;

  select t.* into selected_tenant
  from public.tenant_domains d
  join public.tenants t on t.id=d.tenant_id
  where d.hostname=normalized_host
    and d.status in ('verified','active')
    and t.status='active'
  order by d.is_primary desc,d.verified_at desc nulls last,d.id
  limit 1;

  if selected_tenant.id is null then return null; end if;

  select jsonb_build_object(
    'id',selected_tenant.id,
    'slug',selected_tenant.slug,
    'name',selected_tenant.name,
    'defaultLocale',selected_tenant.default_locale,
    'supportedLocales',selected_tenant.supported_locales,
    'branding',coalesce((select to_jsonb(b)-'tenant_id' from public.tenant_branding b where b.tenant_id=selected_tenant.id),'{}'::jsonb),
    'featureFlags',coalesce((select jsonb_object_agg(f.feature_key,jsonb_build_object('enabled',f.enabled,'configuration',f.configuration)) from public.tenant_feature_flags f where f.tenant_id=selected_tenant.id),'{}'::jsonb),
    'settings',coalesce((select jsonb_object_agg(s.key,s.value) from public.tenant_settings s where s.tenant_id=selected_tenant.id and s.is_secret=false),'{}'::jsonb)
  ) into result;

  return result;
end;
$function$


CREATE OR REPLACE FUNCTION private.raise_new_session_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.security_alerts(tenant_id,user_id,alert_type,severity,metadata)
  values(
    new.tenant_id,
    new.user_id,
    case when new.suspicious then 'suspicious_login' else 'new_device' end,
    case when new.suspicious then 'high' else 'low' end,
    jsonb_build_object('sessionId',new.id,'platform',new.platform,'browser',new.browser)
  );
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(p_expected_tenant_id uuid, p_token_hash text)
 RETURNS TABLE(accepted boolean, membership_id uuid, tenant_id uuid, role text, program_id bigint, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'private', 'extensions'
AS $function$
declare
  v_user uuid:=auth.uid();
  v_email text:=lower(coalesce(auth.jwt()->>'email',''));
  v_invitation public.tenant_invitations%rowtype;
  v_membership public.tenant_memberships%rowtype;
  v_subject text;
begin
  if v_user is null or v_email='' or p_expected_tenant_id is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  select invitation_row.* into v_invitation
  from public.tenant_invitations invitation_row
  where invitation_row.token_hash=p_token_hash
  for update;

  if not found or v_invitation.tenant_id<>p_expected_tenant_id or v_invitation.status<>'invited' then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  v_subject:=encode(digest(v_user::text||'|'||p_token_hash,'sha256'),'hex');
  if not private.consume_invitation_rate_limit(v_invitation.tenant_id,'accept',v_subject) then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,'rate_limited'::text;
    return;
  end if;

  if v_invitation.expires_at<=now() then
    update public.tenant_invitations invitation_row
    set status='expired',updated_at=now()
    where invitation_row.id=v_invitation.id and invitation_row.status='invited';
    return query select false,null::uuid,v_invitation.tenant_id,null::text,null::bigint,'expired'::text;
    return;
  end if;

  if lower(v_invitation.email)<>v_email then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  insert into public.tenant_memberships(tenant_id,user_id,role,status,program_id,permissions,mfa_required)
  values(v_invitation.tenant_id,v_user,v_invitation.role,'active',v_invitation.program_id,v_invitation.permissions,v_invitation.role='tenant_admin')
  on conflict on constraint tenant_memberships_tenant_user_key do update
  set role=excluded.role,status='active',program_id=excluded.program_id,permissions=excluded.permissions,
      mfa_required=excluded.mfa_required,updated_at=now()
  returning * into v_membership;

  update public.tenant_invitations invitation_row
  set status='accepted',accepted_by=v_user,accepted_at=now(),updated_at=now()
  where invitation_row.id=v_invitation.id and invitation_row.status='invited';

  if not found then
    return query select false,null::uuid,null::uuid,null::text,null::bigint,null::text;
    return;
  end if;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(v_invitation.tenant_id,v_user,'tenant.invitation_accepted','tenant_membership',v_membership.id::text,
    jsonb_build_object('email',v_email,'role',v_membership.role,'program_id',v_membership.program_id));

  return query select true,v_membership.id,v_membership.tenant_id,v_membership.role,v_membership.program_id,v_membership.status;
end;
$function$


CREATE OR REPLACE FUNCTION public.assert_translation_revision_snapshot(p_source_snapshot jsonb, p_translated_fields jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if jsonb_typeof(p_source_snapshot) <> 'object'
     or not exists (select 1 from jsonb_object_keys(p_source_snapshot)) then
    raise exception 'Arabic source snapshot must be a non-empty JSON object.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_translated_fields, '{}'::jsonb)) <> 'object' then
    raise exception 'Translated fields must be a JSON object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each(p_source_snapshot) as field(key, value)
    where not public.is_supported_translation_revision_field_name(field.key)
      or jsonb_typeof(field.value) <> 'string'
      or btrim(field.value #>> '{}') = ''
  ) then
    raise exception 'Arabic source snapshot includes an unsupported or empty field.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_each(coalesce(p_translated_fields, '{}'::jsonb)) as field(key, value)
    where not (p_source_snapshot ? field.key)
      or jsonb_typeof(field.value) <> 'string'
  ) then
    raise exception 'Translated fields must be string values for fields present in the Arabic source snapshot.'
      using errcode = '22023';
  end if;
end;
$function$


CREATE OR REPLACE FUNCTION public.create_marketplace_order(p_tenant uuid, p_listing uuid, p_quantity integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := (select auth.uid());
  listing public.marketplace_listings%rowtype;
  new_order public.marketplace_orders%rowtype;
  localized_title jsonb;
begin
  if actor is null or p_quantity<1 or p_quantity>100 then raise exception 'invalid_order_request'; end if;
  if not public.current_user_has_tenant_role(p_tenant,array['client','creator','partner','employee','tenant_admin','super_admin']) then
    raise exception 'forbidden';
  end if;
  select * into listing from public.marketplace_listings
  where id=p_listing and tenant_id=p_tenant and status='published'
  for share;
  if listing.id is null or listing.price_amount is null or listing.currency is null then raise exception 'listing_unavailable'; end if;
  select coalesce(jsonb_object_agg(t.locale,t.title),'{}'::jsonb) into localized_title
  from public.marketplace_listing_translations t where t.listing_id=listing.id;
  insert into public.marketplace_orders(tenant_id,order_code,client_user_id,status,currency,subtotal,total,payment_status)
  values(p_tenant,public.pr101_new_order_code(),actor,'pending',listing.currency,listing.price_amount*p_quantity,listing.price_amount*p_quantity,'unpaid')
  returning * into new_order;
  insert into public.marketplace_order_items(tenant_id,order_id,listing_id,title_snapshot,quantity,unit_price,total_price)
  values(p_tenant,new_order.id,listing.id,localized_title,p_quantity,listing.price_amount,listing.price_amount*p_quantity);
  insert into public.notifications(title,message,type,is_read,recipient_user_id,notification_key,metadata,event_key,event_type,entity_type,entity_id,tenant_id)
  values('طلب سوق جديد','تم إنشاء طلبك بنجاح.','marketplace_order',false,actor,'marketplace.order.created',jsonb_build_object('orderCode',new_order.order_code),
    'marketplace.order.created:'||new_order.id,'marketplace.order.created','marketplace_order',new_order.id::text,p_tenant)
  on conflict do nothing;
  return jsonb_build_object('ok',true,'order_id',new_order.id,'order_code',new_order.order_code,'payment_status',new_order.payment_status);
end;
$function$


CREATE OR REPLACE FUNCTION public.create_tenant_invitation(p_tenant_id uuid, p_email text, p_role text, p_program_id bigint, p_permissions jsonb, p_token_hash text, p_expires_at timestamp with time zone)
 RETURNS TABLE(id uuid, tenant_id uuid, email text, role text, program_id bigint, status text, expires_at timestamp with time zone, last_sent_at timestamp with time zone, send_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'extensions'
AS $function$
declare
  v_actor uuid:=auth.uid();
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_invitation public.tenant_invitations%rowtype;
  v_permissions jsonb;
  v_subject text;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_role not in ('creator','client','employee','partner','tenant_admin') then raise exception 'invalid_invitation'; end if;
  if p_role='tenant_admin' and not public.current_user_has_tenant_role(p_tenant_id,array['super_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(v_email)>254 then raise exception 'invalid_invitation'; end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'invalid_invitation'; end if;

  v_permissions:=private.normalize_invitation_permissions(p_role,p_permissions);
  if p_program_id is not null and not exists(
    select 1 from public.programs program_row
    where program_row.id=p_program_id and program_row.tenant_id=p_tenant_id
  ) then raise exception 'invalid_invitation'; end if;

  v_subject:=encode(digest(v_actor::text||'|'||p_tenant_id::text||'|create|'||v_email,'sha256'),'hex');
  if not private.consume_invitation_rate_limit(p_tenant_id,'create',v_subject) then
    raise exception 'invitation_rate_limited' using errcode='P0001';
  end if;

  perform public.expire_tenant_invitations(p_tenant_id);
  if exists(
    select 1
    from public.tenant_memberships membership_row
    join auth.users user_row on user_row.id=membership_row.user_id
    where membership_row.tenant_id=p_tenant_id
      and lower(user_row.email)=v_email
      and membership_row.status='active'
  ) then raise exception 'invalid_invitation'; end if;

  begin
    insert into public.tenant_invitations(tenant_id,email,role,program_id,permissions,token_hash,invited_by,expires_at)
    values(p_tenant_id,v_email,p_role,p_program_id,v_permissions,p_token_hash,v_actor,p_expires_at)
    returning * into v_invitation;
  exception when unique_violation then
    raise exception 'pending_invitation_exists' using errcode='P0001';
  end;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_created','tenant_invitation',v_invitation.id::text,
    jsonb_build_object('email',v_email,'role',p_role,'program_id',p_program_id,'expires_at',p_expires_at));

  insert into public.notifications(tenant_id,title,message,type,recipient_email,notification_key,metadata,event_key,event_type,entity_type,entity_id,status,priority)
  values(p_tenant_id,'دعوة للانضمام إلى HAMZA AGENCY','لديك دعوة جديدة للانضمام إلى مساحة عمل.','tenant_invitation',v_email,
    'tenant_invitation:'||v_invitation.id,jsonb_build_object('invitation_id',v_invitation.id,'role',p_role,'delivery','provider_disabled'),
    'tenant.invitation.created:'||v_invitation.id,'tenant.invitation.created','tenant_invitation',v_invitation.id::text,'queued','normal')
  on conflict do nothing;

  return query select v_invitation.id,v_invitation.tenant_id,v_invitation.email,v_invitation.role,
    v_invitation.program_id,v_invitation.status,v_invitation.expires_at,v_invitation.last_sent_at,v_invitation.send_count;
end;
$function$


CREATE OR REPLACE FUNCTION public.create_translation_candidate_draft(p_source_type text, p_source_id text, p_language text, p_source_fingerprint text, p_source_snapshot jsonb, p_translated_fields jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(translation_revision_id uuid, created boolean, workflow_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_previous_source_revision_id uuid;
  v_existing_candidate_id uuid;
  v_existing_status text;
  v_candidate_id uuid;
  v_published_revision_id uuid;
  v_created_source_revision boolean := false;
  v_fields jsonb := coalesce(p_translated_fields, '{}'::jsonb);
begin
  perform public.require_translation_revision_admin();

  if not public.is_supported_translation_revision_source_type(p_source_type)
     or coalesce(btrim(p_source_id), '') = ''
     or p_language not in ('en', 'tr')
     or coalesce(btrim(p_source_fingerprint), '') = '' then
    raise exception 'Invalid source identity, language, or source fingerprint.'
      using errcode = '22023';
  end if;

  perform public.assert_translation_revision_snapshot(p_source_snapshot, v_fields);

  -- Source-level lock deliberately excludes the target language so concurrent
  -- EN/TR creation cannot create duplicate source revisions.
  perform pg_advisory_xact_lock(hashtext(p_source_type || ':' || p_source_id));

  select source_revision.id
    into v_source_revision_id
  from public.translation_source_revisions as source_revision
  where source_revision.source_type = p_source_type
    and source_revision.source_id = p_source_id
    and source_revision.source_fingerprint = p_source_fingerprint
  order by source_revision.created_at desc
  limit 1;

  if v_source_revision_id is null then
    select source_revision.id
      into v_previous_source_revision_id
    from public.translation_source_revisions as source_revision
    where source_revision.source_type = p_source_type
      and source_revision.source_id = p_source_id
    order by source_revision.created_at desc
    limit 1;

    insert into public.translation_source_revisions (
      source_type,
      source_id,
      source_locale,
      source_fingerprint,
      source_snapshot,
      previous_source_revision_id,
      created_by
    )
    values (
      p_source_type,
      p_source_id,
      'ar',
      p_source_fingerprint,
      p_source_snapshot,
      v_previous_source_revision_id,
      v_actor
    )
    returning id into v_source_revision_id;

    v_created_source_revision := true;
  end if;

  -- A newer Arabic snapshot never hides the old public translation. It only
  -- marks it stale for admin visibility and makes old candidates ineligible to
  -- review or publish. The public reader continues to see workflow_status=published.
  if v_created_source_revision then
    update public.content_translation_revisions
       set is_stale = true,
           stale_at = now(),
           stale_reason = 'Arabic source content changed',
           updated_at = now()
     where source_type = p_source_type
       and source_id = p_source_id
       and source_revision_id <> v_source_revision_id
       and workflow_status in ('draft', 'needs_review', 'reviewed', 'published')
       and is_stale = false;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_source_type || ':' || p_source_id || ':' || p_language));

  select revision.id, revision.workflow_status
    into v_existing_candidate_id, v_existing_status
  from public.content_translation_revisions as revision
  where revision.source_revision_id = v_source_revision_id
    and revision.language = p_language
    and revision.workflow_status in ('draft', 'needs_review', 'reviewed')
    and revision.is_stale = false
  order by revision.created_at desc
  limit 1
  for update;

  if v_existing_candidate_id is not null then
    return query
      select v_existing_candidate_id, false, v_existing_status;
    return;
  end if;

  select revision.id
    into v_published_revision_id
  from public.content_translation_revisions as revision
  where revision.source_type = p_source_type
    and revision.source_id = p_source_id
    and revision.language = p_language
    and revision.workflow_status = 'published'
  order by revision.published_at desc nulls last, revision.created_at desc
  limit 1;

  insert into public.content_translation_revisions (
    source_revision_id,
    source_type,
    source_id,
    language,
    workflow_status,
    supersedes_translation_revision_id,
    created_by
  )
  values (
    v_source_revision_id,
    p_source_type,
    p_source_id,
    p_language,
    'needs_review',
    v_published_revision_id,
    v_actor
  )
  returning id into v_candidate_id;

  insert into public.content_translation_revision_fields (
    translation_revision_id,
    field_name,
    source_value_snapshot,
    translated_value,
    created_by,
    updated_by
  )
  select
    v_candidate_id,
    field.key,
    field.value,
    coalesce(v_fields ->> field.key, ''),
    v_actor,
    v_actor
  from jsonb_each_text(p_source_snapshot) as field(key, value);

  return query
    select v_candidate_id, true, 'needs_review'::text;
end;
$function$


CREATE OR REPLACE FUNCTION public.current_admin_can_read_operations()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active is true
      and admin_user.role in ('super_admin', 'deputy_super_admin')
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
  );
$function$


CREATE OR REPLACE FUNCTION public.current_admin_has_module_permission(p_module text, p_action text DEFAULT 'can_view'::text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users as admin_user
    left join public.admin_permissions as permission
      on permission.module_key = p_module
     and (
       permission.admin_user_id = admin_user.id
       or (
         permission.admin_user_id is null
         and lower(permission.admin_email) = lower(admin_user.email)
       )
     )
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
      and (
        admin_user.role = 'super_admin'
        or (
          admin_user.role = 'deputy_super_admin'
          and (
            permission.module_key is null
            or permission.can_manage is true
            or case p_action
              when 'can_create' then permission.can_create
              when 'can_edit' then permission.can_edit
              when 'can_delete' then permission.can_delete
              when 'can_export' then permission.can_export
              when 'can_manage' then permission.can_manage
              else permission.can_view
            end is true
          )
        )
        or (
          admin_user.role = 'program_admin'
          and (
            permission.can_manage is true
            or case p_action
              when 'can_create' then permission.can_create
              when 'can_edit' then permission.can_edit
              when 'can_delete' then permission.can_delete
              when 'can_export' then permission.can_export
              when 'can_manage' then permission.can_manage
              else permission.can_view
            end is true
          )
        )
      )
  );
$function$


CREATE OR REPLACE FUNCTION public.current_admin_is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active is true
      and admin_user.role = 'super_admin'
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
  );
$function$


CREATE OR REPLACE FUNCTION public.current_user_has_tenant_role(target_tenant uuid, allowed_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'private'
AS $function$ select private.has_tenant_role(target_tenant,allowed_roles); $function$


CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
  );
$function$


CREATE OR REPLACE FUNCTION public.expire_tenant_invitations(p_tenant_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_count integer;
begin
  if p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  update public.tenant_invitations set status='expired',updated_at=now()
  where tenant_id=p_tenant_id and status='invited' and expires_at<=now();
  get diagnostics v_count=row_count;
  return v_count;
end;
$function$


CREATE OR REPLACE FUNCTION public.get_public_incident_status(p_hostname text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'private'
AS $function$ select private.get_public_incident_status(p_hostname); $function$


CREATE OR REPLACE FUNCTION public.invalidate_content_translations_on_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  watched_column text;
  changed boolean := false;
begin
  -- TG_ARGV[0] is the translation source type. Remaining values are Arabic
  -- source column names to watch. JSONB lookup keeps the migration safe when
  -- optional legacy columns do not exist on a particular installation.
  foreach watched_column in array tg_argv[1:array_length(tg_argv, 1)] loop
    if old_row -> watched_column is distinct from new_row -> watched_column then
      changed := true;
      exit;
    end if;
  end loop;

  if changed then
    update public.content_translations
       set status = 'needs_review',
           reviewed = false,
           is_published = false,
           updated_at = now()
     where source_type = tg_argv[0]
       and source_id = new.id::text
       and (is_published = true or reviewed = true or status in ('published', 'reviewed'));
  end if;

  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.is_active_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active is true
      and admin_user.role in ('super_admin', 'deputy_super_admin')
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
  );
$function$


CREATE OR REPLACE FUNCTION public.is_active_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.admin_users as admin_user
      where admin_user.is_active is true
        and lower(admin_user.role) in ('super_admin', 'deputy_super_admin')
        and (
          admin_user.user_id = (select auth.uid())
          or (
            admin_user.user_id is null
            and lower(admin_user.email) = lower(
              coalesce((select auth.jwt()) ->> 'email', '')
            )
          )
        )
    );
$function$


CREATE OR REPLACE FUNCTION public.is_supported_translation_revision_field_name(p_field_name text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select p_field_name = any (array[
    'title',
    'summary',
    'content',
    'requirements',
    'benefits',
    'updates',
    'faq',
    'department',
    'location',
    'job_type',
    'country',
    'person_name',
    'platform',
    'button_label',
    'meta_title',
    'meta_description',
    'question',
    'answer'
  ]::text[]);
$function$


CREATE OR REPLACE FUNCTION public.is_supported_translation_revision_source_type(p_source_type text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select p_source_type = any (array[
    'programs',
    'pages',
    'sections',
    'faqs',
    'knowledge_base',
    'partners',
    'jobs',
    'reviews',
    'success_stories',
    'gallery_items',
    'announcements',
    'services',
    'legal_pages'
  ]::text[]);
$function$


CREATE OR REPLACE FUNCTION public.is_translation_revision_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.admin_users as admin
    where lower(admin.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(admin.is_active, true) = true
      and admin.role in ('super_admin', 'deputy_super_admin')
  );
$function$


CREATE OR REPLACE FUNCTION public.lookup_public_agency_application(p_whatsapp text, p_platform text)
 RETURNS TABLE(id bigint, whatsapp text, platform text, status text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select application.id,
    '0000' || right(regexp_replace(application.whatsapp, '[^0-9]', '', 'g'), 4),
    application.platform, application.status, application.created_at
  from public.agency_applications as application
  where length(regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g')) between 8 and 20
    and regexp_replace(application.whatsapp, '[^0-9]', '', 'g') = regexp_replace(p_whatsapp, '[^0-9]', '', 'g')
    and ((btrim(p_platform) = 'منصة أخرى' and lower(application.platform) not in ('tiktok', 'bigo live', 'yaahlan', 'xena', 'catchii'))
      or lower(btrim(application.platform)) = lower(btrim(p_platform)))
  order by application.created_at desc limit 1;
$function$


CREATE OR REPLACE FUNCTION public.lookup_public_service_request(p_request_code text)
 RETURNS TABLE(id bigint, request_code text, service_type text, platform text, status text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select request.id, request.request_code, request.service_type, request.platform, request.status, request.created_at, request.updated_at
  from public.service_requests as request
  where length(btrim(coalesce(p_request_code, ''))) between 8 and 32
    and request.request_code = upper(regexp_replace(btrim(p_request_code), '[[:space:]]+', '', 'g'))
  order by request.created_at desc limit 1;
$function$


CREATE OR REPLACE FUNCTION public.manage_tenant_membership(p_tenant_id uuid, p_membership_id uuid, p_status text, p_role text, p_program_id bigint, p_permissions jsonb)
 RETURNS tenant_memberships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'auth'
AS $function$
declare
  v_actor uuid:=auth.uid();
  v_before public.tenant_memberships%rowtype;
  v_after public.tenant_memberships%rowtype;
  v_permissions jsonb;
  v_tenant_sessions integer:=0;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_status not in ('active','suspended','revoked') or p_role not in ('creator','client','employee','partner','tenant_admin') then
    raise exception 'invalid_membership';
  end if;

  select membership_row.* into v_before
  from public.tenant_memberships membership_row
  where membership_row.id=p_membership_id and membership_row.tenant_id=p_tenant_id
  for update;

  if not found then raise exception 'membership_not_found'; end if;
  if v_before.role='super_admin' then raise exception 'super_admin_protected' using errcode='42501'; end if;
  if (v_before.role='tenant_admin' or p_role='tenant_admin') and not public.current_user_has_tenant_role(p_tenant_id,array['super_admin']) then
    raise exception 'super_admin_required' using errcode='42501';
  end if;
  if v_before.user_id=v_actor and p_status<>'active' then raise exception 'cannot_suspend_self' using errcode='42501'; end if;
  if p_program_id is not null and not exists(
    select 1 from public.programs program_row
    where program_row.id=p_program_id and program_row.tenant_id=p_tenant_id
  ) then raise exception 'invalid_membership'; end if;

  v_permissions:=private.normalize_invitation_permissions(p_role,p_permissions);

  update public.tenant_memberships membership_row
  set status=p_status,role=p_role,program_id=p_program_id,permissions=v_permissions,
      mfa_required=(p_role='tenant_admin'),updated_at=now()
  where membership_row.id=p_membership_id and membership_row.tenant_id=p_tenant_id
  returning membership_row.* into v_after;

  if p_status in ('suspended','revoked') then
    update public.user_sessions session_row
    set revoked_at=coalesce(session_row.revoked_at,now()),revoked_by=v_actor,revoke_reason='membership_'||p_status
    where session_row.tenant_id=p_tenant_id
      and session_row.user_id=v_after.user_id
      and session_row.revoked_at is null;
    get diagnostics v_tenant_sessions=row_count;
  end if;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,before_data,after_data)
  values(
    p_tenant_id,v_actor,'tenant.membership_updated','tenant_membership',v_after.id::text,to_jsonb(v_before),
    to_jsonb(v_after)||jsonb_build_object('revocation_scope','tenant','tenant_sessions_revoked',v_tenant_sessions)
  );

  return v_after;
end;
$function$


CREATE OR REPLACE FUNCTION public.mark_translation_revisions_stale_on_source_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_old_snapshot jsonb := public.translation_source_snapshot_from_row(tg_argv[0], to_jsonb(old));
  v_new_snapshot jsonb := public.translation_source_snapshot_from_row(tg_argv[0], to_jsonb(new));
begin
  if v_old_snapshot is distinct from v_new_snapshot then
    update public.content_translation_revisions
       set is_stale = true,
           stale_at = now(),
           stale_reason = 'Arabic source content changed',
           updated_at = now()
     where source_type = tg_argv[0]
       and source_id = new.id::text
       and workflow_status in ('draft', 'needs_review', 'reviewed', 'published')
       and is_stale = false;
  end if;
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.normalize_notification_state_row()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.notification_key := coalesce(nullif(btrim(new.notification_key), ''), nullif(btrim(new.item_key), ''), nullif(btrim(new.state_key), ''), nullif(btrim(coalesce(new.metadata ->> 'notificationKey', '')), ''));
  new.recipient_email := lower(coalesce(nullif(btrim(new.recipient_email), ''), nullif(btrim(new.admin_email), ''), nullif(btrim(new.user_email), ''), nullif(btrim(coalesce(new.metadata ->> 'adminEmail', '')), '')));
  new.admin_email := coalesce(new.admin_email, new.recipient_email);
  new.user_email := coalesce(new.user_email, new.recipient_email);
  new.is_read := coalesce(new.is_read, new.read, false);
  new.read := new.is_read;
  new.is_archived := coalesce(new.is_archived, new.archived, false);
  new.archived := new.is_archived;
  new.is_deleted := coalesce(new.is_deleted, new.deleted, false);
  new.deleted := new.is_deleted;
  new.metadata := coalesce(new.metadata, new.payload, '{}'::jsonb);
  new.payload := coalesce(new.payload, new.metadata);
  new.updated_at := now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.normalize_public_ai_conversation_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.user_message := coalesce(nullif(btrim(new.user_message), ''), nullif(btrim(new.question), ''));
  new.ai_response := coalesce(new.ai_response, new.answer);
  new.question := coalesce(new.question, new.user_message);
  new.answer := coalesce(new.answer, new.ai_response);
  new.metadata := coalesce(new.metadata, '{}'::jsonb)
    || case when nullif(btrim(coalesce(new.source, '')), '') is null then '{}'::jsonb else jsonb_build_object('source', btrim(new.source)) end;
  new.updated_at := now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_admin_requests_index(p_search text DEFAULT NULL::text, p_type text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_offset integer DEFAULT 0, p_limit integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_admin public.admin_users%rowtype;
  v_search text := left(trim(coalesce(p_search, '')), 120);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_rows jsonb;
  v_total bigint;
begin
  select admin_user.*
  into v_admin
  from public.admin_users as admin_user
  where admin_user.is_active is true
    and (
      admin_user.user_id = (select auth.uid())
      or (
        admin_user.user_id is null
        and lower(admin_user.email) = lower(
          coalesce((select auth.jwt()) ->> 'email', '')
        )
      )
    )
  order by (admin_user.user_id = (select auth.uid())) desc
  limit 1;

  if v_admin.id is null
     or not public.current_admin_has_module_permission('requests', 'can_view') then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_type is not null
     and p_type not in ('application', 'service_request', 'job_application', 'contact') then
    raise exception 'Invalid request type' using errcode = '22023';
  end if;

  with request_rows as materialized (
    select
      application.id,
      application.tracking_code,
      'application'::text as request_type,
      application.full_name,
      application.whatsapp,
      null::text as email,
      application.status,
      application.created_at,
      coalesce(
        nullif(to_jsonb(application) ->> 'updated_at', '')::timestamptz,
        application.created_at
      ) as updated_at
    from public.agency_applications as application
    where (
      v_admin.role <> 'program_admin'
      or lower(coalesce(application.platform, '')) =
        lower(coalesce(v_admin.assigned_program, ''))
    )

    union all

    select
      request.id,
      request.request_code,
      'service_request'::text,
      request.full_name,
      request.whatsapp,
      null::text,
      request.status,
      request.created_at,
      coalesce(request.updated_at, request.created_at)
    from public.service_requests as request
    where v_admin.role <> 'program_admin'

    union all

    select
      application.id,
      application.tracking_code,
      'job_application'::text,
      application.full_name,
      application.whatsapp,
      application.email,
      application.status,
      application.created_at,
      coalesce(application.updated_at, application.created_at)
    from public.job_applications as application
    where v_admin.role <> 'program_admin'

    union all

    select
      message.id,
      message.tracking_code,
      'contact'::text,
      message.full_name,
      message.whatsapp,
      message.email,
      message.status,
      message.created_at,
      coalesce(message.updated_at, message.created_at)
    from public.contact_messages as message
    where v_admin.role <> 'program_admin'
  ),
  filtered as materialized (
    select *
    from request_rows
    where (p_type is null or request_type = p_type)
      and (p_status is null or status = p_status)
      and (p_from is null or created_at >= p_from)
      and (p_to is null or created_at < p_to)
      and (
        v_search = ''
        or tracking_code ilike '%' || v_search || '%'
        or full_name ilike '%' || v_search || '%'
        or whatsapp ilike '%' || v_search || '%'
        or email ilike '%' || v_search || '%'
      )
  ),
  page as (
    select *
    from filtered
    order by created_at desc, request_type, id desc
    offset v_offset
    limit v_limit
  )
  select
    coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    (select count(*) from filtered)
  into v_rows, v_total;

  return jsonb_build_object(
    'rows', v_rows,
    'total', v_total,
    'offset', v_offset,
    'limit', v_limit
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_cleanup_security_guards()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_submission bigint;
  v_lookup bigint;
  v_nonces bigint;
begin
  delete from public.public_submission_guards
  where created_at < now() - interval '90 days';
  get diagnostics v_submission = row_count;

  delete from public.public_lookup_guards
  where created_at < now() - interval '90 days';
  get diagnostics v_lookup = row_count;

  delete from public.pr100_gateway_nonces
  where created_at < now() - interval '90 days'
     or expires_at < now() - interval '7 days';
  get diagnostics v_nonces = row_count;

  return jsonb_build_object(
    'submission_guards', v_submission,
    'lookup_guards', v_lookup,
    'gateway_nonces', v_nonces
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_guard_ai_answer(p_identity text, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_identity_hash text;
  v_payload_hash text;
  v_recent integer;
  v_duplicate integer;
  v_reason text;
begin
  if length(trim(coalesce(p_identity, ''))) < 32
     or length(coalesce(p_payload::text, '')) > 5000 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_identity_hash := encode(
    digest(convert_to(lower(trim(p_identity)) || ':ai_answer', 'UTF8'), 'sha256'),
    'hex'
  );
  v_payload_hash := encode(
    digest(convert_to(coalesce(p_payload, '{}'::jsonb)::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select count(*) into v_recent
  from public.public_submission_guards
  where form_type = 'ai_answer'
    and identity_hash = v_identity_hash
    and created_at > now() - interval '15 minutes';

  select count(*) into v_duplicate
  from public.public_submission_guards
  where form_type = 'ai_answer'
    and payload_hash = v_payload_hash
    and accepted = true
    and created_at > now() - interval '5 minutes';

  if v_recent >= 12 then
    v_reason := 'cooldown';
  elsif v_duplicate >= 3 then
    v_reason := 'duplicate';
  end if;

  insert into public.public_submission_guards(
    form_type,
    identity_hash,
    payload_hash,
    accepted,
    reason
  ) values (
    'ai_answer',
    v_identity_hash,
    v_payload_hash,
    v_reason is null,
    v_reason
  );

  return jsonb_build_object(
    'allowed', v_reason is null,
    'code', case when v_reason is null then 'ok' else 'try_again_later' end
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_guard_password_reset(p_identity text, p_payload jsonb, p_started_at timestamp with time zone, p_honeypot text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  select public.pr99_guard_submission(
    'password_reset',
    lower(trim(coalesce(p_payload->>'email',''))),
    p_payload,
    p_started_at,
    p_honeypot
  );
$function$


CREATE OR REPLACE FUNCTION public.pr100_guard_public_lookup(p_lookup_type text, p_identity text, p_request_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_identity text;
  v_fingerprint text;
  v_identity_hash text;
  v_fingerprint_hash text;
  v_identity_attempts integer;
  v_fingerprint_attempts integer;
  v_reason text;
begin
  if p_lookup_type not in (
    'application',
    'service_request',
    'job_application',
    'contact'
  ) then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_identity := lower(trim(coalesce(p_identity, '')));
  v_fingerprint := lower(trim(coalesce(p_request_fingerprint, '')));

  if length(v_identity) < 8 or length(v_identity) > 160
     or v_fingerprint !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_identity_hash := encode(
    digest(convert_to(p_lookup_type || ':' || v_identity, 'UTF8'), 'sha256'),
    'hex'
  );
  v_fingerprint_hash := encode(
    digest(convert_to(v_fingerprint, 'UTF8'), 'sha256'),
    'hex'
  );

  select count(*) into v_identity_attempts
  from public.public_lookup_guards
  where lookup_type = p_lookup_type
    and identity_hash = v_identity_hash
    and created_at > now() - interval '15 minutes';

  select count(*) into v_fingerprint_attempts
  from public.public_lookup_guards
  where fingerprint_hash = v_fingerprint_hash
    and created_at > now() - interval '1 hour';

  if v_identity_attempts >= 5 or v_fingerprint_attempts >= 30 then
    v_reason := 'rate_limited';
  end if;

  insert into public.public_lookup_guards(
    lookup_type,
    identity_hash,
    fingerprint_hash,
    accepted,
    reason
  ) values (
    p_lookup_type,
    v_identity_hash,
    v_fingerprint_hash,
    v_reason is null,
    v_reason
  );

  return jsonb_build_object(
    'allowed', v_reason is null,
    'code', coalesce(v_reason, 'ok')
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_lookup_public_agency_application(p_whatsapp text, p_platform text, p_request_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_digits text;
  v_platform text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_digits := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_platform := trim(coalesce(p_platform, ''));

  if length(v_digits) not between 8 and 20
     or length(v_platform) not between 2 and 80 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'application',
    v_digits || ':' || lower(v_platform),
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select to_jsonb(application_record)
  into v_record
  from public.lookup_public_agency_application(v_digits, v_platform) as application_record
  limit 1;

  if v_record is not null then
    v_record := v_record - 'whatsapp';
  end if;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_lookup_public_agency_application_by_code(p_tracking_code text, p_request_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_code text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_code := upper(regexp_replace(trim(coalesce(p_tracking_code, '')), '[[:space:]]+', '', 'g'));

  if v_code !~ '^APP-[0-9]{4}-[A-F0-9]{10}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'application',
    v_code,
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select jsonb_build_object(
    'tracking_code', application.tracking_code,
    'platform', application.platform,
    'status', application.status,
    'created_at', application.created_at
  )
  into v_record
  from public.agency_applications as application
  where application.tracking_code = v_code
  limit 1;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_lookup_public_contact_message(p_tracking_code text, p_request_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_code text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_code := upper(regexp_replace(trim(coalesce(p_tracking_code, '')), '[[:space:]]+', '', 'g'));
  if v_code !~ '^CNT-[0-9]{4}-[A-F0-9]{10}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'contact',
    v_code,
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select jsonb_build_object(
    'tracking_code', message.tracking_code,
    'request_type', 'contact',
    'status', public.pr100_public_request_status(message.status),
    'created_at', message.created_at,
    'updated_at', message.updated_at
  )
  into v_record
  from public.contact_messages as message
  where message.tracking_code = v_code
  limit 1;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_lookup_public_job_application(p_tracking_code text, p_request_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_code text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_code := upper(regexp_replace(trim(coalesce(p_tracking_code, '')), '[[:space:]]+', '', 'g'));
  if v_code !~ '^JOB-[0-9]{4}-[A-F0-9]{10}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'job_application',
    v_code,
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select jsonb_build_object(
    'tracking_code', application.tracking_code,
    'request_type', 'job_application',
    'status', public.pr100_public_request_status(application.status),
    'created_at', application.created_at,
    'updated_at', application.updated_at,
    'public_title', case
      when job.is_visible is true and job.status = 'open' then job.title
      else null
    end
  )
  into v_record
  from public.job_applications as application
  left join public.jobs as job on job.id = application.job_id
  where application.tracking_code = v_code
  limit 1;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_lookup_public_service_request(p_request_code text, p_request_fingerprint text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_code text;
  v_guard jsonb;
  v_record jsonb;
begin
  v_code := upper(regexp_replace(trim(coalesce(p_request_code, '')), '[[:space:]]+', '', 'g'));
  if length(v_code) not between 8 and 32 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_guard := public.pr100_guard_public_lookup(
    'service_request',
    v_code,
    p_request_fingerprint
  );
  if coalesce((v_guard ->> 'allowed')::boolean, false) is not true then
    return v_guard;
  end if;

  select to_jsonb(service_record)
  into v_record
  from public.lookup_public_service_request(v_code) as service_record
  limit 1;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'found', v_record is not null,
    'record', v_record
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_monthly_backup_dry_run()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_backup record;
  v_payload jsonb;
  v_without_checksum jsonb;
  v_actual_checksum text;
  v_scope text[];
  v_table text;
  v_before bigint;
  v_backup_count bigint;
  v_summary jsonb := '{}'::jsonb;
begin
  select id, backup_code, details, checksum, scope
  into v_backup
  from public.backups
  where status = 'completed'
    and details is not null
  order by completed_at desc nulls last, created_at desc
  limit 1;

  if v_backup.id is null then
    perform public.pr99_scheduled_private_backup();
    select id, backup_code, details, checksum, scope
    into v_backup
    from public.backups
    where status = 'completed'
      and details is not null
    order by completed_at desc nulls last, created_at desc
    limit 1;
  end if;

  v_payload := v_backup.details;
  v_without_checksum := v_payload - 'checksum';
  v_actual_checksum := encode(
    digest(convert_to(v_without_checksum::text, 'UTF8'), 'sha256'),
    'hex'
  );

  if v_payload ->> 'format' <> 'hamza-agency-private-backup'
     or v_payload ->> 'project_ref' <> 'fvaurkfnsvsfohpzguho'
     or coalesce((v_payload ->> 'schema_version')::integer, 0) <> 1
     or coalesce(v_payload ->> 'checksum', '') <> v_actual_checksum
     or coalesce(v_backup.checksum, '') <> v_actual_checksum then
    raise exception 'Scheduled backup validation failed';
  end if;

  select coalesce(array_agg(value), public.pr99_operations_allowlist())
  into v_scope
  from jsonb_array_elements_text(
    coalesce(v_payload -> 'scope', to_jsonb(v_backup.scope))
  );

  foreach v_table in array v_scope loop
    execute format('select count(*) from public.%I', v_table)
      into v_before;
    v_backup_count := jsonb_array_length(
      coalesce(v_payload -> 'entities' -> v_table, '[]'::jsonb)
    );
    v_summary := v_summary || jsonb_build_object(
      v_table,
      jsonb_build_object(
        'before', v_before,
        'backup', v_backup_count,
        'delta', v_backup_count - v_before
      )
    );
  end loop;

  insert into public.restore_operations(
    project_ref,
    backup_code,
    mode,
    status,
    scope,
    summary,
    checksum,
    created_by,
    completed_at
  ) values (
    'fvaurkfnsvsfohpzguho',
    v_backup.backup_code,
    'dry_run',
    'validated',
    v_scope,
    v_summary,
    v_actual_checksum,
    'system',
    now()
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_new_contact_tracking_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_code text;
  v_attempt integer := 0;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('pr100-contact-tracking-code', 0)
  );
  loop
    v_attempt := v_attempt + 1;
    v_code := 'CNT-' || to_char(clock_timestamp(), 'YYYY') || '-' ||
      upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (
      select 1
      from public.contact_messages
      where tracking_code = v_code
    );
    if v_attempt >= 64 then
      raise exception 'Unable to allocate CNT tracking code' using errcode = '23505';
    end if;
  end loop;
  return v_code;
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_new_job_tracking_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_code text;
  v_attempt integer := 0;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('pr100-job-tracking-code', 0)
  );
  loop
    v_attempt := v_attempt + 1;
    v_code := 'JOB-' || to_char(clock_timestamp(), 'YYYY') || '-' ||
      upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (
      select 1
      from public.job_applications
      where tracking_code = v_code
    );
    if v_attempt >= 64 then
      raise exception 'Unable to allocate JOB tracking code' using errcode = '23505';
    end if;
  end loop;
  return v_code;
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_oidc_gateway(p_action text, p_timestamp bigint, p_nonce text, p_body text, p_body_digest text, p_oidc_issuer text, p_oidc_subject text, p_oidc_audience text, p_oidc_team_id text, p_oidc_project_id text, p_oidc_project text, p_oidc_environment text, p_oidc_issued_at bigint, p_oidc_expires_at bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_body jsonb;
  v_actual_digest text;
  v_now bigint := extract(epoch from clock_timestamp())::bigint;
  v_expected_subject text;
  v_request_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  if v_request_role <> 'service_role' then
    return jsonb_build_object('allowed', false, 'code', 'unauthorized_gateway');
  end if;

  if p_action is null or p_action not in (
    'application_lookup',
    'service_lookup',
    'job_lookup',
    'contact_lookup',
    'ai_guard',
    'password_reset_guard',
    'application_submit',
    'service_request_submit',
    'job_application_submit',
    'contact_submit',
    'ai_support_submit'
  ) then
    return jsonb_build_object('allowed', false, 'code', 'invalid_action');
  end if;

  if p_timestamp is null
     or p_timestamp < v_now - 120
     or p_timestamp > v_now + 30 then
    return jsonb_build_object('allowed', false, 'code', 'stale_request');
  end if;
  if p_nonce is null or p_nonce !~ '^[A-Za-z0-9_-]{24,80}$' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_nonce');
  end if;
  if p_body is null or octet_length(p_body) > 40000 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
  end if;

  begin
    v_body := p_body::jsonb;
  exception when others then
    return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
  end;
  if jsonb_typeof(v_body) <> 'object' then
    return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
  end if;

  v_actual_digest := encode(
    digest(convert_to(p_body, 'UTF8'), 'sha256'),
    'hex'
  );
  if p_body_digest is null or lower(p_body_digest) <> v_actual_digest then
    return jsonb_build_object('allowed', false, 'code', 'digest_mismatch');
  end if;

  if p_oidc_issuer <> 'https://oidc.vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_audience <> 'https://vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_team_id <> 'team_gu9SOMWlOqS2uvLEZUYEbTPs'
     or p_oidc_project_id <> 'prj_YQw97FRAAwcnpQkudzGr01kXASvN'
     or p_oidc_project <> 'hamza-agency'
     or p_oidc_environment not in ('preview', 'production') then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_claims');
  end if;

  v_expected_subject :=
    'owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:' ||
    p_oidc_environment;
  if p_oidc_subject <> v_expected_subject then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_subject');
  end if;
  if p_oidc_issued_at is null
     or p_oidc_expires_at is null
     or p_oidc_issued_at > v_now + 30
     or p_oidc_expires_at <= v_now
     or p_oidc_expires_at - p_oidc_issued_at > 7200 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_oidc_time');
  end if;

  begin
    insert into public.pr100_gateway_nonces(
      nonce,
      action,
      request_timestamp,
      expires_at
    ) values (
      p_nonce,
      p_action,
      p_timestamp,
      greatest(to_timestamp(p_timestamp), clock_timestamp()) + interval '10 minutes'
    );
  exception when unique_violation then
    return jsonb_build_object('allowed', false, 'code', 'replay_detected');
  end;

  case p_action
    when 'application_lookup' then
      return public.pr100_lookup_public_agency_application_by_code(
        v_body ->> 'trackingCode',
        v_body ->> 'requestFingerprint'
      );
    when 'service_lookup' then
      return public.pr100_lookup_public_service_request(
        v_body ->> 'requestCode',
        v_body ->> 'requestFingerprint'
      );
    when 'job_lookup' then
      return public.pr100_lookup_public_job_application(
        v_body ->> 'trackingCode',
        v_body ->> 'requestFingerprint'
      );
    when 'contact_lookup' then
      return public.pr100_lookup_public_contact_message(
        v_body ->> 'trackingCode',
        v_body ->> 'requestFingerprint'
      );
    when 'ai_guard' then
      return public.pr100_guard_ai_answer(v_body ->> 'identity', v_body -> 'payload');
    when 'password_reset_guard' then
      return public.pr100_guard_password_reset(
        v_body ->> 'identity',
        v_body -> 'payload',
        (v_body ->> 'startedAt')::timestamptz,
        coalesce(v_body ->> 'honeypot', '')
      );
    when 'application_submit' then
      return public.pr99_submit_application(
        v_body -> 'payload',
        v_body ->> 'identity',
        (v_body ->> 'startedAt')::timestamptz,
        coalesce(v_body ->> 'honeypot', '')
      );
    when 'service_request_submit' then
      return public.pr99_submit_service_request(
        v_body -> 'payload',
        v_body ->> 'identity',
        (v_body ->> 'startedAt')::timestamptz,
        coalesce(v_body ->> 'honeypot', '')
      );
    when 'job_application_submit' then
      return public.pr99_submit_job_application(
        v_body -> 'payload',
        v_body ->> 'identity',
        (v_body ->> 'startedAt')::timestamptz,
        coalesce(v_body ->> 'honeypot', '')
      );
    when 'contact_submit' then
      return public.pr99_submit_contact(
        v_body -> 'payload',
        v_body ->> 'identity',
        (v_body ->> 'startedAt')::timestamptz,
        coalesce(v_body ->> 'honeypot', '')
      );
    when 'ai_support_submit' then
      return public.pr99_submit_ai_support(
        v_body -> 'payload',
        v_body ->> 'identity',
        (v_body ->> 'startedAt')::timestamptz,
        coalesce(v_body ->> 'honeypot', '')
      );
    else
      return jsonb_build_object('allowed', false, 'code', 'invalid_action');
  end case;
exception
  when invalid_text_representation or datetime_field_overflow then
    return jsonb_build_object('allowed', false, 'code', 'invalid_payload');
end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_public_request_status(p_status text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
  select case lower(coalesce(p_status, 'new'))
    when 'accepted' then 'completed'
    when 'approved' then 'completed'
    when 'completed' then 'completed'
    when 'done' then 'completed'
    when 'rejected' then 'closed'
    when 'declined' then 'closed'
    when 'cancelled' then 'closed'
    when 'closed' then 'closed'
    when 'archived' then 'closed'
    else 'in_progress'
  end;
$function$


CREATE OR REPLACE FUNCTION public.pr100_server_gateway(p_action text, p_timestamp bigint, p_nonce text, p_body text, p_body_digest text, p_signature text)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
  select jsonb_build_object('allowed', false, 'code', 'gateway_superseded')
$function$


CREATE OR REPLACE FUNCTION public.pr100_touch_request_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.pr101_new_order_code()
 RETURNS text
 LANGUAGE sql
 SET search_path TO 'public', 'extensions'
AS $function$
  select 'ORD-' || to_char(now(),'YYYY') || '-' || upper(encode(gen_random_bytes(5),'hex'));
$function$


CREATE OR REPLACE FUNCTION public.pr101_oidc_gateway(p_action text, p_timestamp bigint, p_nonce text, p_body text, p_body_digest text, p_oidc_issuer text, p_oidc_subject text, p_oidc_audience text, p_oidc_team_id text, p_oidc_project_id text, p_oidc_project text, p_oidc_environment text, p_oidc_issued_at bigint, p_oidc_expires_at bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  payload jsonb;
  tenant uuid;
  event_id_text text;
  now_epoch bigint := extract(epoch from now())::bigint;
begin
  if p_oidc_issuer <> 'https://oidc.vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_audience <> 'https://vercel.com/hamzaagencysy-3009s-projects'
     or p_oidc_team_id <> 'team_gu9SOMWlOqS2uvLEZUYEbTPs'
     or p_oidc_project_id <> 'prj_YQw97FRAAwcnpQkudzGr01kXASvN'
     or p_oidc_project <> 'hamza-agency'
     or p_oidc_environment not in ('preview','production')
     or p_oidc_subject <> format('owner:hamzaagencysy-3009s-projects:project:hamza-agency:environment:%s',p_oidc_environment)
     or p_timestamp < now_epoch-120 or p_timestamp > now_epoch+30
     or p_oidc_issued_at > now_epoch+30 or p_oidc_expires_at < now_epoch
     or p_nonce !~ '^[A-Za-z0-9_-]{24,80}$'
     or encode(digest(p_body,'sha256'),'hex') <> lower(p_body_digest)
  then return jsonb_build_object('allowed',false,'code','invalid_gateway_request'); end if;

  delete from public.pr101_gateway_nonces where expires_at<now()-interval '1 day';
  begin
    insert into public.pr101_gateway_nonces(nonce,action,request_timestamp,expires_at)
    values(p_nonce,p_action,p_timestamp,now()+interval '10 minutes');
  exception when unique_violation then
    return jsonb_build_object('allowed',false,'code','replay_rejected');
  end;

  payload := p_body::jsonb;
  select t.id into tenant from public.tenants t
  left join public.tenant_domains d on d.tenant_id=t.id
    and d.hostname=lower(split_part(coalesce(payload->>'hostname',''),':',1))
    and d.status in ('verified','active')
  where t.status='active' and (t.id::text=coalesce(payload->>'tenantId','') or d.id is not null or t.is_primary=true)
  order by (t.id::text=coalesce(payload->>'tenantId','')) desc,(d.id is not null) desc,t.is_primary desc
  limit 1;
  if tenant is null then return jsonb_build_object('allowed',false,'code','tenant_not_found'); end if;

  if p_action='consent_record' then
    insert into public.consent_records(tenant_id,anonymous_id,consent_version,necessary,analytics,preferences,marketing,region,withdrawn_at)
    values(tenant,nullif(payload->>'anonymousId',''),left(coalesce(payload->>'consentVersion','1'),50),true,
      coalesce((payload->>'analytics')::boolean,false),coalesce((payload->>'preferences')::boolean,false),coalesce((payload->>'marketing')::boolean,false),
      left(coalesce(payload->>'region','unknown'),40),case when coalesce((payload->>'withdrawn')::boolean,false) then now() else null end)
    returning id::text into event_id_text;
    return jsonb_build_object('allowed',true,'id',event_id_text);
  elsif p_action='payment_webhook_record' then
    insert into public.payment_webhook_events(tenant_id,provider_key,event_id,signature_valid,payload_digest,processing_status)
    values(tenant,left(payload->>'providerKey',80),left(payload->>'eventId',200),true,left(payload->>'payloadDigest',64),'received')
    on conflict (tenant_id,provider_key,event_id) do nothing
    returning id::text into event_id_text;
    return jsonb_build_object('allowed',true,'id',event_id_text,'duplicate',event_id_text is null);
  elsif p_action='provider_event_enqueue' then
    insert into public.provider_message_events(tenant_id,provider_type,provider_key,event_key,status,payload)
    values(tenant,payload->>'providerType',left(payload->>'providerKey',80),left(payload->>'eventKey',128),'queued',coalesce(payload->'payload','{}'::jsonb))
    on conflict (tenant_id,provider_type,event_key) do nothing
    returning id::text into event_id_text;
    return jsonb_build_object('allowed',true,'id',event_id_text,'duplicate',event_id_text is null);
  elsif p_action='provider_health_record' then
    insert into public.provider_health_checks(tenant_id,provider_type,provider_key,status,latency_ms,detail)
    values(tenant,payload->>'providerType',left(payload->>'providerKey',80),payload->>'status',nullif(payload->>'latencyMs','')::integer,coalesce(payload->'detail','{}'::jsonb))
    returning id::text into event_id_text;
    return jsonb_build_object('allowed',true,'id',event_id_text);
  end if;
  return jsonb_build_object('allowed',false,'code','unsupported_action');
exception when others then
  return jsonb_build_object('allowed',false,'code','gateway_operation_failed');
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_audit_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_email text := lower(coalesce((select auth.jwt()) ->> 'email', 'system'));
  v_entity_id text;
  v_action text;
  v_old jsonb;
  v_new jsonb;
begin
  v_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_entity_id := coalesce(v_new ->> 'id', v_old ->> 'id', 'unknown');
  v_action := lower(tg_op) || '_' || tg_table_name;

  if tg_table_name = 'pages'
     and tg_op = 'UPDATE'
     and coalesce(v_old ->> 'publishing_status', '') <>
         coalesce(v_new ->> 'publishing_status', '') then
    v_action := 'page_status_changed';
  end if;
  if tg_table_name in (
      'agency_applications',
      'service_requests',
      'job_applications',
      'contact_messages'
    )
    and tg_op = 'UPDATE'
    and coalesce(v_old ->> 'status', '') <> coalesce(v_new ->> 'status', '') then
    v_action := 'request_status_changed';
  end if;

  insert into public.activity_logs(
    admin_email,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata,
    source_route,
    outcome
  ) values (
    v_email,
    (select auth.uid()),
    v_action,
    tg_table_name,
    v_entity_id,
    coalesce(v_old, '{}'::jsonb)::text,
    coalesce(v_new, '{}'::jsonb)::text,
    jsonb_build_object('operation', tg_op),
    'database',
    'success'
  );
  return coalesce(new, old);
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_backup_dry_run(p_backup jsonb, p_scope text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_payload jsonb:=p_backup-'checksum';v_expected text:=coalesce(p_backup->>'checksum','');v_actual text;v_scope text[];v_table text;v_before bigint;v_after bigint;v_summary jsonb:='{}'::jsonb;v_operation uuid;
begin
 if p_backup->>'format'<>'hamza-agency-private-backup' or p_backup->>'project_ref'<>'fvaurkfnsvsfohpzguho' or coalesce((p_backup->>'schema_version')::integer,0)<>1 then raise exception 'Backup identity or schema is invalid';end if;
 v_actual:=encode(digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');if v_expected='' or v_expected<>v_actual then raise exception 'Backup checksum is invalid';end if;
 select coalesce(array_agg(value),public.pr99_operations_allowlist()) into v_scope from jsonb_array_elements_text(coalesce(to_jsonb(p_scope),p_backup->'scope'));
 if exists(select 1 from unnest(v_scope)x where not(x=any(public.pr99_operations_allowlist()))) then raise exception 'Unsupported restore scope';end if;
 foreach v_table in array v_scope loop
  execute format('select count(*) from public.%I',v_table) into v_before;
  select jsonb_array_length(coalesce(p_backup->'entities'->v_table,'[]'::jsonb)) into v_after;
  v_summary:=v_summary||jsonb_build_object(v_table,jsonb_build_object('before',v_before,'backup',v_after,'delta',v_after-v_before));
 end loop;
 insert into public.restore_operations(project_ref,backup_code,mode,status,scope,summary,checksum,created_by,completed_at) values('fvaurkfnsvsfohpzguho',p_backup->>'backup_code','dry_run','validated',v_scope,v_summary,v_actual,v_actor,now()) returning id into v_operation;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'restore_dry_run','restore_operation',v_operation::text,'',jsonb_build_object('scope',v_scope,'summary',v_summary),'/admin/backups','success');
 return jsonb_build_object('valid',true,'operation_id',v_operation,'scope',v_scope,'summary',v_summary,'checksum',v_actual);
end $function$


CREATE OR REPLACE FUNCTION public.pr99_backup_schedule_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
end $function$


CREATE OR REPLACE FUNCTION public.pr99_build_backup_payload(p_scope text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_scope text[];v_table text;v_entities jsonb:='{}'::jsonb;v_rows jsonb;
begin
 v_scope:=coalesce(p_scope,public.pr99_operations_allowlist());
 if exists(select 1 from unnest(v_scope) x where not(x=any(public.pr99_operations_allowlist()))) then raise exception 'Unsupported backup scope';end if;
 foreach v_table in array v_scope loop
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by t.id),''[]''::jsonb) from public.%I t',v_table) into v_rows;
  v_entities:=v_entities||jsonb_build_object(v_table,coalesce(v_rows,'[]'::jsonb));
 end loop;
 return jsonb_build_object('format','hamza-agency-private-backup','schema_version',1,'project_ref','fvaurkfnsvsfohpzguho','created_at',now(),'created_by',v_actor,'scope',to_jsonb(v_scope),'entities',v_entities);
end $function$


CREATE OR REPLACE FUNCTION public.pr99_contact_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  insert into public.notifications(
    title,
    message,
    type,
    is_read,
    recipient_role,
    notification_key,
    metadata,
    is_archived,
    is_deleted,
    updated_at,
    event_key,
    event_type,
    entity_type,
    entity_id,
    occurred_at,
    href,
    source_table,
    source_id,
    priority
  ) values (
    'رسالة تواصل جديدة',
    'تم استلام رسالة تواصل جديدة برقم ' || new.tracking_code || '.',
    'contact',
    false,
    'admin',
    'contact_messages:' || new.id || ':created',
    jsonb_build_object('tracking_code', new.tracking_code, 'status', new.status),
    false,
    false,
    now(),
    'contact_messages:' || new.id || ':created',
    'created',
    'contact_messages',
    new.id::text,
    now(),
    '/admin/contact#contact-' || new.id,
    'contact_messages',
    new.id::text,
    'high'
  )
  on conflict(event_key) where event_key is not null do nothing;
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_create_page_version(p_page_id bigint, p_operation text, p_locale text DEFAULT NULL::text, p_summary text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_page jsonb;v_sections jsonb;v_version integer;v_id bigint;
begin
 select to_jsonb(p) into v_page from public.pages p where p.id=p_page_id;
 if v_page is null then raise exception 'Page not found';end if;
 select coalesce(jsonb_agg(to_jsonb(s) order by s.language,s.sort_order,s.id),'[]'::jsonb) into v_sections from public.sections s where s.page_id=p_page_id;
 select coalesce(max(version_number),0)+1 into v_version from public.version_history where page_id=p_page_id or(page_id is null and item_type='page' and item_id=p_page_id::text);
 insert into public.version_history(item_type,item_id,version_number,data,changed_by_email,change_summary,entity_type,entity_id,action,title,summary,metadata,changed_by,page_id,operation,page_snapshot,sections_snapshot,locale)
 values('page',p_page_id::text,v_version,jsonb_build_object('page',v_page,'sections',v_sections),v_actor,p_summary,'page',p_page_id::text,coalesce(p_operation,'publish'),v_page->>'title',p_summary,jsonb_build_object('locale',p_locale),v_actor,p_page_id,coalesce(p_operation,'publish'),v_page,v_sections,p_locale) returning id into v_id;
 return v_id;
end $function$


CREATE OR REPLACE FUNCTION public.pr99_create_private_backup(p_scope text[] DEFAULT NULL::text[], p_mode text DEFAULT 'manual'::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_payload jsonb;v_checksum text;v_code text;v_id bigint;v_scope text[];
begin
 v_scope:=coalesce(p_scope,public.pr99_operations_allowlist());v_payload:=public.pr99_build_backup_payload(v_scope);
 v_checksum:=encode(digest(convert_to((v_payload-'checksum')::text,'UTF8'),'sha256'),'hex');v_payload:=v_payload||jsonb_build_object('checksum',v_checksum);
 v_code:='BKP-'||to_char(now(),'YYYYMMDD-HH24MISS')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,8));
 insert into public.backups(backup_name,backup_type,notes,created_by,backup_code,title,file_name,status,mode,size_bytes,details,project_ref,schema_version,checksum,scope,started_at,completed_at)
 values('HAMZA AGENCY private backup',p_mode,p_notes,v_actor,v_code,'نسخة احتياطية خاصة',null,'completed',p_mode,octet_length(v_payload::text),v_payload,'fvaurkfnsvsfohpzguho',1,v_checksum,v_scope,now(),now()) returning id into v_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'backup_create','backup',v_id::text,'',jsonb_build_object('code',v_code,'scope',v_scope,'checksum',v_checksum),'/admin/backups','success');
 return jsonb_build_object('id',v_id,'backup_code',v_code,'checksum',v_checksum,'payload',v_payload);
exception when others then
 insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,occurred_at,priority,metadata) values('فشل النسخ الاحتياطي','تعذر إنشاء نسخة احتياطية خاصة.','backup_failure',false,'admin','backup-failure:'||extract(epoch from clock_timestamp())::bigint,'failed','backup',now(),'critical',jsonb_build_object('safe_error',sqlstate)) on conflict(event_key) where event_key is not null do nothing;
 raise;
end $function$


CREATE OR REPLACE FUNCTION public.pr99_enqueue_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_id text := new.id::text;
  v_status text := coalesce(to_jsonb(new) ->> 'status', 'new');
  v_tracking_code text := to_jsonb(new) ->> 'tracking_code';
  v_event text := case when tg_op = 'INSERT' then 'created' else 'status_changed' end;
  v_key text := tg_table_name || ':' || new.id::text || ':' || v_event || ':' || v_status;
begin
  if tg_op = 'UPDATE'
     and coalesce(to_jsonb(old) ->> 'status', '') = v_status then
    return new;
  end if;

  insert into public.notifications(
    title,
    message,
    type,
    is_read,
    recipient_role,
    notification_key,
    metadata,
    is_archived,
    is_deleted,
    updated_at,
    event_key,
    event_type,
    entity_type,
    entity_id,
    occurred_at,
    href,
    source_table,
    source_id,
    priority
  ) values (
    case tg_table_name
      when 'agency_applications' then 'طلب انضمام'
      when 'service_requests' then 'طلب خدمة'
      else 'طلب وظيفة'
    end,
    case
      when tg_op = 'INSERT' then
        'تم استلام سجل جديد' ||
        case when v_tracking_code is null then '.' else ' برقم ' || v_tracking_code || '.' end
      else 'تم تغيير حالة السجل إلى ' || v_status || '.'
    end,
    tg_table_name,
    false,
    'admin',
    v_key,
    jsonb_build_object(
      'operation', tg_op,
      'status', v_status,
      'tracking_code', v_tracking_code
    ),
    false,
    false,
    now(),
    v_key,
    v_event,
    tg_table_name,
    v_id,
    now(),
    case tg_table_name
      when 'agency_applications' then '/admin/applications'
      when 'service_requests' then '/admin/service-requests'
      else '/admin/jobs#job-application-' || v_id
    end,
    tg_table_name,
    v_id,
    case when tg_op = 'INSERT' then 'high' else 'normal' end
  )
  on conflict(event_key) where event_key is not null do nothing;

  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_guard_submission(p_form_type text, p_identity text, p_payload jsonb, p_started_at timestamp with time zone, p_honeypot text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_identity_hash text;
  v_payload_hash text;
  v_recent integer;
  v_hourly integer;
  v_duplicate integer;
  v_global_recent integer;
  v_global_hourly integer;
  v_reason text;
begin
  if p_form_type not in ('application','service_request','job_application','contact','ai_support','password_reset') then
    raise exception 'Invalid form type';
  end if;
  if length(coalesce(p_payload::text,'')) > 30000 then
    v_reason := 'payload_too_large';
  elsif coalesce(trim(p_honeypot),'') <> '' then
    v_reason := 'honeypot';
  elsif p_started_at is null
     or p_started_at > now() + interval '30 seconds'
     or now() - p_started_at < interval '2 seconds' then
    v_reason := 'submitted_too_fast';
  elsif length(trim(coalesce(p_identity,''))) < 3
     or length(trim(coalesce(p_identity,''))) > 500 then
    v_reason := 'invalid_identity';
  end if;

  v_identity_hash := encode(
    digest(convert_to(lower(trim(coalesce(p_identity,''))) || ':' || p_form_type,'UTF8'),'sha256'),
    'hex'
  );
  v_payload_hash := encode(
    digest(convert_to(coalesce(p_payload,'{}'::jsonb)::text,'UTF8'),'sha256'),
    'hex'
  );

  select count(*) into v_recent
  from public.public_submission_guards
  where form_type=p_form_type
    and identity_hash=v_identity_hash
    and accepted=true
    and created_at>now()-interval '15 minutes';

  select count(*) into v_hourly
  from public.public_submission_guards
  where form_type=p_form_type
    and identity_hash=v_identity_hash
    and created_at>now()-interval '1 hour';

  select count(*) into v_duplicate
  from public.public_submission_guards
  where form_type=p_form_type
    and payload_hash=v_payload_hash
    and accepted=true
    and created_at>now()-interval '24 hours';

  select count(*) into v_global_recent
  from public.public_submission_guards
  where form_type=p_form_type
    and accepted=true
    and created_at>now()-interval '15 minutes';

  select count(*) into v_global_hourly
  from public.public_submission_guards
  where form_type=p_form_type
    and accepted=true
    and created_at>now()-interval '1 hour';

  if v_reason is null and (v_recent >= 3 or v_hourly >= 8) then
    v_reason := 'cooldown';
  end if;
  if v_reason is null and v_duplicate >= 1 then
    v_reason := 'duplicate';
  end if;
  if v_reason is null and (v_global_recent >= 60 or v_global_hourly >= 240) then
    v_reason := 'global_cooldown';
  end if;

  insert into public.public_submission_guards(
    form_type,
    identity_hash,
    payload_hash,
    accepted,
    reason
  ) values (
    p_form_type,
    v_identity_hash,
    v_payload_hash,
    v_reason is null,
    v_reason
  );

  return jsonb_build_object(
    'allowed',v_reason is null,
    'code',case when v_reason is null then 'ok' else 'try_again_later' end
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_log_operation_failure(p_event_type text, p_entity_type text, p_entity_id text, p_safe_message text, p_route text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_key text;
begin
 if p_event_type not in('publish_failure','backup_failure','restore_failure','permission_denied','notification_failure') then raise exception 'Unsupported failure event';end if;
 v_key:=p_event_type||':'||coalesce(p_entity_type,'operation')||':'||coalesce(p_entity_id,'unknown')||':'||to_char(now(),'YYYYMMDDHH24MI');
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome)
 values(v_actor,auth.uid(),p_event_type,coalesce(p_entity_type,'operation'),coalesce(p_entity_id,'unknown'),jsonb_build_object('safe_message',left(coalesce(p_safe_message,''),500)),left(coalesce(p_route,''),500),'failed');
 insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,metadata)
 values(case p_event_type when 'publish_failure' then 'فشل النشر' when 'backup_failure' then 'فشل النسخ الاحتياطي' when 'restore_failure' then 'فشل الاستعادة' when 'permission_denied' then 'رفض إجراء حساس' else 'فشل إشعار' end,left(coalesce(p_safe_message,'تعذر إكمال العملية بأمان.'),500),p_event_type,false,'admin',v_key,'failed',p_entity_type,p_entity_id,now(),case when p_event_type in('backup_failure','restore_failure','permission_denied') then 'critical' else 'high' end,jsonb_build_object('route',p_route)) on conflict(event_key) where event_key is not null do nothing;
end $function$


CREATE OR REPLACE FUNCTION public.pr99_mark_notifications_read(p_ids bigint[] DEFAULT NULL::bigint[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_count integer;
begin
 update public.notifications set is_read=true,read=true,updated_at=now() where coalesce(is_deleted,false)=false and (p_ids is null or id=any(p_ids));get diagnostics v_count=row_count;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'notifications_mark_read','notifications',coalesce(array_to_string(p_ids,','),'all'),jsonb_build_object('count',v_count),'/admin/notifications','success');return v_count;
end $function$


CREATE OR REPLACE FUNCTION public.pr99_operations_allowlist()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
 select array['settings','pages','sections','page_builder_sections','content_translations','programs','announcements','jobs','reviews','success_stories','partners','gallery_items','faqs','knowledge_base','media']::text[]
$function$


CREATE OR REPLACE FUNCTION public.pr99_permanent_delete_trash(p_trash_id bigint, p_confirmation text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_role text;v_item public.trash_items%rowtype;
begin
 select role into v_role from public.admin_users where lower(email)=v_actor and is_active=true;
 if v_role not in('super_admin','deputy_super_admin') then insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_permanent_delete_denied','trash_item',p_trash_id::text,jsonb_build_object('role',v_role),'/admin/trash','denied');raise exception 'Not authorized';end if;
 if p_confirmation<>'DELETE PERMANENTLY' then raise exception 'Second confirmation is invalid';end if;
 select * into v_item from public.trash_items where id=p_trash_id and restore_status='restorable' for update;if not found then raise exception 'Trash item unavailable';end if;
 if not(v_item.item_type=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported trash entity';end if;
 execute format('delete from public.%I where id::text=$1',v_item.item_type) using v_item.item_id;
 update public.trash_items set restore_status='permanently_deleted',item_data=null,data='{}'::jsonb where id=p_trash_id and restore_status='restorable';
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_permanent_delete',v_item.item_type,v_item.item_id,jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success');
 return jsonb_build_object('deleted',true,'trash_id',p_trash_id);
end $function$


CREATE OR REPLACE FUNCTION public.pr99_require_admin()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_email text;
begin
  select lower(admin_user.email)
  into v_email
  from public.admin_users as admin_user
  where admin_user.is_active is true
    and (
      admin_user.user_id = (select auth.uid())
      or (
        admin_user.user_id is null
        and lower(admin_user.email) = lower(
          coalesce((select auth.jwt()) ->> 'email', '')
        )
      )
    )
  order by (admin_user.user_id = (select auth.uid())) desc
  limit 1;

  if v_email is null then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return v_email;
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_restore_backup(p_backup jsonb, p_scope text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_validation jsonb;v_pre jsonb;v_table text;v_results jsonb:='{}'::jsonb;v_operation uuid;
begin
 v_validation:=public.pr99_backup_dry_run(p_backup,p_scope);
 v_pre:=public.pr99_create_private_backup(p_scope,'pre_restore','Automatic private backup before restore');
 insert into public.restore_operations(project_ref,backup_code,mode,status,scope,summary,checksum,created_by) values('fvaurkfnsvsfohpzguho',p_backup->>'backup_code','restore','pending',p_scope,'{}',p_backup->>'checksum',v_actor) returning id into v_operation;
 foreach v_table in array p_scope loop v_results:=v_results||jsonb_build_object(v_table,public.pr99_restore_entity_rows(v_table,coalesce(p_backup->'entities'->v_table,'[]'::jsonb)));end loop;
 update public.restore_operations set status='completed',summary=jsonb_build_object('validation',v_validation,'results',v_results,'pre_restore_backup',v_pre->>'backup_code'),completed_at=now() where id=v_operation;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'backup_restore','restore_operation',v_operation::text,'',jsonb_build_object('scope',p_scope,'pre_restore_backup',v_pre->>'backup_code'),'/admin/backups','success');
 insert into public.notifications(title,message,type,is_read,recipient_role,event_key,event_type,entity_type,entity_id,occurred_at,priority,metadata) values('اكتملت الاستعادة','اكتملت استعادة الكيانات المحددة بعد إنشاء نسخة تلقائية.','restore_completed',false,'admin','restore:'||v_operation,'completed','restore_operation',v_operation::text,now(),'high',jsonb_build_object('scope',p_scope,'pre_restore_backup',v_pre->>'backup_code')) on conflict(event_key) where event_key is not null do nothing;
 return jsonb_build_object('completed',true,'operation_id',v_operation,'results',v_results,'pre_restore_backup',v_pre->>'backup_code');
exception when others then
 raise;
end $function$


CREATE OR REPLACE FUNCTION public.pr99_restore_entity_rows(p_table text, p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_row jsonb;v_filtered jsonb;v_insert_columns text;v_select_columns text;v_updates text;v_count integer:=0;
begin
 if not(p_table=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported restore entity';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 then raise exception 'Invalid restore rows';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  if not(v_row?'id') then raise exception 'Restore row has no id';end if;
  select jsonb_object_agg(e.key,e.value),string_agg(format('%I',c.column_name),',' order by c.ordinal_position),string_agg(format('x.%I',c.column_name),',' order by c.ordinal_position),string_agg(format('%1$I=excluded.%1$I',c.column_name),',' order by c.ordinal_position) filter(where c.column_name<>'id')
  into v_filtered,v_insert_columns,v_select_columns,v_updates
  from jsonb_each(v_row)e join information_schema.columns c on c.table_schema='public' and c.table_name=p_table and c.column_name=e.key and c.is_generated='NEVER' and(c.is_identity='NO' or c.identity_generation='BY DEFAULT');
  if v_filtered is null or v_insert_columns is null or v_updates is null then raise exception 'Restore row has no writable shared columns';end if;
  execute format('insert into public.%1$I(%2$s) select %3$s from jsonb_populate_record(null::public.%1$I,$1) x on conflict(id) do update set %4$s',p_table,v_insert_columns,v_select_columns,v_updates) using v_filtered;
  v_count:=v_count+1;
 end loop;
 return jsonb_build_object('table',p_table,'restored',v_count,'actor',v_actor);
end $function$


CREATE OR REPLACE FUNCTION public.pr99_restore_trash(p_trash_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_item public.trash_items%rowtype;v_result jsonb;
begin
 select * into v_item from public.trash_items where id=p_trash_id and restore_status='restorable' for update;if not found then raise exception 'Trash item unavailable';end if;
 v_result:=public.pr99_restore_entity_rows(v_item.item_type,jsonb_build_array(coalesce(v_item.item_data,v_item.data)));
 update public.trash_items set restore_status='restored',restored_at=now() where id=p_trash_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_restore',v_item.item_type,v_item.item_id,'',jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success');
 return v_result||jsonb_build_object('trash_id',p_trash_id);
end $function$


CREATE OR REPLACE FUNCTION public.pr99_sanitize_text(p_value text, p_max integer DEFAULT 5000)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$ select left(regexp_replace(regexp_replace(coalesce(p_value,''),'<\s*(script|iframe|object|embed|style)[^>]*>.*?<\s*/\s*\1\s*>','','gis'),'on[a-z]+\s*=|javascript:|data:text/html','','gi'),greatest(1,least(coalesce(p_max,5000),50000))) $function$


CREATE OR REPLACE FUNCTION public.pr99_scheduled_private_backup()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare v_payload jsonb;v_checksum text;v_code text;
begin
 v_payload:=jsonb_build_object('format','hamza-agency-private-backup','schema_version',1,'project_ref','fvaurkfnsvsfohpzguho','created_at',now(),'created_by','system','scope',to_jsonb(public.pr99_operations_allowlist()),'entities','{}'::jsonb);
 foreach v_code in array public.pr99_operations_allowlist() loop execute format('select jsonb_set($1,array[''entities'',%L],coalesce(jsonb_agg(to_jsonb(t) order by t.id),''[]''::jsonb),true) from public.%I t',v_code,v_code) into v_payload using v_payload;end loop;
 v_checksum:=encode(digest(convert_to(v_payload::text,'UTF8'),'sha256'),'hex');v_payload:=v_payload||jsonb_build_object('checksum',v_checksum);v_code:='AUTO-'||to_char(now(),'YYYYMMDD-HH24MISS');
 insert into public.backups(backup_name,backup_type,created_by,backup_code,title,status,mode,size_bytes,details,project_ref,schema_version,checksum,scope,started_at,completed_at) values('Scheduled private backup','scheduled','system',v_code,'نسخة تلقائية خاصة','completed','auto',octet_length(v_payload::text),v_payload,'fvaurkfnsvsfohpzguho',1,v_checksum,public.pr99_operations_allowlist(),now(),now());
end $function$


CREATE OR REPLACE FUNCTION public.pr99_soft_delete(p_table text, p_id text, p_title text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_data jsonb;v_published boolean:=false;v_trash bigint;
begin
 if not(p_table=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported trash entity';end if;
 execute format('select to_jsonb(t),coalesce((to_jsonb(t)->>''is_published'')::boolean,false) from public.%I t where t.id::text=$1',p_table) into v_data,v_published using p_id;
 if v_data is null then raise exception 'Entity not found';end if;
 insert into public.trash_items(item_type,item_id,title,data,deleted_by_email,restore_status,deleted_at,deleted_by,item_data,item_title) values(p_table,p_id,coalesce(p_title,v_data->>'title',v_data->>'name'),v_data,v_actor,'restorable',now(),v_actor,v_data,coalesce(p_title,v_data->>'title',v_data->>'name')) returning id into v_trash;
 begin execute format('update public.%I set is_visible=false where id::text=$1',p_table) using p_id; exception when undefined_column then execute format('update public.%I set status=''archived'' where id::text=$1',p_table) using p_id; end;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,old_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'trash_soft_delete',p_table,p_id,v_data::text,jsonb_build_object('trash_id',v_trash,'was_published',v_published),'/admin/trash','success');
 return jsonb_build_object('trash_id',v_trash,'was_published',v_published,'warning',case when v_published then 'published_content' else null end);
end $function$


CREATE OR REPLACE FUNCTION public.pr99_submit_ai_support(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_guard jsonb;
  v_id bigint;
  v_question text;
  v_phone text;
  v_derived_identity text;
begin
  v_question:=trim(public.pr99_sanitize_text(coalesce(p_payload->>'question',p_payload->>'message'),2000));
  v_phone:=regexp_replace(coalesce(p_payload->>'visitor_whatsapp',''),'[^0-9]','','g');
  if length(v_question)<2 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  v_derived_identity:=coalesce(
    nullif(v_phone,''),
    nullif(p_payload->>'email_hash',''),
    nullif(p_payload->>'phone_hash',''),
    encode(digest(convert_to(left(lower(v_question),256),'UTF8'),'sha256'),'hex')
  );
  v_guard:=public.pr99_guard_submission('ai_support',v_derived_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  insert into public.ai_unanswered_questions(
    question,page_url,visitor_info,status,answer,internal_notes,context,source,
    visitor_name,visitor_whatsapp,metadata
  ) values (
    v_question,
    nullif(public.pr99_sanitize_text(p_payload->>'page_url',2000),''),
    jsonb_build_object(
      'email_hash',nullif(p_payload->>'email_hash',''),
      'phone_hash',nullif(p_payload->>'phone_hash','')
    ),
    'new',null,null,
    nullif(public.pr99_sanitize_text(p_payload->>'context',2000),''),
    'public_ai_support',
    nullif(public.pr99_sanitize_text(p_payload->>'visitor_name',160),''),
    nullif(public.pr99_sanitize_text(p_payload->>'visitor_whatsapp',40),''),
    '{}'::jsonb
  ) returning id into v_id;
  return jsonb_build_object('allowed',true,'code','ok','id',v_id);
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_submit_application(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_guard jsonb;
  v_id bigint;
  v_name text;
  v_country text;
  v_phone text;
  v_platform text;
  v_derived_identity text;
  v_tracking_code text;
  v_attempt integer;
begin
  v_name := trim(public.pr99_sanitize_text(p_payload ->> 'full_name', 160));
  v_country := trim(public.pr99_sanitize_text(p_payload ->> 'country', 120));
  v_phone := trim(public.pr99_sanitize_text(p_payload ->> 'whatsapp', 40));
  v_platform := trim(public.pr99_sanitize_text(p_payload ->> 'platform', 120));

  if length(v_name) < 2
     or length(v_country) < 2
     or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8
     or length(v_platform) < 2 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_derived_identity := regexp_replace(v_phone, '[^0-9]', '', 'g') || ':' || lower(v_platform);
  v_guard := public.pr99_guard_submission(
    'application',
    v_derived_identity,
    p_payload,
    p_started_at,
    p_honeypot
  );
  if not coalesce((v_guard ->> 'allowed')::boolean, false) then
    return v_guard;
  end if;

  for v_attempt in 1..5 loop
    v_tracking_code := 'APP-'
      || to_char(now(), 'YYYY')
      || '-'
      || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));

    begin
      insert into public.agency_applications(
        tracking_code,
        full_name,
        country,
        whatsapp,
        platform,
        previous_experience,
        notes,
        status,
        internal_notes
      ) values (
        v_tracking_code,
        v_name,
        v_country,
        v_phone,
        v_platform,
        nullif(public.pr99_sanitize_text(p_payload ->> 'previous_experience', 4000), ''),
        nullif(public.pr99_sanitize_text(p_payload ->> 'notes', 4000), ''),
        'new',
        null
      ) returning id into v_id;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then
        raise;
      end if;
    end;
  end loop;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'id', v_id,
    'tracking_code', v_tracking_code
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_submit_contact(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_guard jsonb;
  v_id bigint;
  v_tracking_code text;
  v_name text;
  v_message text;
  v_email text;
  v_phone text;
  v_derived_identity text;
begin
  v_name := trim(public.pr99_sanitize_text(p_payload ->> 'full_name', 160));
  v_message := trim(public.pr99_sanitize_text(p_payload ->> 'message', 5000));
  v_email := lower(trim(public.pr99_sanitize_text(p_payload ->> 'email', 254)));
  v_phone := trim(public.pr99_sanitize_text(p_payload ->> 'whatsapp', 40));

  if length(v_name) < 2 or length(v_message) < 4 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_derived_identity := coalesce(
    nullif(v_email, ''),
    nullif(regexp_replace(v_phone, '[^0-9]', '', 'g'), ''),
    encode(
      digest(convert_to(lower(v_name) || ':' || left(v_message, 128), 'UTF8'), 'sha256'),
      'hex'
    )
  );
  v_guard := public.pr99_guard_submission(
    'contact',
    v_derived_identity,
    p_payload,
    p_started_at,
    p_honeypot
  );
  if not coalesce((v_guard ->> 'allowed')::boolean, false) then
    return v_guard;
  end if;

  insert into public.contact_messages(
    full_name,
    email,
    whatsapp,
    subject,
    message,
    status
  ) values (
    v_name,
    nullif(v_email, ''),
    nullif(v_phone, ''),
    nullif(public.pr99_sanitize_text(p_payload ->> 'subject', 240), ''),
    v_message,
    'new'
  )
  returning id, tracking_code into v_id, v_tracking_code;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'id', v_id,
    'tracking_code', v_tracking_code
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_submit_job_application(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_guard jsonb;
  v_id bigint;
  v_tracking_code text;
  v_name text;
  v_phone text;
  v_job bigint;
  v_derived_identity text;
begin
  v_name := trim(public.pr99_sanitize_text(p_payload ->> 'full_name', 160));
  v_phone := trim(public.pr99_sanitize_text(p_payload ->> 'whatsapp', 40));
  begin
    v_job := nullif(p_payload ->> 'job_id', '')::bigint;
  exception when others then
    v_job := null;
  end;

  if length(v_name) < 2
     or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8 then
    return jsonb_build_object('allowed', false, 'code', 'invalid_request');
  end if;

  v_derived_identity :=
    regexp_replace(v_phone, '[^0-9]', '', 'g') || ':' || coalesce(v_job::text, 'any');
  v_guard := public.pr99_guard_submission(
    'job_application',
    v_derived_identity,
    p_payload,
    p_started_at,
    p_honeypot
  );
  if not coalesce((v_guard ->> 'allowed')::boolean, false) then
    return v_guard;
  end if;

  insert into public.job_applications(
    job_id,
    full_name,
    country,
    whatsapp,
    email,
    experience,
    answers,
    notes,
    status,
    internal_notes
  ) values (
    v_job,
    v_name,
    nullif(public.pr99_sanitize_text(p_payload ->> 'country', 120), ''),
    v_phone,
    nullif(lower(public.pr99_sanitize_text(p_payload ->> 'email', 254)), ''),
    nullif(public.pr99_sanitize_text(p_payload ->> 'experience', 5000), ''),
    case
      when jsonb_typeof(p_payload -> 'answers') = 'object' then p_payload -> 'answers'
      else '{}'::jsonb
    end,
    nullif(public.pr99_sanitize_text(p_payload ->> 'notes', 4000), ''),
    'new',
    null
  )
  returning id, tracking_code into v_id, v_tracking_code;

  return jsonb_build_object(
    'allowed', true,
    'code', 'ok',
    'id', v_id,
    'tracking_code', v_tracking_code
  );
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_submit_service_request(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_guard jsonb;
  v_id bigint;
  v_code text;
  v_name text;
  v_phone text;
  v_type text;
  v_derived_identity text;
begin
  v_name:=trim(public.pr99_sanitize_text(p_payload->>'full_name',160));
  v_phone:=trim(public.pr99_sanitize_text(p_payload->>'whatsapp',40));
  v_type:=trim(public.pr99_sanitize_text(p_payload->>'service_type',120));
  if length(v_name)<2
     or length(regexp_replace(v_phone,'[^0-9]','','g'))<8
     or length(v_type)<2 then
    return jsonb_build_object('allowed',false,'code','invalid_request');
  end if;

  v_derived_identity:=regexp_replace(v_phone,'[^0-9]','','g')||':'||lower(v_type);
  v_guard:=public.pr99_guard_submission('service_request',v_derived_identity,p_payload,p_started_at,p_honeypot);
  if not coalesce((v_guard->>'allowed')::boolean,false) then return v_guard; end if;

  v_code:='SR-'||to_char(now(),'YYYY')||'-'||upper(substr(encode(gen_random_bytes(8),'hex'),1,10));
  insert into public.service_requests(
    request_code,full_name,country,whatsapp,service_type,platform,
    account_identifier,requested_amount,notes,status,internal_notes
  ) values (
    v_code,v_name,
    nullif(public.pr99_sanitize_text(p_payload->>'country',120),''),
    v_phone,v_type,
    nullif(public.pr99_sanitize_text(p_payload->>'platform',120),''),
    nullif(public.pr99_sanitize_text(p_payload->>'account_identifier',240),''),
    nullif(public.pr99_sanitize_text(p_payload->>'requested_amount',120),''),
    nullif(public.pr99_sanitize_text(p_payload->>'notes',4000),''),
    'new',null
  ) returning id into v_id;
  return jsonb_build_object('allowed',true,'code','ok','id',v_id,'tracking_code',v_code);
end;
$function$


CREATE OR REPLACE FUNCTION public.pr99_unanswered_support_notifications()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
end $function$


CREATE OR REPLACE FUNCTION public.pr99_unpublish_page(p_page_id bigint, p_language text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_version bigint;v_count integer;
begin
 if p_language not in('ar','en','tr') then raise exception 'Unsupported language';end if;
 perform 1 from public.pages where id=p_page_id for update;if not found then raise exception 'Page not found';end if;
 v_version:=public.pr99_create_page_version(p_page_id,'unpublish',p_language,'Snapshot before unpublish');
 update public.sections set is_visible=false,is_published=false,publishing_status='unpublished',updated_at=now() where page_id=p_page_id and language=p_language and is_published=true;
 get diagnostics v_count=row_count;
 if not exists(select 1 from public.sections where page_id=p_page_id and is_published=true and publishing_status='published') then update public.pages set is_published=false,publishing_status='unpublished',updated_at=now() where id=p_page_id;end if;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome) values(v_actor,auth.uid(),'unpublish_page','page',p_page_id::text,jsonb_build_object('language',p_language,'sections',v_count,'version_id',v_version),'/admin/page-builder','success');
 return jsonb_build_object('page_id',p_page_id,'language',p_language,'sections',v_count,'version_id',v_version,'status','unpublished');
end $function$


CREATE OR REPLACE FUNCTION public.publish_page_builder_page(p_page_id bigint, p_language text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$ declare v_actor text:=public.pr99_require_admin();v_page public.pages%rowtype;v_row public.page_builder_sections%rowtype;v_keys text[]:='{}';v_version bigint;v_count integer:=0; begin if p_language not in('ar','en','tr') then raise exception 'Unsupported language'; end if; select * into v_page from public.pages where id=p_page_id for update;if not found then raise exception 'Page not found';end if; if coalesce(trim(v_page.title),'')='' or coalesce(trim(v_page.slug),'')='' then raise exception 'Page title and slug are required';end if; if not exists(select 1 from public.page_builder_sections where page_id=p_page_id and language=p_language and is_visible=true and trim(title)<>'' and trim(body)<>'') then raise exception 'Published language requires complete content';end if; if p_language<>'ar' and exists(select 1 from public.page_builder_sections where page_id=p_page_id and language=p_language and is_visible=true and(trim(title)='' or trim(body)='')) then raise exception 'Translation is incomplete';end if; v_version:=public.pr99_create_page_version(p_page_id,'publish',p_language,p_notes); for v_row in select * from public.page_builder_sections where page_id=p_page_id and language=p_language order by sort_order,id loop v_keys:=array_append(v_keys,v_row.section_key); insert into public.sections(page_id,page_slug,language,section_key,section_type,title,subtitle,content,media_url,sort_order,is_visible,is_published,settings,publishing_status,last_published_at,updated_at) values(p_page_id,v_page.slug,p_language,v_row.section_key,v_row.section_type,v_row.title,'',v_row.body,v_row.media_url,v_row.sort_order,v_row.is_visible,true,coalesce(v_row.settings,'{}'::jsonb)||jsonb_build_object('language',p_language,'source','page_builder','button_label',v_row.button_label,'button_url',v_row.button_url),'published',now(),now()) on conflict(page_id,language,section_key) do update set page_slug=excluded.page_slug,section_type=excluded.section_type,title=excluded.title,subtitle=excluded.subtitle,content=excluded.content,media_url=excluded.media_url,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_published=true,settings=excluded.settings,publishing_status='published',last_published_at=now(),updated_at=now();v_count:=v_count+1; end loop; update public.sections set is_visible=false,publishing_status='unpublished',updated_at=now() where page_id=p_page_id and language=p_language and not(section_key=any(v_keys)); update public.pages set is_published=true,publishing_status='published',last_published_at=now(),publishing_notes=p_notes,updated_at=now() where id=p_page_id; insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'publish_page','page',p_page_id::text,'',jsonb_build_object('language',p_language,'sections',v_count,'version_id',v_version),'/admin/page-builder','success'); return jsonb_build_object('page_id',p_page_id,'language',p_language,'sections',v_count,'version_id',v_version,'published_at',now()); end $function$


CREATE OR REPLACE FUNCTION public.publish_translation_candidate(p_translation_revision_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_source_type text;
  v_source_id text;
  v_language text;
  v_workflow_status text;
  v_is_stale boolean;
  v_snapshot jsonb;
begin
  perform public.require_translation_revision_admin();

  select
    revision.source_revision_id,
    revision.source_type,
    revision.source_id,
    revision.language,
    revision.workflow_status,
    revision.is_stale
  into
    v_source_revision_id,
    v_source_type,
    v_source_id,
    v_language,
    v_workflow_status,
    v_is_stale
  from public.content_translation_revisions as revision
  where revision.id = p_translation_revision_id
  for update;

  if v_source_revision_id is null then
    raise exception 'Translation candidate was not found.' using errcode = 'P0002';
  end if;

  if v_workflow_status <> 'reviewed' or v_is_stale then
    raise exception 'Only a reviewed, current candidate can be published.'
      using errcode = '22023';
  end if;

  select source_revision.source_snapshot
    into v_snapshot
  from public.translation_source_revisions as source_revision
  where source_revision.id = v_source_revision_id;

  if exists (
    select 1
    from jsonb_object_keys(v_snapshot) as expected(field_name)
    left join public.content_translation_revision_fields as field
      on field.translation_revision_id = p_translation_revision_id
     and field.field_name = expected.field_name
    where field.id is null
       or btrim(field.translated_value) = ''
  ) then
    raise exception 'Every field from the Arabic source snapshot must have a non-empty translation before publish.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_source_type || ':' || v_source_id || ':' || v_language));

  update public.content_translation_revisions
     set workflow_status = 'superseded',
         superseded_at = now(),
         updated_at = now()
   where source_type = v_source_type
     and source_id = v_source_id
     and language = v_language
     and workflow_status = 'published'
     and id <> p_translation_revision_id;

  update public.content_translation_revisions
     set workflow_status = 'published',
         published_at = now(),
         published_by = v_actor,
         updated_at = now()
   where id = p_translation_revision_id;

  return p_translation_revision_id;
end;
$function$


CREATE OR REPLACE FUNCTION public.read_published_translation_revision_fields(p_source_type text, p_source_ids text[], p_language text)
 RETURNS TABLE(source_id text, field_name text, translated_value text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    revision.source_id,
    field.field_name,
    field.translated_value
  from public.content_translation_revisions as revision
  join public.content_translation_revision_fields as field
    on field.translation_revision_id = revision.id
  where revision.workflow_status = 'published'
    and revision.source_type = p_source_type
    and revision.language = p_language
    and revision.source_id = any (coalesce(p_source_ids, '{}'::text[]))
  order by revision.source_id, field.field_name;
$function$


CREATE OR REPLACE FUNCTION public.refresh_product_kpis(p_tenant uuid, p_metric_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.register_platform_session(p_tenant uuid, p_auth_session uuid, p_device_label text, p_platform text, p_browser text, p_ip_hash text, p_suspicious boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  actor uuid := (select auth.uid());
  existing uuid;
begin
  if actor is null or not public.current_user_has_tenant_role(p_tenant,array['super_admin','tenant_admin','creator','client','employee','partner']) then
    raise exception 'forbidden';
  end if;
  if p_auth_session is not null then
    select id into existing from public.user_sessions
    where tenant_id=p_tenant and user_id=actor and auth_session_id=p_auth_session and revoked_at is null
    limit 1;
  end if;
  if existing is not null then
    update public.user_sessions
    set last_active_at=now(),device_label=left(coalesce(p_device_label,device_label),120),platform=left(coalesce(p_platform,platform),80),browser=left(coalesce(p_browser,browser),80),ip_hash=left(coalesce(p_ip_hash,ip_hash),64),suspicious=suspicious or p_suspicious
    where id=existing and user_id=actor;
    return existing;
  end if;
  insert into public.user_sessions(tenant_id,user_id,auth_session_id,device_label,platform,browser,ip_hash,suspicious)
  values(p_tenant,actor,p_auth_session,left(p_device_label,120),left(p_platform,80),left(p_browser,80),left(p_ip_hash,64),p_suspicious)
  returning id into existing;
  return existing;
end;
$function$


CREATE OR REPLACE FUNCTION public.require_translation_revision_admin()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.is_translation_revision_admin() then
    raise exception 'Translation revision access requires an active top-level administrator.'
      using errcode = '42501';
  end if;
end;
$function$


CREATE OR REPLACE FUNCTION public.resend_tenant_invitation(p_tenant_id uuid, p_invitation_id uuid, p_token_hash text, p_expires_at timestamp with time zone)
 RETURNS TABLE(id uuid, email text, role text, status text, expires_at timestamp with time zone, last_sent_at timestamp with time zone, send_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private', 'extensions'
AS $function$
declare
  v_actor uuid:=auth.uid();
  v_invitation public.tenant_invitations%rowtype;
  v_subject text;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then
    raise exception 'invalid_invitation';
  end if;

  select invitation_row.* into v_invitation
  from public.tenant_invitations invitation_row
  where invitation_row.id=p_invitation_id and invitation_row.tenant_id=p_tenant_id
  for update;

  if not found or v_invitation.status in ('accepted','revoked') then raise exception 'invitation_not_resendable'; end if;
  if v_invitation.send_count>=25 then raise exception 'resend_limit_reached'; end if;

  v_subject:=encode(digest(v_actor::text||'|'||p_tenant_id::text||'|resend|'||p_invitation_id::text,'sha256'),'hex');
  if not private.consume_invitation_rate_limit(p_tenant_id,'resend',v_subject) then
    raise exception 'invitation_rate_limited' using errcode='P0001';
  end if;

  update public.tenant_invitations invitation_row
  set token_hash=p_token_hash,status='invited',expires_at=p_expires_at,last_sent_at=now(),
      send_count=invitation_row.send_count+1,updated_at=now()
  where invitation_row.id=p_invitation_id and invitation_row.tenant_id=p_tenant_id
  returning invitation_row.* into v_invitation;

  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_resent','tenant_invitation',v_invitation.id::text,
    jsonb_build_object('email',v_invitation.email,'expires_at',v_invitation.expires_at,'send_count',v_invitation.send_count));

  return query select v_invitation.id,v_invitation.email,v_invitation.role,v_invitation.status,
    v_invitation.expires_at,v_invitation.last_sent_at,v_invitation.send_count;
end;
$function$


CREATE OR REPLACE FUNCTION public.resolve_public_tenant_runtime(p_hostname text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'private'
AS $function$ select private.public_tenant_runtime(p_hostname); $function$


CREATE OR REPLACE FUNCTION public.restore_page_version(p_version_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$ declare v_actor text:=public.pr99_require_admin();v_version public.version_history%rowtype;v_page_id bigint;v_page jsonb;v_sections jsonb;v_item jsonb;v_new_version bigint;v_language text; begin select * into v_version from public.version_history where id=p_version_id;if not found then raise exception 'Version not found';end if; v_page_id:=coalesce(v_version.page_id,case when v_version.item_type='page' and v_version.item_id~'^[0-9]+$' then v_version.item_id::bigint end);v_page:=coalesce(nullif(v_version.page_snapshot,'{}'::jsonb),v_version.data->'page');v_sections:=coalesce(nullif(v_version.sections_snapshot,'[]'::jsonb),v_version.data->'sections','[]'::jsonb); if v_page_id is null or v_page is null then raise exception 'Invalid page version';end if; v_new_version:=public.pr99_create_page_version(v_page_id,'pre_restore',v_version.locale,'Automatic snapshot before restore'); update public.pages set title=coalesce(v_page->>'title',title),slug=coalesce(v_page->>'slug',slug),content=v_page->>'content',seo_title=v_page->>'seo_title',seo_description=v_page->>'seo_description',canonical_url=v_page->>'canonical_url',og_image_url=coalesce(v_page->>'og_image_url',v_page->>'og_image'),publishing_status='draft',is_published=false,updated_at=now() where id=v_page_id; update public.sections set is_visible=false,publishing_status='unpublished',updated_at=now() where page_id=v_page_id; for v_item in select value from jsonb_array_elements(v_sections) loop v_language:=case when v_item->>'language' in('ar','en','tr') then v_item->>'language' when v_item->'settings'->>'language' in('ar','en','tr') then v_item->'settings'->>'language' else 'ar' end; insert into public.sections(page_id,page_slug,program_slug,language,section_key,title,subtitle,content,media_url,background_type,background_value,sort_order,is_visible,is_published,section_type,settings,publishing_status,updated_at) values(v_page_id,v_item->>'page_slug',v_item->>'program_slug',v_language,v_item->>'section_key',v_item->>'title',v_item->>'subtitle',coalesce(v_item->>'content',''),v_item->>'media_url',v_item->>'background_type',v_item->>'background_value',coalesce((v_item->>'sort_order')::integer,0),coalesce((v_item->>'is_visible')::boolean,true),false,v_item->>'section_type',coalesce(v_item->'settings','{}'::jsonb),'draft',now()) on conflict(page_id,language,section_key) do update set title=excluded.title,subtitle=excluded.subtitle,content=excluded.content,media_url=excluded.media_url,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_published=false,section_type=excluded.section_type,settings=excluded.settings,publishing_status='draft',updated_at=now(); end loop; insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'restore_page_version','page',v_page_id::text,'',jsonb_build_object('restored_version_id',p_version_id,'pre_restore_version_id',v_new_version),'/admin/version-history','success'); return jsonb_build_object('page_id',v_page_id,'restored_version_id',p_version_id,'pre_restore_version_id',v_new_version,'status','draft'); end $function$


CREATE OR REPLACE FUNCTION public.review_translation_candidate(p_translation_revision_id uuid, p_review_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_workflow_status text;
  v_is_stale boolean;
  v_snapshot jsonb;
begin
  perform public.require_translation_revision_admin();

  select revision.source_revision_id, revision.workflow_status, revision.is_stale
    into v_source_revision_id, v_workflow_status, v_is_stale
  from public.content_translation_revisions as revision
  where revision.id = p_translation_revision_id
  for update;

  if v_source_revision_id is null then
    raise exception 'Translation candidate was not found.' using errcode = 'P0002';
  end if;

  if v_workflow_status not in ('draft', 'needs_review', 'reviewed') or v_is_stale then
    raise exception 'Only a complete current candidate can be reviewed.'
      using errcode = '22023';
  end if;

  select source_revision.source_snapshot
    into v_snapshot
  from public.translation_source_revisions as source_revision
  where source_revision.id = v_source_revision_id;

  if exists (
    select 1
    from jsonb_object_keys(v_snapshot) as expected(field_name)
    left join public.content_translation_revision_fields as field
      on field.translation_revision_id = p_translation_revision_id
     and field.field_name = expected.field_name
    where field.id is null
       or btrim(field.translated_value) = ''
  ) then
    raise exception 'Every field from the Arabic source snapshot must have a non-empty translation before review.'
      using errcode = '22023';
  end if;

  update public.content_translation_revisions
     set workflow_status = 'reviewed',
         reviewed_at = now(),
         reviewed_by = v_actor,
         review_notes = nullif(btrim(coalesce(p_review_notes, '')), ''),
         updated_at = now()
   where id = p_translation_revision_id;

  return p_translation_revision_id;
end;
$function$


CREATE OR REPLACE FUNCTION public.revoke_all_own_platform_sessions(p_tenant uuid, p_reason text DEFAULT 'user_requested_all'::text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare actor uuid := (select auth.uid()); changed integer;
begin
  if actor is null then return 0; end if;
  update public.user_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=actor,revoke_reason=left(coalesce(p_reason,'user_requested_all'),200)
  where tenant_id=p_tenant and user_id=actor and revoked_at is null;
  get diagnostics changed=row_count;
  return changed;
end;
$function$


CREATE OR REPLACE FUNCTION public.revoke_own_platform_session(p_session uuid, p_reason text DEFAULT 'user_requested'::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare actor uuid := (select auth.uid()); changed integer;
begin
  if actor is null then return false; end if;
  update public.user_sessions
  set revoked_at=coalesce(revoked_at,now()),revoked_by=actor,revoke_reason=left(coalesce(p_reason,'user_requested'),200)
  where id=p_session and user_id=actor and revoked_at is null;
  get diagnostics changed=row_count;
  if changed>0 then
    insert into public.security_alerts(tenant_id,user_id,alert_type,severity,metadata)
    select tenant_id,user_id,'session_revoked','low',jsonb_build_object('sessionId',id)
    from public.user_sessions where id=p_session and user_id=actor;
  end if;
  return changed>0;
end;
$function$


CREATE OR REPLACE FUNCTION public.revoke_tenant_invitation(p_tenant_id uuid, p_invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor uuid:=auth.uid(); v_invitation public.tenant_invitations%rowtype;
begin
  if v_actor is null or p_tenant_id is null or not public.current_user_has_tenant_role(p_tenant_id,array['super_admin','tenant_admin']) then raise exception 'forbidden' using errcode='42501'; end if;
  select * into v_invitation from public.tenant_invitations where id=p_invitation_id and tenant_id=p_tenant_id for update;
  if not found then return false; end if;
  if v_invitation.status='accepted' then raise exception 'invitation_not_revocable'; end if;
  if v_invitation.status='revoked' then return true; end if;
  update public.tenant_invitations set status='revoked',revoked_at=now(),updated_at=now() where id=p_invitation_id and tenant_id=p_tenant_id;
  insert into public.tenant_admin_audit(tenant_id,actor_id,action,entity_type,entity_id,after_data)
  values(p_tenant_id,v_actor,'tenant.invitation_revoked','tenant_invitation',v_invitation.id::text,jsonb_build_object('email',v_invitation.email));
  return true;
end;
$function$


CREATE OR REPLACE FUNCTION public.save_page_builder_draft(p_page_id bigint, p_language text, p_sections jsonb, p_page_patch jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_actor text:=public.pr99_require_admin();v_item jsonb;v_index integer:=0;v_type text;v_key text;v_keys text[]:='{}';v_allowed text[]:=array['hero','rich_text','text','text_image','cards','programs','stats','cta','faq','gallery','partners','reviews','success_stories','contact','spacer','divider'];
begin
 if p_language not in('ar','en','tr') then raise exception 'Unsupported language';end if;
 if jsonb_typeof(p_sections)<>'array' or jsonb_array_length(p_sections)>80 then raise exception 'Invalid sections payload';end if;
 if not exists(select 1 from public.pages where id=p_page_id) then raise exception 'Page not found';end if;
 for v_item in select value from jsonb_array_elements(p_sections) loop v_type:=coalesce(v_item->>'section_type',v_item->>'type','');if not(v_type=any(v_allowed)) then raise exception 'Unsupported section type';end if;if length(coalesce(v_item->>'title',''))>300 or length(coalesce(v_item->>'body',''))>50000 then raise exception 'Section content exceeds allowed size';end if;end loop;
 for v_item in select value from jsonb_array_elements(p_sections) loop
  v_index:=v_index+1;v_type:=coalesce(v_item->>'section_type',v_item->>'type','text');v_key:=left(coalesce(nullif(v_item->>'section_key',''),nullif(v_item->>'id',''),'section-'||v_index),120);v_keys:=array_append(v_keys,v_key);
  insert into public.page_builder_sections(page_id,section_type,section_key,title,body,button_label,button_url,media_url,settings,sort_order,language,is_visible,created_by,updated_by)
  values(p_page_id,v_type,v_key,public.pr99_sanitize_text(v_item->>'title',300),public.pr99_sanitize_text(v_item->>'body',50000),nullif(public.pr99_sanitize_text(v_item->>'button_label',120),''),nullif(public.pr99_sanitize_text(v_item->>'button_url',1000),''),nullif(public.pr99_sanitize_text(v_item->>'media_url',1000),''),case when jsonb_typeof(v_item->'settings')='object' then v_item->'settings' else '{}'::jsonb end,v_index,p_language,coalesce((v_item->>'is_visible')::boolean,true),v_actor,v_actor)
  on conflict(page_id,language,section_key) do update set section_type=excluded.section_type,title=excluded.title,body=excluded.body,button_label=excluded.button_label,button_url=excluded.button_url,media_url=excluded.media_url,settings=excluded.settings,sort_order=excluded.sort_order,is_visible=excluded.is_visible,updated_by=excluded.updated_by,updated_at=now();
 end loop;
 update public.page_builder_sections set is_visible=false,sort_order=10000+sort_order,updated_by=v_actor,updated_at=now() where page_id=p_page_id and language=p_language and not(section_key=any(v_keys));
 update public.pages set title=case when p_page_patch?'title' then nullif(public.pr99_sanitize_text(p_page_patch->>'title',300),'') else title end,slug=case when p_page_patch?'slug' then nullif(lower(regexp_replace(p_page_patch->>'slug','[^a-zA-Z0-9/_-]','','g')),'') else slug end,seo_title=case when p_page_patch?'seo_title' then public.pr99_sanitize_text(p_page_patch->>'seo_title',300) else seo_title end,seo_description=case when p_page_patch?'seo_description' then public.pr99_sanitize_text(p_page_patch->>'seo_description',1000) else seo_description end,canonical_url=case when p_page_patch?'canonical_url' then nullif(public.pr99_sanitize_text(p_page_patch->>'canonical_url',1000),'') else canonical_url end,og_image_url=case when p_page_patch?'og_image_url' then nullif(public.pr99_sanitize_text(p_page_patch->>'og_image_url',1000),'') else og_image_url end,publishing_status=case when p_page_patch->>'publishing_status' in('draft','review','published','unpublished','scheduled') then p_page_patch->>'publishing_status' else publishing_status end,updated_at=now() where id=p_page_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'save_page_builder_draft','page',p_page_id::text,'',jsonb_build_object('language',p_language,'sections',jsonb_array_length(p_sections)),'/admin/page-builder','success');
 return jsonb_build_object('page_id',p_page_id,'language',p_language,'sections',jsonb_array_length(p_sections),'saved_at',now());
end $function$


CREATE OR REPLACE FUNCTION public.save_translation_candidate_fields(p_translation_revision_id uuid, p_translated_fields jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_source_revision_id uuid;
  v_workflow_status text;
  v_is_stale boolean;
  v_snapshot jsonb;
  v_fields jsonb := coalesce(p_translated_fields, '{}'::jsonb);
begin
  perform public.require_translation_revision_admin();

  if jsonb_typeof(v_fields) <> 'object'
     or not exists (select 1 from jsonb_object_keys(v_fields)) then
    raise exception 'Provide at least one translated field to save.'
      using errcode = '22023';
  end if;

  select revision.source_revision_id, revision.workflow_status, revision.is_stale
    into v_source_revision_id, v_workflow_status, v_is_stale
  from public.content_translation_revisions as revision
  where revision.id = p_translation_revision_id
  for update;

  if v_source_revision_id is null then
    raise exception 'Translation candidate was not found.' using errcode = 'P0002';
  end if;

  if v_workflow_status not in ('draft', 'needs_review', 'reviewed') or v_is_stale then
    raise exception 'Only a current non-stale candidate draft can be edited.'
      using errcode = '22023';
  end if;

  select source_revision.source_snapshot
    into v_snapshot
  from public.translation_source_revisions as source_revision
  where source_revision.id = v_source_revision_id;

  perform public.assert_translation_revision_snapshot(v_snapshot, v_fields);

  insert into public.content_translation_revision_fields (
    translation_revision_id,
    field_name,
    source_value_snapshot,
    translated_value,
    created_by,
    updated_by
  )
  select
    p_translation_revision_id,
    field.key,
    snapshot.value,
    field.value,
    v_actor,
    v_actor
  from jsonb_each_text(v_fields) as field(key, value)
  join jsonb_each_text(v_snapshot) as snapshot(key, value)
    on snapshot.key = field.key
  on conflict (translation_revision_id, field_name)
  do update set
    translated_value = excluded.translated_value,
    updated_by = excluded.updated_by,
    updated_at = now();

  update public.content_translation_revisions
     set workflow_status = 'needs_review',
         reviewed_at = null,
         reviewed_by = null,
         review_notes = null,
         updated_at = now()
   where id = p_translation_revision_id;

  return p_translation_revision_id;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_ai_support_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_content_translations_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_knowledge_base_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_page_builder_sections_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_service_request_code_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
                            begin
                              update public.service_requests
                                set request_code =
                                    'SR-' ||
                                        to_char(new.created_at, 'YYYY') ||
                                            '-' ||
                                                lpad(new.id::text, 6, '0')
                                                  where id = new.id
                                                      and (request_code is null or trim(request_code) = '');

                                                        return new;
                                                        end;
                                                        $function$


CREATE OR REPLACE FUNCTION public.set_service_requests_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
                                                        begin
                                                          new.updated_at = now();
                                                            return new;
                                                            end;
                                                            $function$


CREATE OR REPLACE FUNCTION public.set_task_completion_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.status in ('resolved','closed') and new.completed_at is null then new.completed_at=now(); end if;
  if new.status not in ('resolved','closed') and old.status in ('resolved','closed') then new.completed_at=null; end if;
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_version_history_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_visual_experience_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.set_white_label_projects_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.start_workflow_run(p_workflow uuid, p_idempotency_key text, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.touch_admin_permissions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
                                                  begin
                                                    new.updated_at = now();
                                                      return new;
                                                      end;
                                                      $function$


CREATE OR REPLACE FUNCTION public.touch_translation_revision_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$


CREATE OR REPLACE FUNCTION public.translation_revision_backfill_source_rows()
 RETURNS TABLE(source_type text, source_id text, source_snapshot jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select *
  from (
    select 'programs'::text as source_type, id::text as source_id, public.translation_source_snapshot_from_row('programs', to_jsonb(programs)) as source_snapshot from public.programs
    union all select 'pages', id::text, public.translation_source_snapshot_from_row('pages', to_jsonb(pages)) from public.pages
    union all select 'sections', id::text, public.translation_source_snapshot_from_row('sections', to_jsonb(sections)) from public.sections
    union all select 'faqs', id::text, public.translation_source_snapshot_from_row('faqs', to_jsonb(faqs)) from public.faqs
    union all select 'knowledge_base', id::text, public.translation_source_snapshot_from_row('knowledge_base', to_jsonb(knowledge_base)) from public.knowledge_base
    union all select 'partners', id::text, public.translation_source_snapshot_from_row('partners', to_jsonb(partners)) from public.partners
    union all select 'jobs', id::text, public.translation_source_snapshot_from_row('jobs', to_jsonb(jobs)) from public.jobs
    union all select 'reviews', id::text, public.translation_source_snapshot_from_row('reviews', to_jsonb(reviews)) from public.reviews
    union all select 'success_stories', id::text, public.translation_source_snapshot_from_row('success_stories', to_jsonb(success_stories)) from public.success_stories
    union all select 'gallery_items', id::text, public.translation_source_snapshot_from_row('gallery_items', to_jsonb(gallery_items)) from public.gallery_items
    union all select 'announcements', id::text, public.translation_source_snapshot_from_row('announcements', to_jsonb(announcements)) from public.announcements
  ) as source_rows
  where source_snapshot <> '{}'::jsonb;
$function$


CREATE OR REPLACE FUNCTION public.translation_revision_js_trim(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select btrim(
    p_value,
    chr(9) || chr(10) || chr(11) || chr(12) || chr(13) ||
    chr(32) || chr(160) || chr(5760) ||
    chr(8192) || chr(8193) || chr(8194) || chr(8195) || chr(8196) ||
    chr(8197) || chr(8198) || chr(8199) || chr(8200) || chr(8201) ||
    chr(8202) || chr(8232) || chr(8233) || chr(8239) || chr(8287) ||
    chr(12288) || chr(65279)
  );
$function$


CREATE OR REPLACE FUNCTION public.translation_source_revision_fingerprint(p_source_type text, p_source_id text, p_source_snapshot jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
  select encode(
    digest(
      public.translation_source_revision_fingerprint_payload(
        p_source_type,
        p_source_id,
        p_source_snapshot
      ),
      'sha256'
    ),
    'hex'
  );
$function$


CREATE OR REPLACE FUNCTION public.translation_source_revision_fingerprint_payload(p_source_type text, p_source_id text, p_source_snapshot jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    '{"sourceType":' || to_json(p_source_type)::text ||
    ',"sourceId":' || to_json(p_source_id)::text ||
    ',"sourceLocale":"ar","fields":[' ||
    coalesce((
      select string_agg(
        '[' || to_json(field.key)::text || ',' || to_json(field.value)::text || ']',
        ',' order by field.key
      )
      from jsonb_each_text(p_source_snapshot) as field(key, value)
    ), '') ||
    ']}';
$function$


CREATE OR REPLACE FUNCTION public.translation_source_snapshot_from_row(p_source_type text, p_row jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  case p_source_type
    when 'programs' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'name'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'title'), '')),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'short_description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'summary'), '')),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')),
        'requirements', nullif(public.translation_revision_js_trim(p_row ->> 'requirements'), ''),
        'benefits', nullif(public.translation_revision_js_trim(p_row ->> 'benefits'), ''),
        'updates', nullif(public.translation_revision_js_trim(p_row ->> 'updates'), ''),
        'faq', nullif(public.translation_revision_js_trim(p_row ->> 'faq'), '')
      ));
    when 'pages' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'seo_description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'summary'), '')),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')
      ));
    when 'sections' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'subtitle'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')
      ));
    when 'faqs' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'question'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'title'), '')),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'category'), ''),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'answer'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'content'), ''))
      ));
    when 'knowledge_base' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'summary'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'category'), '')),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'content'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'answer'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'body'), ''))
      ));
    when 'partners' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'name'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'title'), '')),
        'summary', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'category'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'type'), '')),
        'content', coalesce(nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''), nullif(public.translation_revision_js_trim(p_row ->> 'summary'), ''))
      ));
    when 'jobs' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'short_description'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''),
        'department', nullif(public.translation_revision_js_trim(p_row ->> 'department'), ''),
        'location', nullif(public.translation_revision_js_trim(p_row ->> 'location'), ''),
        'job_type', nullif(public.translation_revision_js_trim(p_row ->> 'job_type'), ''),
        'requirements', nullif(public.translation_revision_js_trim(p_row ->> 'requirements'), '')
      ));
    when 'reviews' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'reviewer_name'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'platform'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), ''),
        'country', nullif(public.translation_revision_js_trim(p_row ->> 'country'), '')
      ));
    when 'success_stories' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'result_summary'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'story'), ''),
        'person_name', nullif(public.translation_revision_js_trim(p_row ->> 'person_name'), ''),
        'country', nullif(public.translation_revision_js_trim(p_row ->> 'country'), ''),
        'platform', nullif(public.translation_revision_js_trim(p_row ->> 'platform'), '')
      ));
    when 'gallery_items' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'summary', nullif(public.translation_revision_js_trim(p_row ->> 'category'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'description'), ''),
        'button_label', nullif(public.translation_revision_js_trim(p_row ->> 'button_label'), '')
      ));
    when 'announcements' then
      return jsonb_strip_nulls(jsonb_build_object(
        'title', nullif(public.translation_revision_js_trim(p_row ->> 'title'), ''),
        'content', nullif(public.translation_revision_js_trim(p_row ->> 'content'), '')
      ));
    else
      return '{}'::jsonb;
  end case;
end;
$function$


CREATE SEQUENCE public.activity_logs_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.admin_users_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.agency_applications_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.ai_conversations_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.ai_unanswered_questions_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.announcements_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.backups_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.contact_messages_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.faqs_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.gallery_items_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.job_applications_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.jobs_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.knowledge_base_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.media_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.notifications_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.pages_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.partners_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.permissions_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.program_admins_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.program_pages_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.programs_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.provider_health_checks_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.redirects_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.reviews_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.role_permissions_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.roles_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.section_templates_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.sections_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.service_requests_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.services_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.settings_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.success_stories_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.task_status_history_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.tenant_admin_audit_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.trash_items_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE SEQUENCE public.version_history_id_seq AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE private.invitation_rate_limits (
  tenant_id uuid NOT NULL,
  action text NOT NULL,
  subject_hash text NOT NULL,
  bucket_started_at timestamp with time zone NOT NULL,
  attempts integer DEFAULT 1 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.activity_logs (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  admin_email text,
  action text,
  entity_type text,
  entity_id text,
  old_data text,
  new_data text,
  ip_address text,
  actor_user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  source_route text,
  outcome text DEFAULT 'success'::text NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.admin_permissions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_email text NOT NULL,
  module_key text NOT NULL,
  can_view boolean DEFAULT false NOT NULL,
  can_create boolean DEFAULT false NOT NULL,
  can_edit boolean DEFAULT false NOT NULL,
  can_delete boolean DEFAULT false NOT NULL,
  can_export boolean DEFAULT false NOT NULL,
  can_manage boolean DEFAULT false NOT NULL,
  notes text,
  created_by text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  admin_user_id bigint
);

CREATE TABLE public.admin_users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'super_admin'::text NOT NULL,
  program text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  assigned_program text,
  user_id uuid
);

CREATE TABLE public.agency_applications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  full_name text NOT NULL,
  country text NOT NULL,
  whatsapp text NOT NULL,
  platform text NOT NULL,
  previous_experience text,
  notes text,
  status text DEFAULT 'new'::text NOT NULL,
  internal_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  tracking_code text NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.ai_conversations (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  session_id text,
  visitor_name text,
  whatsapp text,
  page_url text,
  user_message text NOT NULL,
  ai_response text,
  status text DEFAULT 'answered'::text NOT NULL,
  escalated_to_whatsapp boolean DEFAULT false NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  visitor_whatsapp text,
  visitor_email text,
  last_message text,
  messages jsonb DEFAULT '[]'::jsonb,
  escalated boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  question text,
  answer text,
  source text
);

CREATE TABLE public.ai_knowledge_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  locale text NOT NULL,
  content_redacted text NOT NULL,
  checksum text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ai_messages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  session_id uuid NOT NULL,
  role text NOT NULL,
  content_redacted text NOT NULL,
  pii_detected boolean DEFAULT false NOT NULL,
  prompt_injection_detected boolean DEFAULT false NOT NULL,
  provider_key text DEFAULT 'rules'::text NOT NULL,
  usage jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ai_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid,
  surface text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  retention_until timestamp with time zone,
  consented boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.ai_unanswered_questions (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  question text NOT NULL,
  page_url text,
  visitor_info jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'new'::text NOT NULL,
  answer text,
  internal_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  context text,
  source text,
  visitor_name text,
  visitor_whatsapp text,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE public.announcements (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  title text,
  content text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  show_on_homepage boolean DEFAULT true,
  priority bigint DEFAULT '1'::bigint,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.backups (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  backup_name text,
  backup_type text,
  file_url text,
  notes text,
  created_by text,
  backup_code text,
  title text,
  file_name text,
  status text DEFAULT 'completed'::text,
  mode text DEFAULT 'manual'::text,
  size_bytes bigint,
  details jsonb,
  project_ref text,
  schema_version integer DEFAULT 1 NOT NULL,
  checksum text,
  scope text[] DEFAULT '{}'::text[] NOT NULL,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  restore_tested_at timestamp with time zone,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.communication_consents (
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  channel text NOT NULL,
  opted_in boolean DEFAULT false NOT NULL,
  source text,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  withdrawn_at timestamp with time zone
);

CREATE TABLE public.consent_records (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid,
  anonymous_id text,
  consent_version text NOT NULL,
  necessary boolean DEFAULT true NOT NULL,
  analytics boolean DEFAULT false NOT NULL,
  preferences boolean DEFAULT false NOT NULL,
  marketing boolean DEFAULT false NOT NULL,
  region text,
  recorded_at timestamp with time zone DEFAULT now() NOT NULL,
  withdrawn_at timestamp with time zone
);

CREATE TABLE public.contact_messages (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  full_name text NOT NULL,
  email text,
  whatsapp text,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new'::text NOT NULL,
  internal_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tracking_code text DEFAULT pr100_new_contact_tracking_code() NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.content_translation_revision_fields (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  translation_revision_id uuid NOT NULL,
  field_name text NOT NULL,
  source_value_snapshot text NOT NULL,
  translated_value text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  updated_by uuid
);

CREATE TABLE public.content_translation_revisions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_revision_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  language text NOT NULL,
  workflow_status text DEFAULT 'draft'::text NOT NULL,
  is_stale boolean DEFAULT false NOT NULL,
  stale_at timestamp with time zone,
  stale_reason text,
  supersedes_translation_revision_id uuid,
  review_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid,
  reviewed_at timestamp with time zone,
  reviewed_by uuid,
  published_at timestamp with time zone,
  published_by uuid,
  superseded_at timestamp with time zone,
  archived_at timestamp with time zone
);

CREATE TABLE public.content_translations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  field_name text NOT NULL,
  language text NOT NULL,
  translated_value text DEFAULT ''::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  reviewed boolean DEFAULT false NOT NULL,
  is_published boolean DEFAULT false NOT NULL,
  created_by text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.faqs (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category text DEFAULT 'general'::text,
  sort_order integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  is_published boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.gallery_items (
  id bigint DEFAULT nextval('gallery_items_id_seq'::regclass) NOT NULL,
  title text,
  slug text,
  category text,
  media_type text DEFAULT 'effect'::text,
  description text,
  media_url text,
  thumbnail_url text,
  effect_type text,
  external_url text,
  alt_text text,
  button_label text,
  button_url text,
  status text DEFAULT 'published'::text,
  is_visible boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL
);

CREATE TABLE public.incident_updates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  incident_id uuid NOT NULL,
  status text NOT NULL,
  message text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid,
  is_public boolean DEFAULT true NOT NULL
);

CREATE TABLE public.incidents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  severity text NOT NULL,
  status text DEFAULT 'investigating'::text NOT NULL,
  owner_id uuid,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone,
  postmortem text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.job_applications (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  job_id bigint,
  full_name text NOT NULL,
  country text,
  whatsapp text NOT NULL,
  email text,
  experience text,
  answers jsonb DEFAULT '{}'::jsonb NOT NULL,
  notes text,
  status text DEFAULT 'new'::text NOT NULL,
  internal_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tracking_code text DEFAULT pr100_new_job_tracking_code() NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.jobs (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  department text,
  location text,
  job_type text,
  short_description text,
  description text,
  requirements text,
  questions jsonb DEFAULT '[]'::jsonb NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.knowledge_base (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  category text DEFAULT 'general'::text,
  excerpt text,
  content text,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  status text DEFAULT 'published'::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  is_public boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  is_published boolean DEFAULT false,
  is_visible boolean DEFAULT false,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by text,
  updated_by text,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.legal_policy_versions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  policy_type text NOT NULL,
  locale text NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  published_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marketplace_cart_items (
  cart_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marketplace_carts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marketplace_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  slug text NOT NULL,
  translations jsonb DEFAULT '{}'::jsonb NOT NULL,
  active boolean DEFAULT true NOT NULL
);

CREATE TABLE public.marketplace_disputes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  opened_by uuid,
  reason text NOT NULL,
  status text DEFAULT 'open'::text NOT NULL,
  resolution text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  resolved_at timestamp with time zone
);

CREATE TABLE public.marketplace_favorites (
  tenant_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marketplace_listing_translations (
  listing_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  locale text NOT NULL,
  title text NOT NULL,
  summary text,
  description text,
  seo_title text,
  seo_description text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marketplace_listings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  partner_user_id uuid,
  category_id uuid,
  listing_type text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  slug text NOT NULL,
  translations jsonb DEFAULT '{}'::jsonb NOT NULL,
  media_ids bigint[] DEFAULT ARRAY[]::bigint[] NOT NULL,
  price_amount numeric(14,2),
  currency text,
  availability jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.marketplace_order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  listing_id uuid,
  title_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric(14,2) DEFAULT 0 NOT NULL,
  total_price numeric(14,2) DEFAULT 0 NOT NULL,
  tenant_id uuid
);

CREATE TABLE public.marketplace_orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  order_code text DEFAULT pr101_new_order_code() NOT NULL,
  client_user_id uuid,
  status text DEFAULT 'pending'::text NOT NULL,
  currency text,
  subtotal numeric(14,2) DEFAULT 0 NOT NULL,
  total numeric(14,2) DEFAULT 0 NOT NULL,
  payment_status text DEFAULT 'unpaid'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  notes jsonb DEFAULT '[]'::jsonb NOT NULL,
  dispute_status text
);

CREATE TABLE public.marketplace_reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  order_id uuid,
  user_id uuid NOT NULL,
  rating integer NOT NULL,
  body text,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.media (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  name text,
  file_url text,
  file_type text,
  category text,
  alt_text text,
  page_slug text,
  is_active boolean DEFAULT true,
  uploaded_by text,
  updated_at timestamp with time zone DEFAULT now(),
  tenant_id uuid NOT NULL
);

CREATE TABLE public.notifications (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  title text,
  message text,
  type text,
  is_read boolean DEFAULT false,
  recipient_role text,
  recipient_user_id uuid,
  recipient_email text,
  notification_key text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_archived boolean DEFAULT false NOT NULL,
  is_deleted boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  item_key text,
  state_key text,
  description text,
  content text,
  href text,
  target_url text,
  link text,
  status text,
  priority text,
  source_table text,
  source_id text,
  admin_email text,
  user_email text,
  read boolean,
  archived boolean,
  deleted boolean,
  payload jsonb,
  event_key text,
  event_type text,
  entity_type text,
  entity_id text,
  occurred_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.operations_preflight_backups (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_ref text NOT NULL,
  migration_key text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by text,
  schema_version integer DEFAULT 1 NOT NULL,
  scope text[] DEFAULT '{}'::text[] NOT NULL,
  row_counts jsonb DEFAULT '{}'::jsonb NOT NULL,
  snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  checksum text NOT NULL,
  notes text
);

CREATE TABLE public.page_builder_sections (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  page_id integer NOT NULL,
  section_type text DEFAULT 'text'::text NOT NULL,
  section_key text DEFAULT ''::text NOT NULL,
  title text DEFAULT ''::text NOT NULL,
  body text DEFAULT ''::text NOT NULL,
  button_label text,
  button_url text,
  media_url text,
  settings jsonb DEFAULT '{}'::jsonb NOT NULL,
  sort_order integer DEFAULT 1 NOT NULL,
  language text DEFAULT 'ar'::text NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_by text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pages (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  title text,
  slug text,
  content text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_image text,
  is_homepage boolean DEFAULT false,
  is_published boolean DEFAULT true,
  sort_order bigint,
  updated_at timestamp with time zone DEFAULT now(),
  publishing_status text DEFAULT 'published'::text NOT NULL,
  scheduled_publish_at timestamp with time zone,
  scheduled_unpublish_at timestamp with time zone,
  last_published_at timestamp with time zone,
  publishing_notes text,
  og_title text,
  og_description text,
  og_image_url text,
  twitter_title text,
  twitter_description text,
  twitter_image_url text,
  canonical_url text,
  robots_index boolean DEFAULT true NOT NULL,
  robots_follow boolean DEFAULT true NOT NULL,
  include_in_sitemap boolean DEFAULT true NOT NULL,
  sitemap_priority numeric(2,1) DEFAULT 0.8 NOT NULL,
  sitemap_change_frequency text DEFAULT 'weekly'::text NOT NULL,
  schema_type text DEFAULT 'WebPage'::text NOT NULL,
  schema_json jsonb DEFAULT '{}'::jsonb NOT NULL,
  seo_notes text,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.partners (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  sort_order integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  slug text,
  category text,
  badge text,
  detail_url text,
  status text DEFAULT 'published'::text,
  is_featured boolean DEFAULT false,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.payment_intents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  provider_id uuid,
  order_id uuid,
  idempotency_key text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL,
  status text DEFAULT 'created'::text NOT NULL,
  provider_reference text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_providers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  provider_key text NOT NULL,
  mode text DEFAULT 'disabled'::text NOT NULL,
  public_configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  secret_reference text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_refunds (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  transaction_id uuid,
  amount numeric(14,2) NOT NULL,
  reason text,
  status text DEFAULT 'requested'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_transactions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  intent_id uuid,
  provider_event_id text,
  transaction_type text NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  raw_reference jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.payment_webhook_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  provider_key text NOT NULL,
  event_id text NOT NULL,
  signature_valid boolean DEFAULT false NOT NULL,
  payload_digest text NOT NULL,
  processing_status text DEFAULT 'received'::text NOT NULL,
  received_at timestamp with time zone DEFAULT now() NOT NULL,
  processed_at timestamp with time zone
);

CREATE TABLE public.permissions (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  permission_key text NOT NULL,
  display_name text NOT NULL,
  category text,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.portal_files (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  media_id bigint,
  category text DEFAULT 'document'::text NOT NULL,
  visibility text DEFAULT 'owner'::text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.portal_notification_preferences (
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  channel text NOT NULL,
  event_key text NOT NULL,
  enabled boolean DEFAULT true NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.portal_profiles (
  user_id uuid NOT NULL,
  display_name text,
  phone text,
  locale text DEFAULT 'ar'::text NOT NULL,
  avatar_media_id bigint,
  status text DEFAULT 'active'::text NOT NULL,
  marketing_opt_in boolean DEFAULT false NOT NULL,
  ai_opt_out boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pr100_gateway_nonces (
  nonce text NOT NULL,
  action text NOT NULL,
  request_timestamp bigint NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.pr101_gateway_nonces (
  nonce text NOT NULL,
  action text NOT NULL,
  request_timestamp bigint NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.privacy_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  request_type text NOT NULL,
  status text DEFAULT 'submitted'::text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  due_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  verification_metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  admin_notes text
);

CREATE TABLE public.product_kpi_daily (
  tenant_id uuid NOT NULL,
  metric_date date NOT NULL,
  metric_key text NOT NULL,
  dimensions_hash text DEFAULT md5('{}'::text) NOT NULL,
  metric_value numeric DEFAULT 0 NOT NULL,
  dimensions jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.program_admins (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  program_id bigint,
  admin_user_id bigint
);

CREATE TABLE public.program_pages (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  program_id bigint,
  slug text NOT NULL,
  title text NOT NULL,
  content text,
  sections jsonb DEFAULT '[]'::jsonb NOT NULL,
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_image_url text,
  is_published boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.programs (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  name text,
  slug text,
  description text,
  short_description text,
  logo_url text,
  background_video_url text,
  status text,
  sort_order bigint,
  is_visible boolean,
  requirements text,
  benefits text,
  faq text,
  updates text,
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.provider_health_checks (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  tenant_id uuid NOT NULL,
  provider_type text NOT NULL,
  provider_key text NOT NULL,
  status text NOT NULL,
  latency_ms integer,
  detail jsonb DEFAULT '{}'::jsonb NOT NULL,
  checked_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.provider_message_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  provider_type text NOT NULL,
  provider_key text NOT NULL,
  event_key text NOT NULL,
  user_id uuid,
  status text DEFAULT 'queued'::text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  next_attempt_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.public_lookup_guards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  lookup_type text NOT NULL,
  identity_hash text NOT NULL,
  fingerprint_hash text NOT NULL,
  accepted boolean DEFAULT false NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.public_submission_guards (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  form_type text NOT NULL,
  identity_hash text NOT NULL,
  payload_hash text NOT NULL,
  accepted boolean DEFAULT false NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.push_subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  endpoint_hash text NOT NULL,
  endpoint_ciphertext text NOT NULL,
  key_ciphertext text NOT NULL,
  auth_ciphertext text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  last_used_at timestamp with time zone
);

CREATE TABLE public.redirects (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  source_path text NOT NULL,
  target_path text NOT NULL,
  status_code integer DEFAULT 301 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.restore_operations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  project_ref text NOT NULL,
  backup_code text,
  mode text NOT NULL,
  status text NOT NULL,
  scope text[] DEFAULT '{}'::text[] NOT NULL,
  summary jsonb DEFAULT '{}'::jsonb NOT NULL,
  checksum text,
  created_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  completed_at timestamp with time zone,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.reviews (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  reviewer_name text NOT NULL,
  country text,
  platform text,
  rating integer DEFAULT 5,
  content text NOT NULL,
  avatar_url text,
  is_featured boolean DEFAULT false NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  status text DEFAULT 'published'::text NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.role_permissions (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  role_id bigint,
  permission_id bigint,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.roles (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  name text NOT NULL,
  display_name text NOT NULL,
  description text,
  is_system boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.section_templates (
  id bigint DEFAULT nextval('section_templates_id_seq'::regclass) NOT NULL,
  template_key text NOT NULL,
  template_name text NOT NULL,
  description text,
  category text DEFAULT 'general'::text NOT NULL,
  section_type text DEFAULT 'content'::text NOT NULL,
  default_title text,
  default_subtitle text,
  default_content text,
  default_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
  preview_badge text,
  sort_order integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sections (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  page_slug text,
  program_slug text,
  section_key text NOT NULL,
  title text,
  subtitle text,
  content text DEFAULT '{}'::jsonb NOT NULL,
  media_url text,
  background_type text,
  background_value text,
  sort_order integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  is_published boolean DEFAULT true NOT NULL,
  scheduled_from timestamp with time zone,
  scheduled_to timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  page_id bigint,
  section_type text DEFAULT 'content'::text,
  settings jsonb DEFAULT '{}'::jsonb,
  publishing_status text DEFAULT 'published'::text NOT NULL,
  scheduled_publish_at timestamp with time zone,
  scheduled_unpublish_at timestamp with time zone,
  last_published_at timestamp with time zone,
  publishing_notes text,
  language text DEFAULT 'ar'::text NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.security_alerts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  severity text DEFAULT 'medium'::text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  acknowledged_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.service_requests (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  request_code text,
  full_name text NOT NULL,
  country text,
  whatsapp text NOT NULL,
  service_type text NOT NULL,
  platform text,
  account_identifier text,
  requested_amount text,
  notes text,
  status text DEFAULT 'new'::text NOT NULL,
  internal_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.services (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  category text,
  short_description text,
  description text,
  is_digital boolean DEFAULT false NOT NULL,
  form_schema jsonb DEFAULT '[]'::jsonb NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.settings (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  setting_key text,
  setting_value text,
  setting_group text,
  description text,
  is_public boolean DEFAULT false,
  group_name text DEFAULT 'general'::text,
  label_ar text,
  label_en text,
  input_type text DEFAULT 'text'::text,
  sort_order integer DEFAULT 0
);

CREATE TABLE public.sla_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  policy_id uuid,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  event_type text NOT NULL,
  deadline_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.sla_policies (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  entity_type text NOT NULL,
  first_response_minutes integer NOT NULL,
  resolution_minutes integer NOT NULL,
  business_hours jsonb DEFAULT '{}'::jsonb NOT NULL,
  pause_statuses text[] DEFAULT ARRAY[]::text[] NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.success_stories (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  title text NOT NULL,
  person_name text,
  country text,
  platform text,
  content text,
  results text,
  image_url text,
  video_url text,
  status text DEFAULT 'published'::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  result_summary text,
  story text,
  is_featured boolean DEFAULT false,
  tenant_id uuid NOT NULL
);

CREATE TABLE public.task_assignments (
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  assignment_type text DEFAULT 'assignee'::text NOT NULL,
  assigned_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid
);

CREATE TABLE public.task_attachments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  task_id uuid NOT NULL,
  media_id bigint,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.task_comments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  task_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  is_internal boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid
);

CREATE TABLE public.task_status_history (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  task_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now() NOT NULL,
  tenant_id uuid
);

CREATE TABLE public.tasks (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text DEFAULT 'open'::text NOT NULL,
  priority text DEFAULT 'normal'::text NOT NULL,
  due_at timestamp with time zone,
  related_type text,
  related_id text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  sla_policy_id uuid,
  completed_at timestamp with time zone
);

CREATE TABLE public.tenant_admin_audit (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  tenant_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  correlation_id uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_branding (
  tenant_id uuid NOT NULL,
  logo_media_id bigint,
  favicon_media_id bigint,
  primary_color text,
  secondary_color text,
  accent_color text,
  contact_email text,
  contact_phone text,
  social_links jsonb DEFAULT '{}'::jsonb NOT NULL,
  email_sender_name text,
  email_sender_address text,
  legal_overrides jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_domains (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  hostname text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_feature_flags (
  tenant_id uuid NOT NULL,
  feature_key text NOT NULL,
  enabled boolean DEFAULT false NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_invitations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  program_id bigint,
  permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
  token_hash text NOT NULL,
  status text DEFAULT 'invited'::text NOT NULL,
  invited_by uuid NOT NULL,
  accepted_by uuid,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  revoked_at timestamp with time zone,
  last_sent_at timestamp with time zone DEFAULT now() NOT NULL,
  send_count integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_memberships (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  program_id bigint,
  permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
  mfa_required boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenant_settings (
  tenant_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb DEFAULT 'null'::jsonb NOT NULL,
  is_secret boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.tenants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  default_locale text DEFAULT 'ar'::text NOT NULL,
  supported_locales text[] DEFAULT ARRAY['ar'::text, 'en'::text, 'tr'::text] NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.translation_source_revisions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  source_locale text DEFAULT 'ar'::text NOT NULL,
  source_fingerprint text NOT NULL,
  source_snapshot jsonb NOT NULL,
  previous_source_revision_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  created_by uuid
);

CREATE TABLE public.trash_items (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  item_type text NOT NULL,
  item_id text NOT NULL,
  title text,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  deleted_by_email text,
  restore_status text DEFAULT 'restorable'::text NOT NULL,
  deleted_at timestamp with time zone DEFAULT now() NOT NULL,
  restored_at timestamp with time zone,
  deleted_by text,
  item_data jsonb,
  item_title text
);

CREATE TABLE public.user_sessions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  auth_session_id uuid,
  device_label text,
  platform text,
  browser text,
  ip_hash text,
  last_active_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_at timestamp with time zone,
  suspicious boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  revoked_by uuid,
  revoke_reason text
);

CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  auth_user_id uuid,
  email text,
  full_name text,
  phone text,
  role text DEFAULT 'user'::text,
  is_active boolean DEFAULT true NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.version_history (
  id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  item_type text NOT NULL,
  item_id text NOT NULL,
  version_number integer DEFAULT 1 NOT NULL,
  data jsonb DEFAULT '{}'::jsonb NOT NULL,
  changed_by_email text,
  change_summary text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  entity_type text,
  entity_id text,
  action text DEFAULT 'updated'::text NOT NULL,
  title text,
  summary text,
  details text,
  metadata jsonb DEFAULT '{}'::jsonb,
  changed_by text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  page_id bigint,
  operation text DEFAULT 'publish'::text NOT NULL,
  page_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  sections_snapshot jsonb DEFAULT '[]'::jsonb NOT NULL,
  locale text
);

CREATE TABLE public.visual_experience_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  preset_name text DEFAULT 'HAMZA AGENCY Visual Draft'::text NOT NULL,
  background text DEFAULT 'hepta'::text NOT NULL,
  motion text DEFAULT 'medium'::text NOT NULL,
  glow boolean DEFAULT true NOT NULL,
  glass boolean DEFAULT true NOT NULL,
  animated_cards boolean DEFAULT true NOT NULL,
  cards_scope text[] DEFAULT ARRAY['الخدمات'::text, 'الإحصائيات'::text, 'مميزات الوكالة'::text] NOT NULL,
  cards jsonb DEFAULT '[]'::jsonb NOT NULL,
  notes text DEFAULT ''::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  apply_to_public boolean DEFAULT false NOT NULL,
  approved_by text,
  approved_at timestamp with time zone,
  created_by text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.whatsapp_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  template_key text NOT NULL,
  locale text NOT NULL,
  provider_template_name text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.white_label_projects (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  agency_name text DEFAULT ''::text NOT NULL,
  owner_name text DEFAULT ''::text NOT NULL,
  owner_email text DEFAULT ''::text NOT NULL,
  domain text DEFAULT ''::text NOT NULL,
  default_language text DEFAULT 'ar'::text NOT NULL,
  enabled_languages text[] DEFAULT ARRAY['ar'::text, 'en'::text, 'tr'::text] NOT NULL,
  primary_color text DEFAULT '#09000f'::text NOT NULL,
  accent_color text DEFAULT '#d4af37'::text NOT NULL,
  logo_url text,
  contact_email text,
  whatsapp text,
  package_type text DEFAULT 'standard'::text NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  notes text DEFAULT ''::text NOT NULL,
  checklist jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_by text,
  updated_by text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.workflow_definitions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  trigger_type text NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  definition jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.workflow_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  run_id uuid NOT NULL,
  step_id uuid,
  event_type text NOT NULL,
  idempotency_key text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb NOT NULL,
  error_code text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.workflow_runs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  status text DEFAULT 'queued'::text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb NOT NULL,
  retry_count integer DEFAULT 0 NOT NULL,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.workflow_steps (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  tenant_id uuid NOT NULL,
  workflow_id uuid NOT NULL,
  step_key text NOT NULL,
  step_type text NOT NULL,
  "position" integer NOT NULL,
  configuration jsonb DEFAULT '{}'::jsonb NOT NULL,
  retry_limit integer DEFAULT 3 NOT NULL,
  timeout_seconds integer
);

ALTER TABLE ONLY private.invitation_rate_limits ADD CONSTRAINT invitation_rate_limits_action_check CHECK (action = ANY (ARRAY['create'::text, 'resend'::text, 'accept'::text]));

ALTER TABLE ONLY private.invitation_rate_limits ADD CONSTRAINT invitation_rate_limits_attempts_check CHECK (attempts > 0);

ALTER TABLE ONLY private.invitation_rate_limits ADD CONSTRAINT invitation_rate_limits_pkey PRIMARY KEY (tenant_id, action, subject_hash, bucket_started_at);

ALTER TABLE ONLY private.invitation_rate_limits ADD CONSTRAINT invitation_rate_limits_subject_hash_check CHECK (subject_hash ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE ONLY private.invitation_rate_limits ADD CONSTRAINT invitation_rate_limits_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.activity_logs ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.activity_logs ADD CONSTRAINT activity_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.admin_permissions ADD CONSTRAINT admin_permissions_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.admin_permissions ADD CONSTRAINT admin_permissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.admin_users ADD CONSTRAINT admin_users_email_key UNIQUE (email);

ALTER TABLE ONLY public.admin_users ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.admin_users ADD CONSTRAINT admin_users_role_check CHECK (role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text, 'program_admin'::text]));

ALTER TABLE ONLY public.admin_users ADD CONSTRAINT admin_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.agency_applications ADD CONSTRAINT agency_applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.agency_applications ADD CONSTRAINT agency_applications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.agency_applications ADD CONSTRAINT applications_status_check CHECK (status = ANY (ARRAY['new'::text, 'under_review'::text, 'accepted'::text, 'rejected'::text]));

ALTER TABLE ONLY public.ai_conversations ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_knowledge_documents ADD CONSTRAINT ai_knowledge_documents_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.ai_knowledge_documents ADD CONSTRAINT ai_knowledge_documents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_knowledge_documents ADD CONSTRAINT ai_knowledge_documents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_knowledge_documents ADD CONSTRAINT ai_knowledge_documents_tenant_id_source_type_source_id_loca_key UNIQUE (tenant_id, source_type, source_id, locale);

ALTER TABLE ONLY public.ai_messages ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_messages ADD CONSTRAINT ai_messages_role_check CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text]));

ALTER TABLE ONLY public.ai_messages ADD CONSTRAINT ai_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES ai_sessions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_sessions ADD CONSTRAINT ai_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_sessions ADD CONSTRAINT ai_sessions_status_check CHECK (status = ANY (ARRAY['active'::text, 'escalated'::text, 'closed'::text, 'expired'::text]));

ALTER TABLE ONLY public.ai_sessions ADD CONSTRAINT ai_sessions_surface_check CHECK (surface = ANY (ARRAY['public'::text, 'creator'::text, 'client'::text, 'employee'::text, 'partner'::text, 'admin'::text]));

ALTER TABLE ONLY public.ai_sessions ADD CONSTRAINT ai_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_sessions ADD CONSTRAINT ai_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_unanswered_questions ADD CONSTRAINT ai_unanswered_questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.announcements ADD CONSTRAINT announcements_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.backups ADD CONSTRAINT backups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.backups ADD CONSTRAINT backups_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.communication_consents ADD CONSTRAINT communication_consents_channel_check CHECK (channel = ANY (ARRAY['email'::text, 'push'::text, 'whatsapp'::text, 'marketing'::text]));

ALTER TABLE ONLY public.communication_consents ADD CONSTRAINT communication_consents_pkey PRIMARY KEY (tenant_id, user_id, channel);

ALTER TABLE ONLY public.communication_consents ADD CONSTRAINT communication_consents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.communication_consents ADD CONSTRAINT communication_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.consent_records ADD CONSTRAINT consent_records_check CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL);

ALTER TABLE ONLY public.consent_records ADD CONSTRAINT consent_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.consent_records ADD CONSTRAINT consent_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.consent_records ADD CONSTRAINT consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.contact_messages ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.contact_messages ADD CONSTRAINT contact_messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.contact_messages ADD CONSTRAINT contact_messages_tracking_code_format_check CHECK (tracking_code ~ '^CNT-[0-9]{4}-[A-F0-9]{10}$'::text);

ALTER TABLE ONLY public.content_translation_revision_fields ADD CONSTRAINT content_translation_revision__translation_revision_id_field_key UNIQUE (translation_revision_id, field_name);

ALTER TABLE ONLY public.content_translation_revision_fields ADD CONSTRAINT content_translation_revision_field_translation_revision_id_fkey FOREIGN KEY (translation_revision_id) REFERENCES content_translation_revisions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.content_translation_revision_fields ADD CONSTRAINT content_translation_revision_fields_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_translation_revision_fields ADD CONSTRAINT content_translation_revision_fields_field_name_check CHECK (field_name = ANY (ARRAY['title'::text, 'summary'::text, 'content'::text, 'requirements'::text, 'benefits'::text, 'updates'::text, 'faq'::text, 'department'::text, 'location'::text, 'job_type'::text, 'country'::text, 'person_name'::text, 'platform'::text, 'button_label'::text, 'meta_title'::text, 'meta_description'::text, 'question'::text, 'answer'::text]));

ALTER TABLE ONLY public.content_translation_revision_fields ADD CONSTRAINT content_translation_revision_fields_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.content_translation_revision_fields ADD CONSTRAINT content_translation_revision_fields_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_language_check CHECK (language = ANY (ARRAY['en'::text, 'tr'::text]));

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_source_id_check CHECK (btrim(source_id) <> ''::text);

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_source_revision_fk FOREIGN KEY (source_revision_id, source_type, source_id) REFERENCES translation_source_revisions(id, source_type, source_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_source_type_check CHECK (source_type = ANY (ARRAY['programs'::text, 'pages'::text, 'sections'::text, 'faqs'::text, 'knowledge_base'::text, 'partners'::text, 'jobs'::text, 'reviews'::text, 'success_stories'::text, 'gallery_items'::text, 'announcements'::text, 'services'::text, 'legal_pages'::text]));

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_stale_timestamp_check CHECK (is_stale = false AND stale_at IS NULL OR is_stale = true AND stale_at IS NOT NULL);

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_supersedes_translation_revis_fkey FOREIGN KEY (supersedes_translation_revision_id) REFERENCES content_translation_revisions(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_translation_revisions ADD CONSTRAINT content_translation_revisions_workflow_status_check CHECK (workflow_status = ANY (ARRAY['draft'::text, 'needs_review'::text, 'reviewed'::text, 'published'::text, 'superseded'::text, 'archived'::text]));

ALTER TABLE ONLY public.content_translations ADD CONSTRAINT content_translations_field_name_check CHECK (field_name = ANY (ARRAY['title'::text, 'summary'::text, 'content'::text, 'requirements'::text, 'benefits'::text, 'updates'::text, 'faq'::text, 'department'::text, 'location'::text, 'job_type'::text, 'country'::text, 'person_name'::text, 'platform'::text, 'button_label'::text, 'meta_title'::text, 'meta_description'::text, 'question'::text, 'answer'::text]));

ALTER TABLE ONLY public.content_translations ADD CONSTRAINT content_translations_language_check CHECK (language = ANY (ARRAY['en'::text, 'tr'::text]));

ALTER TABLE ONLY public.content_translations ADD CONSTRAINT content_translations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.content_translations ADD CONSTRAINT content_translations_source_type_check CHECK (source_type = ANY (ARRAY['programs'::text, 'pages'::text, 'sections'::text, 'faqs'::text, 'knowledge_base'::text, 'partners'::text, 'jobs'::text, 'reviews'::text, 'success_stories'::text, 'gallery_items'::text, 'announcements'::text, 'services'::text, 'legal_pages'::text]));

ALTER TABLE ONLY public.content_translations ADD CONSTRAINT content_translations_source_type_supported_check CHECK (source_type = ANY (ARRAY['faqs'::text, 'jobs'::text, 'knowledge_base'::text, 'legal_pages'::text, 'pages'::text, 'partners'::text, 'programs'::text, 'sections'::text, 'services'::text]));

ALTER TABLE ONLY public.content_translations ADD CONSTRAINT content_translations_status_check CHECK (status = ANY (ARRAY['draft'::text, 'needs_review'::text, 'reviewed'::text, 'published'::text, 'archived'::text]));

ALTER TABLE ONLY public.content_translations ADD CONSTRAINT content_translations_unique_item_field_language UNIQUE (source_type, source_id, field_name, language);

ALTER TABLE ONLY public.faqs ADD CONSTRAINT faqs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.gallery_items ADD CONSTRAINT gallery_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.gallery_items ADD CONSTRAINT gallery_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.incident_updates ADD CONSTRAINT incident_updates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.incident_updates ADD CONSTRAINT incident_updates_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.incident_updates ADD CONSTRAINT incident_updates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.incident_updates ADD CONSTRAINT incident_updates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.incidents ADD CONSTRAINT incidents_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.incidents ADD CONSTRAINT incidents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.incidents ADD CONSTRAINT incidents_severity_check CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]));

ALTER TABLE ONLY public.incidents ADD CONSTRAINT incidents_status_check CHECK (status = ANY (ARRAY['investigating'::text, 'identified'::text, 'monitoring'::text, 'resolved'::text]));

ALTER TABLE ONLY public.incidents ADD CONSTRAINT incidents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.job_applications ADD CONSTRAINT job_applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.job_applications ADD CONSTRAINT job_applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.job_applications ADD CONSTRAINT job_applications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.job_applications ADD CONSTRAINT job_applications_tracking_code_format_check CHECK (tracking_code ~ '^JOB-[0-9]{4}-[A-F0-9]{10}$'::text);

ALTER TABLE ONLY public.jobs ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.jobs ADD CONSTRAINT jobs_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.jobs ADD CONSTRAINT jobs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.knowledge_base ADD CONSTRAINT knowledge_base_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.knowledge_base ADD CONSTRAINT knowledge_base_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.knowledge_base ADD CONSTRAINT knowledge_base_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.legal_policy_versions ADD CONSTRAINT legal_policy_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.legal_policy_versions ADD CONSTRAINT legal_policy_versions_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.legal_policy_versions ADD CONSTRAINT legal_policy_versions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.legal_policy_versions ADD CONSTRAINT legal_policy_versions_policy_type_check CHECK (policy_type = ANY (ARRAY['privacy'::text, 'cookies'::text, 'ai'::text, 'terms'::text]));

ALTER TABLE ONLY public.legal_policy_versions ADD CONSTRAINT legal_policy_versions_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]));

ALTER TABLE ONLY public.legal_policy_versions ADD CONSTRAINT legal_policy_versions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.legal_policy_versions ADD CONSTRAINT legal_policy_versions_tenant_id_policy_type_locale_version_key UNIQUE (tenant_id, policy_type, locale, version);

ALTER TABLE ONLY public.marketplace_cart_items ADD CONSTRAINT marketplace_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES marketplace_carts(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_cart_items ADD CONSTRAINT marketplace_cart_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_cart_items ADD CONSTRAINT marketplace_cart_items_pkey PRIMARY KEY (cart_id, listing_id);

ALTER TABLE ONLY public.marketplace_cart_items ADD CONSTRAINT marketplace_cart_items_quantity_check CHECK (quantity > 0);

ALTER TABLE ONLY public.marketplace_carts ADD CONSTRAINT marketplace_carts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_carts ADD CONSTRAINT marketplace_carts_status_check CHECK (status = ANY (ARRAY['active'::text, 'converted'::text, 'abandoned'::text]));

ALTER TABLE ONLY public.marketplace_carts ADD CONSTRAINT marketplace_carts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_carts ADD CONSTRAINT marketplace_carts_tenant_id_user_id_status_key UNIQUE (tenant_id, user_id, status);

ALTER TABLE ONLY public.marketplace_carts ADD CONSTRAINT marketplace_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_categories ADD CONSTRAINT marketplace_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_categories ADD CONSTRAINT marketplace_categories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_categories ADD CONSTRAINT marketplace_categories_tenant_id_slug_key UNIQUE (tenant_id, slug);

ALTER TABLE ONLY public.marketplace_disputes ADD CONSTRAINT marketplace_disputes_opened_by_fkey FOREIGN KEY (opened_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.marketplace_disputes ADD CONSTRAINT marketplace_disputes_order_id_fkey FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_disputes ADD CONSTRAINT marketplace_disputes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_disputes ADD CONSTRAINT marketplace_disputes_status_check CHECK (status = ANY (ARRAY['open'::text, 'under_review'::text, 'resolved'::text, 'rejected'::text, 'closed'::text]));

ALTER TABLE ONLY public.marketplace_disputes ADD CONSTRAINT marketplace_disputes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_favorites ADD CONSTRAINT marketplace_favorites_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_favorites ADD CONSTRAINT marketplace_favorites_pkey PRIMARY KEY (listing_id, user_id);

ALTER TABLE ONLY public.marketplace_favorites ADD CONSTRAINT marketplace_favorites_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_favorites ADD CONSTRAINT marketplace_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_listing_translations ADD CONSTRAINT marketplace_listing_translations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_listing_translations ADD CONSTRAINT marketplace_listing_translations_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.marketplace_listing_translations ADD CONSTRAINT marketplace_listing_translations_pkey PRIMARY KEY (listing_id, locale);

ALTER TABLE ONLY public.marketplace_listing_translations ADD CONSTRAINT marketplace_listing_translations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_listings ADD CONSTRAINT marketplace_listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES marketplace_categories(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.marketplace_listings ADD CONSTRAINT marketplace_listings_listing_type_check CHECK (listing_type = ANY (ARRAY['product'::text, 'service'::text]));

ALTER TABLE ONLY public.marketplace_listings ADD CONSTRAINT marketplace_listings_partner_user_id_fkey FOREIGN KEY (partner_user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.marketplace_listings ADD CONSTRAINT marketplace_listings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_listings ADD CONSTRAINT marketplace_listings_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'published'::text, 'archived'::text]));

ALTER TABLE ONLY public.marketplace_listings ADD CONSTRAINT marketplace_listings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_listings ADD CONSTRAINT marketplace_listings_tenant_id_slug_key UNIQUE (tenant_id, slug);

ALTER TABLE ONLY public.marketplace_order_items ADD CONSTRAINT marketplace_order_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id);

ALTER TABLE ONLY public.marketplace_order_items ADD CONSTRAINT marketplace_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_order_items ADD CONSTRAINT marketplace_order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_order_items ADD CONSTRAINT marketplace_order_items_quantity_check CHECK (quantity > 0);

ALTER TABLE ONLY public.marketplace_order_items ADD CONSTRAINT marketplace_order_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_orders ADD CONSTRAINT marketplace_orders_client_user_id_fkey FOREIGN KEY (client_user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.marketplace_orders ADD CONSTRAINT marketplace_orders_payment_status_check CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'paid'::text, 'partially_refunded'::text, 'refunded'::text, 'failed'::text]));

ALTER TABLE ONLY public.marketplace_orders ADD CONSTRAINT marketplace_orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_orders ADD CONSTRAINT marketplace_orders_status_check CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'fulfilled'::text, 'cancelled'::text, 'refunded'::text, 'disputed'::text]));

ALTER TABLE ONLY public.marketplace_orders ADD CONSTRAINT marketplace_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_orders ADD CONSTRAINT marketplace_orders_tenant_id_order_code_key UNIQUE (tenant_id, order_code);

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_body_check CHECK (body IS NULL OR char_length(body) <= 3000);

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_listing_id_user_id_order_id_key UNIQUE (listing_id, user_id, order_id);

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_order_id_fkey FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_status_check CHECK (status = ANY (ARRAY['pending'::text, 'published'::text, 'rejected'::text, 'archived'::text]));

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.marketplace_reviews ADD CONSTRAINT marketplace_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.media ADD CONSTRAINT media_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.media ADD CONSTRAINT media_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications ADD CONSTRAINT notifications_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.operations_preflight_backups ADD CONSTRAINT operations_preflight_backups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.page_builder_sections ADD CONSTRAINT page_builder_sections_language_check CHECK (language = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.page_builder_sections ADD CONSTRAINT page_builder_sections_page_id_fkey FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.page_builder_sections ADD CONSTRAINT page_builder_sections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.page_builder_sections ADD CONSTRAINT page_builder_sections_section_type_check CHECK (section_type = ANY (ARRAY['hero'::text, 'text'::text, 'cards'::text, 'cta'::text, 'faq'::text, 'gallery'::text, 'stats'::text, 'custom'::text]));

ALTER TABLE ONLY public.page_builder_sections ADD CONSTRAINT page_builder_sections_sort_order_check CHECK (sort_order >= 0);

ALTER TABLE ONLY public.pages ADD CONSTRAINT pages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.pages ADD CONSTRAINT pages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.partners ADD CONSTRAINT partners_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.partners ADD CONSTRAINT partners_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.payment_intents ADD CONSTRAINT payment_intents_order_id_fkey FOREIGN KEY (order_id) REFERENCES marketplace_orders(id);

ALTER TABLE ONLY public.payment_intents ADD CONSTRAINT payment_intents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_intents ADD CONSTRAINT payment_intents_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES payment_providers(id);

ALTER TABLE ONLY public.payment_intents ADD CONSTRAINT payment_intents_status_check CHECK (status = ANY (ARRAY['created'::text, 'pending'::text, 'authorized'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text, 'refunded'::text]));

ALTER TABLE ONLY public.payment_intents ADD CONSTRAINT payment_intents_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_intents ADD CONSTRAINT payment_intents_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);

ALTER TABLE ONLY public.payment_providers ADD CONSTRAINT payment_providers_mode_check CHECK (mode = ANY (ARRAY['disabled'::text, 'manual'::text, 'sandbox'::text, 'live'::text]));

ALTER TABLE ONLY public.payment_providers ADD CONSTRAINT payment_providers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_providers ADD CONSTRAINT payment_providers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_providers ADD CONSTRAINT payment_providers_tenant_id_provider_key_key UNIQUE (tenant_id, provider_key);

ALTER TABLE ONLY public.payment_refunds ADD CONSTRAINT payment_refunds_amount_check CHECK (amount > 0::numeric);

ALTER TABLE ONLY public.payment_refunds ADD CONSTRAINT payment_refunds_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.payment_refunds ADD CONSTRAINT payment_refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_refunds ADD CONSTRAINT payment_refunds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_refunds ADD CONSTRAINT payment_refunds_status_check CHECK (status = ANY (ARRAY['requested'::text, 'approved'::text, 'processing'::text, 'completed'::text, 'rejected'::text, 'failed'::text]));

ALTER TABLE ONLY public.payment_refunds ADD CONSTRAINT payment_refunds_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_refunds ADD CONSTRAINT payment_refunds_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES payment_transactions(id);

ALTER TABLE ONLY public.payment_transactions ADD CONSTRAINT payment_transactions_intent_id_fkey FOREIGN KEY (intent_id) REFERENCES payment_intents(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.payment_transactions ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_transactions ADD CONSTRAINT payment_transactions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_transactions ADD CONSTRAINT payment_transactions_tenant_id_provider_event_id_key UNIQUE (tenant_id, provider_event_id);

ALTER TABLE ONLY public.payment_transactions ADD CONSTRAINT payment_transactions_transaction_type_check CHECK (transaction_type = ANY (ARRAY['authorize'::text, 'capture'::text, 'payment'::text, 'refund'::text, 'void'::text, 'failure'::text]));

ALTER TABLE ONLY public.payment_webhook_events ADD CONSTRAINT payment_webhook_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.payment_webhook_events ADD CONSTRAINT payment_webhook_events_processing_status_check CHECK (processing_status = ANY (ARRAY['received'::text, 'processed'::text, 'ignored'::text, 'failed'::text]));

ALTER TABLE ONLY public.payment_webhook_events ADD CONSTRAINT payment_webhook_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.payment_webhook_events ADD CONSTRAINT payment_webhook_events_tenant_id_provider_key_event_id_key UNIQUE (tenant_id, provider_key, event_id);

ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_permission_key_key UNIQUE (permission_key);

ALTER TABLE ONLY public.permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.portal_files ADD CONSTRAINT portal_files_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.portal_files ADD CONSTRAINT portal_files_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.portal_files ADD CONSTRAINT portal_files_status_check CHECK (status = ANY (ARRAY['active'::text, 'archived'::text, 'deleted'::text]));

ALTER TABLE ONLY public.portal_files ADD CONSTRAINT portal_files_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.portal_files ADD CONSTRAINT portal_files_visibility_check CHECK (visibility = ANY (ARRAY['owner'::text, 'assigned_staff'::text, 'tenant_admin'::text]));

ALTER TABLE ONLY public.portal_notification_preferences ADD CONSTRAINT portal_notification_preferences_channel_check CHECK (channel = ANY (ARRAY['in_app'::text, 'email'::text, 'push'::text, 'whatsapp'::text]));

ALTER TABLE ONLY public.portal_notification_preferences ADD CONSTRAINT portal_notification_preferences_pkey PRIMARY KEY (tenant_id, user_id, channel, event_key);

ALTER TABLE ONLY public.portal_notification_preferences ADD CONSTRAINT portal_notification_preferences_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.portal_notification_preferences ADD CONSTRAINT portal_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.portal_profiles ADD CONSTRAINT portal_profiles_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.portal_profiles ADD CONSTRAINT portal_profiles_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.portal_profiles ADD CONSTRAINT portal_profiles_status_check CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'pending_deletion'::text]));

ALTER TABLE ONLY public.portal_profiles ADD CONSTRAINT portal_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.pr100_gateway_nonces ADD CONSTRAINT pr100_gateway_nonces_action_check CHECK (action = ANY (ARRAY['application_lookup'::text, 'service_lookup'::text, 'ai_guard'::text, 'password_reset_guard'::text, 'application_submit'::text, 'service_request_submit'::text, 'job_application_submit'::text, 'contact_submit'::text, 'ai_support_submit'::text]));

ALTER TABLE ONLY public.pr100_gateway_nonces ADD CONSTRAINT pr100_gateway_nonces_nonce_check CHECK (nonce ~ '^[A-Za-z0-9_-]{24,80}$'::text);

ALTER TABLE ONLY public.pr100_gateway_nonces ADD CONSTRAINT pr100_gateway_nonces_pkey PRIMARY KEY (nonce);

ALTER TABLE ONLY public.pr101_gateway_nonces ADD CONSTRAINT pr101_gateway_nonces_nonce_check CHECK (nonce ~ '^[A-Za-z0-9_-]{24,80}$'::text);

ALTER TABLE ONLY public.pr101_gateway_nonces ADD CONSTRAINT pr101_gateway_nonces_pkey PRIMARY KEY (nonce);

ALTER TABLE ONLY public.privacy_requests ADD CONSTRAINT privacy_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.privacy_requests ADD CONSTRAINT privacy_requests_request_type_check CHECK (request_type = ANY (ARRAY['access'::text, 'download'::text, 'correction'::text, 'deletion'::text, 'consent_withdrawal'::text]));

ALTER TABLE ONLY public.privacy_requests ADD CONSTRAINT privacy_requests_status_check CHECK (status = ANY (ARRAY['submitted'::text, 'verification_required'::text, 'verified'::text, 'in_progress'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text]));

ALTER TABLE ONLY public.privacy_requests ADD CONSTRAINT privacy_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.privacy_requests ADD CONSTRAINT privacy_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.product_kpi_daily ADD CONSTRAINT product_kpi_daily_check CHECK (dimensions_hash = md5(dimensions::text));

ALTER TABLE ONLY public.product_kpi_daily ADD CONSTRAINT product_kpi_daily_pkey PRIMARY KEY (tenant_id, metric_date, metric_key, dimensions_hash);

ALTER TABLE ONLY public.product_kpi_daily ADD CONSTRAINT product_kpi_daily_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.program_admins ADD CONSTRAINT program_admins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.program_pages ADD CONSTRAINT program_pages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.program_pages ADD CONSTRAINT program_pages_program_id_slug_key UNIQUE (program_id, slug);

ALTER TABLE ONLY public.programs ADD CONSTRAINT programs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.programs ADD CONSTRAINT programs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.provider_health_checks ADD CONSTRAINT provider_health_checks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_health_checks ADD CONSTRAINT provider_health_checks_provider_type_check CHECK (provider_type = ANY (ARRAY['oidc'::text, 'database'::text, 'backup'::text, 'push'::text, 'whatsapp'::text, 'ai'::text, 'payment'::text, 'scheduler'::text]));

ALTER TABLE ONLY public.provider_health_checks ADD CONSTRAINT provider_health_checks_status_check CHECK (status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'down'::text, 'disabled'::text]));

ALTER TABLE ONLY public.provider_health_checks ADD CONSTRAINT provider_health_checks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_message_events ADD CONSTRAINT provider_message_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.provider_message_events ADD CONSTRAINT provider_message_events_provider_type_check CHECK (provider_type = ANY (ARRAY['whatsapp'::text, 'push'::text, 'ai'::text, 'payment'::text]));

ALTER TABLE ONLY public.provider_message_events ADD CONSTRAINT provider_message_events_status_check CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'skipped'::text]));

ALTER TABLE ONLY public.provider_message_events ADD CONSTRAINT provider_message_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.provider_message_events ADD CONSTRAINT provider_message_events_tenant_id_provider_type_event_key_key UNIQUE (tenant_id, provider_type, event_key);

ALTER TABLE ONLY public.provider_message_events ADD CONSTRAINT provider_message_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.public_lookup_guards ADD CONSTRAINT public_lookup_guards_lookup_type_check CHECK (lookup_type = ANY (ARRAY['application'::text, 'service_request'::text, 'job_application'::text, 'contact'::text]));

ALTER TABLE ONLY public.public_lookup_guards ADD CONSTRAINT public_lookup_guards_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.public_submission_guards ADD CONSTRAINT public_submission_guards_form_type_check CHECK (form_type = ANY (ARRAY['application'::text, 'service_request'::text, 'job_application'::text, 'contact'::text, 'ai_support'::text, 'password_reset'::text, 'ai_answer'::text]));

ALTER TABLE ONLY public.public_submission_guards ADD CONSTRAINT public_submission_guards_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.push_subscriptions ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.push_subscriptions ADD CONSTRAINT push_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.push_subscriptions ADD CONSTRAINT push_subscriptions_tenant_id_user_id_endpoint_hash_key UNIQUE (tenant_id, user_id, endpoint_hash);

ALTER TABLE ONLY public.push_subscriptions ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.redirects ADD CONSTRAINT redirects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.redirects ADD CONSTRAINT redirects_source_path_key UNIQUE (source_path);

ALTER TABLE ONLY public.restore_operations ADD CONSTRAINT restore_operations_mode_check CHECK (mode = ANY (ARRAY['dry_run'::text, 'restore_test'::text, 'restore'::text]));

ALTER TABLE ONLY public.restore_operations ADD CONSTRAINT restore_operations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.restore_operations ADD CONSTRAINT restore_operations_status_check CHECK (status = ANY (ARRAY['pending'::text, 'validated'::text, 'completed'::text, 'failed'::text]));

ALTER TABLE ONLY public.restore_operations ADD CONSTRAINT restore_operations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.reviews ADD CONSTRAINT reviews_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.role_permissions ADD CONSTRAINT role_permissions_role_id_permission_id_key UNIQUE (role_id, permission_id);

ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_name_key UNIQUE (name);

ALTER TABLE ONLY public.roles ADD CONSTRAINT roles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.section_templates ADD CONSTRAINT section_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.section_templates ADD CONSTRAINT section_templates_template_key_key UNIQUE (template_key);

ALTER TABLE ONLY public.sections ADD CONSTRAINT sections_language_check CHECK (language = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.sections ADD CONSTRAINT sections_page_id_fkey FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.sections ADD CONSTRAINT sections_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sections ADD CONSTRAINT sections_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.security_alerts ADD CONSTRAINT security_alerts_alert_type_check CHECK (alert_type = ANY (ARRAY['new_device'::text, 'suspicious_login'::text, 'session_revoked'::text, 'password_changed'::text, 'mfa_required'::text]));

ALTER TABLE ONLY public.security_alerts ADD CONSTRAINT security_alerts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.security_alerts ADD CONSTRAINT security_alerts_severity_check CHECK (severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]));

ALTER TABLE ONLY public.security_alerts ADD CONSTRAINT security_alerts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.security_alerts ADD CONSTRAINT security_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.service_requests ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.service_requests ADD CONSTRAINT service_requests_request_code_key UNIQUE (request_code);

ALTER TABLE ONLY public.service_requests ADD CONSTRAINT service_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.services ADD CONSTRAINT services_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.services ADD CONSTRAINT services_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sla_events ADD CONSTRAINT sla_events_event_type_check CHECK (event_type = ANY (ARRAY['started'::text, 'paused'::text, 'resumed'::text, 'warning'::text, 'breached'::text, 'met'::text, 'cancelled'::text]));

ALTER TABLE ONLY public.sla_events ADD CONSTRAINT sla_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sla_events ADD CONSTRAINT sla_events_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES sla_policies(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.sla_events ADD CONSTRAINT sla_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.sla_policies ADD CONSTRAINT sla_policies_first_response_minutes_check CHECK (first_response_minutes > 0);

ALTER TABLE ONLY public.sla_policies ADD CONSTRAINT sla_policies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sla_policies ADD CONSTRAINT sla_policies_resolution_minutes_check CHECK (resolution_minutes > 0);

ALTER TABLE ONLY public.sla_policies ADD CONSTRAINT sla_policies_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.success_stories ADD CONSTRAINT success_stories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.success_stories ADD CONSTRAINT success_stories_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE ONLY public.task_assignments ADD CONSTRAINT task_assignments_assignment_type_check CHECK (assignment_type = ANY (ARRAY['assignee'::text, 'watcher'::text]));

ALTER TABLE ONLY public.task_assignments ADD CONSTRAINT task_assignments_pkey PRIMARY KEY (task_id, user_id, assignment_type);

ALTER TABLE ONLY public.task_assignments ADD CONSTRAINT task_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_assignments ADD CONSTRAINT task_assignments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_assignments ADD CONSTRAINT task_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_attachments ADD CONSTRAINT task_attachments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.task_attachments ADD CONSTRAINT task_attachments_size_bytes_check CHECK (size_bytes >= 1 AND size_bytes <= 10485760);

ALTER TABLE ONLY public.task_attachments ADD CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_attachments ADD CONSTRAINT task_attachments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_attachments ADD CONSTRAINT task_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.task_comments ADD CONSTRAINT task_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.task_comments ADD CONSTRAINT task_comments_body_check CHECK (char_length(body) >= 1 AND char_length(body) <= 10000);

ALTER TABLE ONLY public.task_comments ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.task_comments ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_comments ADD CONSTRAINT task_comments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_status_history ADD CONSTRAINT task_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.task_status_history ADD CONSTRAINT task_status_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.task_status_history ADD CONSTRAINT task_status_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.task_status_history ADD CONSTRAINT task_status_history_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_priority_check CHECK (priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]));

ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_related_type_check CHECK (related_type = ANY (ARRAY['APP'::text, 'SR'::text, 'JOB'::text, 'CNT'::text, 'creator'::text, 'client'::text, 'partner'::text, 'marketplace_order'::text, 'incident'::text]));

ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_sla_policy_id_fkey FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id);

ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_status_check CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'blocked'::text, 'resolved'::text, 'closed'::text, 'cancelled'::text]));

ALTER TABLE ONLY public.tasks ADD CONSTRAINT tasks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_admin_audit ADD CONSTRAINT tenant_admin_audit_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);

ALTER TABLE ONLY public.tenant_admin_audit ADD CONSTRAINT tenant_admin_audit_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_admin_audit ADD CONSTRAINT tenant_admin_audit_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_branding ADD CONSTRAINT tenant_branding_pkey PRIMARY KEY (tenant_id);

ALTER TABLE ONLY public.tenant_branding ADD CONSTRAINT tenant_branding_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_domains ADD CONSTRAINT tenant_domains_hostname_key UNIQUE (hostname);

ALTER TABLE ONLY public.tenant_domains ADD CONSTRAINT tenant_domains_normalized_hostname_check CHECK (hostname = lower(hostname) AND hostname ~ '^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$'::text);

ALTER TABLE ONLY public.tenant_domains ADD CONSTRAINT tenant_domains_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_domains ADD CONSTRAINT tenant_domains_status_check CHECK (status = ANY (ARRAY['pending'::text, 'verified'::text, 'active'::text, 'failed'::text, 'disabled'::text]));

ALTER TABLE ONLY public.tenant_domains ADD CONSTRAINT tenant_domains_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_feature_flags ADD CONSTRAINT tenant_feature_flags_pkey PRIMARY KEY (tenant_id, feature_key);

ALTER TABLE ONLY public.tenant_feature_flags ADD CONSTRAINT tenant_feature_flags_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_email_format CHECK (length(email) >= 3 AND length(email) <= 254 AND email = lower(btrim(email)) AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'::text);

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_expiry CHECK (expires_at > created_at);

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_role_check CHECK (role = ANY (ARRAY['creator'::text, 'client'::text, 'employee'::text, 'partner'::text, 'tenant_admin'::text]));

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_send_count_check CHECK (send_count >= 1 AND send_count <= 25);

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_status_check CHECK (status = ANY (ARRAY['invited'::text, 'accepted'::text, 'expired'::text, 'revoked'::text]));

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_invitations ADD CONSTRAINT tenant_invitations_token_hash CHECK (token_hash ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE ONLY public.tenant_memberships ADD CONSTRAINT tenant_memberships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenant_memberships ADD CONSTRAINT tenant_memberships_role_check CHECK (role = ANY (ARRAY['super_admin'::text, 'tenant_admin'::text, 'creator'::text, 'client'::text, 'employee'::text, 'partner'::text]));

ALTER TABLE ONLY public.tenant_memberships ADD CONSTRAINT tenant_memberships_status_check CHECK (status = ANY (ARRAY['invited'::text, 'active'::text, 'suspended'::text, 'revoked'::text]));

ALTER TABLE ONLY public.tenant_memberships ADD CONSTRAINT tenant_memberships_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_memberships ADD CONSTRAINT tenant_memberships_tenant_id_user_id_role_key UNIQUE (tenant_id, user_id, role);

ALTER TABLE ONLY public.tenant_memberships ADD CONSTRAINT tenant_memberships_tenant_user_key UNIQUE (tenant_id, user_id);

ALTER TABLE ONLY public.tenant_memberships ADD CONSTRAINT tenant_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenant_settings ADD CONSTRAINT tenant_settings_pkey PRIMARY KEY (tenant_id, key);

ALTER TABLE ONLY public.tenant_settings ADD CONSTRAINT tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tenants ADD CONSTRAINT tenants_default_locale_check CHECK (default_locale = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.tenants ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.tenants ADD CONSTRAINT tenants_status_check CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'archived'::text]));

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_id_source_type_source_id_key UNIQUE (id, source_type, source_id);

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_previous_source_revision_id_fkey FOREIGN KEY (previous_source_revision_id) REFERENCES translation_source_revisions(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_source_fingerprint_check CHECK (btrim(source_fingerprint) <> ''::text);

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_source_id_check CHECK (btrim(source_id) <> ''::text);

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_source_locale_check CHECK (source_locale = 'ar'::text);

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_source_snapshot_check CHECK (jsonb_typeof(source_snapshot) = 'object'::text);

ALTER TABLE ONLY public.translation_source_revisions ADD CONSTRAINT translation_source_revisions_source_type_check CHECK (source_type = ANY (ARRAY['programs'::text, 'pages'::text, 'sections'::text, 'faqs'::text, 'knowledge_base'::text, 'partners'::text, 'jobs'::text, 'reviews'::text, 'success_stories'::text, 'gallery_items'::text, 'announcements'::text, 'services'::text, 'legal_pages'::text]));

ALTER TABLE ONLY public.trash_items ADD CONSTRAINT trash_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_sessions ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_sessions ADD CONSTRAINT user_sessions_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.user_sessions ADD CONSTRAINT user_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.user_sessions ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.users ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE ONLY public.users ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.version_history ADD CONSTRAINT version_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.visual_experience_settings ADD CONSTRAINT visual_experience_public_requires_approval_check CHECK (apply_to_public = false OR status = 'approved'::text AND approved_by IS NOT NULL AND approved_at IS NOT NULL);

ALTER TABLE ONLY public.visual_experience_settings ADD CONSTRAINT visual_experience_settings_background_check CHECK (background = ANY (ARRAY['royal'::text, 'hepta'::text, 'gold'::text, 'nebula'::text, 'global-luxury-aurora'::text, 'classic-purple-agency'::text, 'royal-creator-waves'::text, 'golden-network-pulse'::text, 'galaxy-agency-flow'::text, 'live-streaming-signal'::text, 'premium-glass-orbits'::text, 'digital-stage-lights'::text]));

ALTER TABLE ONLY public.visual_experience_settings ADD CONSTRAINT visual_experience_settings_motion_check CHECK (motion = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]));

ALTER TABLE ONLY public.visual_experience_settings ADD CONSTRAINT visual_experience_settings_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.visual_experience_settings ADD CONSTRAINT visual_experience_settings_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'approved'::text, 'archived'::text]));

ALTER TABLE ONLY public.whatsapp_templates ADD CONSTRAINT whatsapp_templates_locale_check CHECK (locale = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.whatsapp_templates ADD CONSTRAINT whatsapp_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.whatsapp_templates ADD CONSTRAINT whatsapp_templates_status_check CHECK (status = ANY (ARRAY['draft'::text, 'approved'::text, 'disabled'::text]));

ALTER TABLE ONLY public.whatsapp_templates ADD CONSTRAINT whatsapp_templates_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.whatsapp_templates ADD CONSTRAINT whatsapp_templates_tenant_id_template_key_locale_key UNIQUE (tenant_id, template_key, locale);

ALTER TABLE ONLY public.white_label_projects ADD CONSTRAINT white_label_projects_default_language_check CHECK (default_language = ANY (ARRAY['ar'::text, 'en'::text, 'tr'::text]));

ALTER TABLE ONLY public.white_label_projects ADD CONSTRAINT white_label_projects_package_type_check CHECK (package_type = ANY (ARRAY['standard'::text, 'premium'::text, 'enterprise'::text]));

ALTER TABLE ONLY public.white_label_projects ADD CONSTRAINT white_label_projects_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.white_label_projects ADD CONSTRAINT white_label_projects_status_check CHECK (status = ANY (ARRAY['draft'::text, 'review'::text, 'ready'::text, 'archived'::text]));

ALTER TABLE ONLY public.workflow_definitions ADD CONSTRAINT workflow_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.workflow_definitions ADD CONSTRAINT workflow_definitions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workflow_definitions ADD CONSTRAINT workflow_definitions_status_check CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]));

ALTER TABLE ONLY public.workflow_definitions ADD CONSTRAINT workflow_definitions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workflow_definitions ADD CONSTRAINT workflow_definitions_tenant_id_name_version_key UNIQUE (tenant_id, name, version);

ALTER TABLE ONLY public.workflow_events ADD CONSTRAINT workflow_events_event_type_check CHECK (event_type = ANY (ARRAY['queued'::text, 'started'::text, 'waiting'::text, 'retried'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]));

ALTER TABLE ONLY public.workflow_events ADD CONSTRAINT workflow_events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workflow_events ADD CONSTRAINT workflow_events_run_id_fkey FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workflow_events ADD CONSTRAINT workflow_events_step_id_fkey FOREIGN KEY (step_id) REFERENCES workflow_steps(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.workflow_events ADD CONSTRAINT workflow_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workflow_events ADD CONSTRAINT workflow_events_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);

ALTER TABLE ONLY public.workflow_runs ADD CONSTRAINT workflow_runs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workflow_runs ADD CONSTRAINT workflow_runs_status_check CHECK (status = ANY (ARRAY['queued'::text, 'running'::text, 'waiting'::text, 'completed'::text, 'failed'::text, 'cancelled'::text]));

ALTER TABLE ONLY public.workflow_runs ADD CONSTRAINT workflow_runs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workflow_runs ADD CONSTRAINT workflow_runs_tenant_id_idempotency_key_key UNIQUE (tenant_id, idempotency_key);

ALTER TABLE ONLY public.workflow_runs ADD CONSTRAINT workflow_runs_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id);

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_position_check CHECK ("position" >= 0);

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_retry_limit_check CHECK (retry_limit >= 0 AND retry_limit <= 10);

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_step_type_check CHECK (step_type = ANY (ARRAY['assign_role'::text, 'create_task'::text, 'notify'::text, 'wait'::text, 'condition'::text, 'escalate'::text, 'complete'::text]));

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_timeout_seconds_check CHECK (timeout_seconds IS NULL OR timeout_seconds >= 1 AND timeout_seconds <= 86400);

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_workflow_id_position_key UNIQUE (workflow_id, "position");

ALTER TABLE ONLY public.workflow_steps ADD CONSTRAINT workflow_steps_workflow_id_step_key_key UNIQUE (workflow_id, step_key);

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;

ALTER SEQUENCE public.admin_users_id_seq OWNED BY public.admin_users.id;

ALTER SEQUENCE public.agency_applications_id_seq OWNED BY public.agency_applications.id;

ALTER SEQUENCE public.ai_conversations_id_seq OWNED BY public.ai_conversations.id;

ALTER SEQUENCE public.ai_unanswered_questions_id_seq OWNED BY public.ai_unanswered_questions.id;

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;

ALTER SEQUENCE public.contact_messages_id_seq OWNED BY public.contact_messages.id;

ALTER SEQUENCE public.faqs_id_seq OWNED BY public.faqs.id;

ALTER SEQUENCE public.gallery_items_id_seq OWNED BY public.gallery_items.id;

ALTER SEQUENCE public.job_applications_id_seq OWNED BY public.job_applications.id;

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;

ALTER SEQUENCE public.knowledge_base_id_seq OWNED BY public.knowledge_base.id;

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;

ALTER SEQUENCE public.partners_id_seq OWNED BY public.partners.id;

ALTER SEQUENCE public.permissions_id_seq OWNED BY public.permissions.id;

ALTER SEQUENCE public.program_admins_id_seq OWNED BY public.program_admins.id;

ALTER SEQUENCE public.program_pages_id_seq OWNED BY public.program_pages.id;

ALTER SEQUENCE public.programs_id_seq OWNED BY public.programs.id;

ALTER SEQUENCE public.provider_health_checks_id_seq OWNED BY public.provider_health_checks.id;

ALTER SEQUENCE public.redirects_id_seq OWNED BY public.redirects.id;

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;

ALTER SEQUENCE public.role_permissions_id_seq OWNED BY public.role_permissions.id;

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;

ALTER SEQUENCE public.section_templates_id_seq OWNED BY public.section_templates.id;

ALTER SEQUENCE public.sections_id_seq OWNED BY public.sections.id;

ALTER SEQUENCE public.service_requests_id_seq OWNED BY public.service_requests.id;

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;

ALTER SEQUENCE public.settings_id_seq OWNED BY public.settings.id;

ALTER SEQUENCE public.success_stories_id_seq OWNED BY public.success_stories.id;

ALTER SEQUENCE public.task_status_history_id_seq OWNED BY public.task_status_history.id;

ALTER SEQUENCE public.tenant_admin_audit_id_seq OWNED BY public.tenant_admin_audit.id;

ALTER SEQUENCE public.trash_items_id_seq OWNED BY public.trash_items.id;

ALTER SEQUENCE public.version_history_id_seq OWNED BY public.version_history.id;

CREATE INDEX activity_logs_tenant_idx ON public.activity_logs USING btree (tenant_id);

CREATE INDEX admin_permissions_admin_email_idx ON public.admin_permissions USING btree (lower(admin_email));

CREATE INDEX admin_permissions_admin_user_id_idx ON public.admin_permissions USING btree (admin_user_id);

CREATE UNIQUE INDEX admin_permissions_admin_user_module_uidx ON public.admin_permissions USING btree (admin_user_id, module_key) WHERE (admin_user_id IS NOT NULL);

CREATE UNIQUE INDEX admin_permissions_email_module_unique ON public.admin_permissions USING btree (lower(admin_email), module_key);

CREATE INDEX admin_permissions_module_key_idx ON public.admin_permissions USING btree (module_key);

CREATE UNIQUE INDEX admin_users_user_id_unique_idx ON public.admin_users USING btree (user_id) WHERE (user_id IS NOT NULL);

CREATE INDEX agency_applications_created_at_idx ON public.agency_applications USING btree (created_at DESC);

CREATE INDEX agency_applications_tenant_idx ON public.agency_applications USING btree (tenant_id);

CREATE UNIQUE INDEX agency_applications_tracking_code_uidx ON public.agency_applications USING btree (tracking_code);

CREATE INDEX ai_conversations_created_at_idx ON public.ai_conversations USING btree (created_at DESC);

CREATE INDEX ai_conversations_escalated_idx ON public.ai_conversations USING btree (escalated);

CREATE INDEX ai_conversations_session_idx ON public.ai_conversations USING btree (session_id);

CREATE INDEX ai_conversations_status_idx ON public.ai_conversations USING btree (status);

CREATE INDEX ai_messages_session_id_idx ON public.ai_messages USING btree (session_id);

CREATE INDEX ai_sessions_tenant_id_idx ON public.ai_sessions USING btree (tenant_id);

CREATE INDEX ai_sessions_user_id_idx ON public.ai_sessions USING btree (user_id);

CREATE INDEX ai_unanswered_questions_created_at_idx ON public.ai_unanswered_questions USING btree (created_at DESC);

CREATE INDEX ai_unanswered_questions_status_idx ON public.ai_unanswered_questions USING btree (status);

CREATE INDEX announcements_tenant_idx ON public.announcements USING btree (tenant_id);

CREATE INDEX backups_tenant_idx ON public.backups USING btree (tenant_id);

CREATE INDEX communication_consents_tenant_user_idx ON public.communication_consents USING btree (tenant_id, user_id, channel, opted_in);

CREATE INDEX communication_consents_user_id_idx ON public.communication_consents USING btree (user_id);

CREATE INDEX consent_records_tenant_id_idx ON public.consent_records USING btree (tenant_id);

CREATE INDEX consent_records_user_id_idx ON public.consent_records USING btree (user_id);

CREATE INDEX contact_messages_created_at_idx ON public.contact_messages USING btree (created_at DESC);

CREATE INDEX contact_messages_status_idx ON public.contact_messages USING btree (status);

CREATE INDEX contact_messages_tenant_idx ON public.contact_messages USING btree (tenant_id);

CREATE UNIQUE INDEX contact_messages_tracking_code_uidx ON public.contact_messages USING btree (tracking_code);

CREATE INDEX content_translation_revision_fields_created_by_idx ON public.content_translation_revision_fields USING btree (created_by);

CREATE INDEX content_translation_revision_fields_revision_idx ON public.content_translation_revision_fields USING btree (translation_revision_id, field_name);

CREATE INDEX content_translation_revision_fields_updated_by_idx ON public.content_translation_revision_fields USING btree (updated_by);

CREATE INDEX content_translation_revisions_created_by_idx ON public.content_translation_revisions USING btree (created_by);

CREATE INDEX content_translation_revisions_lookup_idx ON public.content_translation_revisions USING btree (source_type, source_id, language, workflow_status, created_at DESC);

CREATE UNIQUE INDEX content_translation_revisions_one_active_candidate_idx ON public.content_translation_revisions USING btree (source_revision_id, language) WHERE ((workflow_status = ANY (ARRAY['draft'::text, 'needs_review'::text, 'reviewed'::text])) AND (is_stale = false));

CREATE UNIQUE INDEX content_translation_revisions_one_published_idx ON public.content_translation_revisions USING btree (source_type, source_id, language) WHERE (workflow_status = 'published'::text);

CREATE INDEX content_translation_revisions_published_by_idx ON public.content_translation_revisions USING btree (published_by);

CREATE INDEX content_translation_revisions_reviewed_by_idx ON public.content_translation_revisions USING btree (reviewed_by);

CREATE INDEX content_translation_revisions_source_revision_fk_idx ON public.content_translation_revisions USING btree (source_revision_id, source_type, source_id);

CREATE INDEX content_translation_revisions_source_revision_idx ON public.content_translation_revisions USING btree (source_revision_id, language, created_at DESC);

CREATE INDEX content_translation_revisions_supersedes_idx ON public.content_translation_revisions USING btree (supersedes_translation_revision_id);

CREATE INDEX content_translations_admin_lookup_idx ON public.content_translations USING btree (source_type, language, status, updated_at DESC);

CREATE INDEX content_translations_public_lookup_idx ON public.content_translations USING btree (source_type, source_id, language, field_name) WHERE (is_published = true);

CREATE INDEX faqs_category_idx ON public.faqs USING btree (category);

CREATE INDEX gallery_items_public_idx ON public.gallery_items USING btree (status, is_visible, sort_order);

CREATE UNIQUE INDEX gallery_items_slug_unique_idx ON public.gallery_items USING btree (slug);

CREATE INDEX gallery_items_tenant_idx ON public.gallery_items USING btree (tenant_id);

CREATE INDEX incident_updates_created_by_idx ON public.incident_updates USING btree (created_by);

CREATE INDEX incident_updates_incident_id_idx ON public.incident_updates USING btree (incident_id);

CREATE INDEX incident_updates_tenant_id_idx ON public.incident_updates USING btree (tenant_id);

CREATE INDEX incidents_owner_id_idx ON public.incidents USING btree (owner_id);

CREATE INDEX incidents_tenant_status_idx ON public.incidents USING btree (tenant_id, status, severity, started_at DESC);

CREATE INDEX job_applications_created_at_idx ON public.job_applications USING btree (created_at DESC);

CREATE INDEX job_applications_job_id_idx ON public.job_applications USING btree (job_id);

CREATE INDEX job_applications_status_idx ON public.job_applications USING btree (status);

CREATE INDEX job_applications_tenant_idx ON public.job_applications USING btree (tenant_id);

CREATE UNIQUE INDEX job_applications_tracking_code_uidx ON public.job_applications USING btree (tracking_code);

CREATE INDEX jobs_status_idx ON public.jobs USING btree (status);

CREATE INDEX jobs_tenant_idx ON public.jobs USING btree (tenant_id);

CREATE INDEX knowledge_base_category_idx ON public.knowledge_base USING btree (category);

CREATE INDEX knowledge_base_created_at_idx ON public.knowledge_base USING btree (created_at DESC);

CREATE INDEX knowledge_base_is_published_idx ON public.knowledge_base USING btree (is_published);

CREATE INDEX knowledge_base_status_idx ON public.knowledge_base USING btree (status);

CREATE INDEX knowledge_base_tenant_idx ON public.knowledge_base USING btree (tenant_id);

CREATE INDEX legal_policy_versions_created_by_idx ON public.legal_policy_versions USING btree (created_by);

CREATE INDEX marketplace_cart_items_listing_id_idx ON public.marketplace_cart_items USING btree (listing_id);

CREATE INDEX marketplace_carts_user_id_idx ON public.marketplace_carts USING btree (user_id);

CREATE INDEX marketplace_disputes_opened_by_idx ON public.marketplace_disputes USING btree (opened_by);

CREATE INDEX marketplace_disputes_order_id_idx ON public.marketplace_disputes USING btree (order_id);

CREATE INDEX marketplace_disputes_tenant_id_idx ON public.marketplace_disputes USING btree (tenant_id);

CREATE INDEX marketplace_favorites_tenant_id_idx ON public.marketplace_favorites USING btree (tenant_id);

CREATE INDEX marketplace_favorites_user_id_idx ON public.marketplace_favorites USING btree (user_id);

CREATE INDEX marketplace_listing_translations_tenant_id_idx ON public.marketplace_listing_translations USING btree (tenant_id);

CREATE INDEX marketplace_listings_category_id_idx ON public.marketplace_listings USING btree (category_id);

CREATE INDEX marketplace_listings_partner_user_id_idx ON public.marketplace_listings USING btree (partner_user_id);

CREATE INDEX marketplace_listings_public_idx ON public.marketplace_listings USING btree (tenant_id, status, category_id, updated_at);

CREATE INDEX marketplace_order_items_listing_id_idx ON public.marketplace_order_items USING btree (listing_id);

CREATE INDEX marketplace_order_items_order_id_idx ON public.marketplace_order_items USING btree (order_id);

CREATE INDEX marketplace_order_items_tenant_id_idx ON public.marketplace_order_items USING btree (tenant_id);

CREATE INDEX marketplace_orders_client_user_id_idx ON public.marketplace_orders USING btree (client_user_id);

CREATE INDEX marketplace_orders_tenant_status_idx ON public.marketplace_orders USING btree (tenant_id, status, payment_status, created_at);

CREATE INDEX marketplace_reviews_order_id_idx ON public.marketplace_reviews USING btree (order_id);

CREATE INDEX marketplace_reviews_tenant_id_idx ON public.marketplace_reviews USING btree (tenant_id);

CREATE INDEX marketplace_reviews_user_id_idx ON public.marketplace_reviews USING btree (user_id);

CREATE INDEX media_tenant_idx ON public.media USING btree (tenant_id);

CREATE UNIQUE INDEX notifications_event_key_uidx ON public.notifications USING btree (event_key) WHERE (event_key IS NOT NULL);

CREATE INDEX notifications_inbox_idx ON public.notifications USING btree (is_deleted, is_archived, is_read, occurred_at DESC);

CREATE UNIQUE INDEX notifications_recipient_key_uidx ON public.notifications USING btree (lower(recipient_email), notification_key) WHERE ((recipient_email IS NOT NULL) AND (notification_key IS NOT NULL));

CREATE UNIQUE INDEX notifications_tenant_event_uidx ON public.notifications USING btree (tenant_id, event_key) WHERE ((tenant_id IS NOT NULL) AND (event_key IS NOT NULL));

CREATE INDEX notifications_tenant_idx ON public.notifications USING btree (tenant_id);

CREATE INDEX notifications_tenant_unread_idx ON public.notifications USING btree (tenant_id, recipient_user_id, is_read, created_at DESC) WHERE (is_deleted = false);

CREATE INDEX operations_preflight_backups_created_at_idx ON public.operations_preflight_backups USING btree (created_at DESC);

CREATE UNIQUE INDEX operations_preflight_backups_migration_key_uidx ON public.operations_preflight_backups USING btree (project_ref, migration_key);

CREATE INDEX page_builder_sections_page_order_idx ON public.page_builder_sections USING btree (page_id, language, is_visible, sort_order);

CREATE INDEX page_builder_sections_type_idx ON public.page_builder_sections USING btree (section_type);

CREATE INDEX pages_include_in_sitemap_idx ON public.pages USING btree (include_in_sitemap);

CREATE INDEX pages_publishing_status_idx ON public.pages USING btree (publishing_status);

CREATE INDEX pages_robots_index_idx ON public.pages USING btree (robots_index);

CREATE INDEX pages_scheduled_publish_at_idx ON public.pages USING btree (scheduled_publish_at);

CREATE INDEX pages_scheduled_unpublish_at_idx ON public.pages USING btree (scheduled_unpublish_at);

CREATE INDEX pages_schema_type_idx ON public.pages USING btree (schema_type);

CREATE INDEX pages_seo_title_idx ON public.pages USING btree (seo_title);

CREATE UNIQUE INDEX pages_slug_unique_idx ON public.pages USING btree (slug);

CREATE INDEX pages_tenant_idx ON public.pages USING btree (tenant_id);

CREATE UNIQUE INDEX partners_slug_unique_idx ON public.partners USING btree (slug);

CREATE INDEX partners_sort_order_idx ON public.partners USING btree (sort_order);

CREATE INDEX partners_tenant_idx ON public.partners USING btree (tenant_id);

CREATE INDEX payment_intents_order_id_idx ON public.payment_intents USING btree (order_id);

CREATE INDEX payment_intents_provider_id_idx ON public.payment_intents USING btree (provider_id);

CREATE INDEX payment_refunds_created_by_idx ON public.payment_refunds USING btree (created_by);

CREATE INDEX payment_refunds_order_id_idx ON public.payment_refunds USING btree (order_id);

CREATE INDEX payment_refunds_tenant_id_idx ON public.payment_refunds USING btree (tenant_id);

CREATE INDEX payment_refunds_transaction_id_idx ON public.payment_refunds USING btree (transaction_id);

CREATE INDEX payment_transactions_intent_id_idx ON public.payment_transactions USING btree (intent_id);

CREATE INDEX portal_files_owner_user_id_idx ON public.portal_files USING btree (owner_user_id);

CREATE INDEX portal_files_tenant_id_idx ON public.portal_files USING btree (tenant_id);

CREATE INDEX portal_notification_preferences_user_id_idx ON public.portal_notification_preferences USING btree (user_id);

CREATE INDEX pr100_gateway_nonces_expires_at_idx ON public.pr100_gateway_nonces USING btree (expires_at);

CREATE INDEX privacy_requests_tenant_status_idx ON public.privacy_requests USING btree (tenant_id, status, due_at);

CREATE INDEX privacy_requests_user_id_idx ON public.privacy_requests USING btree (user_id);

CREATE INDEX product_kpi_daily_metric_idx ON public.product_kpi_daily USING btree (tenant_id, metric_date DESC, metric_key);

CREATE INDEX program_pages_program_id_idx ON public.program_pages USING btree (program_id);

CREATE INDEX programs_tenant_idx ON public.programs USING btree (tenant_id);

CREATE INDEX provider_health_latest_idx ON public.provider_health_checks USING btree (tenant_id, provider_type, checked_at DESC);

CREATE INDEX provider_message_events_user_id_idx ON public.provider_message_events USING btree (user_id);

CREATE INDEX public_lookup_guards_fingerprint_recent_idx ON public.public_lookup_guards USING btree (fingerprint_hash, created_at DESC);

CREATE INDEX public_lookup_guards_identity_recent_idx ON public.public_lookup_guards USING btree (lookup_type, identity_hash, created_at DESC);

CREATE INDEX public_submission_guards_identity_idx ON public.public_submission_guards USING btree (form_type, identity_hash, created_at DESC);

CREATE INDEX public_submission_guards_payload_idx ON public.public_submission_guards USING btree (form_type, payload_hash, created_at DESC);

CREATE INDEX push_subscriptions_active_user_idx ON public.push_subscriptions USING btree (tenant_id, user_id, active, last_used_at DESC);

CREATE INDEX push_subscriptions_user_id_idx ON public.push_subscriptions USING btree (user_id);

CREATE INDEX redirects_source_path_idx ON public.redirects USING btree (source_path);

CREATE INDEX restore_operations_tenant_idx ON public.restore_operations USING btree (tenant_id);

CREATE INDEX reviews_tenant_idx ON public.reviews USING btree (tenant_id);

CREATE INDEX role_permissions_permission_id_idx ON public.role_permissions USING btree (permission_id);

CREATE INDEX section_templates_active_sort_idx ON public.section_templates USING btree (is_active, sort_order);

CREATE INDEX section_templates_category_idx ON public.section_templates USING btree (category);

CREATE INDEX sections_is_visible_idx ON public.sections USING btree (is_visible);

CREATE INDEX sections_page_id_idx ON public.sections USING btree (page_id);

CREATE UNIQUE INDEX sections_page_language_key_uidx ON public.sections USING btree (page_id, language, section_key);

CREATE INDEX sections_page_slug_idx ON public.sections USING btree (page_slug);

CREATE INDEX sections_program_slug_idx ON public.sections USING btree (program_slug);

CREATE INDEX sections_publishing_status_idx ON public.sections USING btree (publishing_status);

CREATE INDEX sections_scheduled_publish_at_idx ON public.sections USING btree (scheduled_publish_at);

CREATE INDEX sections_scheduled_unpublish_at_idx ON public.sections USING btree (scheduled_unpublish_at);

CREATE INDEX sections_sort_order_idx ON public.sections USING btree (sort_order);

CREATE INDEX sections_tenant_idx ON public.sections USING btree (tenant_id);

CREATE INDEX security_alerts_user_created_idx ON public.security_alerts USING btree (tenant_id, user_id, created_at DESC);

CREATE INDEX security_alerts_user_id_idx ON public.security_alerts USING btree (user_id);

CREATE INDEX service_requests_created_at_idx ON public.service_requests USING btree (created_at DESC);

CREATE INDEX service_requests_status_idx ON public.service_requests USING btree (status);

CREATE INDEX service_requests_tenant_idx ON public.service_requests USING btree (tenant_id);

CREATE INDEX service_requests_whatsapp_idx ON public.service_requests USING btree (whatsapp);

CREATE INDEX services_category_idx ON public.services USING btree (category);

CREATE INDEX settings_group_name_idx ON public.settings USING btree (group_name);

CREATE INDEX settings_is_public_idx ON public.settings USING btree (is_public);

CREATE UNIQUE INDEX settings_setting_key_unique_idx ON public.settings USING btree (setting_key);

CREATE INDEX settings_sort_order_idx ON public.settings USING btree (sort_order);

CREATE INDEX sla_events_policy_id_idx ON public.sla_events USING btree (policy_id);

CREATE INDEX sla_events_tenant_deadline_idx ON public.sla_events USING btree (tenant_id, event_type, deadline_at);

CREATE INDEX sla_policies_tenant_id_idx ON public.sla_policies USING btree (tenant_id);

CREATE INDEX success_stories_tenant_idx ON public.success_stories USING btree (tenant_id);

CREATE INDEX task_assignments_tenant_user_idx ON public.task_assignments USING btree (tenant_id, user_id, assignment_type);

CREATE INDEX task_assignments_user_id_idx ON public.task_assignments USING btree (user_id);

CREATE INDEX task_attachments_task_id_idx ON public.task_attachments USING btree (task_id);

CREATE INDEX task_attachments_tenant_id_idx ON public.task_attachments USING btree (tenant_id);

CREATE INDEX task_attachments_uploaded_by_idx ON public.task_attachments USING btree (uploaded_by);

CREATE INDEX task_comments_author_id_idx ON public.task_comments USING btree (author_id);

CREATE INDEX task_comments_task_id_idx ON public.task_comments USING btree (task_id);

CREATE INDEX task_comments_tenant_task_idx ON public.task_comments USING btree (tenant_id, task_id, created_at);

CREATE INDEX task_status_history_changed_by_idx ON public.task_status_history USING btree (changed_by);

CREATE INDEX task_status_history_task_id_idx ON public.task_status_history USING btree (task_id);

CREATE INDEX task_status_history_tenant_id_idx ON public.task_status_history USING btree (tenant_id);

CREATE INDEX tasks_created_by_idx ON public.tasks USING btree (created_by);

CREATE INDEX tasks_sla_policy_id_idx ON public.tasks USING btree (sla_policy_id);

CREATE INDEX tasks_tenant_status_idx ON public.tasks USING btree (tenant_id, status, due_at);

CREATE INDEX tenant_admin_audit_actor_id_idx ON public.tenant_admin_audit USING btree (actor_id);

CREATE INDEX tenant_admin_audit_tenant_created_idx ON public.tenant_admin_audit USING btree (tenant_id, created_at DESC);

CREATE UNIQUE INDEX tenant_domains_lower_hostname_uidx ON public.tenant_domains USING btree (lower(hostname));

CREATE INDEX tenant_domains_tenant_status_idx ON public.tenant_domains USING btree (tenant_id, status, is_primary);

CREATE UNIQUE INDEX tenant_invitations_one_pending_email_uidx ON public.tenant_invitations USING btree (tenant_id, email) WHERE (status = 'invited'::text);

CREATE INDEX tenant_invitations_tenant_status_idx ON public.tenant_invitations USING btree (tenant_id, status, created_at DESC);

CREATE UNIQUE INDEX tenant_invitations_token_hash_uidx ON public.tenant_invitations USING btree (token_hash);

CREATE INDEX tenant_memberships_tenant_role_status_idx ON public.tenant_memberships USING btree (tenant_id, role, status, user_id);

CREATE INDEX tenant_memberships_user_idx ON public.tenant_memberships USING btree (user_id, tenant_id, status);

CREATE UNIQUE INDEX tenants_id_slug_uidx ON public.tenants USING btree (id, slug);

CREATE UNIQUE INDEX tenants_single_primary_idx ON public.tenants USING btree (is_primary) WHERE is_primary;

CREATE INDEX translation_source_revisions_created_by_idx ON public.translation_source_revisions USING btree (created_by);

CREATE INDEX translation_source_revisions_fingerprint_idx ON public.translation_source_revisions USING btree (source_type, source_id, source_fingerprint);

CREATE INDEX translation_source_revisions_lookup_idx ON public.translation_source_revisions USING btree (source_type, source_id, created_at DESC);

CREATE INDEX translation_source_revisions_previous_idx ON public.translation_source_revisions USING btree (previous_source_revision_id);

CREATE UNIQUE INDEX translation_source_revisions_source_fingerprint_idx ON public.translation_source_revisions USING btree (source_type, source_id, source_fingerprint);

CREATE INDEX trash_items_item_idx ON public.trash_items USING btree (item_type, item_id);

CREATE UNIQUE INDEX user_sessions_active_auth_session_uidx ON public.user_sessions USING btree (tenant_id, user_id, auth_session_id) WHERE ((auth_session_id IS NOT NULL) AND (revoked_at IS NULL));

CREATE INDEX user_sessions_active_idx ON public.user_sessions USING btree (tenant_id, user_id, last_active_at DESC) WHERE (revoked_at IS NULL);

CREATE INDEX user_sessions_revoked_by_idx ON public.user_sessions USING btree (revoked_by);

CREATE INDEX user_sessions_user_id_idx ON public.user_sessions USING btree (user_id);

CREATE INDEX users_email_idx ON public.users USING btree (email);

CREATE INDEX version_history_action_idx ON public.version_history USING btree (action);

CREATE INDEX version_history_created_at_idx ON public.version_history USING btree (created_at DESC);

CREATE INDEX version_history_entity_type_idx ON public.version_history USING btree (entity_type);

CREATE INDEX version_history_item_idx ON public.version_history USING btree (item_type, item_id);

CREATE INDEX version_history_page_created_idx ON public.version_history USING btree (page_id, created_at DESC) WHERE (page_id IS NOT NULL);

CREATE INDEX visual_experience_settings_public_idx ON public.visual_experience_settings USING btree (apply_to_public, updated_at DESC) WHERE (apply_to_public = true);

CREATE INDEX visual_experience_settings_status_idx ON public.visual_experience_settings USING btree (status, updated_at DESC);

CREATE INDEX white_label_projects_domain_idx ON public.white_label_projects USING btree (domain) WHERE (domain <> ''::text);

CREATE INDEX white_label_projects_status_idx ON public.white_label_projects USING btree (status, updated_at DESC);

CREATE INDEX workflow_definitions_created_by_idx ON public.workflow_definitions USING btree (created_by);

CREATE INDEX workflow_events_run_id_idx ON public.workflow_events USING btree (run_id);

CREATE INDEX workflow_events_step_id_idx ON public.workflow_events USING btree (step_id);

CREATE INDEX workflow_runs_tenant_status_idx ON public.workflow_runs USING btree (tenant_id, status, created_at);

CREATE INDEX workflow_runs_workflow_id_idx ON public.workflow_runs USING btree (workflow_id);

CREATE INDEX workflow_steps_tenant_id_idx ON public.workflow_steps USING btree (tenant_id);

CREATE OR REPLACE VIEW public.cms_pages_publish_status AS
 SELECT id,
    slug,
    title,
    is_published,
    publishing_status,
    scheduled_publish_at,
    scheduled_unpublish_at,
    last_published_at,
        CASE
            WHEN publishing_status = 'draft'::text THEN false
            WHEN publishing_status = 'archived'::text THEN false
            WHEN scheduled_publish_at IS NOT NULL AND scheduled_publish_at > now() THEN false
            WHEN scheduled_unpublish_at IS NOT NULL AND scheduled_unpublish_at <= now() THEN false
            WHEN COALESCE(is_published, true) = false THEN false
            ELSE true
        END AS is_currently_public,
    updated_at
   FROM pages;;

CREATE OR REPLACE VIEW public.cms_pages_seo_status AS
 SELECT id,
    slug,
    title,
    seo_title,
    seo_description,
    seo_keywords,
    og_title,
    og_description,
    og_image_url,
    twitter_title,
    twitter_description,
    twitter_image_url,
    canonical_url,
    robots_index,
    robots_follow,
    include_in_sitemap,
    sitemap_priority,
    sitemap_change_frequency,
    schema_type,
    schema_json,
        CASE
            WHEN seo_title IS NULL OR length(TRIM(BOTH FROM seo_title)) < 10 THEN false
            WHEN seo_description IS NULL OR length(TRIM(BOTH FROM seo_description)) < 50 THEN false
            WHEN canonical_url IS NULL OR length(TRIM(BOTH FROM canonical_url)) < 1 THEN false
            WHEN schema_type IS NULL OR length(TRIM(BOTH FROM schema_type)) < 1 THEN false
            ELSE true
        END AS seo_ready,
    updated_at
   FROM pages;;

CREATE OR REPLACE VIEW public.cms_sections_publish_status AS
 SELECT id,
    page_id,
    section_key,
    title,
    is_visible,
    publishing_status,
    scheduled_publish_at,
    scheduled_unpublish_at,
    last_published_at,
        CASE
            WHEN publishing_status = 'draft'::text THEN false
            WHEN publishing_status = 'archived'::text THEN false
            WHEN scheduled_publish_at IS NOT NULL AND scheduled_publish_at > now() THEN false
            WHEN scheduled_unpublish_at IS NOT NULL AND scheduled_unpublish_at <= now() THEN false
            WHEN COALESCE(is_visible, true) = false THEN false
            ELSE true
        END AS is_currently_public,
    updated_at
   FROM sections;;

CREATE OR REPLACE VIEW public.cms_settings_overview AS
 SELECT setting_key,
    setting_value,
    group_name,
    label_ar,
    label_en,
    description,
    input_type,
    sort_order,
    is_public,
    updated_at
   FROM settings
  ORDER BY group_name, sort_order, setting_key;;

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON activity_logs FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON admin_permissions FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER touch_admin_permissions_updated_at BEFORE UPDATE ON admin_permissions FOR EACH ROW EXECUTE FUNCTION touch_admin_permissions_updated_at();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON agency_applications FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_application_notification AFTER INSERT OR UPDATE OF status ON agency_applications FOR EACH ROW EXECUTE FUNCTION pr99_enqueue_notification();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON agency_applications FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER normalize_public_ai_conversation_insert_trigger BEFORE INSERT OR UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION normalize_public_ai_conversation_insert();

CREATE TRIGGER set_ai_conversations_updated_at BEFORE UPDATE ON ai_conversations FOR EACH ROW EXECUTE FUNCTION set_ai_support_updated_at();

CREATE TRIGGER set_ai_unanswered_questions_updated_at BEFORE UPDATE ON ai_unanswered_questions FOR EACH ROW EXECUTE FUNCTION set_ai_support_updated_at();

CREATE TRIGGER trg_ai_unanswered_questions_updated_at BEFORE UPDATE ON ai_unanswered_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invalidate_translations_after_announcement_change AFTER UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('announcements');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON announcements FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON backups FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON backups FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER pr100_touch_contact_message_updated_at BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION pr100_touch_request_updated_at();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON contact_messages FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER pr99_contact_notification AFTER INSERT ON contact_messages FOR EACH ROW EXECUTE FUNCTION pr99_contact_notification();

CREATE TRIGGER touch_content_translation_revision_fields_updated_at BEFORE UPDATE ON content_translation_revision_fields FOR EACH ROW EXECUTE FUNCTION touch_translation_revision_updated_at();

CREATE TRIGGER touch_content_translation_revisions_updated_at BEFORE UPDATE ON content_translation_revisions FOR EACH ROW EXECUTE FUNCTION touch_translation_revision_updated_at();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON content_translations FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER set_content_translations_updated_at BEFORE UPDATE ON content_translations FOR EACH ROW EXECUTE FUNCTION set_content_translations_updated_at();

CREATE TRIGGER invalidate_translations_after_faq_change AFTER UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('faqs');

CREATE TRIGGER trg_faqs_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invalidate_translations_after_gallery_item_change AFTER UPDATE ON gallery_items FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('gallery_items');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON gallery_items FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER incident_update_notification_trigger AFTER INSERT ON incident_updates FOR EACH ROW EXECUTE FUNCTION private.emit_product_notification();

CREATE TRIGGER pr100_touch_job_application_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION pr100_touch_request_updated_at();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON job_applications FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER pr99_job_application_notification AFTER INSERT OR UPDATE OF status ON job_applications FOR EACH ROW EXECUTE FUNCTION pr99_enqueue_notification();

CREATE TRIGGER trg_job_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invalidate_translations_after_job_change AFTER UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('jobs');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON jobs FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invalidate_translations_after_knowledge_change AFTER UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('knowledge_base');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON knowledge_base FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER set_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION set_knowledge_base_updated_at();

CREATE TRIGGER trg_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER marketplace_order_notification_trigger AFTER INSERT OR UPDATE OF status ON marketplace_orders FOR EACH ROW EXECUTE FUNCTION private.emit_product_notification();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON media FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER normalize_notification_state_row_trigger BEFORE INSERT OR UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION normalize_notification_state_row();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER set_page_builder_sections_updated_at BEFORE UPDATE ON page_builder_sections FOR EACH ROW EXECUTE FUNCTION set_page_builder_sections_updated_at();

CREATE TRIGGER invalidate_translations_after_page_change AFTER UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('pages');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON pages FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER invalidate_translations_after_partner_change AFTER UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('partners');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON partners FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER privacy_request_notification_trigger AFTER INSERT ON privacy_requests FOR EACH ROW EXECUTE FUNCTION private.emit_product_notification();

CREATE TRIGGER trg_program_pages_updated_at BEFORE UPDATE ON program_pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invalidate_translations_after_program_change AFTER UPDATE ON programs FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('programs');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON programs FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER trg_redirects_updated_at BEFORE UPDATE ON redirects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON restore_operations FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON restore_operations FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER invalidate_translations_after_review_change AFTER UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('reviews');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON reviews FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER invalidate_translations_after_section_change AFTER UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('sections');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON sections FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER trg_sections_updated_at BEFORE UPDATE ON sections FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER security_alert_notification_trigger AFTER INSERT ON security_alerts FOR EACH ROW EXECUTE FUNCTION private.emit_product_notification();

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON service_requests FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER pr99_service_notification AFTER INSERT OR UPDATE OF status ON service_requests FOR EACH ROW EXECUTE FUNCTION pr99_enqueue_notification();

CREATE TRIGGER trg_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE FUNCTION set_service_requests_updated_at();

CREATE TRIGGER trg_set_service_request_code_after_insert AFTER INSERT ON service_requests FOR EACH ROW EXECUTE FUNCTION set_service_request_code_after_insert();

CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER sla_event_notification_trigger AFTER INSERT ON sla_events FOR EACH ROW WHEN (new.event_type = ANY (ARRAY['warning'::text, 'breached'::text])) EXECUTE FUNCTION private.emit_product_notification();

CREATE TRIGGER invalidate_translations_after_success_story_change AFTER UPDATE ON success_stories FOR EACH ROW EXECUTE FUNCTION mark_translation_revisions_stale_on_source_change('success_stories');

CREATE TRIGGER pr101_assign_primary_tenant_trigger BEFORE INSERT ON success_stories FOR EACH ROW EXECUTE FUNCTION private.assign_primary_tenant();

CREATE TRIGGER trg_success_stories_updated_at BEFORE UPDATE ON success_stories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER task_assignment_notification_trigger AFTER INSERT ON task_assignments FOR EACH ROW EXECUTE FUNCTION private.emit_product_notification();

CREATE TRIGGER tasks_completion_timestamp_trigger BEFORE UPDATE OF status ON tasks FOR EACH ROW EXECUTE FUNCTION set_task_completion_timestamp();

CREATE TRIGGER tasks_status_history_after_trigger AFTER INSERT OR UPDATE OF status ON tasks FOR EACH ROW EXECUTE FUNCTION private.capture_task_status_history();

CREATE TRIGGER pr99_audit_mutation AFTER INSERT OR DELETE OR UPDATE ON trash_items FOR EACH ROW EXECUTE FUNCTION pr99_audit_mutation();

CREATE TRIGGER user_sessions_security_alert_trigger AFTER INSERT ON user_sessions FOR EACH ROW EXECUTE FUNCTION private.raise_new_session_alert();

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_version_history_updated_at BEFORE UPDATE ON version_history FOR EACH ROW EXECUTE FUNCTION set_version_history_updated_at();

CREATE TRIGGER set_visual_experience_settings_updated_at BEFORE UPDATE ON visual_experience_settings FOR EACH ROW EXECUTE FUNCTION set_visual_experience_settings_updated_at();

CREATE TRIGGER set_white_label_projects_updated_at BEFORE UPDATE ON white_label_projects FOR EACH ROW EXECUTE FUNCTION set_white_label_projects_updated_at();

ALTER TABLE private.invitation_rate_limits DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agency_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_knowledge_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ai_unanswered_questions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.communication_consents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.content_translation_revision_fields ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.content_translation_revisions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.legal_policy_versions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_cart_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_carts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_listing_translations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.operations_preflight_backups ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.page_builder_sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.portal_files ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.portal_notification_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.portal_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.pr100_gateway_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr100_gateway_nonces FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pr101_gateway_nonces ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_kpi_daily ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.program_admins ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.program_pages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_health_checks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.provider_message_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.public_lookup_guards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.public_submission_guards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.restore_operations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.section_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sla_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.task_status_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_admin_audit ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_domains ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.translation_source_revisions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.version_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.visual_experience_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.white_label_projects ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY allow_admins_activity_logs_insert ON public.activity_logs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_is_admin());

CREATE POLICY allow_admins_activity_logs_select ON public.activity_logs AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY admin_permissions_delete ON public.admin_permissions AS PERMISSIVE FOR DELETE TO authenticated USING (current_admin_is_super_admin());

CREATE POLICY admin_permissions_insert ON public.admin_permissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_admin_is_super_admin());

CREATE POLICY admin_permissions_select ON public.admin_permissions AS PERMISSIVE FOR SELECT TO authenticated USING ((current_admin_is_super_admin() OR (EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.id = admin_permissions.admin_user_id) AND (admin_user.user_id = ( SELECT auth.uid() AS uid)) AND (admin_user.is_active IS TRUE)))) OR ((admin_user_id IS NULL) AND (lower(admin_email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))))));

CREATE POLICY admin_permissions_update ON public.admin_permissions AS PERMISSIVE FOR UPDATE TO authenticated USING (current_admin_is_super_admin()) WITH CHECK (current_admin_is_super_admin());

CREATE POLICY "Active platform admins can read admin users" ON public.admin_users AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((user_id IS NULL) AND (lower(email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)))) OR is_active_platform_admin()));

CREATE POLICY allow_admins_application_select ON public.agency_applications AS PERMISSIVE FOR SELECT TO authenticated USING ((current_admin_has_module_permission('applications'::text, 'can_view'::text) AND (EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.is_active IS TRUE) AND ((admin_user.user_id = ( SELECT auth.uid() AS uid)) OR ((admin_user.user_id IS NULL) AND (lower(admin_user.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))))) AND ((admin_user.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text])) OR ((admin_user.role = 'program_admin'::text) AND (admin_user.assigned_program IS NOT NULL) AND (regexp_replace(lower(COALESCE(agency_applications.platform, ''::text)), '[^a-z0-9]'::text, ''::text, 'g'::text) = regexp_replace(lower(admin_user.assigned_program), '[^a-z0-9]'::text, ''::text, 'g'::text)))))))));

CREATE POLICY allow_admins_application_update ON public.agency_applications AS PERMISSIVE FOR UPDATE TO authenticated USING ((current_admin_has_module_permission('applications'::text, 'can_edit'::text) AND (EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.is_active IS TRUE) AND ((admin_user.user_id = ( SELECT auth.uid() AS uid)) OR ((admin_user.user_id IS NULL) AND (lower(admin_user.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))))) AND ((admin_user.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text])) OR ((admin_user.role = 'program_admin'::text) AND (admin_user.assigned_program IS NOT NULL) AND (regexp_replace(lower(COALESCE(agency_applications.platform, ''::text)), '[^a-z0-9]'::text, ''::text, 'g'::text) = regexp_replace(lower(admin_user.assigned_program), '[^a-z0-9]'::text, ''::text, 'g'::text))))))))) WITH CHECK ((current_admin_has_module_permission('applications'::text, 'can_edit'::text) AND (EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.is_active IS TRUE) AND ((admin_user.user_id = ( SELECT auth.uid() AS uid)) OR ((admin_user.user_id IS NULL) AND (lower(admin_user.email) = lower(COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text))))) AND ((admin_user.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text])) OR ((admin_user.role = 'program_admin'::text) AND (admin_user.assigned_program IS NOT NULL) AND (regexp_replace(lower(COALESCE(agency_applications.platform, ''::text)), '[^a-z0-9]'::text, ''::text, 'g'::text) = regexp_replace(lower(admin_user.assigned_program), '[^a-z0-9]'::text, ''::text, 'g'::text)))))))));

CREATE POLICY "Admins can delete ai conversations" ON public.ai_conversations AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can insert ai conversations" ON public.ai_conversations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can read ai conversations" ON public.ai_conversations AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can update ai conversations" ON public.ai_conversations AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins manage ai conversations" ON public.ai_conversations AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "tenant staff read ai knowledge" ON public.ai_knowledge_documents AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "users read own ai messages" ON public.ai_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM ai_sessions s
  WHERE ((s.id = ai_messages.session_id) AND ((s.user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(s.tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]))))));

CREATE POLICY "users read own ai sessions" ON public.ai_sessions AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "Admins can delete ai unanswered questions" ON public.ai_unanswered_questions AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can insert ai unanswered questions" ON public.ai_unanswered_questions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can read ai unanswered questions" ON public.ai_unanswered_questions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can update ai unanswered questions" ON public.ai_unanswered_questions AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins manage unanswered ai questions" ON public.ai_unanswered_questions AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY allow_admins_announcements_delete ON public.announcements AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_is_admin());

CREATE POLICY allow_admins_announcements_insert ON public.announcements AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_is_admin());

CREATE POLICY allow_admins_announcements_select ON public.announcements AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY allow_admins_announcements_update ON public.announcements AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE POLICY allow_public_announcements_select ON public.announcements AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_active = true) AND (show_on_homepage = true) AND ((start_date IS NULL) OR (start_date <= now())) AND ((end_date IS NULL) OR (end_date >= now()))));

CREATE POLICY "Admins can delete backups" ON public.backups AS PERMISSIVE FOR DELETE TO authenticated USING (is_active_admin());

CREATE POLICY "Admins can insert backups" ON public.backups AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_active_admin());

CREATE POLICY "Admins can update backups" ON public.backups AS PERMISSIVE FOR UPDATE TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Admins can view backups" ON public.backups AS PERMISSIVE FOR SELECT TO authenticated USING (is_active_admin());

CREATE POLICY "communication consent delete own" ON public.communication_consents AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "communication consent insert own" ON public.communication_consents AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "communication consent select" ON public.communication_consents AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "communication consent update own" ON public.communication_consents AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "deny direct consent record access" ON public.consent_records AS PERMISSIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Admins can read contact messages" ON public.contact_messages AS PERMISSIVE FOR SELECT TO authenticated USING (current_admin_has_module_permission('contact'::text, 'can_view'::text));

CREATE POLICY "Admins can update contact messages" ON public.contact_messages AS PERMISSIVE FOR UPDATE TO authenticated USING (current_admin_has_module_permission('contact'::text, 'can_edit'::text)) WITH CHECK (current_admin_has_module_permission('contact'::text, 'can_edit'::text));

CREATE POLICY "Translation revision admins read revision fields" ON public.content_translation_revision_fields AS PERMISSIVE FOR SELECT TO authenticated USING (is_translation_revision_admin());

CREATE POLICY "Translation revision admins read language revisions" ON public.content_translation_revisions AS PERMISSIVE FOR SELECT TO authenticated USING (is_translation_revision_admin());

CREATE POLICY "Active platform admins can insert content translations" ON public.content_translations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_active_platform_admin());

CREATE POLICY "Active platform admins can read content translations" ON public.content_translations AS PERMISSIVE FOR SELECT TO authenticated USING (is_active_platform_admin());

CREATE POLICY "Active platform admins can update content translations" ON public.content_translations AS PERMISSIVE FOR UPDATE TO authenticated USING (is_active_platform_admin()) WITH CHECK (is_active_platform_admin());

CREATE POLICY "Public can read published content translations" ON public.content_translations AS PERMISSIVE FOR SELECT TO  USING (((is_published = true) AND (status = 'published'::text)));

CREATE POLICY "Admins can manage faqs" ON public.faqs AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Admins manage faqs" ON public.faqs AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read published faqs" ON public.faqs AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_published = true));

CREATE POLICY "Admins can delete gallery items" ON public.gallery_items AS PERMISSIVE FOR DELETE TO authenticated USING (is_active_admin());

CREATE POLICY "Admins can insert gallery items" ON public.gallery_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_active_admin());

CREATE POLICY "Admins can read gallery items" ON public.gallery_items AS PERMISSIVE FOR SELECT TO authenticated USING (is_active_admin());

CREATE POLICY "Admins can update gallery items" ON public.gallery_items AS PERMISSIVE FOR UPDATE TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read visible gallery items" ON public.gallery_items AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (status = 'published'::text)));

CREATE POLICY "tenant admins manage incident updates" ON public.incident_updates AS PERMISSIVE FOR ALL TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant admins manage incidents" ON public.incidents AS PERMISSIVE FOR ALL TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "Admins manage job applications" ON public.job_applications AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Admins manage jobs" ON public.jobs AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read visible open jobs" ON public.jobs AS PERMISSIVE FOR SELECT TO anon USING (((is_visible IS TRUE) AND (status = 'open'::text)));

CREATE POLICY "Admins can delete knowledge base" ON public.knowledge_base AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can insert knowledge base" ON public.knowledge_base AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can read knowledge base" ON public.knowledge_base AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can update knowledge base" ON public.knowledge_base AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins manage knowledge base" ON public.knowledge_base AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read public knowledge base" ON public.knowledge_base AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_public = true) AND (status = 'published'::text)));

CREATE POLICY "anon reads published legal versions" ON public.legal_policy_versions AS PERMISSIVE FOR SELECT TO anon USING ((status = 'published'::text));

CREATE POLICY "authenticated reads legal versions" ON public.legal_policy_versions AS PERMISSIVE FOR SELECT TO authenticated USING (((status = 'published'::text) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "tenant admins delete legal versions" ON public.legal_policy_versions AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins insert legal versions" ON public.legal_policy_versions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins update legal versions" ON public.legal_policy_versions AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "cart items delete own" ON public.marketplace_cart_items AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "cart items insert own" ON public.marketplace_cart_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "cart items select own" ON public.marketplace_cart_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "cart items update own" ON public.marketplace_cart_items AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM marketplace_carts c
  WHERE ((c.id = marketplace_cart_items.cart_id) AND (c.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "owners manage active cart" ON public.marketplace_carts AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND current_user_has_tenant_role(tenant_id, ARRAY['client'::text, 'creator'::text, 'partner'::text, 'employee'::text, 'tenant_admin'::text, 'super_admin'::text])));

CREATE POLICY "anon reads active categories" ON public.marketplace_categories AS PERMISSIVE FOR SELECT TO anon USING ((active = true));

CREATE POLICY "authenticated reads tenant categories" ON public.marketplace_categories AS PERMISSIVE FOR SELECT TO authenticated USING (((active = true) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text])));

CREATE POLICY "tenant staff delete categories" ON public.marketplace_categories AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant staff insert categories" ON public.marketplace_categories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant staff update categories" ON public.marketplace_categories AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "clients open disputes" ON public.marketplace_disputes AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((opened_by = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM marketplace_orders o
  WHERE ((o.id = marketplace_disputes.order_id) AND (o.tenant_id = marketplace_disputes.tenant_id) AND (o.client_user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "disputes select" ON public.marketplace_disputes AS PERMISSIVE FOR SELECT TO authenticated USING (((opened_by = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text])));

CREATE POLICY "tenant staff update disputes" ON public.marketplace_disputes AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "users manage favorites" ON public.marketplace_favorites AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "anon reads published listing translations" ON public.marketplace_listing_translations AS PERMISSIVE FOR SELECT TO anon USING ((EXISTS ( SELECT 1
   FROM marketplace_listings l
  WHERE ((l.id = marketplace_listing_translations.listing_id) AND (l.status = 'published'::text)))));

CREATE POLICY "authenticated reads listing translations" ON public.marketplace_listing_translations AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM marketplace_listings l
  WHERE ((l.id = marketplace_listing_translations.listing_id) AND ((l.status = 'published'::text) OR (l.partner_user_id = ( SELECT auth.uid() AS uid)))))) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text])));

CREATE POLICY "tenant sellers delete translations" ON public.marketplace_listing_translations AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant sellers insert translations" ON public.marketplace_listing_translations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant sellers update translations" ON public.marketplace_listing_translations AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "anon reads published listings" ON public.marketplace_listings AS PERMISSIVE FOR SELECT TO anon USING ((status = 'published'::text));

CREATE POLICY "authenticated reads tenant listings" ON public.marketplace_listings AS PERMISSIVE FOR SELECT TO authenticated USING (((status = 'published'::text) OR (partner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "tenant sellers delete listings" ON public.marketplace_listings AS PERMISSIVE FOR DELETE TO authenticated USING (((partner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "tenant sellers insert listings" ON public.marketplace_listings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((partner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "tenant sellers update listings" ON public.marketplace_listings AS PERMISSIVE FOR UPDATE TO authenticated USING (((partner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]))) WITH CHECK (((partner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "order items delete staff" ON public.marketplace_order_items AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "order items insert" ON public.marketplace_order_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM marketplace_orders o
  WHERE ((o.id = marketplace_order_items.order_id) AND (o.tenant_id = marketplace_order_items.tenant_id) AND ((o.client_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(o.tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]))))));

CREATE POLICY "order items select" ON public.marketplace_order_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM marketplace_orders o
  WHERE ((o.id = marketplace_order_items.order_id) AND (o.tenant_id = marketplace_order_items.tenant_id) AND ((o.client_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(o.tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]))))));

CREATE POLICY "order items update staff" ON public.marketplace_order_items AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "clients create orders" ON public.marketplace_orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((client_user_id = ( SELECT auth.uid() AS uid)) AND current_user_has_tenant_role(tenant_id, ARRAY['client'::text, 'creator'::text, 'partner'::text, 'employee'::text, 'tenant_admin'::text, 'super_admin'::text])));

CREATE POLICY "tenant staff update orders" ON public.marketplace_orders AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "users read own orders" ON public.marketplace_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((client_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text])));

CREATE POLICY "anon reads published reviews" ON public.marketplace_reviews AS PERMISSIVE FOR SELECT TO anon USING ((status = 'published'::text));

CREATE POLICY "authenticated reads published reviews" ON public.marketplace_reviews AS PERMISSIVE FOR SELECT TO authenticated USING (((status = 'published'::text) OR (user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "verified buyers add reviews" ON public.marketplace_reviews AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM marketplace_orders o
  WHERE ((o.id = marketplace_reviews.order_id) AND (o.client_user_id = ( SELECT auth.uid() AS uid)) AND (o.status = 'fulfilled'::text))))));

CREATE POLICY allow_admins_media_delete ON public.media AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_is_admin());

CREATE POLICY allow_admins_media_insert ON public.media AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_is_admin());

CREATE POLICY allow_admins_media_select ON public.media AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY allow_admins_media_update ON public.media AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE POLICY allow_public_media_select ON public.media AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_active = true));

CREATE POLICY notifications_delete_top_admin ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated USING (((auth.uid() IS NOT NULL) AND current_admin_is_super_admin()));

CREATE POLICY notifications_insert_authorized_admin ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND current_user_is_admin() AND (recipient_email IS NOT NULL) AND ((length(btrim(recipient_email)) >= 3) AND (length(btrim(recipient_email)) <= 254)) AND (notification_key IS NOT NULL) AND ((length(btrim(notification_key)) >= 3) AND (length(btrim(notification_key)) <= 240))));

CREATE POLICY notifications_select_recipient_or_top_admin ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND ((recipient_user_id = auth.uid()) OR (lower(COALESCE(recipient_email, ''::text)) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR current_admin_is_super_admin())));

CREATE POLICY notifications_update_recipient_or_top_admin ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() IS NOT NULL) AND ((recipient_user_id = auth.uid()) OR (lower(COALESCE(recipient_email, ''::text)) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR current_admin_is_super_admin()))) WITH CHECK (((auth.uid() IS NOT NULL) AND ((recipient_user_id = auth.uid()) OR (lower(COALESCE(recipient_email, ''::text)) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))) OR current_admin_is_super_admin())));

CREATE POLICY "operations backups readable by active admins" ON public.operations_preflight_backups AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY "Active admins can delete page builder sections" ON public.page_builder_sections AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can insert page builder sections" ON public.page_builder_sections AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can read page builder sections" ON public.page_builder_sections AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can update page builder sections" ON public.page_builder_sections AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "public reads visible sections of published pages" ON public.page_builder_sections AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (EXISTS ( SELECT 1
   FROM pages page_record
  WHERE ((page_record.id = page_builder_sections.page_id) AND (page_record.is_published = true) AND (page_record.publishing_status = 'published'::text) AND ((page_record.scheduled_publish_at IS NULL) OR (page_record.scheduled_publish_at <= now())) AND ((page_record.scheduled_unpublish_at IS NULL) OR (page_record.scheduled_unpublish_at > now())))))));

CREATE POLICY "Admins can delete pages" ON public.pages AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can insert pages" ON public.pages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can read all pages" ON public.pages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can update pages" ON public.pages AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "admins read all pages" ON public.pages AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY "public reads published pages" ON public.pages AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_published = true) AND (publishing_status = 'published'::text) AND ((scheduled_publish_at IS NULL) OR (scheduled_publish_at <= now())) AND ((scheduled_unpublish_at IS NULL) OR (scheduled_unpublish_at > now()))));

CREATE POLICY "Admins can delete partners" ON public.partners AS PERMISSIVE FOR DELETE TO authenticated USING (is_active_admin());

CREATE POLICY "Admins can insert partners" ON public.partners AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_active_admin());

CREATE POLICY "Admins can read partners" ON public.partners AS PERMISSIVE FOR SELECT TO authenticated USING (is_active_admin());

CREATE POLICY "Admins can update partners" ON public.partners AS PERMISSIVE FOR UPDATE TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read visible partners" ON public.partners AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (status = 'published'::text)));

CREATE POLICY "users read own payment intents" ON public.payment_intents AS PERMISSIVE FOR SELECT TO authenticated USING ((current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM marketplace_orders o
  WHERE ((o.id = payment_intents.order_id) AND (o.client_user_id = ( SELECT auth.uid() AS uid)) AND (o.tenant_id = payment_intents.tenant_id))))));

CREATE POLICY "tenant admins insert disabled payment providers" ON public.payment_providers AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((mode = ANY (ARRAY['disabled'::text, 'manual'::text, 'sandbox'::text])) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "tenant admins read provider configuration" ON public.payment_providers AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins update nonlive payment providers" ON public.payment_providers AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (((mode = ANY (ARRAY['disabled'::text, 'manual'::text, 'sandbox'::text])) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "tenant staff manage refunds" ON public.payment_refunds AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant staff update refunds" ON public.payment_refunds AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "users read own refunds" ON public.payment_refunds AS PERMISSIVE FOR SELECT TO authenticated USING ((current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM marketplace_orders o
  WHERE ((o.id = payment_refunds.order_id) AND (o.client_user_id = ( SELECT auth.uid() AS uid)) AND (o.tenant_id = payment_refunds.tenant_id))))));

CREATE POLICY "users read own payment transactions" ON public.payment_transactions AS PERMISSIVE FOR SELECT TO authenticated USING ((current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM (payment_intents pi
     JOIN marketplace_orders o ON ((o.id = pi.order_id)))
  WHERE ((pi.id = payment_transactions.intent_id) AND (pi.tenant_id = payment_transactions.tenant_id) AND (o.client_user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "tenant staff read payment webhooks" ON public.payment_webhook_events AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "Admins manage permissions" ON public.permissions AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "portal files delete staff" ON public.portal_files AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "portal files insert" ON public.portal_files AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((((owner_user_id = ( SELECT auth.uid() AS uid)) AND current_user_has_tenant_role(tenant_id, ARRAY['creator'::text, 'client'::text, 'employee'::text, 'partner'::text, 'tenant_admin'::text, 'super_admin'::text])) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "portal files select" ON public.portal_files AS PERMISSIVE FOR SELECT TO authenticated USING (((owner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "portal files update" ON public.portal_files AS PERMISSIVE FOR UPDATE TO authenticated USING (((owner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]))) WITH CHECK (((owner_user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "notification preferences delete own" ON public.portal_notification_preferences AS PERMISSIVE FOR DELETE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notification preferences insert own" ON public.portal_notification_preferences AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "notification preferences select" ON public.portal_notification_preferences AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "notification preferences update own" ON public.portal_notification_preferences AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users insert own portal profile" ON public.portal_profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users read own portal profile" ON public.portal_profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "users update own portal profile" ON public.portal_profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "deny direct pr100 nonce access" ON public.pr100_gateway_nonces AS PERMISSIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "deny direct pr101 nonce access" ON public.pr101_gateway_nonces AS PERMISSIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "tenant staff update privacy requests" ON public.privacy_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "users create own privacy requests" ON public.privacy_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND current_user_has_tenant_role(tenant_id, ARRAY['creator'::text, 'client'::text, 'employee'::text, 'partner'::text, 'tenant_admin'::text, 'super_admin'::text])));

CREATE POLICY "users read own privacy requests" ON public.privacy_requests AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "tenant staff insert KPI" ON public.product_kpi_daily AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant staff read kpi" ON public.product_kpi_daily AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant staff update KPI" ON public.product_kpi_daily AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "Active platform admins can manage program admin mappings" ON public.program_admins AS PERMISSIVE FOR ALL TO authenticated USING (is_active_platform_admin()) WITH CHECK (is_active_platform_admin());

CREATE POLICY "Admins manage program pages" ON public.program_pages AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read published program pages" ON public.program_pages AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_published = true));

CREATE POLICY allow_authenticated_programs_manage ON public.programs AS PERMISSIVE FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE POLICY allow_public_programs_select ON public.programs AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (is_active = true)));

CREATE POLICY "provider health select" ON public.provider_health_checks AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant staff read provider events" ON public.provider_message_events AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "deny direct lookup guard access" ON public.public_lookup_guards AS PERMISSIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "submission guards readable by admins" ON public.public_submission_guards AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY "users manage own push subscriptions" ON public.push_subscriptions AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'creator'::text, 'client'::text, 'employee'::text, 'partner'::text])));

CREATE POLICY "Admins manage redirects" ON public.redirects AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read active redirects" ON public.redirects AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_active = true));

CREATE POLICY "restore operations readable by admins" ON public.restore_operations AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY "Admins manage reviews" ON public.reviews AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read published reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (status = 'published'::text)));

CREATE POLICY "Public can read visible reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (status = 'published'::text)));

CREATE POLICY "Admins manage role permissions" ON public.role_permissions AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Admins manage roles" ON public.roles AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Admins can delete section templates" ON public.section_templates AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can insert section templates" ON public.section_templates AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can read section templates" ON public.section_templates AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can update section templates" ON public.section_templates AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can delete sections" ON public.sections AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can insert sections" ON public.sections AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can read all sections" ON public.sections AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins can update sections" ON public.sections AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true)))));

CREATE POLICY "Admins manage sections" ON public.sections AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "public reads published visible sections" ON public.sections AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((((is_visible = true) AND (is_published = true) AND (publishing_status = 'published'::text) AND ((scheduled_publish_at IS NULL) OR (scheduled_publish_at <= now())) AND ((scheduled_unpublish_at IS NULL) OR (scheduled_unpublish_at > now()))) OR current_user_is_admin()));

CREATE POLICY "users acknowledge security alerts" ON public.security_alerts AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users read security alerts" ON public.security_alerts AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Admins can read service requests" ON public.service_requests AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY "Admins can update service requests" ON public.service_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE POLICY "Admins manage services" ON public.services AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read visible services" ON public.services AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (status = 'active'::text)));

CREATE POLICY allow_admins_settings_delete ON public.settings AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_is_admin());

CREATE POLICY allow_admins_settings_insert ON public.settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_is_admin());

CREATE POLICY allow_admins_settings_select ON public.settings AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_is_admin());

CREATE POLICY allow_admins_settings_update ON public.settings AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());

CREATE POLICY allow_public_settings_select ON public.settings AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((is_public = true));

CREATE POLICY "tenant staff create sla events" ON public.sla_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant staff read sla events" ON public.sla_events AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant staff manage sla policies" ON public.sla_policies AS PERMISSIVE FOR ALL TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "Admins can delete success stories" ON public.success_stories AS PERMISSIVE FOR DELETE TO authenticated USING (is_active_admin());

CREATE POLICY "Admins can insert success stories" ON public.success_stories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (is_active_admin());

CREATE POLICY "Admins can read success stories" ON public.success_stories AS PERMISSIVE FOR SELECT TO authenticated USING (is_active_admin());

CREATE POLICY "Admins can update success stories" ON public.success_stories AS PERMISSIVE FOR UPDATE TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Public can read published success stories" ON public.success_stories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (status = 'published'::text)));

CREATE POLICY "Public can read visible success stories" ON public.success_stories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((is_visible = true) AND (status = 'published'::text)));

CREATE POLICY "task assignments delete staff" ON public.task_assignments AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "task assignments insert staff" ON public.task_assignments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "task assignments select" ON public.task_assignments AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])));

CREATE POLICY "task assignments update staff" ON public.task_assignments AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "task participants add attachments" ON public.task_attachments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((uploaded_by = ( SELECT auth.uid() AS uid)) AND (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM task_assignments a
  WHERE ((a.task_id = task_attachments.task_id) AND (a.user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "task participants read attachments" ON public.task_attachments AS PERMISSIVE FOR SELECT TO authenticated USING ((current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM task_assignments a
  WHERE ((a.task_id = task_attachments.task_id) AND (a.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "task staff remove attachments" ON public.task_attachments AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "task participants add comments" ON public.task_comments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((author_id = ( SELECT auth.uid() AS uid)) AND (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM task_assignments a
  WHERE ((a.task_id = task_comments.task_id) AND (a.user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "task participants read comments" ON public.task_comments AS PERMISSIVE FOR SELECT TO authenticated USING ((current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM task_assignments a
  WHERE ((a.task_id = task_comments.task_id) AND (a.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "task participants read history" ON public.task_status_history AS PERMISSIVE FOR SELECT TO authenticated USING ((current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM task_assignments a
  WHERE ((a.task_id = task_status_history.task_id) AND (a.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "tasks delete staff" ON public.tasks AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tasks insert staff" ON public.tasks AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tasks select" ON public.tasks AS PERMISSIVE FOR SELECT TO authenticated USING ((current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]) OR (EXISTS ( SELECT 1
   FROM task_assignments ta
  WHERE ((ta.task_id = tasks.id) AND (ta.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "tasks update staff" ON public.tasks AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant admins read tenant audit" ON public.tenant_admin_audit AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins write tenant audit" ON public.tenant_admin_audit AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((actor_id = ( SELECT auth.uid() AS uid)) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "tenant branding delete admin" ON public.tenant_branding AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant branding insert admin" ON public.tenant_branding AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant branding select" ON public.tenant_branding AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'creator'::text, 'client'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant branding update admin" ON public.tenant_branding AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant domains delete admin" ON public.tenant_domains AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant domains insert admin" ON public.tenant_domains AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant domains select" ON public.tenant_domains AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant domains update admin" ON public.tenant_domains AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant flags delete admin" ON public.tenant_feature_flags AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant flags insert admin" ON public.tenant_feature_flags AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant flags select" ON public.tenant_feature_flags AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'creator'::text, 'client'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant flags update admin" ON public.tenant_feature_flags AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins read invitations" ON public.tenant_invitations AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins create memberships" ON public.tenant_memberships AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (private.can_manage_tenant_member(tenant_id, role));

CREATE POLICY "tenant admins update memberships" ON public.tenant_memberships AS PERMISSIVE FOR UPDATE TO authenticated USING (private.can_manage_tenant_member(tenant_id, role)) WITH CHECK (private.can_manage_tenant_member(tenant_id, role));

CREATE POLICY "users read own memberships" ON public.tenant_memberships AS PERMISSIVE FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = user_id) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "tenant public settings delete admin" ON public.tenant_settings AS PERMISSIVE FOR DELETE TO authenticated USING (((is_secret = false) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "tenant public settings insert admin" ON public.tenant_settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((is_secret = false) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "tenant public settings select admin" ON public.tenant_settings AS PERMISSIVE FOR SELECT TO authenticated USING (((is_secret = false) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "tenant public settings update admin" ON public.tenant_settings AS PERMISSIVE FOR UPDATE TO authenticated USING (((is_secret = false) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]))) WITH CHECK (((is_secret = false) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "members read own tenant" ON public.tenants AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'creator'::text, 'client'::text, 'employee'::text, 'partner'::text]));

CREATE POLICY "tenant admins update tenant" ON public.tenants AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "Translation revision admins read source revisions" ON public.translation_source_revisions AS PERMISSIVE FOR SELECT TO authenticated USING (is_translation_revision_admin());

CREATE POLICY "Active admins can insert trash items" ON public.trash_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Admins manage trash items" ON public.trash_items AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY trash_items_admin_select ON public.trash_items AS PERMISSIVE FOR SELECT TO authenticated USING (current_admin_can_read_operations());

CREATE POLICY "users read own sessions" ON public.user_sessions AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users register own sessions" ON public.user_sessions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'creator'::text, 'client'::text, 'employee'::text, 'partner'::text])));

CREATE POLICY "users revoke own sessions" ON public.user_sessions AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Admins manage users" ON public.users AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Admins can insert version history" ON public.version_history AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins can read version history" ON public.version_history AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users au
  WHERE ((lower(au.email) = lower((auth.jwt() ->> 'email'::text))) AND (au.is_active = true) AND (au.role = ANY (ARRAY['super_admin'::text, 'deputy_super_admin'::text]))))));

CREATE POLICY "Admins manage version history" ON public.version_history AS PERMISSIVE FOR ALL TO authenticated USING (is_active_admin()) WITH CHECK (is_active_admin());

CREATE POLICY "Active admins can delete visual experience settings" ON public.visual_experience_settings AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can insert visual experience settings" ON public.visual_experience_settings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can read visual experience settings" ON public.visual_experience_settings AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can update visual experience settings" ON public.visual_experience_settings AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Public can read approved visual experience settings" ON public.visual_experience_settings AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((apply_to_public = true) AND (status = 'approved'::text) AND (approved_by IS NOT NULL) AND (approved_at IS NOT NULL)));

CREATE POLICY "tenant admins delete whatsapp templates" ON public.whatsapp_templates AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins insert whatsapp templates" ON public.whatsapp_templates AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant admins update whatsapp templates" ON public.whatsapp_templates AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "whatsapp templates select" ON public.whatsapp_templates AS PERMISSIVE FOR SELECT TO authenticated USING ((((status = 'approved'::text) AND current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) OR current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])));

CREATE POLICY "Active admins can insert white label projects" ON public.white_label_projects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can read white label projects" ON public.white_label_projects AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "Active admins can update white label projects" ON public.white_label_projects AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM admin_users admin_user
  WHERE ((admin_user.email = (auth.jwt() ->> 'email'::text)) AND (admin_user.is_active = true)))));

CREATE POLICY "tenant admins manage workflows" ON public.workflow_definitions AS PERMISSIVE FOR ALL TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "tenant staff add workflow events" ON public.workflow_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant staff read workflow events" ON public.workflow_events AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "workflow runs delete" ON public.workflow_runs AS PERMISSIVE FOR DELETE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

CREATE POLICY "workflow runs insert" ON public.workflow_runs AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "workflow runs select" ON public.workflow_runs AS PERMISSIVE FOR SELECT TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "workflow runs update" ON public.workflow_runs AS PERMISSIVE FOR UPDATE TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text, 'employee'::text]));

CREATE POLICY "tenant admins manage workflow steps" ON public.workflow_steps AS PERMISSIVE FOR ALL TO authenticated USING (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text])) WITH CHECK (current_user_has_tenant_role(tenant_id, ARRAY['super_admin'::text, 'tenant_admin'::text]));

GRANT MAINTAIN ON TABLE public.activity_logs TO anon;

GRANT DELETE ON TABLE public.activity_logs TO authenticated;

GRANT INSERT ON TABLE public.activity_logs TO authenticated;

GRANT MAINTAIN ON TABLE public.activity_logs TO authenticated;

GRANT SELECT ON TABLE public.activity_logs TO authenticated;

GRANT UPDATE ON TABLE public.activity_logs TO authenticated;

GRANT DELETE ON TABLE public.activity_logs TO service_role;

GRANT INSERT ON TABLE public.activity_logs TO service_role;

GRANT MAINTAIN ON TABLE public.activity_logs TO service_role;

GRANT REFERENCES ON TABLE public.activity_logs TO service_role;

GRANT SELECT ON TABLE public.activity_logs TO service_role;

GRANT TRIGGER ON TABLE public.activity_logs TO service_role;

GRANT TRUNCATE ON TABLE public.activity_logs TO service_role;

GRANT UPDATE ON TABLE public.activity_logs TO service_role;

GRANT SELECT ON SEQUENCE public.activity_logs_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.activity_logs_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.activity_logs_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.admin_permissions TO anon;

GRANT DELETE ON TABLE public.admin_permissions TO authenticated;

GRANT INSERT ON TABLE public.admin_permissions TO authenticated;

GRANT MAINTAIN ON TABLE public.admin_permissions TO authenticated;

GRANT SELECT ON TABLE public.admin_permissions TO authenticated;

GRANT UPDATE ON TABLE public.admin_permissions TO authenticated;

GRANT MAINTAIN ON TABLE public.admin_permissions TO service_role;

GRANT REFERENCES ON TABLE public.admin_permissions TO service_role;

GRANT TRIGGER ON TABLE public.admin_permissions TO service_role;

GRANT TRUNCATE ON TABLE public.admin_permissions TO service_role;

GRANT MAINTAIN ON TABLE public.admin_users TO anon;

GRANT DELETE ON TABLE public.admin_users TO authenticated;

GRANT INSERT ON TABLE public.admin_users TO authenticated;

GRANT MAINTAIN ON TABLE public.admin_users TO authenticated;

GRANT SELECT ON TABLE public.admin_users TO authenticated;

GRANT UPDATE ON TABLE public.admin_users TO authenticated;

GRANT DELETE ON TABLE public.admin_users TO service_role;

GRANT INSERT ON TABLE public.admin_users TO service_role;

GRANT MAINTAIN ON TABLE public.admin_users TO service_role;

GRANT REFERENCES ON TABLE public.admin_users TO service_role;

GRANT SELECT ON TABLE public.admin_users TO service_role;

GRANT TRIGGER ON TABLE public.admin_users TO service_role;

GRANT TRUNCATE ON TABLE public.admin_users TO service_role;

GRANT UPDATE ON TABLE public.admin_users TO service_role;

GRANT SELECT ON SEQUENCE public.admin_users_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.admin_users_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.admin_users_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.agency_applications TO anon;

GRANT DELETE ON TABLE public.agency_applications TO authenticated;

GRANT MAINTAIN ON TABLE public.agency_applications TO authenticated;

GRANT SELECT ON TABLE public.agency_applications TO authenticated;

GRANT UPDATE ON TABLE public.agency_applications TO authenticated;

GRANT DELETE ON TABLE public.agency_applications TO service_role;

GRANT INSERT ON TABLE public.agency_applications TO service_role;

GRANT MAINTAIN ON TABLE public.agency_applications TO service_role;

GRANT REFERENCES ON TABLE public.agency_applications TO service_role;

GRANT SELECT ON TABLE public.agency_applications TO service_role;

GRANT TRIGGER ON TABLE public.agency_applications TO service_role;

GRANT TRUNCATE ON TABLE public.agency_applications TO service_role;

GRANT UPDATE ON TABLE public.agency_applications TO service_role;

GRANT SELECT ON SEQUENCE public.agency_applications_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.agency_applications_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.agency_applications_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_conversations TO anon;

GRANT DELETE ON TABLE public.ai_conversations TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_conversations TO authenticated;

GRANT SELECT ON TABLE public.ai_conversations TO authenticated;

GRANT UPDATE ON TABLE public.ai_conversations TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_conversations TO service_role;

GRANT REFERENCES ON TABLE public.ai_conversations TO service_role;

GRANT TRIGGER ON TABLE public.ai_conversations TO service_role;

GRANT TRUNCATE ON TABLE public.ai_conversations TO service_role;

GRANT SELECT ON SEQUENCE public.ai_conversations_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.ai_conversations_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.ai_conversations_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_knowledge_documents TO anon;

GRANT REFERENCES ON TABLE public.ai_knowledge_documents TO anon;

GRANT TRIGGER ON TABLE public.ai_knowledge_documents TO anon;

GRANT TRUNCATE ON TABLE public.ai_knowledge_documents TO anon;

GRANT MAINTAIN ON TABLE public.ai_knowledge_documents TO authenticated;

GRANT REFERENCES ON TABLE public.ai_knowledge_documents TO authenticated;

GRANT SELECT ON TABLE public.ai_knowledge_documents TO authenticated;

GRANT TRIGGER ON TABLE public.ai_knowledge_documents TO authenticated;

GRANT TRUNCATE ON TABLE public.ai_knowledge_documents TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_knowledge_documents TO service_role;

GRANT REFERENCES ON TABLE public.ai_knowledge_documents TO service_role;

GRANT TRIGGER ON TABLE public.ai_knowledge_documents TO service_role;

GRANT TRUNCATE ON TABLE public.ai_knowledge_documents TO service_role;

GRANT MAINTAIN ON TABLE public.ai_messages TO anon;

GRANT REFERENCES ON TABLE public.ai_messages TO anon;

GRANT TRIGGER ON TABLE public.ai_messages TO anon;

GRANT TRUNCATE ON TABLE public.ai_messages TO anon;

GRANT MAINTAIN ON TABLE public.ai_messages TO authenticated;

GRANT REFERENCES ON TABLE public.ai_messages TO authenticated;

GRANT SELECT ON TABLE public.ai_messages TO authenticated;

GRANT TRIGGER ON TABLE public.ai_messages TO authenticated;

GRANT TRUNCATE ON TABLE public.ai_messages TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_messages TO service_role;

GRANT REFERENCES ON TABLE public.ai_messages TO service_role;

GRANT TRIGGER ON TABLE public.ai_messages TO service_role;

GRANT TRUNCATE ON TABLE public.ai_messages TO service_role;

GRANT MAINTAIN ON TABLE public.ai_sessions TO anon;

GRANT REFERENCES ON TABLE public.ai_sessions TO anon;

GRANT TRIGGER ON TABLE public.ai_sessions TO anon;

GRANT TRUNCATE ON TABLE public.ai_sessions TO anon;

GRANT MAINTAIN ON TABLE public.ai_sessions TO authenticated;

GRANT REFERENCES ON TABLE public.ai_sessions TO authenticated;

GRANT SELECT ON TABLE public.ai_sessions TO authenticated;

GRANT TRIGGER ON TABLE public.ai_sessions TO authenticated;

GRANT TRUNCATE ON TABLE public.ai_sessions TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_sessions TO service_role;

GRANT REFERENCES ON TABLE public.ai_sessions TO service_role;

GRANT TRIGGER ON TABLE public.ai_sessions TO service_role;

GRANT TRUNCATE ON TABLE public.ai_sessions TO service_role;

GRANT MAINTAIN ON TABLE public.ai_unanswered_questions TO anon;

GRANT DELETE ON TABLE public.ai_unanswered_questions TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_unanswered_questions TO authenticated;

GRANT SELECT ON TABLE public.ai_unanswered_questions TO authenticated;

GRANT UPDATE ON TABLE public.ai_unanswered_questions TO authenticated;

GRANT MAINTAIN ON TABLE public.ai_unanswered_questions TO service_role;

GRANT REFERENCES ON TABLE public.ai_unanswered_questions TO service_role;

GRANT TRIGGER ON TABLE public.ai_unanswered_questions TO service_role;

GRANT TRUNCATE ON TABLE public.ai_unanswered_questions TO service_role;

GRANT SELECT ON SEQUENCE public.ai_unanswered_questions_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.ai_unanswered_questions_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.ai_unanswered_questions_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.announcements TO anon;

GRANT SELECT ON TABLE public.announcements TO anon;

GRANT DELETE ON TABLE public.announcements TO authenticated;

GRANT INSERT ON TABLE public.announcements TO authenticated;

GRANT MAINTAIN ON TABLE public.announcements TO authenticated;

GRANT SELECT ON TABLE public.announcements TO authenticated;

GRANT UPDATE ON TABLE public.announcements TO authenticated;

GRANT DELETE ON TABLE public.announcements TO service_role;

GRANT INSERT ON TABLE public.announcements TO service_role;

GRANT MAINTAIN ON TABLE public.announcements TO service_role;

GRANT REFERENCES ON TABLE public.announcements TO service_role;

GRANT SELECT ON TABLE public.announcements TO service_role;

GRANT TRIGGER ON TABLE public.announcements TO service_role;

GRANT TRUNCATE ON TABLE public.announcements TO service_role;

GRANT UPDATE ON TABLE public.announcements TO service_role;

GRANT SELECT ON SEQUENCE public.announcements_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.announcements_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.announcements_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.backups TO anon;

GRANT DELETE ON TABLE public.backups TO authenticated;

GRANT INSERT ON TABLE public.backups TO authenticated;

GRANT MAINTAIN ON TABLE public.backups TO authenticated;

GRANT SELECT ON TABLE public.backups TO authenticated;

GRANT UPDATE ON TABLE public.backups TO authenticated;

GRANT DELETE ON TABLE public.backups TO service_role;

GRANT INSERT ON TABLE public.backups TO service_role;

GRANT MAINTAIN ON TABLE public.backups TO service_role;

GRANT REFERENCES ON TABLE public.backups TO service_role;

GRANT SELECT ON TABLE public.backups TO service_role;

GRANT TRIGGER ON TABLE public.backups TO service_role;

GRANT TRUNCATE ON TABLE public.backups TO service_role;

GRANT UPDATE ON TABLE public.backups TO service_role;

GRANT SELECT ON SEQUENCE public.backups_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.backups_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.backups_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.cms_pages_publish_status TO anon;

GRANT MAINTAIN ON TABLE public.cms_pages_publish_status TO authenticated;

GRANT SELECT ON TABLE public.cms_pages_publish_status TO authenticated;

GRANT MAINTAIN ON TABLE public.cms_pages_publish_status TO service_role;

GRANT REFERENCES ON TABLE public.cms_pages_publish_status TO service_role;

GRANT TRIGGER ON TABLE public.cms_pages_publish_status TO service_role;

GRANT TRUNCATE ON TABLE public.cms_pages_publish_status TO service_role;

GRANT MAINTAIN ON TABLE public.cms_pages_seo_status TO anon;

GRANT MAINTAIN ON TABLE public.cms_pages_seo_status TO authenticated;

GRANT SELECT ON TABLE public.cms_pages_seo_status TO authenticated;

GRANT MAINTAIN ON TABLE public.cms_pages_seo_status TO service_role;

GRANT REFERENCES ON TABLE public.cms_pages_seo_status TO service_role;

GRANT TRIGGER ON TABLE public.cms_pages_seo_status TO service_role;

GRANT TRUNCATE ON TABLE public.cms_pages_seo_status TO service_role;

GRANT MAINTAIN ON TABLE public.cms_sections_publish_status TO anon;

GRANT MAINTAIN ON TABLE public.cms_sections_publish_status TO authenticated;

GRANT SELECT ON TABLE public.cms_sections_publish_status TO authenticated;

GRANT MAINTAIN ON TABLE public.cms_sections_publish_status TO service_role;

GRANT REFERENCES ON TABLE public.cms_sections_publish_status TO service_role;

GRANT TRIGGER ON TABLE public.cms_sections_publish_status TO service_role;

GRANT TRUNCATE ON TABLE public.cms_sections_publish_status TO service_role;

GRANT MAINTAIN ON TABLE public.cms_settings_overview TO anon;

GRANT MAINTAIN ON TABLE public.cms_settings_overview TO authenticated;

GRANT SELECT ON TABLE public.cms_settings_overview TO authenticated;

GRANT MAINTAIN ON TABLE public.cms_settings_overview TO service_role;

GRANT REFERENCES ON TABLE public.cms_settings_overview TO service_role;

GRANT TRIGGER ON TABLE public.cms_settings_overview TO service_role;

GRANT TRUNCATE ON TABLE public.cms_settings_overview TO service_role;

GRANT MAINTAIN ON TABLE public.communication_consents TO anon;

GRANT REFERENCES ON TABLE public.communication_consents TO anon;

GRANT TRIGGER ON TABLE public.communication_consents TO anon;

GRANT TRUNCATE ON TABLE public.communication_consents TO anon;

GRANT INSERT ON TABLE public.communication_consents TO authenticated;

GRANT MAINTAIN ON TABLE public.communication_consents TO authenticated;

GRANT REFERENCES ON TABLE public.communication_consents TO authenticated;

GRANT SELECT ON TABLE public.communication_consents TO authenticated;

GRANT TRIGGER ON TABLE public.communication_consents TO authenticated;

GRANT TRUNCATE ON TABLE public.communication_consents TO authenticated;

GRANT UPDATE ON TABLE public.communication_consents TO authenticated;

GRANT MAINTAIN ON TABLE public.communication_consents TO service_role;

GRANT REFERENCES ON TABLE public.communication_consents TO service_role;

GRANT TRIGGER ON TABLE public.communication_consents TO service_role;

GRANT TRUNCATE ON TABLE public.communication_consents TO service_role;

GRANT MAINTAIN ON TABLE public.consent_records TO anon;

GRANT REFERENCES ON TABLE public.consent_records TO anon;

GRANT TRIGGER ON TABLE public.consent_records TO anon;

GRANT TRUNCATE ON TABLE public.consent_records TO anon;

GRANT MAINTAIN ON TABLE public.consent_records TO authenticated;

GRANT REFERENCES ON TABLE public.consent_records TO authenticated;

GRANT TRIGGER ON TABLE public.consent_records TO authenticated;

GRANT TRUNCATE ON TABLE public.consent_records TO authenticated;

GRANT MAINTAIN ON TABLE public.consent_records TO service_role;

GRANT REFERENCES ON TABLE public.consent_records TO service_role;

GRANT TRIGGER ON TABLE public.consent_records TO service_role;

GRANT TRUNCATE ON TABLE public.consent_records TO service_role;

GRANT SELECT ON TABLE public.contact_messages TO authenticated;

GRANT UPDATE ON TABLE public.contact_messages TO authenticated;

GRANT MAINTAIN ON TABLE public.contact_messages TO service_role;

GRANT REFERENCES ON TABLE public.contact_messages TO service_role;

GRANT TRIGGER ON TABLE public.contact_messages TO service_role;

GRANT TRUNCATE ON TABLE public.contact_messages TO service_role;

GRANT SELECT ON SEQUENCE public.contact_messages_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.contact_messages_id_seq TO authenticated;

GRANT SELECT ON TABLE public.content_translation_revision_fields TO authenticated;

GRANT MAINTAIN ON TABLE public.content_translation_revision_fields TO service_role;

GRANT REFERENCES ON TABLE public.content_translation_revision_fields TO service_role;

GRANT TRIGGER ON TABLE public.content_translation_revision_fields TO service_role;

GRANT TRUNCATE ON TABLE public.content_translation_revision_fields TO service_role;

GRANT SELECT ON TABLE public.content_translation_revisions TO authenticated;

GRANT MAINTAIN ON TABLE public.content_translation_revisions TO service_role;

GRANT REFERENCES ON TABLE public.content_translation_revisions TO service_role;

GRANT TRIGGER ON TABLE public.content_translation_revisions TO service_role;

GRANT TRUNCATE ON TABLE public.content_translation_revisions TO service_role;

GRANT MAINTAIN ON TABLE public.content_translations TO anon;

GRANT SELECT ON TABLE public.content_translations TO anon;

GRANT INSERT ON TABLE public.content_translations TO authenticated;

GRANT MAINTAIN ON TABLE public.content_translations TO authenticated;

GRANT SELECT ON TABLE public.content_translations TO authenticated;

GRANT UPDATE ON TABLE public.content_translations TO authenticated;

GRANT MAINTAIN ON TABLE public.content_translations TO service_role;

GRANT REFERENCES ON TABLE public.content_translations TO service_role;

GRANT TRIGGER ON TABLE public.content_translations TO service_role;

GRANT TRUNCATE ON TABLE public.content_translations TO service_role;

GRANT MAINTAIN ON TABLE public.faqs TO anon;

GRANT SELECT ON TABLE public.faqs TO anon;

GRANT INSERT ON TABLE public.faqs TO authenticated;

GRANT MAINTAIN ON TABLE public.faqs TO authenticated;

GRANT SELECT ON TABLE public.faqs TO authenticated;

GRANT UPDATE ON TABLE public.faqs TO authenticated;

GRANT MAINTAIN ON TABLE public.faqs TO service_role;

GRANT REFERENCES ON TABLE public.faqs TO service_role;

GRANT TRIGGER ON TABLE public.faqs TO service_role;

GRANT TRUNCATE ON TABLE public.faqs TO service_role;

GRANT SELECT ON SEQUENCE public.faqs_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.faqs_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.faqs_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.gallery_items TO anon;

GRANT SELECT ON TABLE public.gallery_items TO anon;

GRANT DELETE ON TABLE public.gallery_items TO authenticated;

GRANT INSERT ON TABLE public.gallery_items TO authenticated;

GRANT MAINTAIN ON TABLE public.gallery_items TO authenticated;

GRANT SELECT ON TABLE public.gallery_items TO authenticated;

GRANT UPDATE ON TABLE public.gallery_items TO authenticated;

GRANT MAINTAIN ON TABLE public.gallery_items TO service_role;

GRANT REFERENCES ON TABLE public.gallery_items TO service_role;

GRANT TRIGGER ON TABLE public.gallery_items TO service_role;

GRANT TRUNCATE ON TABLE public.gallery_items TO service_role;

GRANT SELECT ON SEQUENCE public.gallery_items_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.gallery_items_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.gallery_items_id_seq TO authenticated;

GRANT DELETE ON TABLE public.incident_updates TO authenticated;

GRANT INSERT ON TABLE public.incident_updates TO authenticated;

GRANT MAINTAIN ON TABLE public.incident_updates TO authenticated;

GRANT REFERENCES ON TABLE public.incident_updates TO authenticated;

GRANT SELECT ON TABLE public.incident_updates TO authenticated;

GRANT TRIGGER ON TABLE public.incident_updates TO authenticated;

GRANT TRUNCATE ON TABLE public.incident_updates TO authenticated;

GRANT UPDATE ON TABLE public.incident_updates TO authenticated;

GRANT MAINTAIN ON TABLE public.incident_updates TO service_role;

GRANT REFERENCES ON TABLE public.incident_updates TO service_role;

GRANT TRIGGER ON TABLE public.incident_updates TO service_role;

GRANT TRUNCATE ON TABLE public.incident_updates TO service_role;

GRANT DELETE ON TABLE public.incidents TO authenticated;

GRANT INSERT ON TABLE public.incidents TO authenticated;

GRANT MAINTAIN ON TABLE public.incidents TO authenticated;

GRANT REFERENCES ON TABLE public.incidents TO authenticated;

GRANT SELECT ON TABLE public.incidents TO authenticated;

GRANT TRIGGER ON TABLE public.incidents TO authenticated;

GRANT TRUNCATE ON TABLE public.incidents TO authenticated;

GRANT UPDATE ON TABLE public.incidents TO authenticated;

GRANT MAINTAIN ON TABLE public.incidents TO service_role;

GRANT REFERENCES ON TABLE public.incidents TO service_role;

GRANT TRIGGER ON TABLE public.incidents TO service_role;

GRANT TRUNCATE ON TABLE public.incidents TO service_role;

GRANT MAINTAIN ON TABLE public.job_applications TO anon;

GRANT DELETE ON TABLE public.job_applications TO authenticated;

GRANT MAINTAIN ON TABLE public.job_applications TO authenticated;

GRANT SELECT ON TABLE public.job_applications TO authenticated;

GRANT UPDATE ON TABLE public.job_applications TO authenticated;

GRANT MAINTAIN ON TABLE public.job_applications TO service_role;

GRANT REFERENCES ON TABLE public.job_applications TO service_role;

GRANT TRIGGER ON TABLE public.job_applications TO service_role;

GRANT TRUNCATE ON TABLE public.job_applications TO service_role;

GRANT SELECT ON SEQUENCE public.job_applications_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.job_applications_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.job_applications_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.jobs TO anon;

GRANT SELECT ON TABLE public.jobs TO anon;

GRANT DELETE ON TABLE public.jobs TO authenticated;

GRANT INSERT ON TABLE public.jobs TO authenticated;

GRANT MAINTAIN ON TABLE public.jobs TO authenticated;

GRANT SELECT ON TABLE public.jobs TO authenticated;

GRANT UPDATE ON TABLE public.jobs TO authenticated;

GRANT MAINTAIN ON TABLE public.jobs TO service_role;

GRANT REFERENCES ON TABLE public.jobs TO service_role;

GRANT TRIGGER ON TABLE public.jobs TO service_role;

GRANT TRUNCATE ON TABLE public.jobs TO service_role;

GRANT SELECT ON SEQUENCE public.jobs_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.jobs_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.jobs_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.knowledge_base TO anon;

GRANT DELETE ON TABLE public.knowledge_base TO authenticated;

GRANT INSERT ON TABLE public.knowledge_base TO authenticated;

GRANT MAINTAIN ON TABLE public.knowledge_base TO authenticated;

GRANT SELECT ON TABLE public.knowledge_base TO authenticated;

GRANT UPDATE ON TABLE public.knowledge_base TO authenticated;

GRANT MAINTAIN ON TABLE public.knowledge_base TO service_role;

GRANT REFERENCES ON TABLE public.knowledge_base TO service_role;

GRANT TRIGGER ON TABLE public.knowledge_base TO service_role;

GRANT TRUNCATE ON TABLE public.knowledge_base TO service_role;

GRANT SELECT ON SEQUENCE public.knowledge_base_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.knowledge_base_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.knowledge_base_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.legal_policy_versions TO anon;

GRANT REFERENCES ON TABLE public.legal_policy_versions TO anon;

GRANT SELECT ON TABLE public.legal_policy_versions TO anon;

GRANT TRIGGER ON TABLE public.legal_policy_versions TO anon;

GRANT TRUNCATE ON TABLE public.legal_policy_versions TO anon;

GRANT DELETE ON TABLE public.legal_policy_versions TO authenticated;

GRANT INSERT ON TABLE public.legal_policy_versions TO authenticated;

GRANT MAINTAIN ON TABLE public.legal_policy_versions TO authenticated;

GRANT REFERENCES ON TABLE public.legal_policy_versions TO authenticated;

GRANT SELECT ON TABLE public.legal_policy_versions TO authenticated;

GRANT TRIGGER ON TABLE public.legal_policy_versions TO authenticated;

GRANT TRUNCATE ON TABLE public.legal_policy_versions TO authenticated;

GRANT UPDATE ON TABLE public.legal_policy_versions TO authenticated;

GRANT MAINTAIN ON TABLE public.legal_policy_versions TO service_role;

GRANT REFERENCES ON TABLE public.legal_policy_versions TO service_role;

GRANT TRIGGER ON TABLE public.legal_policy_versions TO service_role;

GRANT TRUNCATE ON TABLE public.legal_policy_versions TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_cart_items TO anon;

GRANT REFERENCES ON TABLE public.marketplace_cart_items TO anon;

GRANT TRIGGER ON TABLE public.marketplace_cart_items TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_cart_items TO anon;

GRANT DELETE ON TABLE public.marketplace_cart_items TO authenticated;

GRANT INSERT ON TABLE public.marketplace_cart_items TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_cart_items TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_cart_items TO authenticated;

GRANT SELECT ON TABLE public.marketplace_cart_items TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_cart_items TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_cart_items TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_cart_items TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_cart_items TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_cart_items TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_cart_items TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_cart_items TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_carts TO anon;

GRANT REFERENCES ON TABLE public.marketplace_carts TO anon;

GRANT TRIGGER ON TABLE public.marketplace_carts TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_carts TO anon;

GRANT DELETE ON TABLE public.marketplace_carts TO authenticated;

GRANT INSERT ON TABLE public.marketplace_carts TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_carts TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_carts TO authenticated;

GRANT SELECT ON TABLE public.marketplace_carts TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_carts TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_carts TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_carts TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_carts TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_carts TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_carts TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_carts TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_categories TO anon;

GRANT REFERENCES ON TABLE public.marketplace_categories TO anon;

GRANT SELECT ON TABLE public.marketplace_categories TO anon;

GRANT TRIGGER ON TABLE public.marketplace_categories TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_categories TO anon;

GRANT DELETE ON TABLE public.marketplace_categories TO authenticated;

GRANT INSERT ON TABLE public.marketplace_categories TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_categories TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_categories TO authenticated;

GRANT SELECT ON TABLE public.marketplace_categories TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_categories TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_categories TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_categories TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_categories TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_categories TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_categories TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_categories TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_disputes TO anon;

GRANT REFERENCES ON TABLE public.marketplace_disputes TO anon;

GRANT TRIGGER ON TABLE public.marketplace_disputes TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_disputes TO anon;

GRANT INSERT ON TABLE public.marketplace_disputes TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_disputes TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_disputes TO authenticated;

GRANT SELECT ON TABLE public.marketplace_disputes TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_disputes TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_disputes TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_disputes TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_disputes TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_disputes TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_disputes TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_disputes TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_favorites TO anon;

GRANT REFERENCES ON TABLE public.marketplace_favorites TO anon;

GRANT TRIGGER ON TABLE public.marketplace_favorites TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_favorites TO anon;

GRANT DELETE ON TABLE public.marketplace_favorites TO authenticated;

GRANT INSERT ON TABLE public.marketplace_favorites TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_favorites TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_favorites TO authenticated;

GRANT SELECT ON TABLE public.marketplace_favorites TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_favorites TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_favorites TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_favorites TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_favorites TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_favorites TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_favorites TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_favorites TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_listing_translations TO anon;

GRANT REFERENCES ON TABLE public.marketplace_listing_translations TO anon;

GRANT SELECT ON TABLE public.marketplace_listing_translations TO anon;

GRANT TRIGGER ON TABLE public.marketplace_listing_translations TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_listing_translations TO anon;

GRANT DELETE ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT INSERT ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT SELECT ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_listing_translations TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_listing_translations TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_listing_translations TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_listing_translations TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_listing_translations TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_listings TO anon;

GRANT REFERENCES ON TABLE public.marketplace_listings TO anon;

GRANT SELECT ON TABLE public.marketplace_listings TO anon;

GRANT TRIGGER ON TABLE public.marketplace_listings TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_listings TO anon;

GRANT DELETE ON TABLE public.marketplace_listings TO authenticated;

GRANT INSERT ON TABLE public.marketplace_listings TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_listings TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_listings TO authenticated;

GRANT SELECT ON TABLE public.marketplace_listings TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_listings TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_listings TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_listings TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_listings TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_listings TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_listings TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_listings TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_order_items TO anon;

GRANT REFERENCES ON TABLE public.marketplace_order_items TO anon;

GRANT TRIGGER ON TABLE public.marketplace_order_items TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_order_items TO anon;

GRANT DELETE ON TABLE public.marketplace_order_items TO authenticated;

GRANT INSERT ON TABLE public.marketplace_order_items TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_order_items TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_order_items TO authenticated;

GRANT SELECT ON TABLE public.marketplace_order_items TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_order_items TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_order_items TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_order_items TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_order_items TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_order_items TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_order_items TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_order_items TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_orders TO anon;

GRANT REFERENCES ON TABLE public.marketplace_orders TO anon;

GRANT TRIGGER ON TABLE public.marketplace_orders TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_orders TO anon;

GRANT INSERT ON TABLE public.marketplace_orders TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_orders TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_orders TO authenticated;

GRANT SELECT ON TABLE public.marketplace_orders TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_orders TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_orders TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_orders TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_orders TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_orders TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_orders TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_orders TO service_role;

GRANT MAINTAIN ON TABLE public.marketplace_reviews TO anon;

GRANT REFERENCES ON TABLE public.marketplace_reviews TO anon;

GRANT SELECT ON TABLE public.marketplace_reviews TO anon;

GRANT TRIGGER ON TABLE public.marketplace_reviews TO anon;

GRANT TRUNCATE ON TABLE public.marketplace_reviews TO anon;

GRANT INSERT ON TABLE public.marketplace_reviews TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_reviews TO authenticated;

GRANT REFERENCES ON TABLE public.marketplace_reviews TO authenticated;

GRANT SELECT ON TABLE public.marketplace_reviews TO authenticated;

GRANT TRIGGER ON TABLE public.marketplace_reviews TO authenticated;

GRANT TRUNCATE ON TABLE public.marketplace_reviews TO authenticated;

GRANT UPDATE ON TABLE public.marketplace_reviews TO authenticated;

GRANT MAINTAIN ON TABLE public.marketplace_reviews TO service_role;

GRANT REFERENCES ON TABLE public.marketplace_reviews TO service_role;

GRANT TRIGGER ON TABLE public.marketplace_reviews TO service_role;

GRANT TRUNCATE ON TABLE public.marketplace_reviews TO service_role;

GRANT MAINTAIN ON TABLE public.media TO anon;

GRANT SELECT ON TABLE public.media TO anon;

GRANT DELETE ON TABLE public.media TO authenticated;

GRANT INSERT ON TABLE public.media TO authenticated;

GRANT MAINTAIN ON TABLE public.media TO authenticated;

GRANT SELECT ON TABLE public.media TO authenticated;

GRANT UPDATE ON TABLE public.media TO authenticated;

GRANT DELETE ON TABLE public.media TO service_role;

GRANT INSERT ON TABLE public.media TO service_role;

GRANT MAINTAIN ON TABLE public.media TO service_role;

GRANT REFERENCES ON TABLE public.media TO service_role;

GRANT SELECT ON TABLE public.media TO service_role;

GRANT TRIGGER ON TABLE public.media TO service_role;

GRANT TRUNCATE ON TABLE public.media TO service_role;

GRANT UPDATE ON TABLE public.media TO service_role;

GRANT SELECT ON SEQUENCE public.media_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.media_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.media_id_seq TO authenticated;

GRANT DELETE ON TABLE public.notifications TO authenticated;

GRANT INSERT ON TABLE public.notifications TO authenticated;

GRANT MAINTAIN ON TABLE public.notifications TO authenticated;

GRANT SELECT ON TABLE public.notifications TO authenticated;

GRANT UPDATE ON TABLE public.notifications TO authenticated;

GRANT DELETE ON TABLE public.notifications TO service_role;

GRANT INSERT ON TABLE public.notifications TO service_role;

GRANT MAINTAIN ON TABLE public.notifications TO service_role;

GRANT REFERENCES ON TABLE public.notifications TO service_role;

GRANT SELECT ON TABLE public.notifications TO service_role;

GRANT TRIGGER ON TABLE public.notifications TO service_role;

GRANT TRUNCATE ON TABLE public.notifications TO service_role;

GRANT UPDATE ON TABLE public.notifications TO service_role;

GRANT SELECT ON SEQUENCE public.notifications_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.notifications_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.notifications_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.operations_preflight_backups TO service_role;

GRANT REFERENCES ON TABLE public.operations_preflight_backups TO service_role;

GRANT TRIGGER ON TABLE public.operations_preflight_backups TO service_role;

GRANT TRUNCATE ON TABLE public.operations_preflight_backups TO service_role;

GRANT MAINTAIN ON TABLE public.page_builder_sections TO anon;

GRANT SELECT ON TABLE public.page_builder_sections TO anon;

GRANT DELETE ON TABLE public.page_builder_sections TO authenticated;

GRANT INSERT ON TABLE public.page_builder_sections TO authenticated;

GRANT MAINTAIN ON TABLE public.page_builder_sections TO authenticated;

GRANT SELECT ON TABLE public.page_builder_sections TO authenticated;

GRANT UPDATE ON TABLE public.page_builder_sections TO authenticated;

GRANT MAINTAIN ON TABLE public.page_builder_sections TO service_role;

GRANT REFERENCES ON TABLE public.page_builder_sections TO service_role;

GRANT TRIGGER ON TABLE public.page_builder_sections TO service_role;

GRANT TRUNCATE ON TABLE public.page_builder_sections TO service_role;

GRANT MAINTAIN ON TABLE public.pages TO anon;

GRANT SELECT ON TABLE public.pages TO anon;

GRANT DELETE ON TABLE public.pages TO authenticated;

GRANT INSERT ON TABLE public.pages TO authenticated;

GRANT MAINTAIN ON TABLE public.pages TO authenticated;

GRANT SELECT ON TABLE public.pages TO authenticated;

GRANT UPDATE ON TABLE public.pages TO authenticated;

GRANT DELETE ON TABLE public.pages TO service_role;

GRANT INSERT ON TABLE public.pages TO service_role;

GRANT MAINTAIN ON TABLE public.pages TO service_role;

GRANT REFERENCES ON TABLE public.pages TO service_role;

GRANT SELECT ON TABLE public.pages TO service_role;

GRANT TRIGGER ON TABLE public.pages TO service_role;

GRANT TRUNCATE ON TABLE public.pages TO service_role;

GRANT UPDATE ON TABLE public.pages TO service_role;

GRANT SELECT ON SEQUENCE public.pages_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.pages_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.pages_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.partners TO anon;

GRANT SELECT ON TABLE public.partners TO anon;

GRANT DELETE ON TABLE public.partners TO authenticated;

GRANT INSERT ON TABLE public.partners TO authenticated;

GRANT MAINTAIN ON TABLE public.partners TO authenticated;

GRANT SELECT ON TABLE public.partners TO authenticated;

GRANT UPDATE ON TABLE public.partners TO authenticated;

GRANT MAINTAIN ON TABLE public.partners TO service_role;

GRANT REFERENCES ON TABLE public.partners TO service_role;

GRANT TRIGGER ON TABLE public.partners TO service_role;

GRANT TRUNCATE ON TABLE public.partners TO service_role;

GRANT SELECT ON SEQUENCE public.partners_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.partners_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.partners_id_seq TO authenticated;

GRANT SELECT ON TABLE public.payment_intents TO authenticated;

GRANT MAINTAIN ON TABLE public.payment_intents TO service_role;

GRANT REFERENCES ON TABLE public.payment_intents TO service_role;

GRANT TRIGGER ON TABLE public.payment_intents TO service_role;

GRANT TRUNCATE ON TABLE public.payment_intents TO service_role;

GRANT INSERT ON TABLE public.payment_providers TO authenticated;

GRANT SELECT ON TABLE public.payment_providers TO authenticated;

GRANT UPDATE ON TABLE public.payment_providers TO authenticated;

GRANT MAINTAIN ON TABLE public.payment_providers TO service_role;

GRANT REFERENCES ON TABLE public.payment_providers TO service_role;

GRANT TRIGGER ON TABLE public.payment_providers TO service_role;

GRANT TRUNCATE ON TABLE public.payment_providers TO service_role;

GRANT INSERT ON TABLE public.payment_refunds TO authenticated;

GRANT SELECT ON TABLE public.payment_refunds TO authenticated;

GRANT UPDATE ON TABLE public.payment_refunds TO authenticated;

GRANT MAINTAIN ON TABLE public.payment_refunds TO service_role;

GRANT REFERENCES ON TABLE public.payment_refunds TO service_role;

GRANT TRIGGER ON TABLE public.payment_refunds TO service_role;

GRANT TRUNCATE ON TABLE public.payment_refunds TO service_role;

GRANT SELECT ON TABLE public.payment_transactions TO authenticated;

GRANT MAINTAIN ON TABLE public.payment_transactions TO service_role;

GRANT REFERENCES ON TABLE public.payment_transactions TO service_role;

GRANT TRIGGER ON TABLE public.payment_transactions TO service_role;

GRANT TRUNCATE ON TABLE public.payment_transactions TO service_role;

GRANT SELECT ON TABLE public.payment_webhook_events TO authenticated;

GRANT MAINTAIN ON TABLE public.payment_webhook_events TO service_role;

GRANT REFERENCES ON TABLE public.payment_webhook_events TO service_role;

GRANT TRIGGER ON TABLE public.payment_webhook_events TO service_role;

GRANT TRUNCATE ON TABLE public.payment_webhook_events TO service_role;

GRANT MAINTAIN ON TABLE public.permissions TO anon;

GRANT MAINTAIN ON TABLE public.permissions TO authenticated;

GRANT MAINTAIN ON TABLE public.permissions TO service_role;

GRANT REFERENCES ON TABLE public.permissions TO service_role;

GRANT TRIGGER ON TABLE public.permissions TO service_role;

GRANT TRUNCATE ON TABLE public.permissions TO service_role;

GRANT SELECT ON SEQUENCE public.permissions_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.permissions_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.permissions_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.portal_files TO anon;

GRANT REFERENCES ON TABLE public.portal_files TO anon;

GRANT TRIGGER ON TABLE public.portal_files TO anon;

GRANT TRUNCATE ON TABLE public.portal_files TO anon;

GRANT DELETE ON TABLE public.portal_files TO authenticated;

GRANT INSERT ON TABLE public.portal_files TO authenticated;

GRANT MAINTAIN ON TABLE public.portal_files TO authenticated;

GRANT REFERENCES ON TABLE public.portal_files TO authenticated;

GRANT SELECT ON TABLE public.portal_files TO authenticated;

GRANT TRIGGER ON TABLE public.portal_files TO authenticated;

GRANT TRUNCATE ON TABLE public.portal_files TO authenticated;

GRANT UPDATE ON TABLE public.portal_files TO authenticated;

GRANT MAINTAIN ON TABLE public.portal_files TO service_role;

GRANT REFERENCES ON TABLE public.portal_files TO service_role;

GRANT TRIGGER ON TABLE public.portal_files TO service_role;

GRANT TRUNCATE ON TABLE public.portal_files TO service_role;

GRANT MAINTAIN ON TABLE public.portal_notification_preferences TO anon;

GRANT REFERENCES ON TABLE public.portal_notification_preferences TO anon;

GRANT TRIGGER ON TABLE public.portal_notification_preferences TO anon;

GRANT TRUNCATE ON TABLE public.portal_notification_preferences TO anon;

GRANT INSERT ON TABLE public.portal_notification_preferences TO authenticated;

GRANT MAINTAIN ON TABLE public.portal_notification_preferences TO authenticated;

GRANT REFERENCES ON TABLE public.portal_notification_preferences TO authenticated;

GRANT SELECT ON TABLE public.portal_notification_preferences TO authenticated;

GRANT TRIGGER ON TABLE public.portal_notification_preferences TO authenticated;

GRANT TRUNCATE ON TABLE public.portal_notification_preferences TO authenticated;

GRANT UPDATE ON TABLE public.portal_notification_preferences TO authenticated;

GRANT MAINTAIN ON TABLE public.portal_notification_preferences TO service_role;

GRANT REFERENCES ON TABLE public.portal_notification_preferences TO service_role;

GRANT TRIGGER ON TABLE public.portal_notification_preferences TO service_role;

GRANT TRUNCATE ON TABLE public.portal_notification_preferences TO service_role;

GRANT MAINTAIN ON TABLE public.portal_profiles TO anon;

GRANT REFERENCES ON TABLE public.portal_profiles TO anon;

GRANT TRIGGER ON TABLE public.portal_profiles TO anon;

GRANT TRUNCATE ON TABLE public.portal_profiles TO anon;

GRANT INSERT ON TABLE public.portal_profiles TO authenticated;

GRANT MAINTAIN ON TABLE public.portal_profiles TO authenticated;

GRANT REFERENCES ON TABLE public.portal_profiles TO authenticated;

GRANT SELECT ON TABLE public.portal_profiles TO authenticated;

GRANT TRIGGER ON TABLE public.portal_profiles TO authenticated;

GRANT TRUNCATE ON TABLE public.portal_profiles TO authenticated;

GRANT UPDATE ON TABLE public.portal_profiles TO authenticated;

GRANT MAINTAIN ON TABLE public.portal_profiles TO service_role;

GRANT REFERENCES ON TABLE public.portal_profiles TO service_role;

GRANT TRIGGER ON TABLE public.portal_profiles TO service_role;

GRANT TRUNCATE ON TABLE public.portal_profiles TO service_role;

GRANT MAINTAIN ON TABLE public.pr100_gateway_nonces TO anon;

GRANT MAINTAIN ON TABLE public.pr100_gateway_nonces TO authenticated;

GRANT MAINTAIN ON TABLE public.pr100_gateway_nonces TO service_role;

GRANT REFERENCES ON TABLE public.pr100_gateway_nonces TO service_role;

GRANT TRIGGER ON TABLE public.pr100_gateway_nonces TO service_role;

GRANT TRUNCATE ON TABLE public.pr100_gateway_nonces TO service_role;

GRANT MAINTAIN ON TABLE public.pr101_gateway_nonces TO service_role;

GRANT REFERENCES ON TABLE public.pr101_gateway_nonces TO service_role;

GRANT TRIGGER ON TABLE public.pr101_gateway_nonces TO service_role;

GRANT TRUNCATE ON TABLE public.pr101_gateway_nonces TO service_role;

GRANT MAINTAIN ON TABLE public.privacy_requests TO anon;

GRANT REFERENCES ON TABLE public.privacy_requests TO anon;

GRANT TRIGGER ON TABLE public.privacy_requests TO anon;

GRANT TRUNCATE ON TABLE public.privacy_requests TO anon;

GRANT INSERT ON TABLE public.privacy_requests TO authenticated;

GRANT MAINTAIN ON TABLE public.privacy_requests TO authenticated;

GRANT REFERENCES ON TABLE public.privacy_requests TO authenticated;

GRANT SELECT ON TABLE public.privacy_requests TO authenticated;

GRANT TRIGGER ON TABLE public.privacy_requests TO authenticated;

GRANT TRUNCATE ON TABLE public.privacy_requests TO authenticated;

GRANT UPDATE ON TABLE public.privacy_requests TO authenticated;

GRANT MAINTAIN ON TABLE public.privacy_requests TO service_role;

GRANT REFERENCES ON TABLE public.privacy_requests TO service_role;

GRANT TRIGGER ON TABLE public.privacy_requests TO service_role;

GRANT TRUNCATE ON TABLE public.privacy_requests TO service_role;

GRANT MAINTAIN ON TABLE public.product_kpi_daily TO anon;

GRANT REFERENCES ON TABLE public.product_kpi_daily TO anon;

GRANT TRIGGER ON TABLE public.product_kpi_daily TO anon;

GRANT TRUNCATE ON TABLE public.product_kpi_daily TO anon;

GRANT INSERT ON TABLE public.product_kpi_daily TO authenticated;

GRANT MAINTAIN ON TABLE public.product_kpi_daily TO authenticated;

GRANT REFERENCES ON TABLE public.product_kpi_daily TO authenticated;

GRANT SELECT ON TABLE public.product_kpi_daily TO authenticated;

GRANT TRIGGER ON TABLE public.product_kpi_daily TO authenticated;

GRANT TRUNCATE ON TABLE public.product_kpi_daily TO authenticated;

GRANT UPDATE ON TABLE public.product_kpi_daily TO authenticated;

GRANT MAINTAIN ON TABLE public.product_kpi_daily TO service_role;

GRANT REFERENCES ON TABLE public.product_kpi_daily TO service_role;

GRANT TRIGGER ON TABLE public.product_kpi_daily TO service_role;

GRANT TRUNCATE ON TABLE public.product_kpi_daily TO service_role;

GRANT MAINTAIN ON TABLE public.program_admins TO anon;

GRANT DELETE ON TABLE public.program_admins TO authenticated;

GRANT INSERT ON TABLE public.program_admins TO authenticated;

GRANT MAINTAIN ON TABLE public.program_admins TO authenticated;

GRANT SELECT ON TABLE public.program_admins TO authenticated;

GRANT UPDATE ON TABLE public.program_admins TO authenticated;

GRANT DELETE ON TABLE public.program_admins TO service_role;

GRANT INSERT ON TABLE public.program_admins TO service_role;

GRANT MAINTAIN ON TABLE public.program_admins TO service_role;

GRANT REFERENCES ON TABLE public.program_admins TO service_role;

GRANT SELECT ON TABLE public.program_admins TO service_role;

GRANT TRIGGER ON TABLE public.program_admins TO service_role;

GRANT TRUNCATE ON TABLE public.program_admins TO service_role;

GRANT UPDATE ON TABLE public.program_admins TO service_role;

GRANT SELECT ON SEQUENCE public.program_admins_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.program_admins_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.program_admins_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.program_pages TO anon;

GRANT MAINTAIN ON TABLE public.program_pages TO authenticated;

GRANT MAINTAIN ON TABLE public.program_pages TO service_role;

GRANT REFERENCES ON TABLE public.program_pages TO service_role;

GRANT TRIGGER ON TABLE public.program_pages TO service_role;

GRANT TRUNCATE ON TABLE public.program_pages TO service_role;

GRANT SELECT ON SEQUENCE public.program_pages_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.program_pages_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.program_pages_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.programs TO anon;

GRANT SELECT ON TABLE public.programs TO anon;

GRANT DELETE ON TABLE public.programs TO authenticated;

GRANT INSERT ON TABLE public.programs TO authenticated;

GRANT MAINTAIN ON TABLE public.programs TO authenticated;

GRANT SELECT ON TABLE public.programs TO authenticated;

GRANT UPDATE ON TABLE public.programs TO authenticated;

GRANT DELETE ON TABLE public.programs TO service_role;

GRANT INSERT ON TABLE public.programs TO service_role;

GRANT MAINTAIN ON TABLE public.programs TO service_role;

GRANT REFERENCES ON TABLE public.programs TO service_role;

GRANT SELECT ON TABLE public.programs TO service_role;

GRANT TRIGGER ON TABLE public.programs TO service_role;

GRANT TRUNCATE ON TABLE public.programs TO service_role;

GRANT UPDATE ON TABLE public.programs TO service_role;

GRANT SELECT ON SEQUENCE public.programs_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.programs_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.programs_id_seq TO authenticated;

GRANT SELECT ON TABLE public.provider_health_checks TO authenticated;

GRANT MAINTAIN ON TABLE public.provider_health_checks TO service_role;

GRANT REFERENCES ON TABLE public.provider_health_checks TO service_role;

GRANT TRIGGER ON TABLE public.provider_health_checks TO service_role;

GRANT TRUNCATE ON TABLE public.provider_health_checks TO service_role;

GRANT SELECT ON SEQUENCE public.provider_health_checks_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.provider_health_checks_id_seq TO authenticated;

GRANT SELECT ON TABLE public.provider_message_events TO authenticated;

GRANT MAINTAIN ON TABLE public.provider_message_events TO service_role;

GRANT REFERENCES ON TABLE public.provider_message_events TO service_role;

GRANT TRIGGER ON TABLE public.provider_message_events TO service_role;

GRANT TRUNCATE ON TABLE public.provider_message_events TO service_role;

GRANT MAINTAIN ON TABLE public.public_lookup_guards TO service_role;

GRANT REFERENCES ON TABLE public.public_lookup_guards TO service_role;

GRANT TRIGGER ON TABLE public.public_lookup_guards TO service_role;

GRANT TRUNCATE ON TABLE public.public_lookup_guards TO service_role;

GRANT MAINTAIN ON TABLE public.public_submission_guards TO service_role;

GRANT REFERENCES ON TABLE public.public_submission_guards TO service_role;

GRANT TRIGGER ON TABLE public.public_submission_guards TO service_role;

GRANT TRUNCATE ON TABLE public.public_submission_guards TO service_role;

GRANT MAINTAIN ON TABLE public.push_subscriptions TO anon;

GRANT REFERENCES ON TABLE public.push_subscriptions TO anon;

GRANT TRIGGER ON TABLE public.push_subscriptions TO anon;

GRANT TRUNCATE ON TABLE public.push_subscriptions TO anon;

GRANT INSERT ON TABLE public.push_subscriptions TO authenticated;

GRANT MAINTAIN ON TABLE public.push_subscriptions TO authenticated;

GRANT REFERENCES ON TABLE public.push_subscriptions TO authenticated;

GRANT SELECT ON TABLE public.push_subscriptions TO authenticated;

GRANT TRIGGER ON TABLE public.push_subscriptions TO authenticated;

GRANT TRUNCATE ON TABLE public.push_subscriptions TO authenticated;

GRANT UPDATE ON TABLE public.push_subscriptions TO authenticated;

GRANT MAINTAIN ON TABLE public.push_subscriptions TO service_role;

GRANT REFERENCES ON TABLE public.push_subscriptions TO service_role;

GRANT TRIGGER ON TABLE public.push_subscriptions TO service_role;

GRANT TRUNCATE ON TABLE public.push_subscriptions TO service_role;

GRANT MAINTAIN ON TABLE public.redirects TO anon;

GRANT MAINTAIN ON TABLE public.redirects TO authenticated;

GRANT MAINTAIN ON TABLE public.redirects TO service_role;

GRANT REFERENCES ON TABLE public.redirects TO service_role;

GRANT TRIGGER ON TABLE public.redirects TO service_role;

GRANT TRUNCATE ON TABLE public.redirects TO service_role;

GRANT SELECT ON SEQUENCE public.redirects_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.redirects_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.redirects_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.restore_operations TO service_role;

GRANT REFERENCES ON TABLE public.restore_operations TO service_role;

GRANT TRIGGER ON TABLE public.restore_operations TO service_role;

GRANT TRUNCATE ON TABLE public.restore_operations TO service_role;

GRANT MAINTAIN ON TABLE public.reviews TO anon;

GRANT SELECT ON TABLE public.reviews TO anon;

GRANT DELETE ON TABLE public.reviews TO authenticated;

GRANT INSERT ON TABLE public.reviews TO authenticated;

GRANT MAINTAIN ON TABLE public.reviews TO authenticated;

GRANT SELECT ON TABLE public.reviews TO authenticated;

GRANT UPDATE ON TABLE public.reviews TO authenticated;

GRANT MAINTAIN ON TABLE public.reviews TO service_role;

GRANT REFERENCES ON TABLE public.reviews TO service_role;

GRANT TRIGGER ON TABLE public.reviews TO service_role;

GRANT TRUNCATE ON TABLE public.reviews TO service_role;

GRANT SELECT ON SEQUENCE public.reviews_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.reviews_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.reviews_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.role_permissions TO anon;

GRANT MAINTAIN ON TABLE public.role_permissions TO authenticated;

GRANT MAINTAIN ON TABLE public.role_permissions TO service_role;

GRANT REFERENCES ON TABLE public.role_permissions TO service_role;

GRANT TRIGGER ON TABLE public.role_permissions TO service_role;

GRANT TRUNCATE ON TABLE public.role_permissions TO service_role;

GRANT SELECT ON SEQUENCE public.role_permissions_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.role_permissions_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.role_permissions_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.roles TO anon;

GRANT MAINTAIN ON TABLE public.roles TO authenticated;

GRANT MAINTAIN ON TABLE public.roles TO service_role;

GRANT REFERENCES ON TABLE public.roles TO service_role;

GRANT TRIGGER ON TABLE public.roles TO service_role;

GRANT TRUNCATE ON TABLE public.roles TO service_role;

GRANT SELECT ON SEQUENCE public.roles_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.roles_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.roles_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.section_templates TO anon;

GRANT DELETE ON TABLE public.section_templates TO authenticated;

GRANT INSERT ON TABLE public.section_templates TO authenticated;

GRANT MAINTAIN ON TABLE public.section_templates TO authenticated;

GRANT SELECT ON TABLE public.section_templates TO authenticated;

GRANT UPDATE ON TABLE public.section_templates TO authenticated;

GRANT MAINTAIN ON TABLE public.section_templates TO service_role;

GRANT REFERENCES ON TABLE public.section_templates TO service_role;

GRANT TRIGGER ON TABLE public.section_templates TO service_role;

GRANT TRUNCATE ON TABLE public.section_templates TO service_role;

GRANT SELECT ON SEQUENCE public.section_templates_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.section_templates_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.sections TO anon;

GRANT SELECT ON TABLE public.sections TO anon;

GRANT DELETE ON TABLE public.sections TO authenticated;

GRANT INSERT ON TABLE public.sections TO authenticated;

GRANT MAINTAIN ON TABLE public.sections TO authenticated;

GRANT SELECT ON TABLE public.sections TO authenticated;

GRANT UPDATE ON TABLE public.sections TO authenticated;

GRANT MAINTAIN ON TABLE public.sections TO service_role;

GRANT REFERENCES ON TABLE public.sections TO service_role;

GRANT TRIGGER ON TABLE public.sections TO service_role;

GRANT TRUNCATE ON TABLE public.sections TO service_role;

GRANT SELECT ON SEQUENCE public.sections_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.sections_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.sections_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.security_alerts TO anon;

GRANT REFERENCES ON TABLE public.security_alerts TO anon;

GRANT TRIGGER ON TABLE public.security_alerts TO anon;

GRANT TRUNCATE ON TABLE public.security_alerts TO anon;

GRANT MAINTAIN ON TABLE public.security_alerts TO authenticated;

GRANT REFERENCES ON TABLE public.security_alerts TO authenticated;

GRANT SELECT ON TABLE public.security_alerts TO authenticated;

GRANT TRIGGER ON TABLE public.security_alerts TO authenticated;

GRANT TRUNCATE ON TABLE public.security_alerts TO authenticated;

GRANT UPDATE ON TABLE public.security_alerts TO authenticated;

GRANT MAINTAIN ON TABLE public.security_alerts TO service_role;

GRANT REFERENCES ON TABLE public.security_alerts TO service_role;

GRANT TRIGGER ON TABLE public.security_alerts TO service_role;

GRANT TRUNCATE ON TABLE public.security_alerts TO service_role;

GRANT MAINTAIN ON TABLE public.service_requests TO anon;

GRANT MAINTAIN ON TABLE public.service_requests TO authenticated;

GRANT SELECT ON TABLE public.service_requests TO authenticated;

GRANT UPDATE ON TABLE public.service_requests TO authenticated;

GRANT MAINTAIN ON TABLE public.service_requests TO service_role;

GRANT REFERENCES ON TABLE public.service_requests TO service_role;

GRANT TRIGGER ON TABLE public.service_requests TO service_role;

GRANT TRUNCATE ON TABLE public.service_requests TO service_role;

GRANT SELECT ON SEQUENCE public.service_requests_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.service_requests_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.service_requests_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.services TO anon;

GRANT MAINTAIN ON TABLE public.services TO authenticated;

GRANT MAINTAIN ON TABLE public.services TO service_role;

GRANT REFERENCES ON TABLE public.services TO service_role;

GRANT TRIGGER ON TABLE public.services TO service_role;

GRANT TRUNCATE ON TABLE public.services TO service_role;

GRANT SELECT ON SEQUENCE public.services_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.services_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.services_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.settings TO anon;

GRANT SELECT ON TABLE public.settings TO anon;

GRANT DELETE ON TABLE public.settings TO authenticated;

GRANT INSERT ON TABLE public.settings TO authenticated;

GRANT MAINTAIN ON TABLE public.settings TO authenticated;

GRANT SELECT ON TABLE public.settings TO authenticated;

GRANT UPDATE ON TABLE public.settings TO authenticated;

GRANT DELETE ON TABLE public.settings TO service_role;

GRANT INSERT ON TABLE public.settings TO service_role;

GRANT MAINTAIN ON TABLE public.settings TO service_role;

GRANT REFERENCES ON TABLE public.settings TO service_role;

GRANT SELECT ON TABLE public.settings TO service_role;

GRANT TRIGGER ON TABLE public.settings TO service_role;

GRANT TRUNCATE ON TABLE public.settings TO service_role;

GRANT UPDATE ON TABLE public.settings TO service_role;

GRANT SELECT ON SEQUENCE public.settings_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.settings_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.settings_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.sla_events TO anon;

GRANT REFERENCES ON TABLE public.sla_events TO anon;

GRANT TRIGGER ON TABLE public.sla_events TO anon;

GRANT TRUNCATE ON TABLE public.sla_events TO anon;

GRANT DELETE ON TABLE public.sla_events TO authenticated;

GRANT INSERT ON TABLE public.sla_events TO authenticated;

GRANT MAINTAIN ON TABLE public.sla_events TO authenticated;

GRANT REFERENCES ON TABLE public.sla_events TO authenticated;

GRANT SELECT ON TABLE public.sla_events TO authenticated;

GRANT TRIGGER ON TABLE public.sla_events TO authenticated;

GRANT TRUNCATE ON TABLE public.sla_events TO authenticated;

GRANT UPDATE ON TABLE public.sla_events TO authenticated;

GRANT MAINTAIN ON TABLE public.sla_events TO service_role;

GRANT REFERENCES ON TABLE public.sla_events TO service_role;

GRANT TRIGGER ON TABLE public.sla_events TO service_role;

GRANT TRUNCATE ON TABLE public.sla_events TO service_role;

GRANT MAINTAIN ON TABLE public.sla_policies TO anon;

GRANT REFERENCES ON TABLE public.sla_policies TO anon;

GRANT TRIGGER ON TABLE public.sla_policies TO anon;

GRANT TRUNCATE ON TABLE public.sla_policies TO anon;

GRANT DELETE ON TABLE public.sla_policies TO authenticated;

GRANT INSERT ON TABLE public.sla_policies TO authenticated;

GRANT MAINTAIN ON TABLE public.sla_policies TO authenticated;

GRANT REFERENCES ON TABLE public.sla_policies TO authenticated;

GRANT SELECT ON TABLE public.sla_policies TO authenticated;

GRANT TRIGGER ON TABLE public.sla_policies TO authenticated;

GRANT TRUNCATE ON TABLE public.sla_policies TO authenticated;

GRANT UPDATE ON TABLE public.sla_policies TO authenticated;

GRANT MAINTAIN ON TABLE public.sla_policies TO service_role;

GRANT REFERENCES ON TABLE public.sla_policies TO service_role;

GRANT TRIGGER ON TABLE public.sla_policies TO service_role;

GRANT TRUNCATE ON TABLE public.sla_policies TO service_role;

GRANT MAINTAIN ON TABLE public.success_stories TO anon;

GRANT SELECT ON TABLE public.success_stories TO anon;

GRANT DELETE ON TABLE public.success_stories TO authenticated;

GRANT INSERT ON TABLE public.success_stories TO authenticated;

GRANT MAINTAIN ON TABLE public.success_stories TO authenticated;

GRANT SELECT ON TABLE public.success_stories TO authenticated;

GRANT UPDATE ON TABLE public.success_stories TO authenticated;

GRANT MAINTAIN ON TABLE public.success_stories TO service_role;

GRANT REFERENCES ON TABLE public.success_stories TO service_role;

GRANT TRIGGER ON TABLE public.success_stories TO service_role;

GRANT TRUNCATE ON TABLE public.success_stories TO service_role;

GRANT SELECT ON SEQUENCE public.success_stories_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.success_stories_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.success_stories_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.task_assignments TO anon;

GRANT REFERENCES ON TABLE public.task_assignments TO anon;

GRANT TRIGGER ON TABLE public.task_assignments TO anon;

GRANT TRUNCATE ON TABLE public.task_assignments TO anon;

GRANT DELETE ON TABLE public.task_assignments TO authenticated;

GRANT INSERT ON TABLE public.task_assignments TO authenticated;

GRANT MAINTAIN ON TABLE public.task_assignments TO authenticated;

GRANT REFERENCES ON TABLE public.task_assignments TO authenticated;

GRANT SELECT ON TABLE public.task_assignments TO authenticated;

GRANT TRIGGER ON TABLE public.task_assignments TO authenticated;

GRANT TRUNCATE ON TABLE public.task_assignments TO authenticated;

GRANT UPDATE ON TABLE public.task_assignments TO authenticated;

GRANT MAINTAIN ON TABLE public.task_assignments TO service_role;

GRANT REFERENCES ON TABLE public.task_assignments TO service_role;

GRANT TRIGGER ON TABLE public.task_assignments TO service_role;

GRANT TRUNCATE ON TABLE public.task_assignments TO service_role;

GRANT MAINTAIN ON TABLE public.task_attachments TO anon;

GRANT REFERENCES ON TABLE public.task_attachments TO anon;

GRANT TRIGGER ON TABLE public.task_attachments TO anon;

GRANT TRUNCATE ON TABLE public.task_attachments TO anon;

GRANT INSERT ON TABLE public.task_attachments TO authenticated;

GRANT MAINTAIN ON TABLE public.task_attachments TO authenticated;

GRANT REFERENCES ON TABLE public.task_attachments TO authenticated;

GRANT SELECT ON TABLE public.task_attachments TO authenticated;

GRANT TRIGGER ON TABLE public.task_attachments TO authenticated;

GRANT TRUNCATE ON TABLE public.task_attachments TO authenticated;

GRANT MAINTAIN ON TABLE public.task_attachments TO service_role;

GRANT REFERENCES ON TABLE public.task_attachments TO service_role;

GRANT TRIGGER ON TABLE public.task_attachments TO service_role;

GRANT TRUNCATE ON TABLE public.task_attachments TO service_role;

GRANT MAINTAIN ON TABLE public.task_comments TO anon;

GRANT REFERENCES ON TABLE public.task_comments TO anon;

GRANT TRIGGER ON TABLE public.task_comments TO anon;

GRANT TRUNCATE ON TABLE public.task_comments TO anon;

GRANT INSERT ON TABLE public.task_comments TO authenticated;

GRANT MAINTAIN ON TABLE public.task_comments TO authenticated;

GRANT REFERENCES ON TABLE public.task_comments TO authenticated;

GRANT SELECT ON TABLE public.task_comments TO authenticated;

GRANT TRIGGER ON TABLE public.task_comments TO authenticated;

GRANT TRUNCATE ON TABLE public.task_comments TO authenticated;

GRANT MAINTAIN ON TABLE public.task_comments TO service_role;

GRANT REFERENCES ON TABLE public.task_comments TO service_role;

GRANT TRIGGER ON TABLE public.task_comments TO service_role;

GRANT TRUNCATE ON TABLE public.task_comments TO service_role;

GRANT MAINTAIN ON TABLE public.task_status_history TO anon;

GRANT REFERENCES ON TABLE public.task_status_history TO anon;

GRANT TRIGGER ON TABLE public.task_status_history TO anon;

GRANT TRUNCATE ON TABLE public.task_status_history TO anon;

GRANT MAINTAIN ON TABLE public.task_status_history TO authenticated;

GRANT REFERENCES ON TABLE public.task_status_history TO authenticated;

GRANT SELECT ON TABLE public.task_status_history TO authenticated;

GRANT TRIGGER ON TABLE public.task_status_history TO authenticated;

GRANT TRUNCATE ON TABLE public.task_status_history TO authenticated;

GRANT MAINTAIN ON TABLE public.task_status_history TO service_role;

GRANT REFERENCES ON TABLE public.task_status_history TO service_role;

GRANT TRIGGER ON TABLE public.task_status_history TO service_role;

GRANT TRUNCATE ON TABLE public.task_status_history TO service_role;

GRANT SELECT ON SEQUENCE public.task_status_history_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.task_status_history_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.tasks TO anon;

GRANT REFERENCES ON TABLE public.tasks TO anon;

GRANT TRIGGER ON TABLE public.tasks TO anon;

GRANT TRUNCATE ON TABLE public.tasks TO anon;

GRANT DELETE ON TABLE public.tasks TO authenticated;

GRANT INSERT ON TABLE public.tasks TO authenticated;

GRANT MAINTAIN ON TABLE public.tasks TO authenticated;

GRANT REFERENCES ON TABLE public.tasks TO authenticated;

GRANT SELECT ON TABLE public.tasks TO authenticated;

GRANT TRIGGER ON TABLE public.tasks TO authenticated;

GRANT TRUNCATE ON TABLE public.tasks TO authenticated;

GRANT UPDATE ON TABLE public.tasks TO authenticated;

GRANT MAINTAIN ON TABLE public.tasks TO service_role;

GRANT REFERENCES ON TABLE public.tasks TO service_role;

GRANT TRIGGER ON TABLE public.tasks TO service_role;

GRANT TRUNCATE ON TABLE public.tasks TO service_role;

GRANT MAINTAIN ON TABLE public.tenant_admin_audit TO anon;

GRANT REFERENCES ON TABLE public.tenant_admin_audit TO anon;

GRANT TRIGGER ON TABLE public.tenant_admin_audit TO anon;

GRANT TRUNCATE ON TABLE public.tenant_admin_audit TO anon;

GRANT INSERT ON TABLE public.tenant_admin_audit TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_admin_audit TO authenticated;

GRANT REFERENCES ON TABLE public.tenant_admin_audit TO authenticated;

GRANT SELECT ON TABLE public.tenant_admin_audit TO authenticated;

GRANT TRIGGER ON TABLE public.tenant_admin_audit TO authenticated;

GRANT TRUNCATE ON TABLE public.tenant_admin_audit TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_admin_audit TO service_role;

GRANT REFERENCES ON TABLE public.tenant_admin_audit TO service_role;

GRANT TRIGGER ON TABLE public.tenant_admin_audit TO service_role;

GRANT TRUNCATE ON TABLE public.tenant_admin_audit TO service_role;

GRANT SELECT ON SEQUENCE public.tenant_admin_audit_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.tenant_admin_audit_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_branding TO anon;

GRANT REFERENCES ON TABLE public.tenant_branding TO anon;

GRANT TRIGGER ON TABLE public.tenant_branding TO anon;

GRANT TRUNCATE ON TABLE public.tenant_branding TO anon;

GRANT DELETE ON TABLE public.tenant_branding TO authenticated;

GRANT INSERT ON TABLE public.tenant_branding TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_branding TO authenticated;

GRANT REFERENCES ON TABLE public.tenant_branding TO authenticated;

GRANT SELECT ON TABLE public.tenant_branding TO authenticated;

GRANT TRIGGER ON TABLE public.tenant_branding TO authenticated;

GRANT TRUNCATE ON TABLE public.tenant_branding TO authenticated;

GRANT UPDATE ON TABLE public.tenant_branding TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_branding TO service_role;

GRANT REFERENCES ON TABLE public.tenant_branding TO service_role;

GRANT TRIGGER ON TABLE public.tenant_branding TO service_role;

GRANT TRUNCATE ON TABLE public.tenant_branding TO service_role;

GRANT MAINTAIN ON TABLE public.tenant_domains TO anon;

GRANT REFERENCES ON TABLE public.tenant_domains TO anon;

GRANT TRIGGER ON TABLE public.tenant_domains TO anon;

GRANT TRUNCATE ON TABLE public.tenant_domains TO anon;

GRANT DELETE ON TABLE public.tenant_domains TO authenticated;

GRANT INSERT ON TABLE public.tenant_domains TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_domains TO authenticated;

GRANT REFERENCES ON TABLE public.tenant_domains TO authenticated;

GRANT SELECT ON TABLE public.tenant_domains TO authenticated;

GRANT TRIGGER ON TABLE public.tenant_domains TO authenticated;

GRANT TRUNCATE ON TABLE public.tenant_domains TO authenticated;

GRANT UPDATE ON TABLE public.tenant_domains TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_domains TO service_role;

GRANT REFERENCES ON TABLE public.tenant_domains TO service_role;

GRANT TRIGGER ON TABLE public.tenant_domains TO service_role;

GRANT TRUNCATE ON TABLE public.tenant_domains TO service_role;

GRANT MAINTAIN ON TABLE public.tenant_feature_flags TO anon;

GRANT REFERENCES ON TABLE public.tenant_feature_flags TO anon;

GRANT TRIGGER ON TABLE public.tenant_feature_flags TO anon;

GRANT TRUNCATE ON TABLE public.tenant_feature_flags TO anon;

GRANT DELETE ON TABLE public.tenant_feature_flags TO authenticated;

GRANT INSERT ON TABLE public.tenant_feature_flags TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_feature_flags TO authenticated;

GRANT REFERENCES ON TABLE public.tenant_feature_flags TO authenticated;

GRANT SELECT ON TABLE public.tenant_feature_flags TO authenticated;

GRANT TRIGGER ON TABLE public.tenant_feature_flags TO authenticated;

GRANT TRUNCATE ON TABLE public.tenant_feature_flags TO authenticated;

GRANT UPDATE ON TABLE public.tenant_feature_flags TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_feature_flags TO service_role;

GRANT REFERENCES ON TABLE public.tenant_feature_flags TO service_role;

GRANT TRIGGER ON TABLE public.tenant_feature_flags TO service_role;

GRANT TRUNCATE ON TABLE public.tenant_feature_flags TO service_role;

GRANT SELECT ON TABLE public.tenant_invitations TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_invitations TO service_role;

GRANT REFERENCES ON TABLE public.tenant_invitations TO service_role;

GRANT TRIGGER ON TABLE public.tenant_invitations TO service_role;

GRANT TRUNCATE ON TABLE public.tenant_invitations TO service_role;

GRANT MAINTAIN ON TABLE public.tenant_memberships TO anon;

GRANT REFERENCES ON TABLE public.tenant_memberships TO anon;

GRANT TRIGGER ON TABLE public.tenant_memberships TO anon;

GRANT TRUNCATE ON TABLE public.tenant_memberships TO anon;

GRANT MAINTAIN ON TABLE public.tenant_memberships TO authenticated;

GRANT REFERENCES ON TABLE public.tenant_memberships TO authenticated;

GRANT SELECT ON TABLE public.tenant_memberships TO authenticated;

GRANT TRIGGER ON TABLE public.tenant_memberships TO authenticated;

GRANT TRUNCATE ON TABLE public.tenant_memberships TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_memberships TO service_role;

GRANT REFERENCES ON TABLE public.tenant_memberships TO service_role;

GRANT TRIGGER ON TABLE public.tenant_memberships TO service_role;

GRANT TRUNCATE ON TABLE public.tenant_memberships TO service_role;

GRANT MAINTAIN ON TABLE public.tenant_settings TO anon;

GRANT REFERENCES ON TABLE public.tenant_settings TO anon;

GRANT TRIGGER ON TABLE public.tenant_settings TO anon;

GRANT TRUNCATE ON TABLE public.tenant_settings TO anon;

GRANT DELETE ON TABLE public.tenant_settings TO authenticated;

GRANT INSERT ON TABLE public.tenant_settings TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_settings TO authenticated;

GRANT REFERENCES ON TABLE public.tenant_settings TO authenticated;

GRANT SELECT ON TABLE public.tenant_settings TO authenticated;

GRANT TRIGGER ON TABLE public.tenant_settings TO authenticated;

GRANT TRUNCATE ON TABLE public.tenant_settings TO authenticated;

GRANT UPDATE ON TABLE public.tenant_settings TO authenticated;

GRANT MAINTAIN ON TABLE public.tenant_settings TO service_role;

GRANT REFERENCES ON TABLE public.tenant_settings TO service_role;

GRANT TRIGGER ON TABLE public.tenant_settings TO service_role;

GRANT TRUNCATE ON TABLE public.tenant_settings TO service_role;

GRANT MAINTAIN ON TABLE public.tenants TO anon;

GRANT REFERENCES ON TABLE public.tenants TO anon;

GRANT TRIGGER ON TABLE public.tenants TO anon;

GRANT TRUNCATE ON TABLE public.tenants TO anon;

GRANT MAINTAIN ON TABLE public.tenants TO authenticated;

GRANT REFERENCES ON TABLE public.tenants TO authenticated;

GRANT SELECT ON TABLE public.tenants TO authenticated;

GRANT TRIGGER ON TABLE public.tenants TO authenticated;

GRANT TRUNCATE ON TABLE public.tenants TO authenticated;

GRANT UPDATE ON TABLE public.tenants TO authenticated;

GRANT MAINTAIN ON TABLE public.tenants TO service_role;

GRANT REFERENCES ON TABLE public.tenants TO service_role;

GRANT TRIGGER ON TABLE public.tenants TO service_role;

GRANT TRUNCATE ON TABLE public.tenants TO service_role;

GRANT SELECT ON TABLE public.translation_source_revisions TO authenticated;

GRANT MAINTAIN ON TABLE public.translation_source_revisions TO service_role;

GRANT REFERENCES ON TABLE public.translation_source_revisions TO service_role;

GRANT TRIGGER ON TABLE public.translation_source_revisions TO service_role;

GRANT TRUNCATE ON TABLE public.translation_source_revisions TO service_role;

GRANT MAINTAIN ON TABLE public.trash_items TO anon;

GRANT DELETE ON TABLE public.trash_items TO authenticated;

GRANT INSERT ON TABLE public.trash_items TO authenticated;

GRANT MAINTAIN ON TABLE public.trash_items TO authenticated;

GRANT SELECT ON TABLE public.trash_items TO authenticated;

GRANT UPDATE ON TABLE public.trash_items TO authenticated;

GRANT MAINTAIN ON TABLE public.trash_items TO service_role;

GRANT REFERENCES ON TABLE public.trash_items TO service_role;

GRANT TRIGGER ON TABLE public.trash_items TO service_role;

GRANT TRUNCATE ON TABLE public.trash_items TO service_role;

GRANT SELECT ON SEQUENCE public.trash_items_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.trash_items_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.trash_items_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.user_sessions TO anon;

GRANT REFERENCES ON TABLE public.user_sessions TO anon;

GRANT TRIGGER ON TABLE public.user_sessions TO anon;

GRANT TRUNCATE ON TABLE public.user_sessions TO anon;

GRANT INSERT ON TABLE public.user_sessions TO authenticated;

GRANT MAINTAIN ON TABLE public.user_sessions TO authenticated;

GRANT REFERENCES ON TABLE public.user_sessions TO authenticated;

GRANT SELECT ON TABLE public.user_sessions TO authenticated;

GRANT TRIGGER ON TABLE public.user_sessions TO authenticated;

GRANT TRUNCATE ON TABLE public.user_sessions TO authenticated;

GRANT UPDATE ON TABLE public.user_sessions TO authenticated;

GRANT MAINTAIN ON TABLE public.user_sessions TO service_role;

GRANT REFERENCES ON TABLE public.user_sessions TO service_role;

GRANT TRIGGER ON TABLE public.user_sessions TO service_role;

GRANT TRUNCATE ON TABLE public.user_sessions TO service_role;

GRANT MAINTAIN ON TABLE public.users TO anon;

GRANT MAINTAIN ON TABLE public.users TO authenticated;

GRANT MAINTAIN ON TABLE public.users TO service_role;

GRANT REFERENCES ON TABLE public.users TO service_role;

GRANT TRIGGER ON TABLE public.users TO service_role;

GRANT TRUNCATE ON TABLE public.users TO service_role;

GRANT MAINTAIN ON TABLE public.version_history TO anon;

GRANT INSERT ON TABLE public.version_history TO authenticated;

GRANT MAINTAIN ON TABLE public.version_history TO authenticated;

GRANT SELECT ON TABLE public.version_history TO authenticated;

GRANT MAINTAIN ON TABLE public.version_history TO service_role;

GRANT REFERENCES ON TABLE public.version_history TO service_role;

GRANT TRIGGER ON TABLE public.version_history TO service_role;

GRANT TRUNCATE ON TABLE public.version_history TO service_role;

GRANT SELECT ON SEQUENCE public.version_history_id_seq TO authenticated;

GRANT UPDATE ON SEQUENCE public.version_history_id_seq TO authenticated;

GRANT USAGE ON SEQUENCE public.version_history_id_seq TO authenticated;

GRANT MAINTAIN ON TABLE public.visual_experience_settings TO anon;

GRANT SELECT ON TABLE public.visual_experience_settings TO anon;

GRANT DELETE ON TABLE public.visual_experience_settings TO authenticated;

GRANT INSERT ON TABLE public.visual_experience_settings TO authenticated;

GRANT MAINTAIN ON TABLE public.visual_experience_settings TO authenticated;

GRANT SELECT ON TABLE public.visual_experience_settings TO authenticated;

GRANT UPDATE ON TABLE public.visual_experience_settings TO authenticated;

GRANT MAINTAIN ON TABLE public.visual_experience_settings TO service_role;

GRANT REFERENCES ON TABLE public.visual_experience_settings TO service_role;

GRANT TRIGGER ON TABLE public.visual_experience_settings TO service_role;

GRANT TRUNCATE ON TABLE public.visual_experience_settings TO service_role;

GRANT MAINTAIN ON TABLE public.whatsapp_templates TO anon;

GRANT REFERENCES ON TABLE public.whatsapp_templates TO anon;

GRANT TRIGGER ON TABLE public.whatsapp_templates TO anon;

GRANT TRUNCATE ON TABLE public.whatsapp_templates TO anon;

GRANT DELETE ON TABLE public.whatsapp_templates TO authenticated;

GRANT INSERT ON TABLE public.whatsapp_templates TO authenticated;

GRANT MAINTAIN ON TABLE public.whatsapp_templates TO authenticated;

GRANT REFERENCES ON TABLE public.whatsapp_templates TO authenticated;

GRANT SELECT ON TABLE public.whatsapp_templates TO authenticated;

GRANT TRIGGER ON TABLE public.whatsapp_templates TO authenticated;

GRANT TRUNCATE ON TABLE public.whatsapp_templates TO authenticated;

GRANT UPDATE ON TABLE public.whatsapp_templates TO authenticated;

GRANT MAINTAIN ON TABLE public.whatsapp_templates TO service_role;

GRANT REFERENCES ON TABLE public.whatsapp_templates TO service_role;

GRANT TRIGGER ON TABLE public.whatsapp_templates TO service_role;

GRANT TRUNCATE ON TABLE public.whatsapp_templates TO service_role;

GRANT MAINTAIN ON TABLE public.white_label_projects TO anon;

GRANT INSERT ON TABLE public.white_label_projects TO authenticated;

GRANT MAINTAIN ON TABLE public.white_label_projects TO authenticated;

GRANT SELECT ON TABLE public.white_label_projects TO authenticated;

GRANT UPDATE ON TABLE public.white_label_projects TO authenticated;

GRANT MAINTAIN ON TABLE public.white_label_projects TO service_role;

GRANT REFERENCES ON TABLE public.white_label_projects TO service_role;

GRANT TRIGGER ON TABLE public.white_label_projects TO service_role;

GRANT TRUNCATE ON TABLE public.white_label_projects TO service_role;

GRANT MAINTAIN ON TABLE public.workflow_definitions TO anon;

GRANT REFERENCES ON TABLE public.workflow_definitions TO anon;

GRANT TRIGGER ON TABLE public.workflow_definitions TO anon;

GRANT TRUNCATE ON TABLE public.workflow_definitions TO anon;

GRANT DELETE ON TABLE public.workflow_definitions TO authenticated;

GRANT INSERT ON TABLE public.workflow_definitions TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_definitions TO authenticated;

GRANT REFERENCES ON TABLE public.workflow_definitions TO authenticated;

GRANT SELECT ON TABLE public.workflow_definitions TO authenticated;

GRANT TRIGGER ON TABLE public.workflow_definitions TO authenticated;

GRANT TRUNCATE ON TABLE public.workflow_definitions TO authenticated;

GRANT UPDATE ON TABLE public.workflow_definitions TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_definitions TO service_role;

GRANT REFERENCES ON TABLE public.workflow_definitions TO service_role;

GRANT TRIGGER ON TABLE public.workflow_definitions TO service_role;

GRANT TRUNCATE ON TABLE public.workflow_definitions TO service_role;

GRANT MAINTAIN ON TABLE public.workflow_events TO anon;

GRANT REFERENCES ON TABLE public.workflow_events TO anon;

GRANT TRIGGER ON TABLE public.workflow_events TO anon;

GRANT TRUNCATE ON TABLE public.workflow_events TO anon;

GRANT DELETE ON TABLE public.workflow_events TO authenticated;

GRANT INSERT ON TABLE public.workflow_events TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_events TO authenticated;

GRANT REFERENCES ON TABLE public.workflow_events TO authenticated;

GRANT SELECT ON TABLE public.workflow_events TO authenticated;

GRANT TRIGGER ON TABLE public.workflow_events TO authenticated;

GRANT TRUNCATE ON TABLE public.workflow_events TO authenticated;

GRANT UPDATE ON TABLE public.workflow_events TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_events TO service_role;

GRANT REFERENCES ON TABLE public.workflow_events TO service_role;

GRANT TRIGGER ON TABLE public.workflow_events TO service_role;

GRANT TRUNCATE ON TABLE public.workflow_events TO service_role;

GRANT MAINTAIN ON TABLE public.workflow_runs TO anon;

GRANT REFERENCES ON TABLE public.workflow_runs TO anon;

GRANT TRIGGER ON TABLE public.workflow_runs TO anon;

GRANT TRUNCATE ON TABLE public.workflow_runs TO anon;

GRANT DELETE ON TABLE public.workflow_runs TO authenticated;

GRANT INSERT ON TABLE public.workflow_runs TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_runs TO authenticated;

GRANT REFERENCES ON TABLE public.workflow_runs TO authenticated;

GRANT SELECT ON TABLE public.workflow_runs TO authenticated;

GRANT TRIGGER ON TABLE public.workflow_runs TO authenticated;

GRANT TRUNCATE ON TABLE public.workflow_runs TO authenticated;

GRANT UPDATE ON TABLE public.workflow_runs TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_runs TO service_role;

GRANT REFERENCES ON TABLE public.workflow_runs TO service_role;

GRANT TRIGGER ON TABLE public.workflow_runs TO service_role;

GRANT TRUNCATE ON TABLE public.workflow_runs TO service_role;

GRANT MAINTAIN ON TABLE public.workflow_steps TO anon;

GRANT REFERENCES ON TABLE public.workflow_steps TO anon;

GRANT TRIGGER ON TABLE public.workflow_steps TO anon;

GRANT TRUNCATE ON TABLE public.workflow_steps TO anon;

GRANT DELETE ON TABLE public.workflow_steps TO authenticated;

GRANT INSERT ON TABLE public.workflow_steps TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_steps TO authenticated;

GRANT REFERENCES ON TABLE public.workflow_steps TO authenticated;

GRANT SELECT ON TABLE public.workflow_steps TO authenticated;

GRANT TRIGGER ON TABLE public.workflow_steps TO authenticated;

GRANT TRUNCATE ON TABLE public.workflow_steps TO authenticated;

GRANT UPDATE ON TABLE public.workflow_steps TO authenticated;

GRANT MAINTAIN ON TABLE public.workflow_steps TO service_role;

GRANT REFERENCES ON TABLE public.workflow_steps TO service_role;

GRANT TRIGGER ON TABLE public.workflow_steps TO service_role;

GRANT TRUNCATE ON TABLE public.workflow_steps TO service_role;

GRANT EXECUTE ON FUNCTION private.can_manage_tenant_member(target_tenant uuid, target_role text) TO authenticated;

GRANT EXECUTE ON FUNCTION private.expire_all_tenant_invitations() TO service_role;

GRANT EXECUTE ON FUNCTION private.get_public_incident_status(p_hostname text) TO anon;

GRANT EXECUTE ON FUNCTION private.get_public_incident_status(p_hostname text) TO authenticated;

GRANT EXECUTE ON FUNCTION private.has_tenant_role(target_tenant uuid, allowed_roles text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION private.public_tenant_runtime(target_hostname text) TO anon;

GRANT EXECUTE ON FUNCTION private.public_tenant_runtime(target_hostname text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.accept_tenant_invitation(p_expected_tenant_id uuid, p_token_hash text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_marketplace_order(p_tenant uuid, p_listing uuid, p_quantity integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_tenant_invitation(p_tenant_id uuid, p_email text, p_role text, p_program_id bigint, p_permissions jsonb, p_token_hash text, p_expires_at timestamp with time zone) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_translation_candidate_draft(p_source_type text, p_source_id text, p_language text, p_source_fingerprint text, p_source_snapshot jsonb, p_translated_fields jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_admin_can_read_operations() TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_admin_has_module_permission(p_module text, p_action text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_admin_is_super_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_has_tenant_role(target_tenant uuid, allowed_roles text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.expire_tenant_invitations(p_tenant_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_incident_status(p_hostname text) TO anon;

GRANT EXECUTE ON FUNCTION public.get_public_incident_status(p_hostname text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_active_platform_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_translation_revision_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.lookup_public_agency_application(p_whatsapp text, p_platform text) TO anon;

GRANT EXECUTE ON FUNCTION public.lookup_public_agency_application(p_whatsapp text, p_platform text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.lookup_public_service_request(p_request_code text) TO anon;

GRANT EXECUTE ON FUNCTION public.lookup_public_service_request(p_request_code text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.manage_tenant_membership(p_tenant_id uuid, p_membership_id uuid, p_status text, p_role text, p_program_id bigint, p_permissions jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr100_admin_requests_index(p_search text, p_type text, p_status text, p_from timestamp with time zone, p_to timestamp with time zone, p_offset integer, p_limit integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr100_guard_ai_answer(p_identity text, p_payload jsonb) TO anon;

GRANT EXECUTE ON FUNCTION public.pr100_guard_ai_answer(p_identity text, p_payload jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr100_guard_password_reset(p_identity text, p_payload jsonb, p_started_at timestamp with time zone, p_honeypot text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr100_guard_password_reset(p_identity text, p_payload jsonb, p_started_at timestamp with time zone, p_honeypot text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_agency_application(p_whatsapp text, p_platform text, p_request_fingerprint text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_agency_application(p_whatsapp text, p_platform text, p_request_fingerprint text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_agency_application_by_code(p_tracking_code text, p_request_fingerprint text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_agency_application_by_code(p_tracking_code text, p_request_fingerprint text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_contact_message(p_tracking_code text, p_request_fingerprint text) TO service_role;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_job_application(p_tracking_code text, p_request_fingerprint text) TO service_role;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_service_request(p_request_code text, p_request_fingerprint text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr100_lookup_public_service_request(p_request_code text, p_request_fingerprint text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr100_oidc_gateway(p_action text, p_timestamp bigint, p_nonce text, p_body text, p_body_digest text, p_oidc_issuer text, p_oidc_subject text, p_oidc_audience text, p_oidc_team_id text, p_oidc_project_id text, p_oidc_project text, p_oidc_environment text, p_oidc_issued_at bigint, p_oidc_expires_at bigint) TO service_role;

GRANT EXECUTE ON FUNCTION public.pr101_new_order_code() TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_backup_dry_run(p_backup jsonb, p_scope text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_backup_schedule_status() TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_build_backup_payload(p_scope text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_create_page_version(p_page_id bigint, p_operation text, p_locale text, p_summary text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_create_private_backup(p_scope text[], p_mode text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_guard_submission(p_form_type text, p_identity text, p_payload jsonb, p_started_at timestamp with time zone, p_honeypot text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr99_guard_submission(p_form_type text, p_identity text, p_payload jsonb, p_started_at timestamp with time zone, p_honeypot text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_log_operation_failure(p_event_type text, p_entity_type text, p_entity_id text, p_safe_message text, p_route text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_mark_notifications_read(p_ids bigint[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_permanent_delete_trash(p_trash_id bigint, p_confirmation text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_require_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_restore_backup(p_backup jsonb, p_scope text[]) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_restore_entity_rows(p_table text, p_rows jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_restore_trash(p_trash_id bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_soft_delete(p_table text, p_id text, p_title text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_submit_ai_support(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr99_submit_ai_support(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_submit_application(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr99_submit_application(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_submit_contact(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr99_submit_contact(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_submit_job_application(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr99_submit_job_application(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_submit_service_request(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO anon;

GRANT EXECUTE ON FUNCTION public.pr99_submit_service_request(p_payload jsonb, p_identity text, p_started_at timestamp with time zone, p_honeypot text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.pr99_unpublish_page(p_page_id bigint, p_language text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.publish_page_builder_page(p_page_id bigint, p_language text, p_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.publish_translation_candidate(p_translation_revision_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.read_published_translation_revision_fields(p_source_type text, p_source_ids text[], p_language text) TO anon;

GRANT EXECUTE ON FUNCTION public.read_published_translation_revision_fields(p_source_type text, p_source_ids text[], p_language text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.refresh_product_kpis(p_tenant uuid, p_metric_date date) TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_platform_session(p_tenant uuid, p_auth_session uuid, p_device_label text, p_platform text, p_browser text, p_ip_hash text, p_suspicious boolean) TO authenticated;

GRANT EXECUTE ON FUNCTION public.require_translation_revision_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.resend_tenant_invitation(p_tenant_id uuid, p_invitation_id uuid, p_token_hash text, p_expires_at timestamp with time zone) TO authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_public_tenant_runtime(p_hostname text) TO anon;

GRANT EXECUTE ON FUNCTION public.resolve_public_tenant_runtime(p_hostname text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.restore_page_version(p_version_id bigint) TO authenticated;

GRANT EXECUTE ON FUNCTION public.review_translation_candidate(p_translation_revision_id uuid, p_review_notes text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.revoke_all_own_platform_sessions(p_tenant uuid, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.revoke_own_platform_session(p_session uuid, p_reason text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.revoke_tenant_invitation(p_tenant_id uuid, p_invitation_id uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_page_builder_draft(p_page_id bigint, p_language text, p_sections jsonb, p_page_patch jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.save_translation_candidate_fields(p_translation_revision_id uuid, p_translated_fields jsonb) TO authenticated;

GRANT EXECUTE ON FUNCTION public.start_workflow_run(p_workflow uuid, p_idempotency_key text, p_context jsonb) TO authenticated;
