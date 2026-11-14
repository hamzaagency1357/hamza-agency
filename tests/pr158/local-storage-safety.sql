-- Real isolated Postgres + Storage schema; all synthetic rows are rolled back.
-- No Production data, private objects, or actual customer file bytes are read.
begin;
insert into storage.buckets (id,name,public) values ('pr160-private-evidence','pr160-private-evidence',false);
insert into storage.objects (bucket_id,name,metadata)
values ('pr160-private-evidence','private/synthetic-only.txt','{}'::jsonb);
set local role anon;
do $check_anon$
begin
  if exists (select 1 from storage.objects where bucket_id='pr160-private-evidence') then
    raise exception 'Anonymous role can read private object metadata';
  end if;
  begin
    insert into storage.objects (bucket_id,name,metadata)
      values ('pr160-private-evidence','private/forbidden.txt','{}'::jsonb);
    raise exception 'Anonymous upload unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$check_anon$;
set local role authenticated;
do $check_user$
begin
  if exists (select 1 from storage.objects where bucket_id='pr160-private-evidence') then
    raise exception 'Unrelated signed-in user can read private object metadata';
  end if;
  begin
    delete from storage.objects where bucket_id='pr160-private-evidence';
    if found then raise exception 'Unrelated user deleted private object'; end if;
  exception when insufficient_privilege then null;
  end;
end
$check_user$;
reset role;
rollback;
select 'PASS: private Storage object RLS denied anonymous/unauthorized roles in isolated database' as result;
