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

test("acceptance guarantees are normalized precisely in Arabic English and Turkish",()=>{
  const cases=[
    {
      language:"en",
      input:"Yes. Acceptance is guaranteed for applications that meet the program's conditions. Other verified details remain.",
      forbidden:/acceptance is guaranteed|guaranteed acceptance|guaranteed approval/iu,
      required:/acceptance is not guaranteed/iu,
      preserved:"Other verified details remain.",
    },
    {
      language:"ar",
      input:"نعم. القبول مضمون عند استيفاء شروط البرنامج. تبقى المعلومات الأخرى المنشورة كما هي.",
      forbidden:/القبول\s+مضمون|نضمن(?:\s+لك)?\s+القبول|قبول\s+مضمون/iu,
      required:/لا يوجد ضمان للقبول/iu,
      preserved:"تبقى المعلومات الأخرى المنشورة كما هي.",
    },
    {
      language:"tr",
      input:"Evet. Kabul garanti edilir. Diğer doğrulanmış bilgiler aynen kalır.",
      forbidden:/kabul\s+garantili|garantili\s+kabul|kabul\s+garanti\s+edilir/iu,
      required:/kabul garantisi yoktur/iu,
      preserved:"Diğer doğrulanmış bilgiler aynen kalır.",
    },
  ];
  for(const entry of cases){
    const output=normalizeAcceptanceGuaranteeClaims(entry.input,entry.language);
    assert.doesNotMatch(output,entry.forbidden);
    assert.match(output,entry.required);
    assert.ok(output.includes(entry.preserved));
    assert.equal(normalizeAcceptanceGuaranteeClaims(output,entry.language),output);
  }
});

test("acceptance guarantee variants are covered without rewriting questions or existing non-guarantees",()=>{
  const variants=[
    ["en","Guaranteed acceptance.","acceptance is not guaranteed"],
    ["en","Guaranteed approval.","acceptance is not guaranteed"],
    ["en","Approval is guaranteed.","acceptance is not guaranteed"],
    ["ar","نضمن القبول.","لا يوجد ضمان للقبول"],
    ["ar","قبول مضمون.","لا يوجد ضمان للقبول"],
    ["tr","Kabul garantili.","kabul garantisi yoktur"],
    ["tr","Kabul garanti edilir.","kabul garantisi yoktur"],
  ];
  for(const [language,input,expected] of variants){
    assert.ok(normalizeAcceptanceGuaranteeClaims(input,language).includes(expected));
  }

  const safe=[
    ["en","Is acceptance guaranteed?\nEvery application is reviewed."],
    ["en","Acceptance is not guaranteed."],
    ["ar","هل القبول مضمون؟\nكل طلب يخضع للمراجعة."],
    ["ar","لا نضمن القبول."],
    ["tr","Kabul garanti mi?\nHer başvuru incelenir."],
    ["tr","Kabul garantisi yoktur."],
    ["tr","Kabul garanti edilmez."],
  ];
  for(const [language,input] of safe){
    assert.equal(normalizeAcceptanceGuaranteeClaims(input,language),input);
  }
});

test("hotfix preserves the Owner locked +500 homepage statistic",()=>{
  assert.equal((home.match(/number:"\+500"/g)||[]).length,3);
  assert.doesNotMatch(home,/number:"\+50"/);
});
