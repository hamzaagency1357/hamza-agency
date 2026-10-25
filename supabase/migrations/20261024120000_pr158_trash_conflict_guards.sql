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
  v_columns text;
  v_select_columns text;
  v_row_count bigint;
  v_tenant_id uuid;
begin
  select role into v_role from public.admin_users where lower(email)=v_actor and is_active=true;
  if v_role not in ('super_admin','deputy_super_admin') then raise exception 'Not authorized'; end if;
  select id into strict v_tenant_id from public.tenants where is_primary=true and status='active';
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
  -- Atomic insert-only restore: concurrent writers may win, but never get overwritten.
  -- Reject malformed/incomplete snapshots instead of silently losing columns.
  if jsonb_typeof(coalesce(v_item.item_data,v_item.data)) <> 'object' then raise exception 'Invalid trash snapshot'; end if;
  if not (coalesce(v_item.item_data,v_item.data) ? 'id') then raise exception 'Missing snapshot identifier'; end if;
  select string_agg(format('%I',c.column_name),',' order by c.ordinal_position),
         string_agg(format('x.%I',c.column_name),',' order by c.ordinal_position)
    into v_columns,v_select_columns
    from information_schema.columns c
    where c.table_schema='public' and c.table_name=v_item.item_type
      and c.column_name in (select key from jsonb_each(coalesce(v_item.item_data,v_item.data)))
      and c.is_generated='NEVER'
      and (c.is_identity='NO' or c.identity_generation='BY DEFAULT');
  if v_columns is null or v_select_columns is null then raise exception 'Invalid restore columns'; end if;
  if not exists (
    select 1 from pg_catalog.pg_attribute a
    where a.attrelid = format('public.%I', v_item.item_type)::regclass
      and a.attname = 'id' and a.attnum > 0 and not a.attisdropped
  ) then raise exception 'Restore target has no id column'; end if;
  execute format(
    'insert into public.%1$I (%2$s) select %3$s from jsonb_populate_record(null::public.%1$I,$1) x on conflict do nothing',
    v_item.item_type,v_columns,v_select_columns
  ) using coalesce(v_item.item_data,v_item.data);
  get diagnostics v_row_count = row_count;
  if v_row_count <> 1 then raise exception 'Restore conflict: concurrent record exists; no data overwritten'; end if;
  -- Confirm the restored row is visible before marking its trash item restored.
  execute format(
    'select to_jsonb(t) from public.%I t where t.id::text=$1',
    v_item.item_type
  ) into v_result using v_item.item_id;
  if v_result is null then raise exception 'Restored record not found'; end if;
  v_result := jsonb_build_object('table',v_item.item_type,'restored',1,'actor',v_actor);
  update public.trash_items set restore_status='restored',restored_at=now() where id=p_trash_id and restore_status='restorable';
  insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome,tenant_id)
  values(v_actor,auth.uid(),'trash_restore',v_item.item_type,v_item.item_id,v_result::text,jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success',v_tenant_id);
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
  v_tenant_id uuid;
begin
  select role into v_role from public.admin_users where lower(email)=v_actor and is_active=true;
  if v_role not in ('super_admin','deputy_super_admin') then raise exception 'Not authorized'; end if;
  select id into strict v_tenant_id from public.tenants where is_primary=true and status='active';
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
  insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome,tenant_id)
  values(v_actor,auth.uid(),'trash_permanent_delete',v_item.item_type,v_item.item_id,jsonb_build_object('trash_id',p_trash_id),'/admin/trash','success',v_tenant_id);
  return jsonb_build_object('deleted',true,'trash_id',p_trash_id);
end $function$;

-- Restrict execution of SECURITY DEFINER RPCs; authorization is also checked inside each function.
revoke all on function public.pr99_restore_trash(bigint) from public, anon;
revoke all on function public.pr99_permanent_delete_trash(bigint,text) from public, anon;
revoke all on function public.pr99_restore_trash(bigint) from authenticated;
revoke all on function public.pr99_permanent_delete_trash(bigint,text) from authenticated;
grant execute on function public.pr99_restore_trash(bigint) to service_role;
grant execute on function public.pr99_permanent_delete_trash(bigint,text) to service_role;
