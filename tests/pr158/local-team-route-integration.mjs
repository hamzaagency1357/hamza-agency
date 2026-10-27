import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const url = process.env.API_URL, anon = process.env.ANON_KEY, service = process.env.SERVICE_ROLE_KEY;
assert.equal(url, "http://127.0.0.1:54321");
assert.ok(anon && service);
const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
const ownerEmail = "owner-pr158@example.invalid", memberEmail = "member-pr158@example.invalid";
const ownerPassword = "LocalOnly!Owner158";
let ownerId, memberId;
function handler(name) {
  const source = readFileSync(new URL(`../../app/api/admin/team/${name}/route.ts`, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { module: { exports: {} }, process: { env: {
    VERCEL_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, ["SUPABASE_SERVICE_ROLE_KEY"]: service,
  } }, URL, require: (name) => {
    if (name === "next/server") return { NextResponse: { json: (body, opts = {}) => ({ status: opts.status || 200, body }) } };
    if (name === "@supabase/supabase-js") return { createClient };
    throw new Error("Unexpected import: " + name);
  } };
  context.exports = context.module.exports;
  vm.runInNewContext(compiled, context, { timeout: 3000 });
  return context.module.exports.POST;
}
const invite = handler("invite"), activate = handler("activate"), deactivate = handler("deactivate");
function request(body, token) {
  return { headers: { get: (name) => name === "authorization" ? "Bearer " + token : null },
    nextUrl: { origin: "http://localhost:3000" }, json: async () => body };
}
try {
  const created = await admin.auth.admin.createUser({ email: ownerEmail, password: ownerPassword, email_confirm: true });
  assert.ifError(created.error); ownerId = created.data.user.id;
  const ownerRow = await admin.from("admin_users").insert({ email: ownerEmail, user_id: ownerId, role: "super_admin", is_active: true });
  assert.ifError(ownerRow.error);
  const login = await publicClient.auth.signInWithPassword({ email: ownerEmail, password: ownerPassword });
  assert.ifError(login.error);
  const token = login.data.session.access_token;
  const invalid = await invite(request({ email: memberEmail, role: "program_admin", assigned_program: "nonexistent" }, token));
  assert.equal(invalid.status, 400, "Unknown program denied");
  const invited = await invite(request({ email: memberEmail, role: "program_admin", assigned_program: "tiktok" }, token));
  assert.equal(invited.status, 201, JSON.stringify(invited.body));
  const pending = await admin.from("admin_users").select("id,user_id,is_active,assigned_program").eq("email", memberEmail).single();
  assert.ifError(pending.error);
  assert.equal(pending.data.is_active, false);
  assert.equal(pending.data.assigned_program, "tiktok");
  memberId = pending.data.user_id;
  assert.ok(memberId);
  const tooEarly = await activate(request({ id: pending.data.id }, token));
  assert.equal(tooEarly.status, 409, "Unaccepted invitation denied");
  const accepted = await admin.auth.admin.updateUserById(memberId, { email_confirm: true });
  assert.ifError(accepted.error);
  const activated = await activate(request({ id: pending.data.id }, token));
  assert.equal(activated.status, 200, JSON.stringify(activated.body));
  const activeRow = await admin.from("admin_users").select("is_active").eq("id", pending.data.id).single();
  assert.equal(activeRow.data.is_active, true);
  const disabled = await deactivate(request({ id: pending.data.id }, token));
  assert.equal(disabled.status, 200, JSON.stringify(disabled.body));
  const inactiveRow = await admin.from("admin_users").select("is_active").eq("id", pending.data.id).single();
  assert.equal(inactiveRow.data.is_active, false);
  const duplicate = await deactivate(request({ id: pending.data.id }, token));
  assert.equal(duplicate.status, 409, "Repeated deactivation denied");
  const logs = await admin.from("activity_logs").select("action").in("action", ["invite_admin_user","activate_admin_user","deactivate_admin_user"]);
  assert.ifError(logs.error);
  for (const action of ["invite_admin_user","activate_admin_user","deactivate_admin_user"])
    assert.ok(logs.data.some(row => row.action === action), "Missing audit: " + action);
  console.log("PASS: real isolated Auth + PostgREST invite/activate/deactivate handlers, denied cases and audit");
} finally {
  if (memberId) await admin.auth.admin.deleteUser(memberId);
  if (ownerId) await admin.auth.admin.deleteUser(ownerId);
}
