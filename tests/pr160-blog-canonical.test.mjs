import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveBlogCanonical } from "../lib/blog/resolveCanonical.mjs";

const site="https://hamza-agency.com";
const slug="tiktok-live-hamza-agency";
const ar=site+"/blog/"+slug;
const en=site+"/en/blog/"+slug;
const tr=site+"/tr/blog/"+slug;

test("blank/invalid blog canonical is always localized self URL",()=>{
 for (const self of [ar,en,tr]) {
  for (const input of ["", " ", null, undefined, "not-a-uri", site, "/", "/blog/another-post", "https://attacker.invalid/blog/"+slug, self+"?ref=x", self+"#top"])
   assert.equal(resolveBlogCanonical(input,self,site),self,JSON.stringify(input));
 }
});
test("allows only a valid same-article same-language override",()=>{
 for (const self of [ar,en,tr]){
  assert.equal(resolveBlogCanonical(self,self,site),self);
  assert.equal(resolveBlogCanonical(new URL(self).pathname,self,site),self);
 }
 assert.equal(resolveBlogCanonical(ar,en,site),en);
 assert.equal(resolveBlogCanonical(en,tr,site),tr);
});
test("blog metadata uses shared safe resolver for canonical and structured-data URL",()=>{
 const source=readFileSync(new URL("../app/blog/[slug]/page.tsx",import.meta.url),"utf8");
 assert.match(source,/resolveBlogCanonical\(post\.copy\.canonical,fallbackCanonical,SITE_URL\)/);
 assert.ok(source.includes("alternates:{canonical"));
 assert.ok(source.includes("url:canonical"));
 assert.doesNotMatch(source,/function safeCanonical\(/);
});
