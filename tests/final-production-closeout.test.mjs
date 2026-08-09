import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

test("EN/TR shared public chrome cannot reuse raw managed Arabic labels",()=>{
  const header=read("components/PublicGlobalHeader.tsx");
  const footer=read("components/PublicFooterLinks.tsx");
  const quickNav=read("components/PublicQuickNav.tsx");
  assert.match(header,/getSharedNavigationLabel\(language, managed\)/);
  assert.match(footer,/getSharedNavigationLabel\(language,link\)/);
  assert.match(footer,/filter\(\(link\)=>!isInstallAppLink\(link\)\)/);
  assert.match(quickNav,/"الوصول والخدمات": "Access and services"/);
  assert.match(quickNav,/"الوصول والخدمات": "Erişim ve hizmetler"/);
});

test("home uses one global navigation and safe EN/TR program fallbacks",()=>{
  const home=read("app/page.tsx");
  assert.doesNotMatch(home,/const nav=\[/);
  assert.doesNotMatch(home,/<nav className=/);
  assert.match(home,/xena:"Explore the Xena creator program/);
  assert.match(home,/catchii:"HAMZA AGENCY'nin profesyonel takibiyle Catchii/);
  assert.match(home,/containsArabic/);
});

test("program details reject Arabic residue in EN/TR and state non-guaranteed acceptance",()=>{
  const program=read("app/programs/[slug]/page.tsx");
  assert.match(program,/language!=="ar"&&containsArabic\(localized\)/);
  assert.match(program,/ولا يعني القبول التلقائي أو النهائي/);
  assert.match(program,/does not guarantee automatic or final acceptance/);
  assert.match(program,/otomatik veya kesin kabul anlamına gelmez/);
});

test("all five program routes have explicit localized SEO and Arabic cookie policy metadata",()=>{
  const seo=read("lib/i18n/publicSeo.ts");
  for(const slug of ["tiktok","bigo-live","yaahlan","xena","catchii"]) assert.ok(seo.includes(slug),`missing SEO program slug ${slug}`);
  assert.match(seo,/برنامج \$\{name\} لصناع المحتوى \| HAMZA AGENCY/);
  assert.match(seo,/\$\{name\} Creator Program \| HAMZA AGENCY/);
  assert.match(seo,/سياسة ملفات تعريف الارتباط \| HAMZA AGENCY/);
});

test("review empty state has no fake review or prominent zero metrics",()=>{
  const reviews=read("components/ReviewsPageContent.tsx");
  const stats=read("components/ReviewsStatsUi.tsx");
  assert.doesNotMatch(reviews,/بانتظار أول تقييم/);
  assert.doesNotMatch(reviews,/defaultReview/);
  assert.match(stats,/if\(isDefault\)return null/);
});

test("install flow remains gated by real install availability",()=>{
  const install=read("components/InstallAppPage.tsx");
  assert.match(install,/context === "browser" && installState\.available && !installed/);
  assert.match(install,/hamza:pwa-install-request/);
  assert.match(install,/data-testid="install-app-fallback"/);
  assert.match(install,/data-testid="install-app-action"/);
});

test("sitemap dates and robots sensitive-route invariants stay truthful",()=>{
  const sitemap=read("app/sitemap.ts");
  const robots=read("app/robots.ts");
  assert.match(sitemap,/post\.updatedAt\|\|post\.publishedAt/);
  assert.match(sitemap,/cmsLastModifiedByPath\.get\(path\)/);
  assert.doesNotMatch(sitemap,/lastModified:\s*new Date\(\)/);
  for(const value of ["/admin","/api/","/track"]) assert.ok(robots.includes(value),`robots missing ${value}`);
});

test("structured agent identity keeps the decorated form out of the primary name",()=>{
  const schema=read("components/StructuredData.tsx");
  assert.match(schema,/name: agentDisplayName\[language\]/);
  assert.match(schema,/alternateName: \["عراب سوريا", "⚔عܓོراب✴سܓོوريا⚔"/);
});
