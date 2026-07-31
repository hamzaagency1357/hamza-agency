-- HAMZA AGENCY PR101 one-membership-per-user tenant constraint
begin;

do $$
begin
  if not exists (
    select 1
    from pg_constraint constraint_row
    where constraint_row.conrelid='public.tenant_memberships'::regclass
      and constraint_row.conname='tenant_memberships_tenant_user_key'
  ) then
    alter table public.tenant_memberships
      add constraint tenant_memberships_tenant_user_key
      unique using index tenant_memberships_tenant_user_uidx;
  end if;
end;
$$;

commit;
