-- HAMZA AGENCY PR #98
-- Non-destructive expansion for the existing Visual Background Presets.
--
-- This migration changes only the allowed values of the existing
-- visual_experience_settings.background column. It does not alter rows,
-- privileges, RLS, policies, triggers, or the public approval guard.

begin;

alter table public.visual_experience_settings
  drop constraint if exists visual_experience_settings_background_check;

alter table public.visual_experience_settings
  add constraint visual_experience_settings_background_check
  check (
    background in (
      -- Existing values remain valid so no stored row is rewritten.
      'royal',
      'hepta',
      'gold',
      'nebula',
      -- Public Experience preset identifiers.
      'global-luxury-aurora',
      'classic-purple-agency',
      'royal-creator-waves',
      'golden-network-pulse',
      'galaxy-agency-flow',
      'live-streaming-signal',
      'premium-glass-orbits',
      'digital-stage-lights'
    )
  ) not valid;

alter table public.visual_experience_settings
  validate constraint visual_experience_settings_background_check;

commit;
