import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

// Execute the real route handlers against deterministic in-memory Supabase doubles.
// No network, database or email service is accessed by these tests.
const require = createRequire(import.meta.url);
const ts = require("typescript");
const names = ["invite", "activate", "deactivate"];
const sources = Object.fromEntries(names.map((name) => [
  name, readFileSync(new URL(`../app/api/admin/team/${name}/route.ts`, import.meta.url), "utf8"),
]));

function harness(name, { actorRole = "super_admin", accepted = true, auditFailure = false, preview = false } = {}) {
  const state = {
    rows: [
      { id: 1, user_id: "owner-id", email: "owner@example.test", role: actorRole, is_active: true },
      { id: 2, user_id: "member-id", email: "member@example.test", role: "program_admin", assigned_program: "tiktok", is_active: name === "deactivate" },
    ],
    invites: 0, logs: [], writes: 0,
  };
  if (name === "invite") state.rows = state.rows.slice(0, 1);
  let nextId = 4;
  function builder(table, action = "read", value = null) {
    return {
      filters: [], limitCount: null,
      select() { return this; },
      eq(key, value) { this.filters.push([key, value]); return this; },
      limit(count) { this.limitCount = count; return this; },
      update(value) { return builder(table, "update", value); },
      insert(value) { return builder(table, "insert", value); },
      single() { return this.resolve(true); },
      maybeSingle() { return this.resolve(true); },
      then(resolve, reject) { return Promise.resolve(this.resolve(false)).then(resolve, reject); },
      resolve(single) {
        if (table === "activity_logs" && action === "insert") {
          if (auditFailure) return { error: { message: "isolated audit failure" } };
          state.logs.push(value);
          return { error: null };
        }
        if (table === "tenants") return { data: { id: 8 }, error: null };
        if (table === "programs") return { data: [{ slug: "tiktok", name: "TikTok" }], error: null };
        const matches = state.rows.filter((row) => this.filters.every(([key, value]) => row[key] === value));
        if (action === "insert") {
          const row = { id: nextId++, ...value };
          state.rows.push(row); state.writes++;
          return { data: single ? { id: row.id } : [row], error: null };
        }
        if (action === "update") {
          if (matches.length !== 1) return { data: null, error: { message: "conflict" } };
          Object.assign(matches[0], value); state.writes++;
          return { data: single ? { id: matches[0].id } : [{ id: matches[0].id }], error: null };
        }
        const rows = this.limitCount ? matches.slice(0, this.limitCount) : matches;
        return { data: single ? rows[0] ?? null : rows, error: null };
      },
    };
  }
  const client = {
    from: (table) => builder(table),
    auth: {
      getUser: async () => ({ data: { user: { id: "owner-id", email: "owner@example.test" } }, error: null }),
      admin: {
        inviteUserByEmail: async () => {
          state.invites++;
          return { data: { user: { id: "member-id" } }, error: null };
        },
        getUserById: async () => ({
          data: { user: { id: "member-id", email: "member@example.test", email_confirmed_at: accepted ? "2026-10-26" : null } },
          error: null,
        }),
      },
    },
  };
  const context = {
    module: { exports: {} }, process: { env: {
      VERCEL_ENV: preview ? "preview" : "development",
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-anon",
      SUPABASE_SERVICE_ROLE_KEY: "isolated-service",
    } }, URL,
    require: (name) => {
      if (name === "next/server") return { NextResponse: { json: (body, options = {}) => ({ status: options.status ?? 200, body }) } };
      if (name === "@supabase/supabase-js") return { createClient: () => client };
      throw Error("Unexpected dependency in isolated handler: " + name);
    },
  };
  context.exports = context.module.exports;
  const compiled = ts.transpileModule(sources[name], { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(compiled, context, { timeout: 2000 });
  const run = (body = {}, headers = {}) => context.module.exports.POST({
    headers: { get: (key) => headers[key] ?? (key === "authorization" ? "Bearer isolated" : null) },
    nextUrl: { origin: "http://localhost:3000" },
    json: async () => body,
  });
  return { run, state };
}
test("invite creates inactive account before activation", async () => {
  const h = harness("invite");
  const result = await h.run({ email: "member@example.test", role: "program_admin", assigned_program: "tiktok" });
  assert.equal(result.status, 201);
  assert.equal(h.state.rows[1].is_active, false);
  assert.equal(h.state.rows[1].user_id, "member-id");
  assert.equal(h.state.invites, 1);
  assert.equal(h.state.logs.length, 1);
});
test("non-owner cannot invite or write", async () => {
  const h = harness("invite", { actorRole: "program_admin" });
  const result = await h.run({ email: "member@example.test", role: "program_admin", assigned_program: "tiktok" });
  assert.equal(result.status, 403);
  assert.equal(h.state.invites, 0);
  assert.equal(h.state.writes, 0);
});
test("preview cannot send invitations", async () => {
  const h = harness("invite", { preview: true });
  const result = await h.run({ email: "member@example.test", role: "program_admin", assigned_program: "tiktok" });
  assert.equal(result.status, 403);
  assert.equal(h.state.invites, 0);
});
test("activation rejects an invitation not yet accepted", async () => {
  const h = harness("activate", { accepted: false });
  assert.equal((await h.run({ id: 2 })).status, 409);
  assert.equal(h.state.rows[1].is_active, false);
});
test("accepted scoped invitation activates only on owner approval", async () => {
  const h = harness("activate");
  assert.equal((await h.run({ id: 2 })).status, 200);
  assert.equal(h.state.rows[1].is_active, true);
  assert.equal(h.state.logs.length, 1);
});
test("owner cannot deactivate own account", async () => {
  const h = harness("deactivate");
  assert.equal((await h.run({ id: 1 })).status, 409);
  assert.equal(h.state.rows[0].is_active, true);
});
test("deactivation revokes active member", async () => {
  const h = harness("deactivate");
  assert.equal((await h.run({ id: 2 })).status, 200);
  assert.equal(h.state.rows[1].is_active, false);
  assert.equal(h.state.logs.length, 1);
});
test("audit failure after deactivation is not reported as success", async () => {
  const h = harness("deactivate", { auditFailure: true });
  assert.equal((await h.run({ id: 2 })).status, 503);
  assert.equal(h.state.rows[1].is_active, false);
});
