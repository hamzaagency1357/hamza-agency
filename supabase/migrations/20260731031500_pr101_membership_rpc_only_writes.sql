-- HAMZA AGENCY PR101 membership write boundary
-- Authenticated clients retain tenant-scoped reads, while all membership mutations use reviewed SECURITY DEFINER RPCs.
begin;

revoke insert,update,delete on table public.tenant_memberships from authenticated;
revoke all on function public.manage_tenant_membership(uuid,uuid,text,text,bigint,jsonb) from public,anon;
grant execute on function public.manage_tenant_membership(uuid,uuid,text,text,bigint,jsonb) to authenticated;
revoke all on function public.accept_tenant_invitation(uuid,text) from public,anon;
grant execute on function public.accept_tenant_invitation(uuid,text) to authenticated;

comment on table public.tenant_memberships is
  'Tenant membership reads are RLS-scoped. Authenticated writes are allowed only through reviewed invitation and membership RPCs.';

commit;
