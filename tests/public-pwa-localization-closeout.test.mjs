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

test("Turkish install copy preserves HAMZA AGENCY and the translation evidence forbids cross-locale leakage",()=>{
  const pwa=read("lib/i18n/privacyAndPwaCopy.ts");
  const translations=read("e2e/closeout/translations.spec.mjs");
  assert.ok(pwa.includes('pageEyebrow:"HAMZA AGENCY uygulaması"'));
  assert.ok(pwa.includes("HAMZA AGENCY'yi cihazınıza yükleyin"));
  assert.ok(pwa.includes("HAMZA AGENCY'yi bağımsız uygulama modunda kullanıyorsunuz"));
  assert.equal(pwa.includes("Hamza Ajansı"),false);
  assert.ok(translations.includes('agency: "HAMZA AGENCY"'));
  assert.ok(translations.includes('crossLocaleInstallLeakage'));
  assert.equal(translations.includes("Hamza Ajansı"),false);
});

test("legacy agent aliases and framework generator are absent from public metadata sources",()=>{
  const metadata=read("lib/i18n/serverPublicMetadata.ts");
  const structured=read("components/StructuredData.tsx");
  const seo=read("lib/i18n/publicSeo.ts");
  for(const source of [metadata,structured,seo]){
    assert.equal(source.includes("Agent Hamza"),false);
    assert.equal(source.includes("Temsilci Hamza"),false);
    assert.equal(source.includes("Hamza Ajansı"),false);
  }
  assert.equal(metadata.includes('generator:"Next.js"'),false);
  assert.ok(seo.includes('en: { title: "عراب سوريا | Agent and Manager at HAMZA AGENCY"'));
});

test("Owner-approved global SEO positioning is localized and feeds metadata plus structured data",()=>{
  const seo=read("lib/i18n/publicSeo.ts");
  const metadata=read("lib/i18n/serverPublicMetadata.ts");
  const structured=read("components/StructuredData.tsx");
  for(const copy of[
    "HAMZA AGENCY — من أبرز وأأمن الوكالات عالميًا في دعم وإدارة صناع المحتوى.",
    "HAMZA AGENCY — one of the world’s leading and safest agencies for creator support and management.",
    "HAMZA AGENCY — içerik üreticisi desteği ve yönetiminde dünyanın önde gelen ve en güvenli ajanslarından biri.",
  ]) assert.ok(seo.includes(copy),copy);
  assert.ok(seo.includes("Owner-approved marketing positioning"));
  assert.ok(metadata.includes("description:copy.description"));
  assert.ok(metadata.includes("openGraph:{title:copy.title,description:copy.description"));
  assert.ok(metadata.includes("twitter:{card:\"summary_large_image\",title:copy.title,description:copy.description"));
  assert.ok(structured.includes("buildOrganization(copy.description)"));
  assert.ok(structured.includes("buildLocalBusiness(copy.description)"));
  assert.ok(structured.includes('buildWebsite(language, getPublicSeoCopy("/", language).description)'));
});

test("reviewer name remains required independent of managed review form config",()=>{
  const reviews=read("components/ReviewsPageContent.tsx");
  assert.ok(reviews.includes('reviewer_name:{enabled:true,required:true}'));
  assert.ok(reviews.includes('next.reviewer_name={enabled:true,required:true}'));
  assert.ok(reviews.includes('required/>'));
});
