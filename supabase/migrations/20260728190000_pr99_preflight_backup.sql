begin;

create table if not exists public.operations_preflight_backups (
  id uuid primary key default gen_random_uuid(),
  project_ref text not null,
  migration_key text not null,
  created_at timestamptz not null default now(),
  created_by text null,
  schema_version integer not null default 1,
  scope text[] not null default '{}',
  row_counts jsonb not null default '{}'::jsonb,
  snapshot jsonb not null default '{}'::jsonb,
  checksum text not null,
  notes text null
);

alter table public.operations_preflight_backups enable row level security;

create index if not exists operations_preflight_backups_created_at_idx
  on public.operations_preflight_backups (created_at desc);

create unique index if not exists operations_preflight_backups_migration_key_uidx
  on public.operations_preflight_backups (project_ref, migration_key);

revoke all on table public.operations_preflight_backups from anon;
revoke all on table public.operations_preflight_backups from authenticated;

drop policy if exists "operations backups readable by active admins" on public.operations_preflight_backups;
create policy "operations backups readable by active admins"
  on public.operations_preflight_backups
  for select
  to authenticated
  using (public.current_user_is_admin());

with payload as (
  select jsonb_build_object(
    'pages', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.pages order by id) row_value), '[]'::jsonb),
    'sections', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.sections order by id) row_value), '[]'::jsonb),
    'page_builder_sections', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.page_builder_sections order by page_id, language, sort_order, id) row_value), '[]'::jsonb),
    'settings', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.settings order by id) row_value), '[]'::jsonb),
    'content_translations', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.content_translations order by id) row_value), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.notifications order by id) row_value), '[]'::jsonb),
    'version_history', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.version_history order by id) row_value), '[]'::jsonb),
    'backups', coalesce((select jsonb_agg(to_jsonb(row_value)) from (select * from public.backups order by id) row_value), '[]'::jsonb)
  ) as snapshot
), counts as (
  select jsonb_build_object(
    'pages', (select count(*) from public.pages),
    'sections', (select count(*) from public.sections),
    'page_builder_sections', (select count(*) from public.page_builder_sections),
    'settings', (select count(*) from public.settings),
    'content_translations', (select count(*) from public.content_translations),
    'notifications', (select count(*) from public.notifications),
    'version_history', (select count(*) from public.version_history),
    'backups', (select count(*) from public.backups)
  ) as row_counts
)
insert into public.operations_preflight_backups (
  project_ref,
  migration_key,
  created_by,
  scope,
  row_counts,
  snapshot,
  checksum,
  notes
)
select
  'fvaurkfnsvsfohpzguho',
  'PR99_COMPLETE_MANAGEMENT_OPERATIONS',
  coalesce(auth.jwt() ->> 'email', 'migration'),
  array['pages','sections','page_builder_sections','settings','content_translations','notifications','version_history','backups'],
  counts.row_counts,
  payload.snapshot,
  encode(digest(convert_to(payload.snapshot::text, 'UTF8'), 'sha256'), 'hex'),
  'Non-destructive, project-scoped safety snapshot created before PR #99 schema changes.'
from payload cross join counts
on conflict (project_ref, migration_key) do nothing;

comment on table public.operations_preflight_backups is
  'Project-scoped safety snapshots created before high-impact non-destructive operations migrations. Never exposed publicly.';

commit;
