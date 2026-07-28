begin;

create or replace function public.pr99_create_page_version(p_page_id bigint,p_operation text,p_locale text default null,p_summary text default null)
returns bigint language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_page jsonb;v_sections jsonb;v_version integer;v_id bigint;
begin
 select to_jsonb(p) into v_page from public.pages p where p.id=p_page_id;
 if v_page is null then raise exception 'Page not found';end if;
 select coalesce(jsonb_agg(to_jsonb(s) order by s.language,s.sort_order,s.id),'[]'::jsonb) into v_sections from public.sections s where s.page_id=p_page_id;
 select coalesce(max(version_number),0)+1 into v_version from public.version_history where page_id=p_page_id or(page_id is null and item_type='page' and item_id=p_page_id::text);
 insert into public.version_history(item_type,item_id,version_number,data,changed_by_email,change_summary,entity_type,entity_id,action,title,summary,metadata,changed_by,page_id,operation,page_snapshot,sections_snapshot,locale)
 values('page',p_page_id::text,v_version,jsonb_build_object('page',v_page,'sections',v_sections),v_actor,p_summary,'page',p_page_id::text,coalesce(p_operation,'publish'),v_page->>'title',p_summary,jsonb_build_object('locale',p_locale),v_actor,p_page_id,coalesce(p_operation,'publish'),v_page,v_sections,p_locale) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.pr99_create_page_version(bigint,text,text,text) from public,anon;
grant execute on function public.pr99_create_page_version(bigint,text,text,text) to authenticated;

create or replace function public.save_page_builder_draft(p_page_id bigint,p_language text,p_sections jsonb,p_page_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_item jsonb;v_index integer:=0;v_type text;v_key text;v_keys text[]:='{}';v_allowed text[]:=array['hero','rich_text','text','text_image','cards','programs','stats','cta','faq','gallery','partners','reviews','success_stories','contact','spacer','divider'];
begin
 if p_language not in('ar','en','tr') then raise exception 'Unsupported language';end if;
 if jsonb_typeof(p_sections)<>'array' or jsonb_array_length(p_sections)>80 then raise exception 'Invalid sections payload';end if;
 if not exists(select 1 from public.pages where id=p_page_id) then raise exception 'Page not found';end if;
 for v_item in select value from jsonb_array_elements(p_sections) loop v_type:=coalesce(v_item->>'section_type',v_item->>'type','');if not(v_type=any(v_allowed)) then raise exception 'Unsupported section type';end if;if length(coalesce(v_item->>'title',''))>300 or length(coalesce(v_item->>'body',''))>50000 then raise exception 'Section content exceeds allowed size';end if;end loop;
 for v_item in select value from jsonb_array_elements(p_sections) loop
  v_index:=v_index+1;v_type:=coalesce(v_item->>'section_type',v_item->>'type','text');v_key:=left(coalesce(nullif(v_item->>'section_key',''),nullif(v_item->>'id',''),'section-'||v_index),120);v_keys:=array_append(v_keys,v_key);
  insert into public.page_builder_sections(page_id,section_type,section_key,title,body,button_label,button_url,media_url,settings,sort_order,language,is_visible,created_by,updated_by)
  values(p_page_id,v_type,v_key,public.pr99_sanitize_text(v_item->>'title',300),public.pr99_sanitize_text(v_item->>'body',50000),nullif(public.pr99_sanitize_text(v_item->>'button_label',120),''),nullif(public.pr99_sanitize_text(v_item->>'button_url',1000),''),nullif(public.pr99_sanitize_text(v_item->>'media_url',1000),''),case when jsonb_typeof(v_item->'settings')='object' then v_item->'settings' else '{}'::jsonb end,v_index,p_language,coalesce((v_item->>'is_visible')::boolean,true),v_actor,v_actor)
  on conflict(page_id,language,section_key) do update set section_type=excluded.section_type,title=excluded.title,body=excluded.body,button_label=excluded.button_label,button_url=excluded.button_url,media_url=excluded.media_url,settings=excluded.settings,sort_order=excluded.sort_order,is_visible=excluded.is_visible,updated_by=excluded.updated_by,updated_at=now();
 end loop;
 update public.page_builder_sections set is_visible=false,sort_order=10000+sort_order,updated_by=v_actor,updated_at=now() where page_id=p_page_id and language=p_language and not(section_key=any(v_keys));
 update public.pages set title=case when p_page_patch?'title' then nullif(public.pr99_sanitize_text(p_page_patch->>'title',300),'') else title end,slug=case when p_page_patch?'slug' then nullif(lower(regexp_replace(p_page_patch->>'slug','[^a-zA-Z0-9/_-]','','g')),'') else slug end,seo_title=case when p_page_patch?'seo_title' then public.pr99_sanitize_text(p_page_patch->>'seo_title',300) else seo_title end,seo_description=case when p_page_patch?'seo_description' then public.pr99_sanitize_text(p_page_patch->>'seo_description',1000) else seo_description end,canonical_url=case when p_page_patch?'canonical_url' then nullif(public.pr99_sanitize_text(p_page_patch->>'canonical_url',1000),'') else canonical_url end,og_image_url=case when p_page_patch?'og_image_url' then nullif(public.pr99_sanitize_text(p_page_patch->>'og_image_url',1000),'') else og_image_url end,publishing_status=case when p_page_patch->>'publishing_status' in('draft','review','published','unpublished','scheduled') then p_page_patch->>'publishing_status' else publishing_status end,updated_at=now() where id=p_page_id;
 insert into public.activity_logs(admin_email,actor_user_id,action,entity_type,entity_id,new_data,metadata,source_route,outcome) values(v_actor,auth.uid(),'save_page_builder_draft','page',p_page_id::text,'',jsonb_build_object('language',p_language,'sections',jsonb_array_length(p_sections)),'/admin/page-builder','success');
 return jsonb_build_object('page_id',p_page_id,'language',p_language,'sections',jsonb_array_length(p_sections),'saved_at',now());
end $$;
revoke all on function public.save_page_builder_draft(bigint,text,jsonb,jsonb) from public,anon;
grant execute on function public.save_page_builder_draft(bigint,text,jsonb,jsonb) to authenticated;

create or replace function public.pr99_restore_entity_rows(p_table text,p_rows jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare v_actor text:=public.pr99_require_admin();v_row jsonb;v_filtered jsonb;v_insert_columns text;v_select_columns text;v_updates text;v_count integer:=0;
begin
 if not(p_table=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported restore entity';end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 then raise exception 'Invalid restore rows';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  if not(v_row?'id') then raise exception 'Restore row has no id';end if;
  select jsonb_object_agg(e.key,e.value),string_agg(format('%I',c.column_name),',' order by c.ordinal_position),string_agg(format('x.%I',c.column_name),',' order by c.ordinal_position),string_agg(format('%1$I=excluded.%1$I',c.column_name),',' order by c.ordinal_position) filter(where c.column_name<>'id')
  into v_filtered,v_insert_columns,v_select_columns,v_updates
  from jsonb_each(v_row)e join information_schema.columns c on c.table_schema='public' and c.table_name=p_table and c.column_name=e.key and c.is_generated='NEVER' and(c.is_identity='NO' or c.identity_generation='BY DEFAULT');
  if v_filtered is null or v_insert_columns is null or v_updates is null then raise exception 'Restore row has no writable shared columns';end if;
  execute format('insert into public.%1$I(%2$s) select %3$s from jsonb_populate_record(null::public.%1$I,$1) x on conflict(id) do update set %4$s',p_table,v_insert_columns,v_select_columns,v_updates) using v_filtered;
  v_count:=v_count+1;
 end loop;
 return jsonb_build_object('table',p_table,'restored',v_count,'actor',v_actor);
end $$;
revoke all on function public.pr99_restore_entity_rows(text,jsonb) from public,anon;
grant execute on function public.pr99_restore_entity_rows(text,jsonb) to authenticated;

comment on function public.pr99_restore_entity_rows is 'Restores only the actual intersection of backup keys and current writable columns, excluding generated and ALWAYS identity columns.';
commit;
