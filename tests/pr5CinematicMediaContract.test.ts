import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(join(root, "supabase/migrations/20260808233000_pr5_cinematic_visual_media.sql"), "utf8");
const publicBackground = readFileSync(join(root, "components/CinematicSiteBackground.tsx"), "utf8");
const adminManager = readFileSync(join(root, "app/admin/media/cinematic/page.tsx"), "utf8");

describe("PR5 cinematic media security contract", () => {
  it("keeps migration additive and RLS protected", () => {
    expect(migration).toContain("add column if not exists");
    expect(migration).toContain("alter table public.media enable row level security");
    expect(migration).toContain("status = 'published'");
    expect(migration).toContain("publish_at is null or publish_at <= now()");
    expect(migration).toContain("unpublish_at is null or unpublish_at > now()");
    expect(migration).not.toMatch(/\bdrop\s+table\b/i);
    expect(migration).not.toMatch(/\btruncate\b/i);
  });
  it("allows only safe image and video MIME types and never SVG", () => {
    for (const mime of ["image/jpeg","image/png","image/webp","image/avif","video/webm","video/mp4"]) expect(migration).toContain(`'${mime}'`);
    expect(migration).not.toContain("image/svg+xml");
    expect(adminManager).not.toContain("image/svg+xml");
  });
  it("does not introduce client service role credentials", () => {
    expect(publicBackground).not.toContain("service_role");
    expect(adminManager).not.toContain("service_role");
  });
  it("protects reduced motion and constrained devices", () => {
    expect(publicBackground).toContain("prefers-reduced-motion: reduce");
    expect(publicBackground).toContain("saveData");
    expect(publicBackground).toContain("weakDevice");
    expect(publicBackground).toContain("playsInline");
    expect(publicBackground).toContain('preload="metadata"');
  });
  it("keeps safe delete two step and never deletes storage objects", () => {
    expect(adminManager).toContain('status: "archived"');
    expect(adminManager).toContain("is_active: false");
    expect(adminManager).toContain('row.status !== "archived"');
    expect(adminManager).toContain('.from("media").delete()');
    expect(adminManager).not.toContain(".storage.from(BUCKET).remove");
  });
});
