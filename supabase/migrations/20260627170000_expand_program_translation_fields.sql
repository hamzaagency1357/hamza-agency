-- HAMZA AGENCY: fail-closed support for program-detail translation fields.
-- Scope is limited to public.content_translations.field_name.
-- This migration never changes RLS policies, existing translation values,
-- ownership, or the existing upsert conflict key.

DO $$
DECLARE
  field_type_kind "char";
  field_type_schema text;
  field_type_name text;
  check_row record;
  check_values text[];
  old_constraint_name text;
  old_constraint_count integer := 0;
  expanded_constraint_count integer := 0;
  unsupported_value text;
  old_values constant text[] := ARRAY['content', 'summary', 'title'];
  expanded_values constant text[] := ARRAY['benefits', 'content', 'faq', 'requirements', 'summary', 'title', 'updates'];
BEGIN
  IF to_regclass('public.content_translations') IS NULL THEN
    RAISE EXCEPTION 'public.content_translations does not exist';
  END IF;

  SELECT t.typtype, n.nspname, t.typname
    INTO field_type_kind, field_type_schema, field_type_name
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace table_namespace ON table_namespace.oid = c.relnamespace
  JOIN pg_type t ON t.oid = a.atttypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE table_namespace.nspname = 'public'
    AND c.relname = 'content_translations'
    AND a.attname = 'field_name'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF field_type_kind IS NULL THEN
    RAISE EXCEPTION 'public.content_translations.field_name does not exist';
  END IF;

  -- Only plain text-like columns and enums are supported. Domains fail closed
  -- because their own constraints must be reviewed separately.
  IF field_type_kind = 'e' THEN
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'requirements');
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'benefits');
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'updates');
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'faq');
  ELSIF field_type_kind <> 'b' THEN
    RAISE EXCEPTION 'Unsupported public.content_translations.field_name type kind: %', field_type_kind;
  END IF;

  -- Do not introduce a narrower allow-list over unexpected existing values.
  SELECT COALESCE(field_name::text, '<NULL>')
    INTO unsupported_value
  FROM public.content_translations
  WHERE field_name IS NULL
     OR field_name::text NOT IN ('title', 'summary', 'content', 'requirements', 'benefits', 'updates', 'faq')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Unexpected existing content_translations.field_name value: %', unsupported_value;
  END IF;

  -- Inspect only CHECK constraints that reference field_name. A constraint with
  -- string literals must be exactly the prior three-field allow-list or the
  -- expanded seven-field allow-list. Any other shape stops the migration.
  FOR check_row IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'content_translations'
      AND con.contype = 'c'
      AND position('field_name' IN lower(pg_get_constraintdef(con.oid))) > 0
  LOOP
    SELECT array_agg(DISTINCT literal ORDER BY literal)
      INTO check_values
    FROM (
      SELECT match[1] AS literal
      FROM regexp_matches(check_row.definition, '''([^'']*)''', 'g') AS match
    ) AS extracted;

    IF check_values IS NULL THEN
      CONTINUE;
    ELSIF check_values = old_values THEN
      old_constraint_count := old_constraint_count + 1;
      old_constraint_name := check_row.conname;
    ELSIF check_values = expanded_values THEN
      expanded_constraint_count := expanded_constraint_count + 1;
    ELSE
      RAISE EXCEPTION
        'Unexpected CHECK constraint % on content_translations.field_name; no changes were made',
        check_row.conname;
    END IF;
  END LOOP;

  IF old_constraint_count > 1 OR expanded_constraint_count > 1 THEN
    RAISE EXCEPTION 'Ambiguous content_translations.field_name CHECK constraints; no changes were made';
  END IF;

  -- Drop only the exact previous title/summary/content allow-list after it has
  -- been positively identified. No unknown constraint is ever removed.
  IF old_constraint_count = 1 THEN
    EXECUTE format('ALTER TABLE public.content_translations DROP CONSTRAINT %I', old_constraint_name);
  END IF;

  IF expanded_constraint_count = 0 THEN
    ALTER TABLE public.content_translations
      ADD CONSTRAINT content_translations_field_name_supported_check
      CHECK (
        field_name::text IN (
          'title',
          'summary',
          'content',
          'requirements',
          'benefits',
          'updates',
          'faq'
        )
      );
  END IF;
END
$$;
