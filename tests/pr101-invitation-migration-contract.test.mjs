import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const invitationSql = await readFile(new URL("../supabase/migrations/20260731024500_pr101_operational_tenant_invitations_hardened.sql", import.meta.url), "utf8");
const membershipSql = await readFile(new URL("../supabase/migrations/20260731031500_pr101_membership_rpc_only_writes.sql", import.meta.url), "utf8");

test("private schema usage required by existing tenant role wrappers is preserved", () => {
  assert.match(invitationSql, /revoke all on schema private from public\s*;/i);
  assert.match(invitationSql, /grant usage on schema private to authenticated\s*,\s*anon\s*,\s*service_role\s*;/i);
  assert.doesNotMatch(invitationSql, /revoke all on schema private from[^;]*authenticated/i);
});

test("rate limiting is private, fixed and not client configurable", () => {
  assert.match(invitationSql, /function private\.consume_invitation_rate_limit\(\s*p_tenant_id uuid\s*,\s*p_action text\s*,\s*p_subject_hash text\s*\)/i);
  assert.match(invitationSql, /values \('create',20,3600\),\('resend',10,3600\),\('accept',12,900\)/i);
  assert.match(invitationSql, /revoke all on function private\.consume_invitation_rate_limit\(uuid,text,text\) from public,anon,authenticated/i);
  assert.doesNotMatch(invitationSql, /function public\.consume_invitation_rate_limit/i);
});

test("only one pending invitation exists per tenant email", () => {
  assert.match(invitationSql, /unique index if not exists tenant_invitations_one_pending_email_uidx[\s\S]*?\(tenant_id,email\)[\s\S]*?where status='invited'/i);
  assert.doesNotMatch(invitationSql, /tenant_invitations_one_pending_uidx/i);
});

test("acceptance derives tenant from locked token and verifies expected host tenant", () => {
  assert.match(invitationSql, /where token_hash=p_token_hash for update/i);
  assert.match(invitationSql, /v_invitation\.tenant_id<>p_expected_tenant_id/i);
  assert.match(invitationSql, /private\.consume_invitation_rate_limit\(v_invitation\.tenant_id,'accept'/i);
});

test("membership direct writes are removed while approved RPC execution remains", () => {
  assert.match(membershipSql, /revoke insert,update,delete on public\.tenant_memberships from authenticated/i);
  assert.match(membershipSql, /grant select on public\.tenant_memberships to authenticated/i);
  assert.match(membershipSql, /grant execute on function public\.accept_tenant_invitation\(uuid,text\) to authenticated/i);
  assert.match(membershipSql, /grant execute on function public\.manage_tenant_membership\(uuid,uuid,text,text,bigint,jsonb\) to authenticated/i);
  assert.match(membershipSql, /revoke all on function public\.accept_tenant_invitation\(uuid,text\) from public,anon/i);
});
