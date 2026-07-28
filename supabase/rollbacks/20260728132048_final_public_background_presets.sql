-- Reviewed rollback for:
-- 20260728132048_final_public_background_presets.sql
--
-- This rollback deliberately refuses to run if a new preset identifier is
-- already stored. That prevents data loss or an invalid constraint. Convert
-- such rows to one of royal/hepta/gold/nebula before retrying.

begin;

do $$
begin
  if exists (
    select 1
    from public.visual_experience_settings
    where background not in ('royal', 'hepta', 'gold', 'nebula')
  ) then
    raise exception
      'Rollback stopped: new visual background preset values are in use.';
  end if;
end
$$;

alter table public.visual_experience_settings
  drop constraint if exists visual_experience_settings_background_check;

alter table public.visual_experience_settings
  add constraint visual_experience_settings_background_check
  check (background in ('royal', 'hepta', 'gold', 'nebula'));

commit;
