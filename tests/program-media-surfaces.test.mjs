import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),"utf8");

test("program media fields are consumed by home and partners surfaces with migration-safe fallback",async()=>{const[home,partners,grid]=await Promise.all([read("app/page.tsx"),read("app/partners/page.tsx"),read("components/PartnersGridWithTranslations.tsx")]);for(const field of ["logo_url","hero_image_url","mobile_image_url","og_image_url","alt_ar","alt_en","alt_tr"]){assert.ok(home.includes(field),`home ${field}`);assert.ok(partners.includes(field),`partners ${field}`)}assert.ok(home.includes('select("id,logo_url,hero_image_url,mobile_image_url,og_image_url,alt_ar,alt_en,alt_tr")'));assert.ok(home.includes("program.hero_image_url||program.logo_url||program.mobile_image_url"));assert.ok(home.includes("program.mobile_image_url||desktop"));assert.ok(partners.includes("media.logo_url||media.mobile_image_url||media.hero_image_url||partner.logoUrl"));for(const token of ["partner.altAr","partner.altEn","partner.altTr","imageAlt"])assert.ok(grid.includes(token),token)});
