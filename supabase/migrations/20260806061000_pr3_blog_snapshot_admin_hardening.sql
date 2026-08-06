begin;

create or replace function public.pr3_blog_snapshot(p_post_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor text := public.pr99_require_admin();
  v_snapshot jsonb;
begin
  select jsonb_build_object(
    'post', to_jsonb(p),
    'translations', coalesce(
      (
        select jsonb_agg(to_jsonb(t) order by t.language)
        from public.blog_post_translations t
        where t.post_id = p.id
      ),
      '[]'::jsonb
    )
  )
  into v_snapshot
  from public.blog_posts p
  where p.id = p_post_id;

  if v_snapshot is null then
    raise exception 'Blog post not found';
  end if;

  return v_snapshot;
end
$$;

revoke all on function public.pr3_blog_snapshot(bigint) from public, anon, authenticated;
grant execute on function public.pr3_blog_snapshot(bigint) to authenticated;

comment on function public.pr3_blog_snapshot(bigint) is
  'Admin-only editorial snapshot. pr99_require_admin rejects every non-admin authenticated role before draft data is read.';

commit;
