begin;

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('super_admin', 'deputy_super_admin', 'program_admin')) not valid;

alter table public.admin_users
  validate constraint admin_users_role_check;

create index if not exists content_translation_revisions_source_revision_fk_idx
  on public.content_translation_revisions(source_revision_id, source_type, source_id);

-- Agency applications contain applicant PII. Enforce program scoping in RLS,
-- not only in the client, so a program administrator never receives rows for
-- another program over PostgREST. Program names and stored slugs are compared
-- after removing punctuation and spaces (for example BIGO LIVE / bigo-live).
drop policy if exists allow_admins_application_select on public.agency_applications;
drop policy if exists allow_admins_application_update on public.agency_applications;

create policy allow_admins_application_select
on public.agency_applications
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
      and (
        admin_user.role in ('super_admin', 'deputy_super_admin')
        or (
          admin_user.role = 'program_admin'
          and admin_user.assigned_program is not null
          and lower(regexp_replace(coalesce(agency_applications.platform, ''), '[^a-z0-9]', '', 'g'))
            = lower(regexp_replace(admin_user.assigned_program, '[^a-z0-9]', '', 'g'))
        )
      )
  )
);

create policy allow_admins_application_update
on public.agency_applications
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
      and (
        admin_user.role in ('super_admin', 'deputy_super_admin')
        or (
          admin_user.role = 'program_admin'
          and admin_user.assigned_program is not null
          and lower(regexp_replace(coalesce(agency_applications.platform, ''), '[^a-z0-9]', '', 'g'))
            = lower(regexp_replace(admin_user.assigned_program, '[^a-z0-9]', '', 'g'))
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(
            coalesce((select auth.jwt()) ->> 'email', '')
          )
        )
      )
      and (
        admin_user.role in ('super_admin', 'deputy_super_admin')
        or (
          admin_user.role = 'program_admin'
          and admin_user.assigned_program is not null
          and lower(regexp_replace(coalesce(agency_applications.platform, ''), '[^a-z0-9]', '', 'g'))
            = lower(regexp_replace(admin_user.assigned_program, '[^a-z0-9]', '', 'g'))
        )
      )
  )
);

-- Replace legacy email-only backup policies with the stable auth.uid()-first
-- administrator predicate. is_active_admin() is restricted to active
-- super_admin and deputy_super_admin accounts and retains the documented
-- legacy email fallback only for admin rows whose user_id is still null.
drop policy if exists "Admins can view backups" on public.backups;
drop policy if exists "Admins can insert backups" on public.backups;
drop policy if exists "Admins can update backups" on public.backups;
drop policy if exists "Admins can delete backups" on public.backups;

create policy "Admins can view backups"
on public.backups
for select
to authenticated
using (public.is_active_admin());

create policy "Admins can insert backups"
on public.backups
for insert
to authenticated
with check (public.is_active_admin());

create policy "Admins can update backups"
on public.backups
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "Admins can delete backups"
on public.backups
for delete
to authenticated
using (public.is_active_admin());

commit;
