import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeAcceptanceGuaranteeClaims } from "../lib/i18n/acceptanceGuaranteeSafety.mjs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const home=read("app/page.tsx");
const details=read("app/programs/[slug]/page.tsx");
const dynamicCopy=read("lib/i18n/localizeDynamicPublicCopy.ts");
const marketingSafety=read("lib/i18n/marketingSafety.ts");

test("program media fallbacks are neutral on homepage and detail pages while real media keeps priority",()=>{
  for(const source of [home,details]){
    assert.match(source,/data-program-neutral-media="true"/);
    assert.match(source,/<svg viewBox="0 0 24 24"/);
  }
  assert.doesNotMatch(home,/label\.slice\(0,\s*1\)/);
  assert.doesNotMatch(details,/display\.name\.slice\(0,\s*1\)/);
  assert.match(home,/media\.primary\?/);
  assert.match(details,/fetchProgramMedia/);
  assert.match(details,/if\(!hasConfiguredMedia\)return <MediaFallback\/>/);
});

test("public dynamic copy routes acceptance claims through the safety normalization layer",()=>{
  assert.match(dynamicCopy,/sanitizeMarketingCopy/);
  assert.match(marketingSafety,/normalizeAcceptanceGuaranteeClaims/);
  assert.match(details,/localizeDynamicPublicCopy/);
});

test("conditional acceptance guarantees are retained while unconditional ones gain conditions",()=>{
 const conditional=[
  ["en","Yes. Acceptance is guaranteed for applications that meet the program's conditions. Other verified details remain."],
  ["ar","نعم. القبول مضمون عند استيفاء شروط البرنامج. تبقى المعلومات الأخرى المنشورة كما هي."],
  ["tr","Evet. Program şartlarını karşılayan başvurular için kabul garantilidir. Diğer doğrulanmış bilgiler aynen kalır."],
 ];
 for(const [language,input] of conditional){
  assert.equal(normalizeAcceptanceGuaranteeClaims(input,language),input);
 }
 const unconditional=[
  ["en","Acceptance is guaranteed.","requirements are met and verified"],
  ["en","Guaranteed approval.","requirements are met and verified"],
  ["ar","نضمن القبول.","التحقق منها"],
  ["ar","قبول مضمون.","التحقق منها"],
  ["tr","Kabul garantilidir.","doğrulandığında"],
  ["tr","Kabul garanti edilir.","doğrulandığında"],
 ];
 for(const [language,input,expected] of unconditional){
  const output=normalizeAcceptanceGuaranteeClaims(input,language);
  assert.notEqual(output,input);
  assert.ok(output.includes(expected),language);
  assert.equal(normalizeAcceptanceGuaranteeClaims(output,language),output);
 }
});
test("conditional acceptance policy never rewrites questions or existing negative statements",()=>{
 const safe=[
  ["en","Is acceptance guaranteed?\\nEvery application is reviewed."],
  ["en","Acceptance is not guaranteed."],
  ["ar","هل القبول مضمون؟\\nكل طلب يخضع للمراجعة."],
  ["ar","لا نضمن القبول."],
  ["tr","Kabul garanti mi?\\nHer başvuru incelenir."],
  ["tr","Kabul garantisi yoktur."],
  ["tr","Kabul garanti edilmez."],
 ];
 for(const [language,input] of safe)assert.equal(normalizeAcceptanceGuaranteeClaims(input,language),input);
});

test("hotfix preserves the Owner locked +500 homepage statistic",()=>{
  assert.equal((home.match(/number:"\+500"/g)||[]).length,3);
  assert.doesNotMatch(home,/number:"\+50"/);
});
