-- HAMZA AGENCY PR105 macro runtime hardening
-- Additive-only replacement functions and grants. No existing business rows are changed.

create or replace function public.transition_marketplace_order(p_tenant uuid,p_order uuid,p_status text)
returns text language plpgsql security definer set search_path=public,private as $$
declare v_old text; v_client uuid;
begin
  perform private.assert_member(p_tenant,array['partner','employee','tenant_admin','super_admin','client']);
  select status,client_user_id into v_old,v_client from public.marketplace_orders where id=p_order and tenant_id=p_tenant for update;
  if not found then raise exception 'order_not_found' using errcode='22023'; end if;
  if v_client=(select auth.uid()) then
    if not (v_old='pending' and p_status='cancelled') then raise exception 'client_transition_denied' using errcode='42501'; end if;
  elsif not public.current_user_has_tenant_role(p_tenant,array['partner','employee','tenant_admin','super_admin']) then
    raise exception 'order_transition_denied' using errcode='42501';
  end if;
  if not ((v_old='pending' and p_status in ('confirmed','cancelled')) or (v_old='confirmed' and p_status in ('in_progress','cancelled')) or (v_old='in_progress' and p_status in ('fulfilled','cancelled'))) then
    raise exception 'invalid_order_transition' using errcode='22023';
  end if;
  update public.marketplace_orders set status=p_status,updated_at=now() where id=p_order;
  insert into public.commerce_events(tenant_id,order_id,actor_id,event_type,payload)
  values(p_tenant,p_order,(select auth.uid()),'order.status_changed',jsonb_build_object('from',v_old,'to',p_status));
  return p_status;
end $$;

create or replace function public.create_marketplace_review(p_tenant uuid,p_order uuid,p_listing uuid,p_rating integer,p_body text default null)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_id uuid;
begin
  perform private.assert_member(p_tenant,array['client']);
  if p_rating not between 1 and 5 then raise exception 'invalid_rating' using errcode='22023'; end if;
  if not exists(select 1 from public.marketplace_orders o join public.marketplace_order_items i on i.order_id=o.id where o.id=p_order and o.tenant_id=p_tenant and o.client_user_id=(select auth.uid()) and o.status='fulfilled' and i.listing_id=p_listing) then
    raise exception 'review_not_allowed' using errcode='42501';
  end if;
  insert into public.marketplace_reviews(tenant_id,listing_id,order_id,user_id,rating,body,status)
  values(p_tenant,p_listing,p_order,(select auth.uid()),p_rating,left(p_body,3000),'pending') returning id into v_id;
  return v_id;
exception when unique_violation then raise exception 'duplicate_review' using errcode='23505';
end $$;

create or replace function public.request_marketplace_refund(p_tenant uuid,p_order uuid,p_amount numeric,p_reason text)
returns uuid language plpgsql security definer set search_path=public,private as $$
declare v_id uuid; v_total numeric;
begin
  perform private.assert_member(p_tenant,array['client']);
  select total into v_total from public.marketplace_orders where id=p_order and tenant_id=p_tenant and client_user_id=(select auth.uid()) and status='fulfilled';
  if v_total is null or p_amount<=0 or p_amount>v_total then raise exception 'refund_not_allowed' using errcode='22023'; end if;
  insert into public.payment_refunds(tenant_id,order_id,amount,reason,status,created_by)
  values(p_tenant,p_order,p_amount,left(p_reason,1000),'requested',(select auth.uid())) returning id into v_id;
  return v_id;
end $$;

create or replace function public.task_runtime_evidence(p_tenant uuid,p_task uuid)
returns jsonb language plpgsql stable security definer set search_path=public,private as $$
declare result jsonb;
begin
  perform private.assert_member(p_tenant,array['employee','tenant_admin','super_admin']);
  select jsonb_build_object(
    'task',to_jsonb(t),
    'historyCount',(select count(*) from public.task_status_history h where h.task_id=t.id and h.tenant_id=p_tenant),
    'auditCount',(select count(*) from public.tenant_admin_audit a where a.tenant_id=p_tenant and a.entity_type='task' and a.entity_id=t.id::text)
  ) into result from public.tasks t where t.id=p_task and t.tenant_id=p_tenant;
  if result is null then raise exception 'task_not_found' using errcode='22023'; end if;
  return result;
end $$;

revoke all on function public.toggle_marketplace_favorite(uuid,uuid,boolean) from public;
revoke all on function public.upsert_marketplace_cart_item(uuid,uuid,integer) from public;
revoke all on function public.remove_marketplace_cart_item(uuid,uuid) from public;
revoke all on function public.clear_marketplace_cart(uuid) from public;
revoke all on function public.checkout_marketplace_cart(uuid,text) from public;
revoke all on function public.transition_marketplace_order(uuid,uuid,text) from public;
revoke all on function public.create_marketplace_review(uuid,uuid,uuid,integer,text) from public;
revoke all on function public.request_marketplace_refund(uuid,uuid,numeric,text) from public;
revoke all on function public.review_marketplace_refund(uuid,uuid,text,text) from public;
revoke all on function public.open_marketplace_dispute(uuid,uuid,text) from public;
revoke all on function public.add_marketplace_dispute_message(uuid,uuid,text) from public;
revoke all on function public.resolve_marketplace_dispute(uuid,uuid,text,text) from public;
revoke all on function public.manage_task_runtime(uuid,uuid,text,jsonb) from public;
revoke all on function public.task_runtime_evidence(uuid,uuid) from public;
revoke all on function public.evaluate_sla_runtime(uuid,uuid,text,text,timestamptz,timestamptz) from public;
revoke all on function public.start_workflow_runtime(uuid,uuid,text,jsonb) from public;
revoke all on function public.advance_workflow_runtime(uuid,uuid,boolean,text) from public;

grant execute on function public.toggle_marketplace_favorite(uuid,uuid,boolean) to authenticated;
grant execute on function public.upsert_marketplace_cart_item(uuid,uuid,integer) to authenticated;
grant execute on function public.remove_marketplace_cart_item(uuid,uuid) to authenticated;
grant execute on function public.clear_marketplace_cart(uuid) to authenticated;
grant execute on function public.checkout_marketplace_cart(uuid,text) to authenticated;
grant execute on function public.transition_marketplace_order(uuid,uuid,text) to authenticated;
grant execute on function public.create_marketplace_review(uuid,uuid,uuid,integer,text) to authenticated;
grant execute on function public.request_marketplace_refund(uuid,uuid,numeric,text) to authenticated;
grant execute on function public.review_marketplace_refund(uuid,uuid,text,text) to authenticated;
grant execute on function public.open_marketplace_dispute(uuid,uuid,text) to authenticated;
grant execute on function public.add_marketplace_dispute_message(uuid,uuid,text) to authenticated;
grant execute on function public.resolve_marketplace_dispute(uuid,uuid,text,text) to authenticated;
grant execute on function public.manage_task_runtime(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.task_runtime_evidence(uuid,uuid) to authenticated;
grant execute on function public.evaluate_sla_runtime(uuid,uuid,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.start_workflow_runtime(uuid,uuid,text,jsonb) to authenticated;
grant execute on function public.advance_workflow_runtime(uuid,uuid,boolean,text) to authenticated;
