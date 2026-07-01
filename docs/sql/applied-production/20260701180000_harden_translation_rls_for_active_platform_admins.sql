-- APPLIED MANUALLY TO SUPABASE PRODUCTION
-- Applied date: 2026-07-01
-- Execution method: Supabase SQL Editor
-- Status: Applied successfully and validated
-- DO NOT RE-RUN
-- This is a historical production record, not a Supabase CLI migration.
-- Current project database workflow: Manual SQL Workflow documented in Git.
--
-- HAMZA AGENCY: harden RLS for translation administration.
-- Scope: public.admin_users, public.program_admins, and public.content_translations.
-- This migration changes policies and one authorization helper only.
-- It does not change tables, columns, constraints, translation values, AI configuration,
-- the public published-reader policy, or Program Admin scope.
--
-- Public Reader remains unchanged and continues to allow only:
--   is_published = true AND status IN ('reviewed', 'published')
--
-- Program Admin intentionally receives no content_translations access in this baseline.

BEGIN;

-- SECURITY DEFINER is required because the helper must evaluate the current Auth
-- principal against public.admin_users without depending on a caller's table access.
-- The allowlist is explicit: unknown roles never become privileged.
CREATE OR REPLACE FUNCTION public.is_active_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.admin_users AS au
      WHERE pg_catalog.lower(au.email) = pg_catalog.lower(
        coalesce(auth.jwt() ->> 'email', '')
      )
        AND au.is_active IS TRUE
        AND pg_catalog.lower(au.role) IN (
          'super_admin',
          'deputy_super_admin'
        )
    );
$$;

-- Function EXECUTE is not available to PUBLIC/anon. Authenticated requests need it
-- only because the RLS policies below call the helper.
REVOKE ALL ON FUNCTION public.is_active_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_platform_admin() TO authenticated;

-- admin_users: replace authenticated-wide SELECT with self-profile access or
-- full access for an active Super Admin / Deputy Super Admin.
-- The baseline policy must exist. If it changed, fail the transaction for review.
DROP POLICY allow_authenticated_admin_users_select
  ON public.admin_users;

CREATE POLICY "Active platform admins can read admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  pg_catalog.lower(email) = pg_catalog.lower(
    coalesce(auth.jwt() ->> 'email', '')
  )
  OR public.is_active_platform_admin()
);

-- program_admins: Program Admin scope is not proven yet. Until a future scoped
-- migration exists, mappings are managed only by active platform admins.
-- The baseline policy must exist. If it changed, fail the transaction for review.
DROP POLICY allow_authenticated_program_admins_manage
  ON public.program_admins;

CREATE POLICY "Active platform admins can manage program admin mappings"
ON public.program_admins
FOR ALL
TO authenticated
USING (public.is_active_platform_admin())
WITH CHECK (public.is_active_platform_admin());

-- content_translations: remove only the three authenticated-wide administrative
-- policies. The existing Public Reader policy is intentionally left unchanged.
-- Each baseline policy must exist. If any changed, fail the transaction for review.
DROP POLICY "Authenticated admins can insert content translations"
  ON public.content_translations;

DROP POLICY "Authenticated admins can read content translations"
  ON public.content_translations;

DROP POLICY "Authenticated admins can update content translations"
  ON public.content_translations;

CREATE POLICY "Active platform admins can read content translations"
ON public.content_translations
FOR SELECT
TO authenticated
USING (public.is_active_platform_admin());

CREATE POLICY "Active platform admins can insert content translations"
ON public.content_translations
FOR INSERT
TO authenticated
WITH CHECK (public.is_active_platform_admin());

CREATE POLICY "Active platform admins can update content translations"
ON public.content_translations
FOR UPDATE
TO authenticated
USING (public.is_active_platform_admin())
WITH CHECK (public.is_active_platform_admin());

-- Transaction guard: fail closed if the public reader disappeared/changed from its
-- expected target, or if any authenticated-wide true policy remains on the audited
-- tables. pg_policies may render boolean expressions as true or (true), so the
-- comparison removes whitespace and parentheses before testing exact equivalence.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies AS p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'content_translations'
      AND p.policyname = 'Public can read published content translations'
      AND p.cmd = 'SELECT'
      AND p.roles = ARRAY['public']::name[]
  ) THEN
    RAISE EXCEPTION
      'Expected public published-reader policy is missing or has an unexpected command/role target';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies AS p
    WHERE p.schemaname = 'public'
      AND p.tablename IN (
        'admin_users',
        'program_admins',
        'content_translations'
      )
      AND p.roles @> ARRAY['authenticated']::name[]
      AND (
        regexp_replace(
          coalesce(p.qual, ''),
          '[[:space:]()]',
          '',
          'g'
        ) = 'true'
        OR regexp_replace(
          coalesce(p.with_check, ''),
          '[[:space:]()]',
          '',
          'g'
        ) = 'true'
      )
  ) THEN
    RAISE EXCEPTION
      'Authenticated-wide RLS policy with USING true or WITH CHECK true remains on an audited table';
  END IF;
END;
$$;

-- No DELETE policy is created.
-- The existing "Public can read published content translations" policy remains TO public.

COMMIT;
