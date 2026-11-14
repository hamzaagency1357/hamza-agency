import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {containsPositiveAcceptanceGuarantee,normalizeAcceptanceGuaranteeClaims} from "../lib/i18n/acceptanceGuaranteeSafety.mjs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("TikTok fallback confirms acceptance only after conditions are met and verified",()=>{
 const page=read("app/programs/[slug]/page.tsx");
 const translations=read("lib/i18n/siteRuntimeTranslationsLegacy.ts");
 assert.ok(page.includes("هل القبول مضمون؟\\nنعم، القبول مضمون عند استيفاء جميع شروط البرنامج والتحقق منها."));
 assert.ok(page.includes("Is acceptance guaranteed?\\nYes. Acceptance is guaranteed when all program requirements are met and verified."));
 assert.ok(page.includes("Kabul garanti mi?\\nEvet. Programın tüm şartları karşılandığında ve doğrulandığında kabul garantilidir."));
 assert.ok(translations.includes("Programın tüm şartları karşılandığında ve doğrulandığında kabul garantilidir."));
 for(const [language,conditional,unconditional] of [
   ["ar","القبول مضمون عند استيفاء جميع شروط البرنامج والتحقق منها.","القبول مضمون."],
   ["en","Acceptance is guaranteed when all program requirements are met and verified.","Acceptance is guaranteed."],
   ["tr","Programın tüm şartları karşılandığında ve doğrulandığında kabul garantilidir.","Kabul garantilidir."]
 ]){
   assert.equal(normalizeAcceptanceGuaranteeClaims(conditional,language),conditional);
   assert.equal(containsPositiveAcceptanceGuarantee(conditional,language),false);
   const safe=normalizeAcceptanceGuaranteeClaims(unconditional,language);
   assert.notEqual(safe,unconditional);
   assert.equal(containsPositiveAcceptanceGuarantee(safe,language),false);
 }
 assert.equal(normalizeAcceptanceGuaranteeClaims("Kabul garanti mi?","tr"),"Kabul garanti mi?");
});
test("Turkish agency name is localized but the owner and program names stay unchanged",()=>{
 const identity=read("lib/publicIdentity.ts");
 const marketing=read("lib/i18n/marketingSafety.ts");
 const seo=read("lib/i18n/publicSeo.ts");
 assert.ok(identity.includes('tr: "Hamza Ajansı"'));
 assert.ok(identity.includes("⚔عܓོراب✴سܓོوريا⚔"));
 assert.ok(marketing.includes('["HAMZA AJANSI","Hamza Ajansı"]'));
 assert.ok(seo.includes('language==="tr"?"Hamza Ajansı"'));
 for(const name of ["TikTok","BIGO LIVE","Yaahlan","Xena","Catchii"])assert.ok(seo.includes(name),name);
});

test("BIGO LIVE truncated Turkish summary has an exact-only display correction",()=>{
 const marketing=read("lib/i18n/marketingSafety.ts");
 assert.ok(marketing.includes('safeValue.trim() === "BIGO LIVE programına Hamza Ajansı ara"'));
 assert.ok(marketing.includes('safeValue = "BIGO LIVE programına Hamza Ajansı aracılığıyla katılın."'));
 assert.ok(marketing.includes('Program kamera karşısına geçmeyi gerektiriyor mu?'));
});
