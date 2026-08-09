import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const runtime = readFileSync(join(root, "components/CinematicSiteBackground.tsx"), "utf8");
const css = readFileSync(join(root, "app/pr5-cinematic.css"), "utf8");
const admin = readFileSync(join(root, "app/admin/media/cinematic/page.tsx"), "utf8");
const visualLib = readFileSync(join(root, "lib/siteVisualMedia.ts"), "utf8");

const homeVideoAssets = [
  "public/media/cinematic/home-cinematic-desktop.webm",
  "public/media/cinematic/home-cinematic-desktop.mp4",
  "public/media/cinematic/home-cinematic-mobile.webm",
  "public/media/cinematic/home-cinematic-mobile.mp4",
  "public/media/cinematic/home-cinematic-desktop-poster.webp",
  "public/media/cinematic/home-cinematic-mobile-poster.webp",
];
const pageVisuals = ["programs","services","success-stories","blog","agent","contact","install-app","tracking","service-request","application-status","service-status"];

test("PR5 completion keeps cinematic assets available without forcing an unpublished fallback", () => {
  for (const asset of homeVideoAssets) assert.ok(existsSync(join(root, asset)), `missing ${asset}`);
  assert.match(runtime, /No published managed media means the existing site background remains untouched/);
  assert.match(runtime, /if \(!scope \|\| !media\) return null/);
  assert.match(runtime, /<video/);
  assert.match(runtime, /data-mode=\{mode\}/);
  assert.doesNotMatch(runtime, /canPlayBuiltInHomeVideo/);
});

test("approved visual scopes remain represented by cinematic assets and route coverage", () => {
  for (const scope of pageVisuals) {
    assert.ok(existsSync(join(root, `public/media/cinematic/${scope}.webp`)), `missing ${scope} visual`);
  }
  assert.match(visualLib, /PUBLIC_ROUTE_ALIASES/);
  assert.match(visualLib, /path\.startsWith\("\/programs\/"\)/);
  assert.match(visualLib, /path\.startsWith\("\/blog\/"\)/);
});

test("managed video respects constrained environments and playback failure", () => {
  assert.match(runtime, /shouldPlayCinematic\(media\.autoplay, \{ reducedMotion, saveData, weakDevice \}\)/);
  assert.match(runtime, /playsInline/);
  assert.match(runtime, /preload="metadata"/);
  assert.match(runtime, /onError=\{\(\) => setVideoFailed\(true\)\}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /video \{ display: none !important; \}/);
});

test("background stays non-interactive and overlay no longer buries the cinematic scene", () => {
  assert.match(css, /pointer-events: none !important/);
  assert.match(css, /overflow: hidden !important/);
  assert.match(css, /z-index: 0 !important/);
  assert.match(css, /rgba\(3,0,5,\.08\)/);
  assert.doesNotMatch(css, /box-shadow: inset 0 0 18vw rgba\(0,0,0,\.88\)/);
});

test("admin cinematic UI contains no PR or developer-stage badge", () => {
  assert.doesNotMatch(admin, /PR5\s*·\s*CINEMATIC MEDIA/i);
  assert.match(admin, /إدارة الوسائط السينمائية/);
});
