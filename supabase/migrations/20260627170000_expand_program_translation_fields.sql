-- Adds program-detail translation fields to content_translations.
-- Does not modify RLS policies, existing rows, or unique keys.

DO $$
DECLARE
  field_type_kind "char";
  field_type_schema text;
  field_type_name text;
  field_check record;
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

  IF field_type_kind = 'e' THEN
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'requirements');
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'benefits');
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'updates');
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L', field_type_schema, field_type_name, 'faq');
  ELSIF field_type_kind NOT IN ('b', 'd') THEN
    RAISE EXCEPTION 'Unsupported field_name type kind: %', field_type_kind;
  END IF;

  FOR field_check IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'content_translations'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%field_name%'
  LOOP
    EXECUTE format('ALTER TABLE public.content_translations DROP CONSTRAINT %I', field_check.conname);
  END LOOP;
END
$$;

ALTER TABLE public.content_translations
  ADD CONSTRAINT content_translations_field_name_supported_check
  CHECK (field_name::text IN ('title', 'summary', 'content', 'requirements', 'benefits', 'updates', 'faq'));
