-- HAMZA AGENCY
-- Translation schema alignment + Arabic source change invalidation
-- Apply once in Supabase SQL Editor after reviewing the deployed code.
-- This migration is idempotent and preserves legacy translation source types.

begin;

-- Keep the database contract aligned with every source and field used by the
-- current translation system, while retaining legacy rows from earlier phases.
alter table public.content_translations
  drop constraint if exists content_translations_source_type_check;

alter table public.content_translations
  add constraint content_translations_source_type_check
  check (
    source_type in (
      'programs',
      'pages',
      'sections',
      'faqs',
      'knowledge_base',
      'partners',
      'jobs',
      'reviews',
      'success_stories',
      'gallery_items',
      'announcements',
      'services',
      'legal_pages'
    )
  );

alter table public.content_translations
  drop constraint if exists content_translations_field_name_check;

alter table public.content_translations
  add constraint content_translations_field_name_check
  check (
    field_name in (
      'title',
      'summary',
      'content',
      'requirements',
      'benefits',
      'updates',
      'faq',
      'department',
      'location',
      'job_type',
      'country',
      'person_name',
      'platform',
      'button_label',
      'meta_title',
      'meta_description',
      'question',
      'answer'
    )
  );

-- Public access must match the application reader exactly: published only.
drop policy if exists "Public can read published content translations" on public.content_translations;
create policy "Public can read published content translations"
on public.content_translations
for select
to public
using (is_published = true and status = 'published');

-- Any change to an Arabic source field unpublishes its translations and sends
-- them back to needs_review. The translations remain stored for the admin,
-- but public visitors fall back to Arabic until a new review and publish.
create or replace function public.invalidate_content_translations_on_source_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb := to_jsonb(old);
  new_row jsonb := to_jsonb(new);
  watched_column text;
  changed boolean := false;
begin
  -- TG_ARGV[0] is the translation source type. Remaining values are Arabic
  -- source column names to watch. JSONB lookup keeps the migration safe when
  -- optional legacy columns do not exist on a particular installation.
  foreach watched_column in array tg_argv[1:array_length(tg_argv, 1)] loop
    if old_row -> watched_column is distinct from new_row -> watched_column then
      changed := true;
      exit;
    end if;
  end loop;

  if changed then
    update public.content_translations
       set status = 'needs_review',
           reviewed = false,
           is_published = false,
           updated_at = now()
     where source_type = tg_argv[0]
       and source_id = new.id::text
       and (is_published = true or reviewed = true or status in ('published', 'reviewed'));
  end if;

  return new;
end;
$$;

-- The trigger list mirrors lib/i18n/translationSources.ts.
drop trigger if exists invalidate_translations_after_program_change on public.programs;
create trigger invalidate_translations_after_program_change
after update on public.programs
for each row execute function public.invalidate_content_translations_on_source_change(
  'programs', 'name', 'title', 'short_description', 'summary', 'description', 'content', 'requirements', 'benefits', 'updates', 'faq'
);

drop trigger if exists invalidate_translations_after_page_change on public.pages;
create trigger invalidate_translations_after_page_change
after update on public.pages
for each row execute function public.invalidate_content_translations_on_source_change(
  'pages', 'title', 'seo_description', 'summary', 'content'
);

drop trigger if exists invalidate_translations_after_section_change on public.sections;
create trigger invalidate_translations_after_section_change
after update on public.sections
for each row execute function public.invalidate_content_translations_on_source_change(
  'sections', 'title', 'subtitle', 'content'
);

drop trigger if exists invalidate_translations_after_faq_change on public.faqs;
create trigger invalidate_translations_after_faq_change
after update on public.faqs
for each row execute function public.invalidate_content_translations_on_source_change(
  'faqs', 'question', 'title', 'category', 'answer', 'content'
);

drop trigger if exists invalidate_translations_after_knowledge_change on public.knowledge_base;
create trigger invalidate_translations_after_knowledge_change
after update on public.knowledge_base
for each row execute function public.invalidate_content_translations_on_source_change(
  'knowledge_base', 'title', 'summary', 'category', 'content', 'answer', 'body'
);

drop trigger if exists invalidate_translations_after_partner_change on public.partners;
create trigger invalidate_translations_after_partner_change
after update on public.partners
for each row execute function public.invalidate_content_translations_on_source_change(
  'partners', 'name', 'title', 'category', 'type', 'description', 'summary'
);

drop trigger if exists invalidate_translations_after_job_change on public.jobs;
create trigger invalidate_translations_after_job_change
after update on public.jobs
for each row execute function public.invalidate_content_translations_on_source_change(
  'jobs', 'title', 'short_description', 'description', 'department', 'location', 'job_type', 'requirements'
);

drop trigger if exists invalidate_translations_after_review_change on public.reviews;
create trigger invalidate_translations_after_review_change
after update on public.reviews
for each row execute function public.invalidate_content_translations_on_source_change(
  'reviews', 'reviewer_name', 'platform', 'content', 'country'
);

drop trigger if exists invalidate_translations_after_success_story_change on public.success_stories;
create trigger invalidate_translations_after_success_story_change
after update on public.success_stories
for each row execute function public.invalidate_content_translations_on_source_change(
  'success_stories', 'title', 'result_summary', 'story', 'person_name', 'country', 'platform'
);

drop trigger if exists invalidate_translations_after_gallery_item_change on public.gallery_items;
create trigger invalidate_translations_after_gallery_item_change
after update on public.gallery_items
for each row execute function public.invalidate_content_translations_on_source_change(
  'gallery_items', 'title', 'category', 'description', 'button_label'
);

drop trigger if exists invalidate_translations_after_announcement_change on public.announcements;
create trigger invalidate_translations_after_announcement_change
after update on public.announcements
for each row execute function public.invalidate_content_translations_on_source_change(
  'announcements', 'title', 'content'
);

commit;

-- Optional verification after applying:
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.content_translations'::regclass
-- order by conname;
--
-- select tgname, tgrelid::regclass
-- from pg_trigger
-- where tgname like 'invalidate_translations_after_%'
-- order by tgname;
