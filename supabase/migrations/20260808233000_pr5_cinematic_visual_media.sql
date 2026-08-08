-- PR5: Cinematic visual media system.
-- Additive-only schema extension. No destructive table changes.
-- Production application is intentionally deferred until PR5 closeout.

alter table public.media
  add column if not exists status text not null default 'published',
  add column if not exists usage_context text not null default 'background',
  add column if not exists desktop_url text,
  add column if not exists desktop_fallback_url text,
  add column if not exists mobile_url text,
  add column if not exists mobile_fallback_url text,
  add column if not exists poster_url text,
  add column if not exists opacity numeric(4,3) not null default 1,
  add column if not exists dimming numeric(4,3) not null default 0.36,
  add column if not exists overlay_strength numeric(4,3) not null default 0.48,
  add column if not exists blur_px integer not null default 0,
  add column if not exists focal_position text not null default 'center center',
  add column if not exists autoplay boolean not null default true,
  add column if not exists loop boolean not null default true,
  add column if not exists publish_at timestamptz,
  add column if not exists unpublish_at timestamptz;

update public.media
set
  status = case when is_active is false then 'disabled' else 'published' end,
  desktop_url = coalesce(desktop_url, file_url),
  usage_context = coalesce(nullif(btrim(usage_context), ''), 'background')
where status is null or desktop_url is null or usage_context is null or btrim(usage_context) = '';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'media_pr5_status_check' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_pr5_status_check
      check (status in ('draft', 'review', 'approved', 'published', 'disabled', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_pr5_opacity_check' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_pr5_opacity_check check (opacity >= 0 and opacity <= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_pr5_dimming_check' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_pr5_dimming_check check (dimming >= 0 and dimming <= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_pr5_overlay_strength_check' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_pr5_overlay_strength_check check (overlay_strength >= 0 and overlay_strength <= 1);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_pr5_blur_check' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_pr5_blur_check check (blur_px >= 0 and blur_px <= 24);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'media_pr5_schedule_check' and conrelid = 'public.media'::regclass) then
    alter table public.media add constraint media_pr5_schedule_check
      check (unpublish_at is null or publish_at is null or unpublish_at > publish_at);
  end if;
end
$$;

create index if not exists media_pr5_public_scope_idx
  on public.media (page_slug, updated_at desc)
  where is_active is true and status = 'published';
create index if not exists media_pr5_schedule_idx
  on public.media (publish_at, unpublish_at)
  where is_active is true and status = 'published';

alter table public.media enable row level security;
drop policy if exists "allow_public_media_select" on public.media;
create policy "allow_public_media_select"
on public.media for select to anon, authenticated
using (
  is_active is true
  and status = 'published'
  and (publish_at is null or publish_at <= now())
  and (unpublish_at is null or unpublish_at > now())
);

-- Reuse existing admin-only Storage write policies and the existing bucket.
-- SVG remains intentionally excluded.
update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/jpeg','image/png','image/webp','image/avif','video/webm','video/mp4'
  ]::text[]
where id = 'media-library';

comment on column public.media.status is 'PR5 visual media lifecycle: draft, review, approved, published, disabled, archived.';
comment on column public.media.desktop_url is 'PR5 primary desktop image/video public URL.';
comment on column public.media.desktop_fallback_url is 'PR5 desktop fallback URL, normally MP4 for WebM video.';
comment on column public.media.mobile_url is 'PR5 mobile-specific image/video public URL; null inherits desktop.';
comment on column public.media.mobile_fallback_url is 'PR5 mobile fallback URL, normally MP4 for WebM video.';
comment on column public.media.poster_url is 'PR5 poster/static fallback for cinematic video.';
