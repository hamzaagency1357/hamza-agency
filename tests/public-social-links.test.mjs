import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const footer = readFileSync(new URL("../components/PublicFooterLinks.tsx", import.meta.url), "utf8");

test("public root layout renders the active footer", () => {
  assert.ok(root.includes('import PublicFooterLinks from'));
  assert.ok(root.includes('<PublicFooterLinks/>'));
});

test("active footer has official external social links and keyboard focus", () => {
  for (const [platform, href] of [
    ["instagram", "https://www.instagram.com/hamza_agency/"],
    ["facebook", "https://www.facebook.com/share/1CPDPhC8MW/"],
  ]) {
    const link = footer.split('<a href="' + href + '"')[1]?.split('>')[0];
    assert.ok(link, "missing " + platform + " in active footer");
    assert.ok(link.includes('target="_blank"'));
    assert.ok(link.includes('rel="noopener noreferrer"'));
    assert.ok(link.includes('focus-visible:'));
    assert.ok(link.includes('data-testid="footer-social-' + platform + '"'));
  }
});

test("social section has Arabic, English and Turkish accessible copy", () => {
  assert.ok(footer.includes("تابع وكالة حمزة"));
  assert.ok(footer.includes("Follow HAMZA AGENCY"));
  assert.ok(footer.includes("HAMZA AGENCY sosyal medya"));
  assert.ok(footer.includes("socialAriaLabels"));
});
