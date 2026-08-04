import test from "node:test";
import assert from "node:assert/strict";
import { stripSqlComments, validateMigrationText } from "../scripts/verify-safe-migrations.mjs";

const file = "20260731999999_pr101_safety_fixture.sql";
const migration = (body) => `begin;\n${body}\ncommit;`;
const errorsFor = (body) => validateMigrationText(file, migration(body));

test("line comments containing DROP TABLE are ignored", () => {
  assert.deepEqual(errorsFor("-- DROP TABLE public.safe_table;\nselect 1;"), []);
});

test("block comments containing DROP TABLE are ignored", () => {
  assert.deepEqual(errorsFor("/* DROP TABLE public.safe_table; */\nselect 1;"), []);
});

test("actual DROP TABLE is rejected", () => {
  assert.ok(errorsFor("drop table public.real_table;").some((error) => error.includes("forbidden destructive SQL")));
});

test("actual TRUNCATE is rejected", () => {
  assert.ok(errorsFor("truncate public.real_table;").some((error) => error.includes("forbidden destructive SQL")));
});

test("actual DROP COLUMN is rejected", () => {
  assert.ok(errorsFor("alter table public.real_table drop column secret;").some((error) => error.includes("forbidden destructive SQL")));
});

test("comment markers inside strings and dollar-quoted functions do not hide following SQL", () => {
  const source = migration(`
    select '-- not a comment';
    create or replace function public.fixture() returns text language sql as $$
      select '-- still function text';
    $$;
    drop table public.real_table;
  `);
  const stripped = stripSqlComments(source);
  assert.match(stripped, /drop table public\.real_table/i);
  assert.ok(validateMigrationText(file, source).some((error) => error.includes("forbidden destructive SQL")));
});

test("block-comment markers inside strings do not disable the remaining scan", () => {
  const source = migration("select '/* not a comment */';\ntruncate public.real_table;");
  const stripped = stripSqlComments(source);
  assert.match(stripped, /truncate public\.real_table/i);
  assert.ok(validateMigrationText(file, source).some((error) => error.includes("forbidden destructive SQL")));
});
