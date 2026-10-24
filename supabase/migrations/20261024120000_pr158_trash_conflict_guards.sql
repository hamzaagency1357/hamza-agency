-- PR #158: forward-only, deploy separately after owner approval.
-- Fail closed for any existing record: never overwrite newer data during trash restore.
create or replace function public.pr99_restore_trash(p_trash_id bigint)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.pr99_require_admin();
  v_role text;
  v_item public.trash_items%rowtype;
  v_exists boolean;
  v_result jsonb;
  v_id_type text;
begin
  select role into v_role from public.admin_users where lower(email)=v_actor and is_active=true;
  if v_role not in ('super_admin','deputy_super_admin') then raise exception 'Not authorized'; end if;
  select * into v_item from public.trash_items where id=p_trash_id and restore_status='restorable' for update;
  if not found then raise exception 'Trash item unavailable'; end if;
  if not (v_item.item_type=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported trash entity'; end if;
  -- Serialize restore/delete attempts for the same entity across this migration's RPCs.
  perform pg_advisory_xact_lock(hashtextextended(v_item.item_type || ':' || v_item.item_id, 0));
  select c.data_type into v_id_type from information_schema.columns c where c.table_schema='public' and c.table_name=v_item.item_type and c.column_name='id';
  if v_id_type not in ('bigint','integer','smallint','uuid','text','character varying') then raise exception 'Unsupported entity identifier type'; end if;
  if coalesce(v_item.item_data,v_item.data)->>'id' is distinct from v_item.item_id then raise exception 'Trash snapshot identifier mismatch'; end if;
  execute format('select exists(select 1 from public.%I where id::text=$1)',v_item.item_type) into v_exists using v_item.item_id;
  if v_exists then raise exception 'Restore conflict: original record exists; no data overwritten'; end if;
  v_result := public.pr99_restore_entity_rows(v_item.item_type,jsonb_build_array(coalesce(v_item.item_data,v_item.data)));
  update public.trash_items set restore_status='restored',restored_at=now() where id=p_trash_id and restore_status='restorable';
  insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome)
  values(v_actor,auth.uid(),'trash_restore',v_item.item_type,v_item.item_id,'',jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success');
  return v_result||jsonb_build_object('trash_id',p_trash_id);
end $function$;

create or replace function public.pr99_permanent_delete_trash(p_trash_id bigint,p_confirmation text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare
  v_actor text := public.pr99_require_admin();
  v_role text;
  v_item public.trash_items%rowtype;
  v_exists boolean;
  v_id_type text;
begin
  select role into v_role from public.admin_users where lower(email)=v_actor and is_active=true;
  if v_role not in ('super_admin','deputy_super_admin') then raise exception 'Not authorized'; end if;
  if p_confirmation <> 'DELETE PERMANENTLY' then raise exception 'Second confirmation is invalid'; end if;
  select * into v_item from public.trash_items where id=p_trash_id and restore_status='restorable' for update;
  if not found then raise exception 'Trash item unavailable'; end if;
  if not (v_item.item_type=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported trash entity'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_item.item_type || ':' || v_item.item_id, 0));
  select c.data_type into v_id_type from information_schema.columns c where c.table_schema='public' and c.table_name=v_item.item_type and c.column_name='id';
  if v_id_type not in ('bigint','integer','smallint','uuid','text','character varying') then raise exception 'Unsupported entity identifier type'; end if;
  execute format('select exists(select 1 from public.%I where id::text=$1)',v_item.item_type) into v_exists using v_item.item_id;
  if v_exists then raise exception 'Permanent delete conflict: live record exists; no data deleted'; end if;
  update public.trash_items set restore_status='permanently_deleted',item_data=null,data='{}'::jsonb where id=p_trash_id and restore_status='restorable';
  insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome)
  values(v_actor,auth.uid(),'trash_permanent_delete',v_item.item_type,v_item.item_id,jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success');
  return jsonb_build_object('deleted',true,'trash_id',p_trash_id);
end $function$;
