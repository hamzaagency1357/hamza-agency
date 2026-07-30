begin;

alter table public.admin_users
  drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('super_admin', 'deputy_super_admin', 'program_admin')) not valid;
alter table public.admin_users validate constraint admin_users_role_check;

create index if not exists content_translation_revisions_source_revision_fk_idx
  on public.content_translation_revisions(source_revision_id, source_type, source_id);

drop policy if exists allow_admins_application_select on public.agency_applications;
drop policy if exists allow_admins_application_update on public.agency_applications;

create policy allow_admins_application_select
on public.agency_applications
for select
to authenticated
using (
  public.current_admin_has_module_permission('applications', 'can_view')
  and exists (
    select 1 from public.admin_users as admin_user
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
        )
      )
      and (
        admin_user.role in ('super_admin', 'deputy_super_admin')
        or (
          admin_user.role = 'program_admin'
          and admin_user.assigned_program is not null
          and regexp_replace(lower(coalesce(agency_applications.platform, '')), '[^a-z0-9]', '', 'g')
            = regexp_replace(lower(admin_user.assigned_program), '[^a-z0-9]', '', 'g')
        )
      )
  )
);

create policy allow_admins_application_update
on public.agency_applications
for update
to authenticated
using (
  public.current_admin_has_module_permission('applications', 'can_edit')
  and exists (
    select 1 from public.admin_users as admin_user
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
        )
      )
      and (
        admin_user.role in ('super_admin', 'deputy_super_admin')
        or (
          admin_user.role = 'program_admin'
          and admin_user.assigned_program is not null
          and regexp_replace(lower(coalesce(agency_applications.platform, '')), '[^a-z0-9]', '', 'g')
            = regexp_replace(lower(admin_user.assigned_program), '[^a-z0-9]', '', 'g')
        )
      )
  )
)
with check (
  public.current_admin_has_module_permission('applications', 'can_edit')
  and exists (
    select 1 from public.admin_users as admin_user
    where admin_user.is_active is true
      and (
        admin_user.user_id = (select auth.uid())
        or (
          admin_user.user_id is null
          and lower(admin_user.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
        )
      )
      and (
        admin_user.role in ('super_admin', 'deputy_super_admin')
        or (
          admin_user.role = 'program_admin'
          and admin_user.assigned_program is not null
          and regexp_replace(lower(coalesce(agency_applications.platform, '')), '[^a-z0-9]', '', 'g')
            = regexp_replace(lower(admin_user.assigned_program), '[^a-z0-9]', '', 'g')
        )
      )
  )
);

drop policy if exists "Admins can view backups" on public.backups;
drop policy if exists "Admins can insert backups" on public.backups;
drop policy if exists "Admins can update backups" on public.backups;
drop policy if exists "Admins can delete backups" on public.backups;
create policy "Admins can view backups" on public.backups for select to authenticated using (public.is_active_admin());
create policy "Admins can insert backups" on public.backups for insert to authenticated with check (public.is_active_admin());
create policy "Admins can update backups" on public.backups for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
create policy "Admins can delete backups" on public.backups for delete to authenticated using (public.is_active_admin());

commit;
