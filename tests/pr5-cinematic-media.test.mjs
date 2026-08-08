import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const lib = readFileSync(join(root, "lib/siteVisualMedia.ts"), "utf8");
const runtime = readFileSync(join(root, "components/CinematicSiteBackground.tsx"), "utf8");
const api = readFileSync(join(root, "app/api/public/site-visual/route.ts"), "utf8");
const admin = readFileSync(join(root, "app/admin/media/cinematic/page.tsx"), "utf8");
const migration = readFileSync(join(root, "supabase/migrations/20260808233000_pr5_cinematic_visual_media.sql"), "utf8");

test("PR5 maps all approved page scopes and AR EN TR locale stripping", () => {
  for (const scope of ["home","programs","services","success-stories","blog","agent","contact","install-app","tracking","service-request","application-status","service-status"]) {
    assert.ok(lib.includes(`\"${scope}\"`), `missing visual scope ${scope}`);
  }
  assert.ok(lib.includes("withoutLocale"));
  assert.ok(lib.includes("(?:en|tr)"));
});

test("PR5 runtime provides cinematic fallback and constrained-device guards", () => {
  assert.match(runtime, /prefers-reduced-motion: reduce/);
  assert.match(runtime, /saveData/);
  assert.match(runtime, /weakDevice/);
  assert.match(runtime, /playsInline/);
  assert.match(runtime, /preload="metadata"/);
  assert.match(runtime, /selectDeviceVisualSources/);
  assert.match(runtime, /poster=/);
});

test("PR5 public API fails closed without raw database errors", () => {
  assert.match(api, /status.*eq\.published/s);
  assert.match(api, /file_type.*cinematic_video.*background_image.*texture/s);
  assert.match(api, /return emptyResponse\(false\)/);
  assert.doesNotMatch(api, /service_role/);
});

test("PR5 migration is additive, scheduled and RLS protected", () => {
  assert.match(migration, /add column if not exists/);
  assert.match(migration, /alter table public\.media enable row level security/);
  assert.match(migration, /status = 'published'/);
  assert.match(migration, /publish_at is null or publish_at <= now\(\)/);
  assert.match(migration, /unpublish_at is null or unpublish_at > now\(\)/);
  assert.doesNotMatch(migration, /\bdrop\s+table\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
});

test("PR5 upload allowlist excludes SVG and client service-role credentials", () => {
  for (const mime of ["image/jpeg","image/png","image/webp","image/avif","video/webm","video/mp4"]) {
    assert.ok(migration.includes(`'${mime}'`), `missing MIME ${mime}`);
  }
  assert.doesNotMatch(migration, /image\/svg\+xml/);
  assert.doesNotMatch(admin, /image\/svg\+xml/);
  assert.doesNotMatch(admin, /service_role/);
});

test("PR5 safe delete requires archive and never removes Storage objects", () => {
  assert.match(admin, /row\.status !== "archived"/);
  assert.match(admin, /is_active: false/);
  assert.match(admin, /from\("media"\)\.delete\(\)/);
  assert.doesNotMatch(admin, /\.storage\.from\(BUCKET\)\.remove/);
});
