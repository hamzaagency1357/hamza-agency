import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {normalizeAcceptanceGuaranteeClaims,containsPositiveAcceptanceGuarantee} from "../lib/i18n/acceptanceGuaranteeSafety.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("operation dropdowns bind raw statuses and preserve Arabic display",()=>{
 const s=read("components/admin/ProductOperationsConsole.tsx");
 assert.equal((s.match(/value=\{text\(row\.status\)\}/g)||[]).length,5);
 assert.doesNotMatch(s,/value=\{operationalLabel\(row\.status\)\}/);
 assert.match(s,/updateTaskStatus\(text\(row\.id\), event\.target\.value\)/);
});
test("verified-condition acceptance promises remain intact in all three languages",()=>{
 const examples={
  ar:"نعم، القبول مضمون للطلبات التي تستوفي شروط البرنامج.",
  en:"Yes, acceptance is guaranteed for applications that meet the program's conditions.",
  tr:"Evet, program şartlarını karşılayan başvurular için kabul garantilidir."
 };
 for(const lang of ["ar","en","tr"]){
  assert.equal(normalizeAcceptanceGuaranteeClaims(examples[lang],lang),examples[lang]);
  assert.equal(containsPositiveAcceptanceGuarantee(examples[lang],lang),false);
 }
 assert.match(normalizeAcceptanceGuaranteeClaims("Kabul garantilidir.","tr"),/şartları karşılandığında/iu);
});
test("program details use language-safe per-field fallback",()=>{
 const s=read("app/programs/[slug]/page.tsx");
 assert.ok(s.includes("localizeDynamicPublicCopy(value,language).trim()||fallback"));
 for(const k of ["description","requirements","benefits","updates","faq"])assert.ok(s.includes("text."+k+",text."+k),k);
});
test("media upload security remains intact and Arabic UI labels are human-readable",()=>{
 const s=read("app/admin/media/page.tsx");
 assert.ok(s.includes("مكتبة الصور الآمنة"));
 assert.doesNotMatch(s,/Secure Image Library|Bucket الصور|placeholder="page_slug"/);
 for(const k of ["MAX=5*1024*1024","await detect(next)","upsert:false","adminStorageMutation"])assert.ok(s.includes(k));
});
