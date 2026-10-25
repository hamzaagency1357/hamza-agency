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
do $
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
end $;
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
