import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const root=new URL("../",import.meta.url);
const sql=readFileSync(new URL("scripts/ops/pr160-tiktok-editorial-rewrite-once.sql",root),"utf8");
const draft=JSON.parse(readFileSync(new URL("lib/blog/pr160TikTokLiveDraft.json",root),"utf8"));
test("editorial rewrite embeds only the current approved trilingual draft and is disabled by default",()=>{
 const m=sql.match(/v_draft jsonb := '((?:''|[^'])*)'::jsonb;/);
 assert.ok(m);assert.deepEqual(JSON.parse(m[1].replaceAll("''","'")),draft);
 assert.match(sql,/v_apply boolean := false;/);
 assert.match(sql,/v_old_hash IS DISTINCT FROM v_expected_hash/);
 assert.match(sql,/operations_preflight_backups/);
 assert.match(sql,/blog_post_versions/);
 assert.match(sql,/pr160_tiktok_editorial_rewrite/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.doesNotMatch(sql,/UPDATE\s+public\.content_translation_revision_fields/i);
 assert.doesNotMatch(sql,/\b(GRANT|CREATE ROLE|CREATE USER|service_role|SUPABASE_SERVICE_ROLE_KEY)\b/i);
});
