-- HAMZA AGENCY PR101 security and tenant finalization
-- Additive, transactional, and safe to run only after the PR101 backfill migrations.
begin;

-- The status page must never expose incident ownership, private postmortems, or hidden updates.
drop policy if exists "public reads active incidents" on public.incidents;
drop policy if exists "public reads incident updates" on public.incident_updates;
drop policy if exists "public reads public incident updates" on public.incident_updates;
revoke all on public.incidents, public.incident_updates from anon;

create or replace function private.get_public_incident_status(p_hostname text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private
as $$
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
$$;
revoke all on function private.get_public_incident_status(text) from public;
grant execute on function private.get_public_incident_status(text) to anon,authenticated;

create or replace function public.get_public_incident_status(p_hostname text)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$ select private.get_public_incident_status(p_hostname); $$;
revoke all on function public.get_public_incident_status(text) from public;
grant execute on function public.get_public_incident_status(text) to anon,authenticated;

-- Seed the current production tenant and its trusted domains without changing public behavior.
insert into public.tenant_domains(tenant_id,hostname,status,is_primary,verified_at)
select id,'hamza-agency.com','active',true,now() from public.tenants where is_primary=true
on conflict (hostname) do update set tenant_id=excluded.tenant_id,status='active',is_primary=true,verified_at=coalesce(public.tenant_domains.verified_at,excluded.verified_at);
insert into public.tenant_domains(tenant_id,hostname,status,is_primary,verified_at)
select id,'www.hamza-agency.com','active',false,now() from public.tenants where is_primary=true
on conflict (hostname) do update set tenant_id=excluded.tenant_id,status='active',verified_at=coalesce(public.tenant_domains.verified_at,excluded.verified_at);

insert into public.tenant_branding(tenant_id,primary_color,secondary_color,accent_color,social_links,legal_overrides)
select id,'#7C3AED','#09050F','#D4AF37','{}'::jsonb,'{}'::jsonb from public.tenants where is_primary=true
on conflict (tenant_id) do nothing;

create unique index if not exists tenant_domains_lower_hostname_uidx on public.tenant_domains(lower(hostname));
alter table public.tenant_domains drop constraint if exists tenant_domains_normalized_hostname_check;
alter table public.tenant_domains add constraint tenant_domains_normalized_hostname_check
check (hostname=lower(hostname) and hostname ~ '^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$') not valid;
alter table public.tenant_domains validate constraint tenant_domains_normalized_hostname_check;

-- Legacy admin code remains compatible while all new tenant-aware code supplies tenant_id explicitly.
-- The trigger only fills a missing tenant with the current primary tenant and never overrides an explicit scope.
create or replace function private.assign_primary_tenant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from public.tenants where is_primary=true and status='active' limit 1;
  end if;
  if new.tenant_id is null then raise exception 'primary_tenant_not_configured'; end if;
  return new;
end;
$$;
revoke all on function private.assign_primary_tenant() from public,anon,authenticated;

-- Tenant columns become mandatory only after a final backfill and a compatibility trigger are installed.
do $$
declare
  table_name text;
  missing_count bigint;
begin
  foreach table_name in array array[
    'agency_applications','service_requests','job_applications','contact_messages','programs','pages','sections','media',
    'announcements','jobs','reviews','success_stories','partners','gallery_items','knowledge_base','notifications',
    'activity_logs','backups','restore_operations'
  ] loop
    if to_regclass('public.'||table_name) is not null then
      execute format('update public.%I set tenant_id=(select id from public.tenants where is_primary=true and status=''active'' limit 1) where tenant_id is null',table_name);
      execute format('select count(*) from public.%I where tenant_id is null',table_name) into missing_count;
      if missing_count<>0 then
        raise exception 'tenant_backfill_incomplete:%:%',table_name,missing_count;
      end if;
      execute format('drop trigger if exists pr101_assign_primary_tenant_trigger on public.%I',table_name);
      execute format('create trigger pr101_assign_primary_tenant_trigger before insert on public.%I for each row execute function private.assign_primary_tenant()',table_name);
      execute format('alter table public.%I alter column tenant_id set not null',table_name);
    end if;
  end loop;
end $$;

-- Cross-tenant references are indexed and guarded by composite uniqueness where applicable.
create unique index if not exists tenants_id_slug_uidx on public.tenants(id,slug);
create index if not exists tenant_domains_tenant_status_idx on public.tenant_domains(tenant_id,status,is_primary);
create index if not exists tenant_memberships_tenant_role_status_idx on public.tenant_memberships(tenant_id,role,status,user_id);
create index if not exists tenant_admin_audit_tenant_created_idx on public.tenant_admin_audit(tenant_id,created_at desc);

comment on function public.get_public_incident_status(text) is 'Returns only public, tenant-resolved incident fields; ownership and postmortems remain private.';
comment on function private.assign_primary_tenant() is 'Compatibility trigger for legacy single-tenant writes; explicit tenant_id values are never overridden.';
comment on constraint tenant_domains_normalized_hostname_check on public.tenant_domains is 'Domain resolution accepts normalized lowercase hostnames only.';

commit;
