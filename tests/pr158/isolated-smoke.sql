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
