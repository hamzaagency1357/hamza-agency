import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const compact=(value)=>value.replace(/\s+/g,"");

test("shared footer localizes managed labels and keeps one install utility",()=>{const source=read("components/PublicFooterLinks.tsx");assert.ok(compact(source).includes("getSharedNavigationLabel(language,link)"));assert.ok(compact(source).includes("!isInstallAppLink(link)"));assert.ok(source.includes('data-testid="footer-install-app"'))});

test("program SEO has explicit locale-safe program metadata and non-guarantee wording",()=>{const source=read("lib/i18n/publicSeo.ts");assert.ok(source.includes('tiktok:"TikTok"'));assert.ok(source.includes('"bigo-live":"BIGO LIVE"'));assert.ok(source.includes('xena:"Xena"'));assert.ok(source.includes('catchii:"Catchii"'));assert.ok(source.includes("does not guarantee automatic or final acceptance"));assert.ok(source.includes("ولا يعني القبول التلقائي أو النهائي"));assert.ok(source.includes("سياسة ملفات تعريف الارتباط | HAMZA AGENCY"))});

test("install page remains gated by a real browser install opportunity",()=>{const source=read("components/InstallAppPage.tsx");const normalized=compact(source);assert.ok(normalized.includes('constready=context==="browser"&&installState.available&&!installed'));assert.ok(source.includes("hamza:pwa-install-request"));assert.ok(source.includes('data-testid="install-app-action"'));assert.ok(source.includes('data-testid="install-app-fallback"'));assert.ok(normalized.includes("onClick={requestInstall}"))});

test("sitemap never fabricates a build-time lastModified",()=>{const source=read("app/sitemap.ts");assert.ok(source.includes("post.updatedAt||post.publishedAt"));assert.ok(source.includes("cmsLastModifiedByPath.get(path)"));assert.equal(source.includes("lastModified:new Date()"),false)});
