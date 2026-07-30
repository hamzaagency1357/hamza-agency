import test from "node:test";
import assert from "node:assert/strict";
import {
  generateInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
  isValidRawInvitationToken,
  normalizeInvitationEmail,
  normalizeInvitationExpiryDays,
  normalizeInvitationRole,
} from "../lib/productExpansion/invitationSecurity.ts";

test("invitation tokens are random, URL-safe and persisted only as deterministic SHA-256 hashes", () => {
  const first = generateInvitationToken();
  const second = generateInvitationToken();
  assert.notEqual(first.raw, second.raw);
  assert.match(first.raw, /^[A-Za-z0-9_-]{40,100}$/);
  assert.match(first.hash, /^[a-f0-9]{64}$/);
  assert.equal(first.hash, hashInvitationToken(first.raw));
  assert.notEqual(first.hash, second.hash);
  assert.equal(isValidRawInvitationToken(first.raw), true);
  assert.equal(isValidRawInvitationToken("unsafe token"), false);
});

test("invitation email and roles fail closed", () => {
  assert.equal(normalizeInvitationEmail("  USER@Example.COM "), "user@example.com");
  assert.equal(normalizeInvitationEmail("not-an-email"), null);
  assert.equal(normalizeInvitationRole("creator"), "creator");
  assert.equal(normalizeInvitationRole("super_admin"), null);
  assert.equal(normalizeInvitationRole("unknown"), null);
});

test("invitation expiry is bounded to one through thirty days without waiting", () => {
  const now = Date.UTC(2026, 6, 31, 0, 0, 0);
  assert.equal(normalizeInvitationExpiryDays(0), 1);
  assert.equal(normalizeInvitationExpiryDays(999), 30);
  assert.equal(normalizeInvitationExpiryDays("7"), 7);
  assert.equal(invitationExpiresAt(7, now), "2026-08-07T00:00:00.000Z");
});
