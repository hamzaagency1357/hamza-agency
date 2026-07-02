-- HAMZA AGENCY: safe support for CMS section translations.
-- Scope is limited to public.content_translations.source_type.
-- This migration never changes RLS policies, existing translation values,
-- ownership, or the existing upsert conflict key.
--
-- It is fail-closed: if the existing source_type restriction is not a known
-- shape, the migration stops without changing the database.

DO $$
DECLARE
  source_type_kind "char";
  source_type_schema text;
  source_type_name text;
  check_row record;
  check_values text[];
  old_constraint_name text;
  old_constraint_count integer := 0;
  expanded_constraint_count integer := 0;
  unsupported_value text;
  old_values constant text[] := ARRAY[
    'faqs',
    'jobs',
    'knowledge_base',
    'legal_pages',
    'pages',
    'partners',
    'programs',
    'services'
  ];
  expanded_values constant text[] := ARRAY[
    'faqs',
    'jobs',
    'knowledge_base',
    'legal_pages',
    'pages',
    'partners',
    'programs',
    'sections',
    'services'
  ];
BEGIN
  IF to_regclass('public.content_translations') IS NULL THEN
    RAISE EXCEPTION 'public.content_translations does not exist';
  END IF;

  SELECT t.typtype, n.nspname, t.typname
    INTO source_type_kind, source_type_schema, source_type_name
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace table_namespace ON table_namespace.oid = c.relnamespace
  JOIN pg_type t ON t.oid = a.atttypid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE table_namespace.nspname = 'public'
    AND c.relname = 'content_translations'
    AND a.attname = 'source_type'
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF source_type_kind IS NULL THEN
    RAISE EXCEPTION 'public.content_translations.source_type does not exist';
  END IF;

  -- Existing text-like source_type columns rely on a CHECK constraint. Enums
  -- can safely receive the new value without changing any existing rows.
  IF source_type_kind = 'e' THEN
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', source_type_schema, source_type_name, 'sections');
    RETURN;
  ELSIF source_type_kind <> 'b' THEN
    RAISE EXCEPTION 'Unsupported public.content_translations.source_type type kind: %', source_type_kind;
  END IF;

  SELECT COALESCE(source_type::text, '<NULL>')
    INTO unsupported_value
  FROM public.content_translations
  WHERE source_type IS NULL
     OR source_type::text NOT IN (
       'faqs',
       'jobs',
       'knowledge_base',
       'legal_pages',
       'pages',
       'partners',
       'programs',
       'sections',
       'services'
     )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Unexpected existing content_translations.source_type value: %', unsupported_value;
  END IF;

  -- Inspect only CHECK constraints that reference source_type. A string-list
  -- restriction must be exactly the known original allow-list or the expanded
  -- allow-list. Any unfamiliar shape stops the migration rather than risking a
  -- narrower or destructive replacement.
  FOR check_row IN
    SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'content_translations'
      AND con.contype = 'c'
      AND position('source_type' IN lower(pg_get_constraintdef(con.oid))) > 0
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
        'Unexpected CHECK constraint % on content_translations.source_type; no changes were made',
        check_row.conname;
    END IF;
  END LOOP;

  IF old_constraint_count > 1 OR expanded_constraint_count > 1 THEN
    RAISE EXCEPTION 'Ambiguous content_translations.source_type CHECK constraints; no changes were made';
  END IF;

  IF old_constraint_count = 1 THEN
    EXECUTE format('ALTER TABLE public.content_translations DROP CONSTRAINT %I', old_constraint_name);
  END IF;

  IF expanded_constraint_count = 0 AND old_constraint_count = 1 THEN
    ALTER TABLE public.content_translations
      ADD CONSTRAINT content_translations_source_type_supported_check
      CHECK (
        source_type::text IN (
          'faqs',
          'jobs',
          'knowledge_base',
          'legal_pages',
          'pages',
          'partners',
          'programs',
          'sections',
          'services'
        )
      );
  END IF;
END
$$;