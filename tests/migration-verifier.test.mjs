import test from "node:test";
import assert from "node:assert/strict";
import { validateMigrationText } from "../scripts/verify-safe-migrations.mjs";

const wrap = (body, extra = "") => `begin;\ncreate or replace function public.pr99_permanent_delete_trash(p_trash_id bigint,p_confirmation text) returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$\ndeclare v_actor text:=public.pr99_require_admin();v_role text;v_item public.trash_items%rowtype;\nbegin\nselect role into v_role from public.admin_users where lower(email)=v_actor and is_active=true;\n${body}\nend $$;\n${extra}\ncommit;`;

const protectedBody = `
if v_role not in('super_admin','deputy_super_admin') then raise exception 'Not authorized';end if;
if p_confirmation<>'DELETE PERMANENTLY' then raise exception 'Second confirmation is invalid';end if;
select * into v_item from public.trash_items where id=p_trash_id and restore_status='restorable' for update;
if not(v_item.item_type=any(public.pr99_operations_allowlist())) then raise exception 'Unsupported trash entity';end if;
execute format('delete from public.%I where id::text=$1',v_item.item_type) using v_item.item_id;
insert into public.activity_logs(action) values('trash_permanent_delete');
return jsonb_build_object('deleted',true);`;

test("fully protected permanent delete passes", () => {
  assert.deepEqual(validateMigrationText("fixture.sql", wrap(protectedBody)), []);
});

test("missing allowlist fails", () => {
  assert.ok(validateMigrationText("fixture.sql", wrap(protectedBody.replace(/if not\(v_item[\s\S]*?end if;\n/, ""))).some((error) => error.includes("allowlist")));
});

test("missing role restriction fails", () => {
  assert.ok(validateMigrationText("fixture.sql", wrap(protectedBody.replace(/if v_role[\s\S]*?end if;\n/, ""))).some((error) => error.includes("role restriction")));
});

test("missing confirmation fails", () => {
  assert.ok(validateMigrationText("fixture.sql", wrap(protectedBody.replace(/if p_confirmation[\s\S]*?end if;\n/, ""))).some((error) => error.includes("confirmation")));
});

test("missing restorable status fails", () => {
  assert.ok(validateMigrationText("fixture.sql", wrap(protectedBody.replace(" and restore_status='restorable'", ""))).some((error) => error.includes("restorable")));
});

test("additional delete outside protected function fails", () => {
  assert.ok(validateMigrationText("fixture.sql", wrap(protectedBody, "delete from public.pages where id=1;")).some((error) => error.includes("hard delete")));
});
