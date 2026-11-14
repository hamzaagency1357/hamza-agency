-- Supabase CLI applies this file and its migration history entry atomically.
-- Direct draft creation uses the same linked Auth identity and edit permission
-- as the OIDC gateway.

create or replace function public.is_translation_revision_admin()
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $pr160$
  select exists (
    select 1
    from public.admin_users as admin
    where admin.user_id = (select auth.uid())
      and admin.is_active is true
      and admin.role in ('super_admin', 'deputy_super_admin')
      and lower(admin.email) = lower((select auth.jwt()) ->> 'email')
  );
$pr160$;

create or replace function public.require_translation_revision_admin()
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $pr160$
begin
  if not public.is_translation_revision_admin() or not exists (
    select 1
    from public.admin_users as admin
    where admin.user_id = (select auth.uid())
      and (
        admin.role = 'super_admin'
        or exists (
          select 1
          from public.admin_permissions as permission
          where permission.admin_user_id = admin.id
            and permission.module_key = 'settings'
            and (permission.can_edit or permission.can_manage)
        )
      )
  ) then
    raise exception 'Translation revision access requires an authorized administrator.'
      using errcode = '42501';
  end if;
end;
$pr160$;

-- Candidate creation is the one revision write performed with the user's JWT.
revoke execute on function public.create_translation_candidate_draft(text, text, text, text, jsonb, jsonb)
from public, anon, service_role;

-- The supported archive paths enforce entity and program scope. The legacy
-- generic soft-delete RPC and internal version helpers have no app callers.
revoke execute on function
  public.pr99_soft_delete(text, text, text),
  public.pr3_blog_snapshot(bigint),
  public.pr3_create_blog_version(bigint, text),
  public.pr99_create_page_version(bigint, text, text, text)
from public, anon, authenticated;

-- Apply the Admin Blog Manager's Pages access rule to private Data API reads.
do $blog_admin_read$
declare
  target record;
begin
  for target in
    select * from (values
      ('blog_posts', 'blog posts admin read'),
      ('blog_post_translations', 'blog translations admin read'),
      ('blog_post_versions', 'blog versions admin read')
    ) as policies(table_name, policy_name)
  loop
    execute format($policy$
      alter policy %I on public.%I using (
        exists (
          select 1
          from public.admin_users as admin
          where admin.user_id = (select auth.uid())
            and admin.is_active is true
            and (
              admin.role = 'super_admin'
              or (
                admin.role = 'deputy_super_admin'
                and exists (
                  select 1
                  from public.admin_permissions as permission
                  where permission.admin_user_id = admin.id
                    and permission.module_key = 'pages'
                    and (permission.can_view or permission.can_manage)
                )
              )
            )
        )
      )
    $policy$, target.policy_name, target.table_name);
  end loop;
end
$blog_admin_read$;

-- Preserve the existing page restore lifecycle for authorized operators.
create or replace function public.restore_page_version(p_version_id bigint)
returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $pr160$
declare
  v_actor text := public.pr99_require_admin();
  v_version public.version_history%rowtype;
  v_page_id bigint;
  v_page jsonb;
  v_sections jsonb;
  v_item jsonb;
  v_new_version bigint;
  v_language text;
begin
  if not exists (
    select 1
    from public.admin_users as admin
    where admin.user_id = (select auth.uid())
      and admin.is_active is true
      and (
        admin.role = 'super_admin'
        or (
          admin.role = 'deputy_super_admin'
          and exists (
            select 1
            from public.admin_permissions as permission
            where permission.admin_user_id = admin.id
              and permission.module_key = 'version_history'
              and (permission.can_edit or permission.can_manage)
          )
        )
      )
  ) then
    raise exception 'Page version restore requires an authorized administrator.'
      using errcode = '42501';
  end if;

  select * into v_version from public.version_history where id = p_version_id;
  if not found then raise exception 'Version not found'; end if;
  v_page_id := coalesce(v_version.page_id, case
    when v_version.item_type = 'page' and v_version.item_id ~ '^[0-9]+$'
    then v_version.item_id::bigint end);
  v_page := coalesce(nullif(v_version.page_snapshot, '{}'::jsonb), v_version.data -> 'page');
  v_sections := coalesce(nullif(v_version.sections_snapshot, '[]'::jsonb), v_version.data -> 'sections', '[]'::jsonb);
  if v_page_id is null or v_page is null then raise exception 'Invalid page version'; end if;
  v_new_version := public.pr99_create_page_version(v_page_id, 'pre_restore', v_version.locale, 'Automatic snapshot before restore');

  update public.pages
  set title = coalesce(v_page ->> 'title', title),
      slug = coalesce(v_page ->> 'slug', slug),
      content = v_page ->> 'content',
      seo_title = v_page ->> 'seo_title',
      seo_description = v_page ->> 'seo_description',
      canonical_url = v_page ->> 'canonical_url',
      og_image_url = coalesce(v_page ->> 'og_image_url', v_page ->> 'og_image'),
      publishing_status = 'draft',
      is_published = false,
      updated_at = now()
  where id = v_page_id;

  update public.sections
  set is_visible = false, publishing_status = 'unpublished', updated_at = now()
  where page_id = v_page_id;

  for v_item in select value from jsonb_array_elements(v_sections) loop
    v_language := case
      when v_item ->> 'language' in ('ar', 'en', 'tr') then v_item ->> 'language'
      when v_item -> 'settings' ->> 'language' in ('ar', 'en', 'tr') then v_item -> 'settings' ->> 'language'
      else 'ar' end;
    insert into public.sections (
      page_id, page_slug, program_slug, language, section_key, title, subtitle, content,
      media_url, background_type, background_value, sort_order, is_visible, is_published,
      section_type, settings, publishing_status, updated_at
    ) values (
      v_page_id, v_item ->> 'page_slug', v_item ->> 'program_slug', v_language,
      v_item ->> 'section_key', v_item ->> 'title', v_item ->> 'subtitle', v_item ->> 'content',
      v_item ->> 'media_url', v_item ->> 'background_type', v_item ->> 'background_value',
      coalesce((v_item ->> 'sort_order')::integer, 0), coalesce((v_item ->> 'is_visible')::boolean, true),
      false, v_item ->> 'section_type', v_item -> 'settings', 'draft', now()
    )
    on conflict (page_id, language, section_key) do update
    set title = excluded.title, subtitle = excluded.subtitle, content = excluded.content,
        media_url = excluded.media_url, background_type = excluded.background_type,
        background_value = excluded.background_value, sort_order = excluded.sort_order,
        is_visible = excluded.is_visible, is_published = false, section_type = excluded.section_type,
        settings = excluded.settings, publishing_status = 'draft', updated_at = now();
  end loop;

  insert into public.activity_logs (
    admin_email, actor_user_id, action, entity_type, entity_id, new_data, metadata, source_route, outcome
  ) values (
    v_actor, auth.uid(), 'page_restore_version', 'page', v_page_id::text, '',
    jsonb_build_object('restored_version_id', p_version_id, 'pre_restore_version_id', v_new_version),
    '/admin/version-history', 'success'
  );
  return jsonb_build_object(
    'page_id', v_page_id, 'restored_version_id', p_version_id,
    'pre_restore_version_id', v_new_version, 'status', 'draft'
  );
end;
$pr160$;
