-- HAMZA AGENCY PR101 runtime corrections
-- Additive and transactional. Corrects pre-application function behavior without deleting business data.
begin;

alter table public.incident_updates add column if not exists is_public boolean not null default true;

drop policy if exists "public reads incident updates" on public.incident_updates;
create policy "public reads public incident updates" on public.incident_updates
for select to anon,authenticated
using (is_public=true);

create or replace function public.pr101_new_order_code()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select 'ORD-' || to_char(now(),'YYYY') || '-' || upper(encode(gen_random_bytes(5),'hex'));
$$;
revoke all on function public.pr101_new_order_code() from public;
grant execute on function public.pr101_new_order_code() to authenticated;

alter table public.marketplace_orders alter column order_code set default public.pr101_new_order_code();

create or replace function public.create_marketplace_order(p_tenant uuid,p_listing uuid,p_quantity integer default 1)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
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
$$;
revoke all on function public.create_marketplace_order(uuid,uuid,integer) from public,anon;
grant execute on function public.create_marketplace_order(uuid,uuid,integer) to authenticated;

create policy "clients insert own order items" on public.marketplace_order_items
for insert to authenticated
with check (
  tenant_id is not null and exists(
    select 1 from public.marketplace_orders o
    where o.id=order_id and o.tenant_id=marketplace_order_items.tenant_id and o.client_user_id=(select auth.uid())
  )
);

create or replace function public.revoke_own_platform_session(p_session uuid,p_reason text default 'user_requested')
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
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
$$;
revoke all on function public.revoke_own_platform_session(uuid,text) from public,anon;
grant execute on function public.revoke_own_platform_session(uuid,text) to authenticated;

create or replace function public.pr101_oidc_gateway(
  p_action text,
  p_timestamp bigint,
  p_nonce text,
  p_body text,
  p_body_digest text,
  p_oidc_issuer text,
  p_oidc_subject text,
  p_oidc_audience text,
  p_oidc_team_id text,
  p_oidc_project_id text,
  p_oidc_project text,
  p_oidc_environment text,
  p_oidc_issued_at bigint,
  p_oidc_expires_at bigint
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
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
$$;
revoke all on function public.pr101_oidc_gateway(text,bigint,text,text,text,text,text,text,text,text,text,text,bigint,bigint) from public,anon,authenticated;

commit;
