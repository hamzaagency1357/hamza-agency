# WP04-B — Translation RLS Security Baseline

## Purpose

This document accompanies:

`supabase/migrations/20260701180000_harden_translation_rls_for_active_platform_admins.sql`

The migration is **prepared for review only**. It has not been executed in Supabase.

Its only purpose is to replace authenticated-wide administrative access on these tables:

- `public.admin_users`
- `public.program_admins`
- `public.content_translations`

with an explicit active-platform-admin allowlist:

- `super_admin`
- `deputy_super_admin`

A platform admin is allowed only when the JWT email matches `public.admin_users.email`, `is_active IS TRUE`, and the role is in the explicit allowlist.

## Explicit non-goals

This migration does **not**:

- change `content_translations` schema, constraints, values, indexes, or conflict keys;
- add `category`, `meta_title`, `meta_description`, `needs_update`, `archived`, or `sections`;
- add Foreign Keys or Program Admin scope;
- grant any translation access to `program_admin`;
- create a DELETE policy;
- change the public published-reader policy;
- modify application code, AI configuration, Vercel configuration, or production data.

## Public Reader contract

The existing policy named `Public can read published content translations` is intentionally not dropped or changed.

It remains `TO public` and must continue to allow only:

```sql
is_published = true
and status in ('reviewed', 'published')
```

`TO public` is intentional: published translations are public website content and must remain available whether a visitor is anonymous or has an authenticated Supabase session.

## Operational effect after a successful manual apply

| Actor | `content_translations` access |
|---|---|
| Public visitor, anonymous or authenticated | Published/reviewed public rows only, through the unchanged public policy |
| Authenticated non-admin | Published/reviewed public rows only; no administrative read, insert, or update |
| Active `super_admin` | Administrative select, insert, update across all translations |
| Active `deputy_super_admin` | Administrative select, insert, update across all translations |
| Inactive admin | Public-reader behavior only; no administrative access |
| `program_admin` | Public-reader behavior only; no translation administration in Phase 1 |
| AI Translation route | Continues to work only for active Super/Deputy Admin because its server-side check and RLS allowlist match |

The admin application currently looks up `admin_users` by JWT email. The tightened `admin_users` policy therefore allows an authenticated user to read only their own profile row, while an active Super/Deputy Admin can read all admin profiles.

## Pre-apply checklist

Before a manual Supabase execution, confirm all items:

1. The live policies still have the names audited in WP04-A.
2. The live public reader still has the exact published/reviewed condition.
3. The current active Super Admin can sign in successfully.
4. No Program Admin scoped-access requirement is being introduced in this execution.
5. No application code change is bundled with the SQL apply.
6. A project owner is ready to run the validation SQL below immediately after apply.

---

# Post-apply validation SQL — read-only

Run the following statements only **after** the migration is manually applied. Every statement is `SELECT` only.

## 1. Confirm RLS remains enabled

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

Expected: all three rows show `rls_enabled = true`; the migration does not enable `FORCE ROW LEVEL SECURITY`.

## 2. Inspect the final policy contract

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

Expected final policies include:

- `Active platform admins can read admin users`
- `Active platform admins can manage program admin mappings`
- `Active platform admins can read content translations`
- `Active platform admins can insert content translations`
- `Active platform admins can update content translations`
- unchanged `Public can read published content translations`

## 3. Confirm helper security properties and function grants

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
    where setting = 'search_path=pg_catalog, public'
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

Expected:

- `security_definer = true`
- `has_configured_safe_search_path = true`
- `anon_cannot_execute = true`
- `authenticated_can_execute = true`

The owner is displayed for audit. The owner must be a controlled project database owner, not an untrusted application role.

## 4. Detect any remaining authenticated-wide policy conditions

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
  and roles::text = '{authenticated}'
  and (
    coalesce(qual, '') = 'true'
    or coalesce(with_check, '') = 'true'
  )
order by tablename, policyname;
```

Expected: zero rows.

## 5. Confirm the unchanged Public Reader remains fail-closed

```sql
select
  policyname,
  cmd,
  roles::text as roles,
  qual as using_condition,
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

Expected:

- `cmd = SELECT`
- `roles = {public}`
- `checks_is_published = true`
- `allows_reviewed = true`
- `allows_published = true`

## 6. Manual application tests after SQL validation

Do not create test accounts unless separately approved.

| Existing account type | Expected result |
|---|---|
| Current active Super Admin | `/admin/translations` loads and can read/save translations; `/admin/translations/automation` authorization passes |
| Existing active Deputy Super Admin, when one exists | Same translation access as Super Admin |
| Existing Program Admin, when one exists | No administrative translation access |
| Existing inactive admin, when one exists | No administrative translation access |
| Authenticated non-admin, when one exists | No administrative translation access; published public translations remain readable by public pages |
| Public visitor | `/programs`, `/programs/tiktok`, `/faq`, and `/knowledge-center` still read only published/reviewed translations |

---

# Emergency rollback SQL

> **Warning:** This rollback intentionally restores the prior, broader authenticated access. Use it only for a verified operational failure that blocks essential administration, and investigate immediately afterward. It does not change data, tables, columns, constraints, or the public reader.

```sql
begin;

-- Remove all policies that depend on the helper before dropping it.
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

-- Restore only the exact broad policies audited before WP04-B.
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

-- The public published-reader policy was never changed by WP04-B.
revoke all on function public.is_active_platform_admin() from authenticated;
drop function if exists public.is_active_platform_admin();

commit;
```

## Rollback verification

After an emergency rollback, re-run policy inspection only to confirm the expected previous policies exist. Do not leave the broader policies in place longer than necessary.
