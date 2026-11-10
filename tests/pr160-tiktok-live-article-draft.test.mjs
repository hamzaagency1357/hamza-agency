import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { sanitizeArticleHtml } from "../lib/blog/sanitizeHtml.mjs";

const root=new URL("../",import.meta.url);
const draft=JSON.parse(readFileSync(new URL("lib/blog/pr160TikTokLiveDraft.json",root),"utf8"));
const admin=readFileSync(new URL("components/AdminBlogManager.tsx",root),"utf8");
const applyUrl="https://www.tiktok.com/t/ZS2AxwqsK/";
const contactUrl="https://wa.me/905011730337";

test("TikTok LIVE draft follows existing CMS route and never publishes automatically",()=>{
 assert.equal(draft.slug,"tiktok-live-hamza-agency");
 assert.equal(draft.status,"draft");
 assert.equal(draft.authorName,"HAMZA AGENCY");
 assert.deepEqual(Object.keys(draft.translations).sort(),["ar","en","tr"]);
 assert.ok(admin.includes('import tiktokArticleDraft from "@/lib/blog/pr160TikTokLiveDraft.json"'));
 assert.ok(admin.includes('const existing=rows.find((row)=>row.slug===tiktokArticleDraft.slug)'));
 assert.ok(admin.includes('setStatus("draft")'));
 assert.ok(admin.includes('setTranslations(tiktokArticleDraft.translations)'));
 assert.ok(admin.includes('onClick={loadTikTokArticleDraft}'));
 assert.ok(admin.includes("لم يُحفظ أو يُنشر أي شيء"));
});

test("three independently localized, safe and complete article versions contain official registration CTAs",()=>{
 for(const [language,copy] of Object.entries(draft.translations)){
  for(const key of ["title","excerpt","content","seoTitle","seoDescription","ogTitle","ogDescription","imageAlt"]){
   assert.ok(typeof copy[key]==="string" && copy[key].trim(),language+":"+key);
  }
  assert.ok(copy.content.includes(applyUrl),language+" TikTok form");
  assert.ok(copy.content.includes(contactUrl),language+" WhatsApp");
  assert.ok(copy.content.includes('href="/apply"'),language+" website form");
  assert.ok(copy.content.includes("⚔عܓོراب✴سܓོوريا⚔"),language+" agent name");
  assert.ok(copy.content.includes("ⒽⒶ"),language+" logo");
  assert.ok((copy.content.match(/<h2>/g)||[]).length>=6,language+" topic sections");
  assert.ok((copy.content.match(/<h3>/g)||[]).length>=5,language+" FAQs");
  const sanitized=sanitizeArticleHtml(copy.content);
  assert.ok(sanitized.includes(applyUrl));
  assert.ok(sanitized.includes(contactUrl));
  assert.ok(sanitized.includes('href="/apply"'));
  assert.doesNotMatch(sanitized,/<script\b|javascript:/i);
  assert.ok(copy.allowIndex===true);
  assert.equal(copy.canonical,""); // CMS page derives locale-specific canonical.
 }
 assert.match(draft.translations.ar.content,/القبول مضمون عند استيفاء جميع شروط ومتطلبات البرنامج والتحقق منها/);
 assert.match(draft.translations.en.content,/Acceptance is guaranteed when all program requirements are met and verified/);
 assert.match(draft.translations.tr.content,/Programın tüm şartları karşılandığında ve doğrulandığında kabul garantilidir/);
 assert.ok(draft.translations.tr.title.includes("Hamza Ajansı"));
 assert.ok(draft.translations.en.title.includes("HAMZA AGENCY"));
 assert.ok(draft.translations.ar.title.includes("وكالة حمزة"));
});
