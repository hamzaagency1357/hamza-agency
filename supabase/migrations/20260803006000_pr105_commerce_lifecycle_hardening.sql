-- HAMZA AGENCY PR105 commerce lifecycle hardening
-- Additive-only function replacements for real local runtime verification.

create or replace function public.checkout_marketplace_cart(p_tenant uuid,p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path=public,private as $$
declare v_cart uuid; v_order uuid; v_code text; v_currency text; v_total numeric(14,2);
begin
  perform private.assert_member(p_tenant,array['client']);
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{12,100}$' then
    raise exception 'invalid_idempotency_key' using errcode='22023';
  end if;

  select order_id into v_order
  from public.commerce_events
  where tenant_id=p_tenant and idempotency_key='checkout:'||p_idempotency_key;

  if v_order is not null then
    return (
      select jsonb_build_object('orderId',id,'orderCode',order_code,'duplicate',true)
      from public.marketplace_orders where id=v_order
    );
  end if;

  select id into v_cart
  from public.marketplace_carts
  where tenant_id=p_tenant and user_id=(select auth.uid()) and status='active'
  for update;

  if v_cart is null or not exists(select 1 from public.marketplace_cart_items where cart_id=v_cart) then
    raise exception 'empty_cart' using errcode='22023';
  end if;

  if exists(
    select 1
    from public.marketplace_cart_items i
    left join public.marketplace_listings l on l.id=i.listing_id
    where i.cart_id=v_cart
      and (l.id is null or l.status<>'published' or l.price_amount is null
        or coalesce((l.availability->>'available')::boolean,true)=false)
  ) then
    raise exception 'cart_contains_unavailable_listing' using errcode='22023';
  end if;

  select min(currency),sum(i.quantity*l.price_amount)
  into v_currency,v_total
  from public.marketplace_cart_items i
  join public.marketplace_listings l on l.id=i.listing_id
  where i.cart_id=v_cart;

  if exists(
    select 1
    from public.marketplace_cart_items i
    join public.marketplace_listings l on l.id=i.listing_id
    where i.cart_id=v_cart and l.currency is distinct from v_currency
  ) then
    raise exception 'mixed_currency_cart' using errcode='22023';
  end if;

  v_code='ORD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.marketplace_orders(
    tenant_id,order_code,client_user_id,status,currency,subtotal,total,payment_status
  ) values(
    p_tenant,v_code,(select auth.uid()),'pending',v_currency,v_total,v_total,'unpaid'
  ) returning id into v_order;

  insert into public.marketplace_order_items(
    order_id,tenant_id,listing_id,title_snapshot,quantity,unit_price,total_price
  )
  select v_order,p_tenant,l.id,coalesce(l.translations,'{}'::jsonb),
         i.quantity,l.price_amount,i.quantity*l.price_amount
  from public.marketplace_cart_items i
  join public.marketplace_listings l on l.id=i.listing_id
  where i.cart_id=v_cart;

  delete from public.marketplace_carts
  where tenant_id=p_tenant
    and user_id=(select auth.uid())
    and status='converted'
    and id<>v_cart;

  update public.marketplace_carts
  set status='converted',updated_at=now()
  where id=v_cart;

  insert into public.commerce_events(
    tenant_id,order_id,actor_id,event_type,idempotency_key,payload
  ) values(
    p_tenant,v_order,(select auth.uid()),'order.created',
    'checkout:'||p_idempotency_key,jsonb_build_object('total',v_total)
  );

  return jsonb_build_object(
    'orderId',v_order,'orderCode',v_code,'duplicate',false,'total',v_total
  );
end $$;

create or replace function public.open_marketplace_dispute(
  p_tenant uuid,p_order uuid,p_reason text
)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_id uuid;
begin
  perform private.assert_member(p_tenant,array['client']);

  if not exists(
    select 1
    from public.marketplace_orders
    where id=p_order
      and tenant_id=p_tenant
      and client_user_id=(select auth.uid())
      and status in ('confirmed','in_progress','fulfilled')
  ) then
    raise exception 'dispute_not_allowed' using errcode='42501';
  end if;

  if exists(
    select 1
    from public.marketplace_disputes
    where order_id=p_order and status in ('open','under_review')
  ) then
    raise exception 'duplicate_dispute' using errcode='23505';
  end if;

  insert into public.marketplace_disputes(
    tenant_id,order_id,opened_by,reason,status
  ) values(
    p_tenant,p_order,(select auth.uid()),left(p_reason,3000),'open'
  ) returning id into v_id;

  return v_id;
end $$;

create or replace function public.pr105_list_commerce_events(p_tenant uuid,p_order uuid)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','public','private'
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
begin
  if v_user is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select tm.role::text
  into v_role
  from public.tenant_memberships tm
  where tm.tenant_id=p_tenant
    and tm.user_id=v_user
    and tm.status='active';

  if v_role is null or v_role not in ('partner','employee','tenant_admin','super_admin') then
    raise exception 'commerce_events_forbidden' using errcode='42501';
  end if;

  if not exists(
    select 1 from public.marketplace_orders o
    where o.id=p_order and o.tenant_id=p_tenant
  ) then
    raise exception 'commerce_order_forbidden' using errcode='42501';
  end if;

  if v_role='partner' and not exists(
    select 1
    from public.marketplace_order_items oi
    join public.marketplace_listings l on l.id=oi.listing_id
    where oi.order_id=p_order
      and oi.tenant_id=p_tenant
      and l.tenant_id=p_tenant
      and l.partner_user_id=v_user
  ) then
    raise exception 'commerce_order_forbidden' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object('eventType',e.event_type,'createdAt',e.created_at)
      order by e.created_at,e.id
    )
    from public.commerce_events e
    where e.tenant_id=p_tenant and e.order_id=p_order
  ),'[]'::jsonb);
end $$;

revoke all on function public.checkout_marketplace_cart(uuid,text) from public;
revoke all on function public.open_marketplace_dispute(uuid,uuid,text) from public;
revoke all on function public.pr105_list_commerce_events(uuid,uuid) from public;
revoke all on function public.pr105_list_commerce_events(uuid,uuid) from anon;
grant execute on function public.checkout_marketplace_cart(uuid,text) to authenticated;
grant execute on function public.open_marketplace_dispute(uuid,uuid,text) to authenticated;
grant execute on function public.pr105_list_commerce_events(uuid,uuid) to authenticated;
