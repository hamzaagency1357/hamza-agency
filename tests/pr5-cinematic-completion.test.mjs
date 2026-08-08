import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const runtime = readFileSync(join(root, "components/CinematicSiteBackground.tsx"), "utf8");
const css = readFileSync(join(root, "app/pr5-cinematic.css"), "utf8");
const admin = readFileSync(join(root, "app/admin/media/cinematic/page.tsx"), "utf8");

const requiredAssets = [
  "/media/cinematic/home-gateway-desktop.webp",
  "/media/cinematic/home-gateway-mobile.webp",
  "/media/cinematic/home-gateway-poster.webp",
];

test("PR5 completion has a real built-in cinematic scene instead of media-null gradient-only", () => {
  for (const asset of requiredAssets) assert.ok(runtime.includes(asset), `missing ${asset}`);
  assert.match(runtime, /data-cinematic-source=\{media \? "managed" : "built-in"\}/);
  assert.match(runtime, /data-mode=\{mode\}/);
  assert.match(runtime, /layered-motion/);
  assert.match(runtime, /hamza-cinematic-scene-image/);
});

test("normal devices get actual motion while constrained environments remain on the same-scene poster", () => {
  assert.match(runtime, /const constrained = reducedMotion \|\| saveData \|\| weakDevice/);
  assert.match(runtime, /const imageMotion = !canPlayVideo && !constrained/);
  assert.match(runtime, /data-cinematic-motion=\{imageMotion \|\| canPlayVideo \? "active" : "static"\}/);
  assert.match(runtime, /onError=\{\(\) => setVideoFailed\(true\)\}/);
  assert.match(css, /@keyframes hamza-cinematic-camera-drift/);
  assert.match(css, /@keyframes hamza-cinematic-light-sweep/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation: none !important/);
});

test("responsive source and interaction contracts stay safe", () => {
  assert.match(runtime, /<source media="\(max-width: 767px\)" srcSet=\{DEFAULT_MOBILE\}/);
  assert.match(css, /pointer-events: none !important/);
  assert.match(css, /overflow: hidden !important/);
  assert.match(css, /z-index: 0 !important/);
  assert.doesNotMatch(css, /overflow-x:\s*auto/);
});

test("admin cinematic UI contains no PR or developer-stage badge", () => {
  assert.doesNotMatch(admin, /PR5\s*·\s*CINEMATIC MEDIA/i);
  assert.match(admin, /إدارة الوسائط السينمائية/);
});
