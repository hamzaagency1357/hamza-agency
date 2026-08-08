begin;

-- PR #112: additive PR3 owner-QA closeout only. Commit this migration; do not apply it to Production in this PR step.
alter table if exists public.programs
  add column if not exists logo_url text,
  add column if not exists hero_image_url text,
  add column if not exists mobile_image_url text,
  add column if not exists og_image_url text,
  add column if not exists alt_ar text,
  add column if not exists alt_en text,
  add column if not exists alt_tr text;
comment on column public.programs.logo_url is 'Admin-managed program logo; media table remains a compatibility fallback.';
comment on column public.programs.hero_image_url is 'Admin-managed desktop/detail hero image.';
comment on column public.programs.mobile_image_url is 'Admin-managed mobile-optimized program image.';
comment on column public.programs.og_image_url is 'Admin-managed Open Graph image.';
comment on column public.programs.alt_ar is 'Arabic alternative text for program media.';
comment on column public.programs.alt_en is 'English alternative text for program media.';
comment on column public.programs.alt_tr is 'Turkish alternative text for program media.';

alter table if exists public.blog_posts add column if not exists author_name text not null default 'HAMZA AGENCY';
alter table if exists public.blog_post_translations
  add column if not exists image_alt text not null default '',
  add column if not exists og_title text not null default '',
  add column if not exists og_description text not null default '',
  add column if not exists og_image_url text not null default '',
  add column if not exists canonical_url text not null default '',
  add column if not exists allow_index boolean not null default true;
alter table if exists public.blog_posts drop constraint if exists blog_posts_status_check;
update public.blog_posts set status='archived' where status='unpublished';
alter table if exists public.blog_posts add constraint blog_posts_status_check check (status in ('draft','review','scheduled','published','archived'));

create or replace function public.pr3_save_blog_post(p_post_id bigint,p_slug text,p_status text,p_category text,p_tags text[],p_featured_image_url text,p_scheduled_at timestamptz,p_translations jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_actor text:=public.pr99_require_admin(); v_post_id bigint; v_slug text:=lower(trim(coalesce(p_slug,'')));
  v_status text:=case when p_status in ('draft','review','scheduled','published','archived') then p_status else 'draft' end;
  v_item jsonb; v_language text; v_ar_title text:=''; v_author text:='HAMZA AGENCY';
begin
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid blog slug'; end if;
  if v_status='scheduled' and (p_scheduled_at is null or p_scheduled_at<=now()) then raise exception 'Scheduled publication requires a future date'; end if;
  if jsonb_typeof(p_translations)<>'array' or jsonb_array_length(p_translations)<>3 then raise exception 'Arabic, English, and Turkish translations are required'; end if;
  for v_item in select value from jsonb_array_elements(p_translations) loop
    v_language:=v_item->>'language'; if v_language not in ('ar','en','tr') then raise exception 'Unsupported blog language'; end if;
    if v_language='ar' then v_ar_title:=trim(public.pr99_sanitize_text(v_item->>'title',300)); v_author:=coalesce(nullif(trim(public.pr99_sanitize_text(v_item->>'author_name',200)),''),'HAMZA AGENCY'); end if;
  end loop;
  if v_ar_title='' then raise exception 'Arabic title is required'; end if;
  if p_post_id is null then
    insert into public.blog_posts(slug,status,category,tags,featured_image_url,scheduled_at,published_at,author_name,created_by,updated_by)
    values(v_slug,v_status,left(lower(coalesce(nullif(trim(p_category),''),'general')),80),coalesce(p_tags,'{}'),nullif(public.pr99_sanitize_text(p_featured_image_url,1200),''),case when v_status='scheduled' then p_scheduled_at end,case when v_status='published' then now() end,v_author,v_actor,v_actor)
    returning id into v_post_id;
  else
    if not exists(select 1 from public.blog_posts where id=p_post_id) then raise exception 'Blog post not found'; end if;
    perform public.pr3_create_blog_version(p_post_id,'pre_save');
    update public.blog_posts set slug=v_slug,status=v_status,category=left(lower(coalesce(nullif(trim(p_category),''),'general')),80),tags=coalesce(p_tags,'{}'),featured_image_url=nullif(public.pr99_sanitize_text(p_featured_image_url,1200),''),scheduled_at=case when v_status='scheduled' then p_scheduled_at end,published_at=case when v_status='published' then coalesce(published_at,now()) else published_at end,author_name=v_author,updated_by=v_actor,updated_at=now() where id=p_post_id;
    v_post_id:=p_post_id;
  end if;
  for v_item in select value from jsonb_array_elements(p_translations) loop
    insert into public.blog_post_translations(post_id,language,title,excerpt,content_html,seo_title,seo_description,image_alt,og_title,og_description,og_image_url,canonical_url,allow_index)
    values(v_post_id,v_item->>'language',public.pr99_sanitize_text(v_item->>'title',300),public.pr99_sanitize_text(v_item->>'excerpt',1200),public.pr99_sanitize_text(v_item->>'content_html',50000),public.pr99_sanitize_text(v_item->>'seo_title',300),public.pr99_sanitize_text(v_item->>'seo_description',1000),public.pr99_sanitize_text(v_item->>'image_alt',500),public.pr99_sanitize_text(v_item->>'og_title',300),public.pr99_sanitize_text(v_item->>'og_description',1000),public.pr99_sanitize_text(v_item->>'og_image_url',1200),public.pr99_sanitize_text(v_item->>'canonical_url',1200),coalesce((v_item->>'allow_index')::boolean,true))
    on conflict(post_id,language) do update set title=excluded.title,excerpt=excluded.excerpt,content_html=excluded.content_html,seo_title=excluded.seo_title,seo_description=excluded.seo_description,image_alt=excluded.image_alt,og_title=excluded.og_title,og_description=excluded.og_description,og_image_url=excluded.og_image_url,canonical_url=excluded.canonical_url,allow_index=excluded.allow_index,updated_at=now();
  end loop;
  if p_post_id is null then perform public.pr3_create_blog_version(v_post_id,'create'); end if;
  return jsonb_build_object('post_id',v_post_id,'slug',v_slug,'status',v_status,'saved_at',now());
end $$;

create or replace function public.pr3_unpublish_blog_post(p_post_id bigint)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();
begin
  perform public.pr3_create_blog_version(p_post_id,'pre_archive');
  update public.blog_posts set status='archived',scheduled_at=null,updated_by=v_actor,updated_at=now() where id=p_post_id;
  if not found then raise exception 'Blog post not found'; end if;
  return jsonb_build_object('post_id',p_post_id,'status','archived','updated_at',now());
end $$;
revoke all on function public.pr3_save_blog_post(bigint,text,text,text,text[],text,timestamptz,jsonb) from public,anon;
grant execute on function public.pr3_save_blog_post(bigint,text,text,text,text[],text,timestamptz,jsonb) to authenticated;
revoke all on function public.pr3_unpublish_blog_post(bigint) from public,anon;
grant execute on function public.pr3_unpublish_blog_post(bigint) to authenticated;
commit;
