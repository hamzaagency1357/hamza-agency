-- HARDCODED READ-ONLY BY DEFAULT: narrowly scoped SEO metadata correction.
-- To apply ONLY with owner authorization, an operator must override v_apply in memory;
-- do not commit an enabled copy, and do not repeat any already audited release.
DO $pr160_blog_canonical$
DECLARE
 v_apply boolean := false;
 v_release_key constant text := 'pr160-blog-canonical-once-20261111-v1';
 v_actor constant text := 'pr160_owner_approved_one_shot_seo_service';
 v_post_id bigint;
 v_tenant_id uuid;
 v_backup_id uuid;
 v_original jsonb;
 v_revision_number integer;
 v_rowcount integer;
 v_total integer;
 v_blank integer;
 v_updated integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext('hamza-agency-pr160-blog-canonical-once'));
 IF EXISTS(SELECT 1 FROM public.activity_logs WHERE action='pr160_once_blog_canonical' AND metadata->>'release_key'=v_release_key) THEN
  RAISE NOTICE 'Single-use blog canonical correction already recorded. No writes.';
  RETURN;
 END IF;
 SELECT id INTO STRICT v_post_id FROM public.blog_posts
 WHERE slug='tiktok-live-hamza-agency' AND status='published' FOR UPDATE;
 SELECT id INTO STRICT v_tenant_id FROM public.tenants WHERE is_primary=true AND status='active';
 PERFORM 1 FROM public.blog_post_translations WHERE post_id=v_post_id FOR UPDATE;
 SELECT count(*),count(*) FILTER(WHERE btrim(canonical_url)='')
 INTO v_total,v_blank
 FROM public.blog_post_translations WHERE post_id=v_post_id
 AND language IN('ar','en','tr');
 IF v_total<>3 OR v_blank<>3 OR (SELECT count(*) FROM public.blog_post_translations WHERE post_id=v_post_id)<>3 THEN
  RAISE EXCEPTION 'Unexpected blog translations or canonical URLs; refusing to overwrite.';
 END IF;
 IF NOT v_apply THEN
  RAISE NOTICE 'PR160 blog canonical preflight PASS: three empty canonical URLs; no writes.';
  RETURN;
 END IF;
 SELECT jsonb_build_object(
   'release_key',v_release_key,'captured_at',now(),
   'post',(SELECT to_jsonb(p) FROM public.blog_posts p WHERE p.id=v_post_id),
   'translations',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.language)
    FROM public.blog_post_translations t WHERE t.post_id=v_post_id),
   'history',(SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.version_number),'[]'::jsonb)
    FROM public.blog_post_versions h WHERE h.post_id=v_post_id)
 ) INTO v_original;
 INSERT INTO public.operations_preflight_backups
  (project_ref,migration_key,created_by,scope,row_counts,snapshot,checksum,notes)
 VALUES
  ('fvaurkfnsvsfohpzguho',v_release_key,v_actor,
   ARRAY['blog_posts','blog_post_translations','blog_post_versions'],
   jsonb_build_object('article',1,'translations',3),v_original,
   encode(extensions.digest(v_original::text,'sha256'),'hex'),
   'Owner-approved follow-up SEO canonical correction; pre-change row snapshot for precise recovery.')
 RETURNING id INTO v_backup_id;
 SELECT coalesce(max(version_number),0)+1 INTO v_revision_number
 FROM public.blog_post_versions WHERE post_id=v_post_id;
 INSERT INTO public.blog_post_versions(post_id,version_number,reason,snapshot,created_by)
 VALUES(v_post_id,v_revision_number,'pre_pr160_canonical_fix',
  jsonb_build_object('post',(SELECT to_jsonb(p) FROM public.blog_posts p WHERE p.id=v_post_id),
   'translations',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.language) FROM public.blog_post_translations t WHERE t.post_id=v_post_id)),v_actor);
 UPDATE public.blog_post_translations
 SET canonical_url=CASE language
  WHEN 'ar' THEN 'https://hamza-agency.com/blog/tiktok-live-hamza-agency'
  WHEN 'en' THEN 'https://hamza-agency.com/en/blog/tiktok-live-hamza-agency'
  WHEN 'tr' THEN 'https://hamza-agency.com/tr/blog/tiktok-live-hamza-agency'
 END,
 updated_at=now()
 WHERE post_id=v_post_id AND language IN('ar','en','tr') AND btrim(canonical_url)='';
 GET DIAGNOSTICS v_rowcount=ROW_COUNT;
 IF v_rowcount<>3 THEN RAISE EXCEPTION 'Expected 3 canonical corrections, got %.',v_rowcount; END IF;
 UPDATE public.blog_posts SET updated_at=now(),updated_by=v_actor WHERE id=v_post_id;
 INSERT INTO public.blog_post_versions(post_id,version_number,reason,snapshot,created_by)
 VALUES(v_post_id,v_revision_number+1,'post_pr160_canonical_fix',
  jsonb_build_object('post',(SELECT to_jsonb(p) FROM public.blog_posts p WHERE p.id=v_post_id),
   'translations',(SELECT jsonb_agg(to_jsonb(t) ORDER BY t.language) FROM public.blog_post_translations t WHERE t.post_id=v_post_id)),v_actor);
 SELECT count(*) INTO v_updated
 FROM public.blog_post_translations t WHERE t.post_id=v_post_id AND
 t.canonical_url=CASE t.language
  WHEN 'ar' THEN 'https://hamza-agency.com/blog/tiktok-live-hamza-agency'
  WHEN 'en' THEN 'https://hamza-agency.com/en/blog/tiktok-live-hamza-agency'
  WHEN 'tr' THEN 'https://hamza-agency.com/tr/blog/tiktok-live-hamza-agency' ELSE '' END;
 IF v_updated<>3 THEN RAISE EXCEPTION 'Canonical postcondition failure; transaction will rollback.'; END IF;
 INSERT INTO public.activity_logs
 (admin_email,actor_user_id,action,entity_type,entity_id,metadata,source_route,outcome,tenant_id)
 VALUES (NULL,NULL,'pr160_once_blog_canonical','blog_posts',v_post_id::text,
 jsonb_build_object('release_key',v_release_key,'actor_type','owner-authorized-service','backup_id',v_backup_id,
 'article_slug','tiktok-live-hamza-agency','changed_locales',jsonb_build_array('ar','en','tr')),
 '/automation/pr160-once-canonical','success',v_tenant_id);
END
$pr160_blog_canonical$;
