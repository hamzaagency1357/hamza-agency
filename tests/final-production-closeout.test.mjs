import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const has=(source,needle,message)=>assert.ok(source.includes(needle),message||`missing: ${needle}`);

test("EN/TR shared public chrome localizes managed navigation and deduplicates install",()=>{
  const header=read("components/PublicGlobalHeader.tsx");
  const footer=read("components/PublicFooterLinks.tsx");
  const quickNav=read("components/PublicQuickNav.tsx");
  has(header,"getSharedNavigationLabel(language, managed)");
  has(footer,"getSharedNavigationLabel(language,link)");
  has(footer,"!isInstallAppLink(link)");
  has(quickNav,'"الوصول والخدمات": "Access and services"');
  has(quickNav,'"الوصول والخدمات": "Erişim ve hizmetler"');
});

test("home keeps one global navigation and safe EN/TR program fallbacks",()=>{
  const home=read("app/page.tsx");
  assert.equal(home.includes("const nav=["),false);
  assert.equal(home.includes("<nav className="),false);
  has(home,'xena:"Explore the Xena creator program');
  has(home,'catchii:"HAMZA AGENCY\'nin profesyonel takibiyle Catchii');
  has(home,"containsArabic");
});

test("localized program SEO is explicit and non-guaranteed",()=>{
  const seo=read("lib/i18n/publicSeo.ts");
  for(const slug of ["tiktok","bigo-live","yaahlan","xena","catchii"]) has(seo,slug);
  has(seo,"ولا يعني القبول التلقائي أو النهائي");
  has(seo,"does not guarantee automatic or final acceptance");
  has(seo,"otomatik veya kesin kabul anlamına gelmez");
  has(seo,'`برنامج ${name} لصناع المحتوى | HAMZA AGENCY`');
  has(seo,'`${name} Creator Program | HAMZA AGENCY`');
  has(seo,"سياسة ملفات تعريف الارتباط | HAMZA AGENCY");
});

test("review empty state contains no fabricated review and no empty zero-stat strip",()=>{
  const reviews=read("components/ReviewsPageContent.tsx");
  const stats=read("components/ReviewsStatsUi.tsx");
  assert.equal(reviews.includes("بانتظار أول تقييم"),false);
  assert.equal(reviews.includes("defaultReview"),false);
  has(stats,"if(isDefault)return null");
});

test("install flow remains gated by a real browser install opportunity",()=>{
  const install=read("components/InstallAppPage.tsx");
  has(install,'const ready = context === "browser" && installState.available && !installed');
  has(install,"hamza:pwa-install-request");
  has(install,'data-testid="install-app-fallback"');
  has(install,'data-testid="install-app-action"');
});

test("sitemap and robots keep truthful date and sensitive-route invariants",()=>{
  const sitemap=read("app/sitemap.ts");
  const robots=read("app/robots.ts");
  has(sitemap,"post.updatedAt||post.publishedAt");
  has(sitemap,"cmsLastModifiedByPath.get(path)");
  assert.equal(sitemap.includes("lastModified:new Date()"),false);
  for(const value of ["/admin","/api/","/track"]) has(robots,value);
});

test("decorated agent identity is alternate, not the structured-data primary name",()=>{
  const schema=read("components/StructuredData.tsx");
  has(schema,"name: agentDisplayName[language]");
  has(schema,'alternateName: ["عراب سوريا", "⚔عܓོراب✴سܓོوريا⚔"');
});
