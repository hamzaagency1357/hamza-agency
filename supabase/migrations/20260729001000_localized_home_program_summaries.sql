begin;

insert into public.content_translations (
  id,
  source_type,
  source_id,
  field_name,
  language,
  translated_value,
  status,
  reviewed,
  is_published,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values
  (
    gen_random_uuid(),
    'programs',
    '1',
    'summary',
    'tr',
    'HAMZA AGENCY takibi ve desteğiyle TikTok programına katılın.',
    'published',
    true,
    true,
    'system:localized-home-program-summaries',
    'system:localized-home-program-summaries',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'programs',
    '2',
    'summary',
    'tr',
    'HAMZA AGENCY takibi ve desteğiyle BIGO LIVE programına katılın.',
    'published',
    true,
    true,
    'system:localized-home-program-summaries',
    'system:localized-home-program-summaries',
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    'programs',
    '3',
    'summary',
    'tr',
    'HAMZA AGENCY takibi ve desteğiyle Yaahlan sesli yayın programına katılın.',
    'published',
    true,
    true,
    'system:localized-home-program-summaries',
    'system:localized-home-program-summaries',
    now(),
    now()
  )
on conflict (source_type, source_id, field_name, language)
do update set
  translated_value = excluded.translated_value,
  status = 'published',
  reviewed = true,
  is_published = true,
  updated_by = 'system:localized-home-program-summaries',
  updated_at = now();

commit;
