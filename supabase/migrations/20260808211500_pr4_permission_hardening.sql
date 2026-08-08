begin;

create or replace function public.pr4_admin_can_module(p_module text, p_action text default 'can_view')
returns boolean language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare v_admin public.admin_users%rowtype;v_value boolean;
begin
  select * into v_admin from public.admin_users where id=public.pr4_current_admin_id() and is_active is not false;
  if not found then return false;end if;
  if v_admin.role='super_admin' then return true;end if;
  if v_admin.role='program_admin' and p_module not in('dashboard','applications','programs') then return false;end if;
  select case p_action when 'can_create' then ap.can_create when 'can_edit' then ap.can_edit when 'can_delete' then ap.can_delete when 'can_export' then ap.can_export when 'can_manage' then ap.can_manage else ap.can_view end or ap.can_manage
  into v_value from public.admin_permissions ap
  where ap.module_key=p_module and (ap.admin_user_id=v_admin.id or (ap.admin_user_id is null and lower(ap.admin_email)=lower(v_admin.email)))
  order by case when ap.admin_user_id=v_admin.id then 0 else 1 end limit 1;
  if v_admin.role='deputy_super_admin' and v_value is null then return true;end if;
  return coalesce(v_value,false);
end $$;
revoke all on function public.pr4_admin_can_module(text,text) from public,anon;
grant execute on function public.pr4_admin_can_module(text,text) to authenticated;

comment on function public.pr4_admin_can_module is 'PR4 module authorization: super admin always, deputy defaults to allowed when no explicit row exists, other roles require an explicit permission and program admins remain scoped.';
commit;
