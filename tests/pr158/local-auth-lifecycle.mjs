import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Real local GoTrue API, no invitation email, no production connection.
// This proves Auth identity create / lookup / disable / delete only;
// application admin_users routes are covered separately by route tests.
const url = process.env.API_URL;
const serviceKey = process.env.SERVICE_ROLE_KEY;
assert.equal(url, "http://127.0.0.1:54321", "Local Auth only");
assert.ok(serviceKey, "Missing local service role key");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const email = "pr158-team-lifecycle@example.invalid";
let userId;
try {
  const created = await admin.auth.admin.createUser({
    email, password: "LocalTestOnly!pr158_2026", email_confirm: true,
    app_metadata: { test_only: true },
  });
  assert.ifError(created.error);
  userId = created.data.user?.id;
  assert.ok(userId, "Auth user not created");
  assert.equal(created.data.user.email, email);
  const found = await admin.auth.admin.getUserById(userId);
  assert.ifError(found.error);
  assert.equal(found.data.user.id, userId);
  assert.ok(found.data.user.email_confirmed_at, "Local identity must be confirmed before activation");
  const disabled = await admin.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
  assert.ifError(disabled.error);
  assert.ok(disabled.data.user.banned_until, "Auth identity should be disabled");
  const reloaded = await admin.auth.admin.getUserById(userId);
  assert.ifError(reloaded.error);
  assert.ok(reloaded.data.user.banned_until);
  console.log("PASS: real isolated GoTrue create, confirm, lookup and disable");
} finally {
  if (userId) {
    const removed = await admin.auth.admin.deleteUser(userId);
    assert.ifError(removed.error);
    const missing = await admin.auth.admin.getUserById(userId);
    assert.ok(missing.error, "Deleted test identity must not remain accessible");
  }
}
