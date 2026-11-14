import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

// Real GoTrue server in an ephemeral loopback-only Supabase CLI stack.
// No Production keys, no real accounts, no outbound mail.
const url = process.env.API_URL || "";
const anonKey = process.env.ANON_KEY || "";
const serviceKey = process.env.SERVICE_ROLE_KEY || "";
const dbUrl = process.env.DB_URL || "";
assert.equal(url, "http://127.0.0.1:54321", "Local-only GoTrue required");
assert.match(dbUrl, /^postgres(?:ql)?:\/\/[^@]+@(?:127\.0\.0\.1|localhost):\d+\//);
assert.ok(anonKey && serviceKey, "Local test keys required");
const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const makeClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const created = [];
const suffix = randomBytes(5).toString("hex");
let stage = "startup";
const oldPassword = "Local-only!Pwd-2026-Pr160";
const newPassword = "New-local-only!Pwd-2026-Pr160";

async function check(name, task) {
  stage = name;
  await task();
  console.log("PASS isolated GoTrue: " + name);
}
async function user(name) {
  const email = "pr160-" + name + "-" + suffix + "@example.invalid";
  const r = await admin.auth.admin.createUser({ email, email_confirm: true, password: oldPassword });
  assert.ifError(r.error);
  assert.ok(r.data.user?.id);
  created.push(r.data.user.id);
  return { email, id: r.data.user.id };
}
async function link(email) {
  const r = await admin.auth.admin.generateLink({ type: "recovery", email });
  assert.ifError(r.error);
  const token = r.data.properties?.hashed_token;
  assert.match(token || "", /^[0-9a-f]{32,128}$/i, "Expected local recovery hash");
  return token;
}
async function redeem(token) {
  const client = makeClient();
  const r = await client.auth.verifyOtp({ type: "recovery", token_hash: token });
  return { client, data: r.data, error: r.error };
}
function sql(query) {
  const result = spawnSync("psql", [dbUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", query], { stdio: ["ignore","pipe","pipe"], encoding: "utf8" });
  assert.equal(result.status, 0, "Local SQL fixture rejected");
}
function totp(secret, offset = 0) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = secret.toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
  let bits = 0, value = 0, bytes = [];
  for (const char of clean) {
    const digit = alphabet.indexOf(char);
    assert.ok(digit >= 0, "Invalid local TOTP factor");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); }
  }
  const frame = Buffer.alloc(8);
  frame.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000) + offset));
  const hash = createHmac("sha1", Buffer.from(bytes)).update(frame).digest();
  const index = hash[hash.length - 1] & 15;
  const value32 = hash.readUInt32BE(index) & 0x7fffffff;
  return String(value32 % 1_000_000).padStart(6, "0");
}
async function run() {
  await check("expired recovery hash is rejected", async () => {
    const a = await user("expired");
    const token = await link(a.email);
    sql("update auth.users set recovery_sent_at=now()-interval '72 hours' where id='" + a.id + "';");
    const r = await redeem(token);
    assert.ok(r.error, "Expired recovery token must be rejected");
  });
  await check("invalid and superseded recovery hashes are rejected", async () => {
    const a = await user("revoked");
    const first = await link(a.email);
    const next = await link(a.email);
    assert.notEqual(first, next);
    assert.ok((await redeem(first)).error, "Superseded recovery token must fail");
    assert.ok((await redeem(randomBytes(32).toString("hex"))).error, "Forged recovery hash must fail");
    const accepted = await redeem(next);
    assert.ifError(accepted.error);
    assert.ok(accepted.data.session?.access_token, "New recovery token must work");
    const replay = await redeem(next);
    assert.ok(replay.error, "Recovery token must be one-use");
    assert.ifError((await accepted.client.auth.signOut()).error);
  });
  await check("recovery request does not enumerate an existing email", async () => {
    const a = await user("exists");
    const request = async (email) => {
      const response = await fetch(url + "/auth/v1/recover", {
        method: "POST",
        headers: { apikey: anonKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      // No emails or tokens are printed. Mail is captured by local Inbucket.
      return { status: response.status, code: data?.code ?? null, msg: data?.msg ?? data?.message ?? null };
    };
    const existing = await request(a.email);
    const missing = await request("not-found-" + suffix + "@example.invalid");
    assert.deepEqual(existing, missing, "Account existence must not change recovery response");
    assert.equal(existing.status, 200);
  });
  await check("password change, explicit logout and fresh sign-in", async () => {
    const a = await user("password");
    const client = makeClient();
    const original = await client.auth.signInWithPassword({ email: a.email, password: oldPassword });
    assert.ifError(original.error);
    const changed = await client.auth.updateUser({ password: newPassword });
    assert.ifError(changed.error);
    const failOld = await makeClient().auth.signInWithPassword({ email: a.email, password: oldPassword });
    assert.ok(failOld.error, "Old password must no longer authenticate");
    const successNew = await makeClient().auth.signInWithPassword({ email: a.email, password: newPassword });
    assert.ifError(successNew.error);
    assert.ifError((await client.auth.signOut({ scope: "global" })).error);
    const current = await client.auth.getSession();
    assert.equal(current.data.session, null, "Changing password route must allow full logout");
    assert.ifError((await successNew.data.session ? { error: null } : { error: Error("Missing session") }).error);
  });
  await check("MFA factor survives recovery and AAL1 cannot become AAL2 without TOTP", async () => {
    const a = await user("mfa");
    const first = makeClient();
    assert.ifError((await first.auth.signInWithPassword({ email: a.email, password: oldPassword })).error);
    const enrolled = await first.auth.mfa.enroll({ factorType: "totp", friendlyName: "isolated-pr160-factor" });
    assert.ifError(enrolled.error);
    assert.ok(enrolled.data.id && enrolled.data.totp?.secret, "Local TOTP enrollment missing");
    const goodCode = totp(enrolled.data.totp.secret);
    const verified = await first.auth.mfa.challengeAndVerify({ factorId: enrolled.data.id, code: goodCode });
    assert.ifError(verified.error);
    const upgraded = await first.auth.mfa.getAuthenticatorAssuranceLevel();
    assert.ifError(upgraded.error);
    assert.equal(upgraded.data.currentLevel, "aal2");
    assert.ifError((await first.auth.signOut()).error);
    const recoveryToken = await link(a.email);
    const recovered = await redeem(recoveryToken);
    assert.ifError(recovered.error);
    const aal = await recovered.client.auth.mfa.getAuthenticatorAssuranceLevel();
    assert.ifError(aal.error);
    assert.equal(aal.data.currentLevel, "aal1", "Recovery alone must not confer AAL2");
    assert.equal(aal.data.nextLevel, "aal2", "Verified second factor must remain required");
    const invalidCode = goodCode === "000000" ? "111111" : "000000";
    const bad = await recovered.client.auth.mfa.challengeAndVerify({ factorId: enrolled.data.id, code: invalidCode });
    assert.ok(bad.error, "Invalid TOTP must be rejected");
    const stillAal1 = await recovered.client.auth.mfa.getAuthenticatorAssuranceLevel();
    assert.equal(stillAal1.data.currentLevel, "aal1");
    const good = await recovered.client.auth.mfa.challengeAndVerify({ factorId: enrolled.data.id, code: totp(enrolled.data.totp.secret) });
    assert.ifError(good.error);
    const verifiedAgain = await recovered.client.auth.mfa.getAuthenticatorAssuranceLevel();
    assert.equal(verifiedAgain.data.currentLevel, "aal2");
    assert.ifError((await recovered.client.auth.signOut()).error);
  });
}
try {
  await run();
} catch (error) {
  // Failure logging is intentionally non-sensitive: no tokens, mail addresses,
  // TOTP codes, recovery links, or DB connection strings.
  console.error("FAIL isolated GoTrue stage=" + stage + " kind=" + (error?.name || "unknown"));
  process.exitCode = 1;
} finally {
  for (const id of created.reverse()) {
    const removed = await admin.auth.admin.deleteUser(id);
    if (removed.error) { console.error("FAIL local identity cleanup"); process.exitCode = 1; }
  }
}
