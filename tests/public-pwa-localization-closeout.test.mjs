import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("PWA uses one manifest source with existing application icon route",()=>{
  const manifest=read("app/manifest.ts");
  assert.equal(existsSync(new URL("../public/manifest.json",import.meta.url)),false);
  assert.equal(existsSync(new URL("../public/manifest.webmanifest",import.meta.url)),false);
  assert.ok(manifest.includes('name: "HAMZA AGENCY"'));
  assert.ok(manifest.includes('src: "/icon"'));
  assert.ok(manifest.includes('scope: "/"'));
});

test("service worker separates AR EN TR offline fallbacks and keeps private surfaces uncached",()=>{
  const sw=read("public/sw.js");
  assert.ok(sw.includes('"/offline", "/en/offline", "/tr/offline"'));
  assert.ok(sw.includes('return "/en/offline"'));
  assert.ok(sw.includes('return "/tr/offline"'));
  for(const prefix of ['"/admin"','"/portal"','"/api"','"/auth"']) assert.ok(sw.includes(prefix));
});

test("offline page is locale-pure and Smart Support uses the locked Arabic label",()=>{
  const offline=read("app/offline/page.tsx");
  const support=read("components/SmartSupportPanel.tsx");
  assert.ok(offline.includes('useSiteLanguage'));
  assert.ok(offline.includes('title: "You are offline"'));
  assert.ok(offline.includes('title: "Çevrimdışısınız"'));
  assert.ok(support.includes('title:"الدعم الذكي"'));
  assert.ok(support.includes('title:"Smart Support"'));
  assert.ok(support.includes('title:"Akıllı Destek"'));
  assert.ok(support.includes("REQUEST_TIMEOUT_MS=12000"));
});

test("legacy agent aliases and framework generator are absent from public metadata sources",()=>{
  const metadata=read("lib/i18n/serverPublicMetadata.ts");
  const structured=read("components/StructuredData.tsx");
  const seo=read("lib/i18n/publicSeo.ts");
  for(const source of [metadata,structured,seo]){
    assert.equal(source.includes("Agent Hamza"),false);
    assert.equal(source.includes("Temsilci Hamza"),false);
  }
  assert.equal(metadata.includes('generator:"Next.js"'),false);
  assert.ok(seo.includes('en: { title: "عراب سوريا | Agent and Manager at HAMZA AGENCY"'));
});

test("reviewer name remains required independent of managed review form config",()=>{
  const reviews=read("components/ReviewsPageContent.tsx");
  assert.ok(reviews.includes('reviewer_name:{enabled:true,required:true}'));
  assert.ok(reviews.includes('next.reviewer_name={enabled:true,required:true}'));
  assert.ok(reviews.includes('required/>'));
});
