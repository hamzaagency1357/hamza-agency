-- HAMZA AGENCY PR101 invitation crypto dependency hardening
begin;

alter function private.consume_invitation_rate_limit(uuid,text,text)
  set search_path=pg_catalog,public,private,extensions;

alter function public.create_tenant_invitation(uuid,text,text,bigint,jsonb,text,timestamptz)
  set search_path=pg_catalog,public,private,extensions;

alter function public.resend_tenant_invitation(uuid,uuid,text,timestamptz)
  set search_path=pg_catalog,public,private,extensions;

alter function public.accept_tenant_invitation(uuid,text)
  set search_path=pg_catalog,public,auth,private,extensions;

commit;
