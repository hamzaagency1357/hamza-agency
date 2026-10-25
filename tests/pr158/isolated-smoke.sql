\set ON_ERROR_STOP on
set test.actor='owner@example.test';
insert into trash_items(id,item_type,item_id,item_data,restore_status) values
 (1,'programs','10','{"id":10,"title":"Restored"}','restorable'),
 (2,'programs','11','{"id":11,"title":"Old"}','restorable'),
 (3,'programs','12','{"id":12,"title":"Delete"}','restorable'),
 (4,'programs','13','{"id":13,"title":"Unauthorized"}','restorable');
insert into programs values (11,'Live newer record');
do $$
begin
  if (public.pr99_restore_trash(1)->>'restored')::int <> 1 then raise exception 'restore result'; end if;
  if (select title from programs where id=10) <> 'Restored' then raise exception 'restore missing'; end if;
  if (select restore_status from trash_items where id=1) <> 'restored' then raise exception 'restore status'; end if;
  begin
    perform public.pr99_restore_trash(2);
    raise exception 'conflict was accepted';
  exception when others then
    if sqlerrm = 'conflict was accepted' then raise; end if;
  end;
  if (select title from programs where id=11) <> 'Live newer record' then raise exception 'overwritten'; end if;
  begin
    perform public.pr99_permanent_delete_trash(3,'WRONG');
    raise exception 'confirmation bypass';
  exception when others then
    if sqlerrm = 'confirmation bypass' then raise; end if;
  end;
  if (public.pr99_permanent_delete_trash(3,'DELETE PERMANENTLY')->>'deleted')::boolean is distinct from true then raise exception 'delete failed'; end if;
  if (select restore_status from trash_items where id=3) <> 'permanently_deleted' then raise exception 'delete status'; end if;
end $$;
-- A soft archive retains its source row. Restore must only reverse the archive flag.
insert into programs(id,title,is_visible) values (20,'Archived original',false),(21,'Changed after archive',false),(22,'Dispose archived',false),(23,'Changed before disposal',false);
insert into trash_items(id,item_type,item_id,item_data,restore_status) values
 (20,'programs','20','{"id":20,"title":"Archived original","is_visible":true}','restorable'),
 (21,'programs','21','{"id":21,"title":"Original title","is_visible":true}','restorable'),
 (22,'programs','22','{"id":22,"title":"Dispose archived","is_visible":true}','restorable'),
 (23,'programs','23','{"id":23,"title":"Original title","is_visible":true}','restorable');
-- Real program flow archives both flags and changes updated_at.
insert into programs(id,title,is_visible,is_active,updated_at)
values (40,'Full archive',false,false,'2026-10-25T10:00:00Z'),
       (41,'Full archive changed',false,false,'2026-10-25T10:00:00Z');
insert into trash_items(id,item_type,item_id,item_data,restore_status) values
 (40,'programs','40','{"id":40,"title":"Full archive","is_visible":true,"is_active":true,"updated_at":"2026-10-24T10:00:00Z"}','restorable'),
 (41,'programs','41','{"id":41,"title":"Original","is_visible":true,"is_active":true,"updated_at":"2026-10-24T10:00:00Z"}','restorable');
do $full_archive$
begin
  perform public.pr99_restore_trash(40);
  if not (select is_visible and is_active from programs where id=40) then raise exception 'full archive flags not restored'; end if;
  if (select updated_at from programs where id=40) <> '2026-10-24T10:00:00Z'::timestamptz then raise exception 'archive timestamp not restored'; end if;
  begin
    perform public.pr99_restore_trash(41);
    raise exception 'changed full archive restored';
  exception when others then
    if sqlerrm='changed full archive restored' then raise; end if;
  end;
end $full_archive$;
do $archive$
begin
  if (public.pr99_restore_trash(20)->>'restored')::int <> 1 then raise exception 'soft restore failed'; end if;
  if (select is_visible from programs where id=20) is distinct from true then raise exception 'soft restore visibility'; end if;
  begin
    perform public.pr99_restore_trash(21);
    raise exception 'modified soft archive was restored';
  exception when others then
    if sqlerrm='modified soft archive was restored' then raise; end if;
  end;
  if (select title from programs where id=21) <> 'Changed after archive' then raise exception 'modified row overwritten'; end if;
  if (public.pr99_permanent_delete_trash(22,'DELETE PERMANENTLY')->>'deleted')::boolean is distinct from true then raise exception 'soft disposal failed'; end if;
  if exists(select 1 from programs where id=22) then raise exception 'archived row not disposed'; end if;
  begin
    perform public.pr99_permanent_delete_trash(23,'DELETE PERMANENTLY');
    raise exception 'modified archived row disposed';
  exception when others then
    if sqlerrm='modified archived row disposed' then raise; end if;
  end;
  if not exists(select 1 from programs where id=23) then raise exception 'modified row deleted'; end if;
end $archive$;
set test.actor='staff@example.test';
do $$
begin
  begin
    perform public.pr99_restore_trash(4);
    raise exception 'unauthorized restore allowed';
  exception when others then
    if sqlerrm = 'unauthorized restore allowed' then raise; end if;
  end;
end $$;
set test.actor='owner@example.test';
select 'PR158 isolated restore/conflict/delete/authorization PASS' as result;
