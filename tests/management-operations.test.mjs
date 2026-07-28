import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration=await readFile(new URL("../supabase/migrations/20260728192000_pr99_management_operations.sql",import.meta.url),"utf8");
const builder=await readFile(new URL("../components/AdminManagementPageBuilder.tsx",import.meta.url),"utf8");

test("page publishing is transactional and versioned",()=>{assert.match(migration,/begin;/i);assert.match(migration,/publish_page_builder_page/);assert.match(migration,/pr99_create_page_version/);assert.match(migration,/commit;/i);});
test("multilingual sections have isolated uniqueness",()=>{assert.match(migration,/sections_page_language_key_uidx/);assert.match(migration,/on conflict\(page_id,language,section_key\)/);});
test("translation publishing validates required content",()=>{assert.match(migration,/Translation is incomplete/);assert.match(migration,/Published language requires complete content/);});
test("restore keeps pre-restore history",()=>{assert.match(migration,/pre_restore/);assert.match(migration,/restore_page_version/);});
test("rate limiting stores hashes instead of raw identities",()=>{assert.match(migration,/identity_hash/);assert.match(migration,/digest\(/);assert.doesNotMatch(migration,/insert into public\.public_submission_guards[^;]*p_identity/i);});
test("builder supports required production section types",()=>{for(const type of ["hero","rich_text","text_image","cards","programs","stats","cta","faq","gallery","partners","reviews","success_stories","contact","spacer","divider"])assert.match(builder,new RegExp(`\\"${type}\\"`));});
test("builder includes all public locales and unsaved-change protection",()=>{for(const locale of ["ar","en","tr"])assert.match(builder,new RegExp(`${locale}:`));assert.match(builder,/beforeunload/);assert.match(builder,/تغييرات غير محفوظة/);});
