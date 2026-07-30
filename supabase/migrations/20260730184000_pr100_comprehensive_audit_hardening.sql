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
