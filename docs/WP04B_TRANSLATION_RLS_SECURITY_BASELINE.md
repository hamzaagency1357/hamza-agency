# WP04-B — Translation RLS Security Baseline

## Final status

**Applied manually to Supabase Production on 2026-07-01.**

- Execution method: Supabase SQL Editor.
- Result: applied successfully in one transaction with the fail-closed guard.
- No rollback was run.
- No translation data was modified during the security apply.
- No AI Translation was run.
- No Program Admin translation access was added.

The final historical SQL record is:

```text
docs/sql/applied-production/20260701180000_harden_translation_rls_for_active_platform_admins.sql
```

> **DO NOT RE-RUN.** This is a historical record of Production SQL already applied successfully. It is not a pending Supabase CLI migration.

## Database workflow context

HAMZA AGENCY currently uses **Manual SQL Workflow documented in Git**.

`supabase/migrations/` does not currently represent a reliable Remote Supabase CLI History or an executable migration queue. The WP04-B SQL was therefore moved out of that path after successful manual execution and validation.

A future migration workflow may use Supabase CLI only after a dedicated Production Schema Baseline and Migration History Alignment work package is approved and completed.

## Scope that was applied

The SQL hardened access on:

- `public.admin_users`
- `public.program_admins`
- `public.content_translations`

The helper `public.is_active_platform_admin()` grants elevated access only when all of the following are true:

- a valid Auth session exists;
- JWT email matches `public.admin_users.email`;
- `is_active IS TRUE`;
- normalized role is exactly `super_admin` or `deputy_super_admin`.

It is `SECURITY DEFINER`, `STABLE`, uses `search_path=pg_catalog`, exposes no Execute grant to `anon`, and does not grant Program Admin any translation administration access.

## Public Reader contract

The existing Policy remains intentionally unchanged:

```sql
TO public
USING (
  is_published = true
  AND status IN ('reviewed', 'published')
)
```

Published content remains available to both anonymous visitors and authenticated non-admin visitors. Drafts, needs-review rows, unpublished rows, and broad administrative reads remain unavailable through the public reader.

## Validation results — all passed

### Validation 1 — RLS state

RLS is enabled on:

- `admin_users`
- `program_admins`
- `content_translations`

`FORCE ROW LEVEL SECURITY` is not enabled.

### Validation 2 — final Policy contract

The final restrictive policies were present for active platform administrators, and the existing Public Reader remained present for `content_translations`.

### Validation 3 — authorization helper

Verified on Production:

- `security_definer = true`
- function owner = `postgres`
- function configuration includes `search_path=pg_catalog`
- configured safe search path check = `true`
- `anon_cannot_execute = true`
- `authenticated_can_execute = true`

### Validation 4 — no remaining authenticated-wide policy

The wide-policy detector returned no rows for `admin_users`, `program_admins`, and `content_translations`. No audited policy remained equivalent to `USING true` or `WITH CHECK true` for authenticated access.

### Validation 5 — Public Reader remains fail-closed

Verified on Production:

- command = `SELECT`
- role target = `{public}`
- public-only target check = `true`
- `is_published` is required
- both `reviewed` and `published` statuses are required by the public policy condition

## Operational test results — all passed

The following pages opened successfully without saving, editing, publishing, deleting, or triggering AI:

- `/programs`
- `/programs/tiktok`
- `/faq`
- `/knowledge-center`
- `/admin/translations`
- `/admin/translations/automation`

Translation behavior verified:

- TikTok English rendered the complete seven-field published translation.
- TikTok Turkish fell back to Arabic when Turkish translation was incomplete.
- FAQ and Knowledge Center retained Arabic fallback when a complete published translation was unavailable.
- No public Draft or `needs_review` translation became visible.

## Historical read-only validation SQL

These statements are preserved for audit and future verification. They do not modify data.

### 1. Confirm RLS remains enabled

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n
  on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'admin_users',
    'program_admins',
    'content_translations'
  )
order by c.relname;
```

### 2. Inspect the Policy contract

```sql
select
  tablename,
  policyname,
  cmd,
  roles::text as roles,
  coalesce(qual, '(no USING condition)') as using_condition,
  coalesce(with_check, '(no WITH CHECK condition)') as with_check_condition
from pg_policies
where schemaname = 'public'
  and tablename in (
    'admin_users',
    'program_admins',
    'content_translations'
  )
order by tablename, policyname;
```

### 3. Confirm helper security properties and function grants

```sql
select
  n.nspname as function_schema,
  p.proname as function_name,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as function_owner,
  p.proconfig as function_config,
  exists (
    select 1
    from unnest(coalesce(p.proconfig, array[]::text[])) as setting
    where setting = 'search_path=pg_catalog'
  ) as has_configured_safe_search_path,
  not has_function_privilege(
    'anon',
    'public.is_active_platform_admin()',
    'EXECUTE'
  ) as anon_cannot_execute,
  has_function_privilege(
    'authenticated',
    'public.is_active_platform_admin()',
    'EXECUTE'
  ) as authenticated_can_execute
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'is_active_platform_admin'
  and pg_get_function_identity_arguments(p.oid) = '';
```

### 4. Detect any remaining authenticated-wide policy conditions

```sql
select
  tablename,
  policyname,
  cmd,
  roles::text as roles,
  coalesce(qual, '(no USING condition)') as using_condition,
  coalesce(with_check, '(no WITH CHECK condition)') as with_check_condition
from pg_policies
where schemaname = 'public'
  and tablename in (
    'admin_users',
    'program_admins',
    'content_translations'
  )
  and roles @> ARRAY['authenticated']::name[]
  and (
    regexp_replace(coalesce(qual, ''), '[[:space:]()]', '', 'g') = 'true'
    or regexp_replace(coalesce(with_check, ''), '[[:space:]()]', '', 'g') = 'true'
  )
order by tablename, policyname;
```

### 5. Confirm the Public Reader remains fail-closed

```sql
select
  policyname,
  cmd,
  roles::text as roles,
  qual as using_condition,
  roles = ARRAY['public']::name[] as targets_public_only,
  position('is_published' in lower(coalesce(qual, ''))) > 0
    as checks_is_published,
  position('reviewed' in lower(coalesce(qual, ''))) > 0
    as allows_reviewed,
  position('published' in lower(coalesce(qual, ''))) > 0
    as allows_published
from pg_policies
where schemaname = 'public'
  and tablename = 'content_translations'
  and policyname = 'Public can read published content translations';
```

## Emergency rollback SQL — historical only

> **Warning:** This rollback restores the broader pre-WP04-B policies. It must not be run automatically or for a speculative issue. It requires a separate operational decision after evidence of an actual failure.

```sql
begin;

drop policy if exists "Active platform admins can read admin users"
  on public.admin_users;

drop policy if exists "Active platform admins can manage program admin mappings"
  on public.program_admins;

drop policy if exists "Active platform admins can read content translations"
  on public.content_translations;

drop policy if exists "Active platform admins can insert content translations"
  on public.content_translations;

drop policy if exists "Active platform admins can update content translations"
  on public.content_translations;

create policy allow_authenticated_admin_users_select
on public.admin_users
for select
to authenticated
using (true);

create policy allow_authenticated_program_admins_manage
on public.program_admins
for all
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can insert content translations"
on public.content_translations
for insert
to authenticated
with check (true);

create policy "Authenticated admins can read content translations"
on public.content_translations
for select
to authenticated
using (true);

create policy "Authenticated admins can update content translations"
on public.content_translations
for update
to authenticated
using (true)
with check (true);

revoke all on function public.is_active_platform_admin() from authenticated;
drop function if exists public.is_active_platform_admin();

commit;
```
