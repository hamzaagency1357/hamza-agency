import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root=new URL("../",import.meta.url);
const sql=readFileSync(new URL("scripts/ops/pr160-owner-approved-once-content-release.sql",root),"utf8");
const draft=JSON.parse(readFileSync(new URL("lib/blog/pr160TikTokLiveDraft.json",root),"utf8"));

test("owner-approved single-use release uses the exact reviewed article and safe immutable targets",()=>{
 const m=sql.match(/v_draft jsonb := '((?:''|[^'])*)'::jsonb;/);
 assert.ok(m,"Embedded reviewed editorial JSON payload is present");
 assert.deepEqual(JSON.parse(m[1].replaceAll("''","'")),draft,"No drift from approved article");
 for(const value of ["pr160-owner-authorized-tiktok-bigo-yaahlan-20261111-v1",
  "f00c1698a74a2baa0603c11d0ca3a2dea2a818a63b3e222f52db96f74ccdfc47",
  "7b4adb6d4f04878f80aaf7e87c5baf39f19d8a6374818636df0bfdc4f339b173",
  "3d963d9e-f68a-4130-af4b-ddf803298b19","a193e789-c0ab-44a7-8b60-2b956b0da1db",
  "BIGO LIVE programına Hamza Ajansı aracılığıyla katılın.",
  "Program kamera karşısına geçmeyi gerektiriyor mu?",
  "905011730377"])assert.ok(sql.includes(value),value);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/v_apply boolean := false;/);
 assert.match(sql,/IF NOT v_apply THEN/);
 assert.doesNotMatch(sql,/v_apply boolean := true;/);
 assert.match(sql,/operations_preflight_backups/);
 assert.match(sql,/encode\(extensions\.digest\(v_snapshot::text,'sha256'\),'hex'\)/);
 assert.match(sql,/supersedes_translation_revision_id/);
 assert.match(sql,/status='superseded'/);
 assert.match(sql,/pr160_once_editorial_release/);
 assert.match(sql,/IF v_rowcount<>1 THEN/);
 assert.doesNotMatch(sql,/\b(CREATE\s+ROLE|CREATE\s+USER|GRANT|DELETE\s+FROM\s+auth\.users|UPDATE\s+auth\.users|INSERT\s+INTO\s+auth\.users)\b/i);
 assert.doesNotMatch(sql,/service_role|password=|private[_-]?key|SUPABASE_SERVICE_ROLE_KEY/i);
});

test("one-shot targeted SQL has no credential or role masquerade and no updates to published field values",()=>{
 assert.doesNotMatch(sql,/UPDATE\s+public\.content_translation_revision_fields/i);
 assert.doesNotMatch(sql,/SET\s+LOCAL\s+ROLE|SET\s+ROLE|request\.jwt\.claims|actor_user_id\s*=\s*'/i);
 assert.ok(sql.includes("owner-authorized-service"));
 assert.match(sql,/v_first_new_revision:=v_new_revision_id/);
 assert.match(sql,/v_second_new_revision:=v_new_revision_id/);
});
