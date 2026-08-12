import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const compact=(value)=>value.replace(/\s+/g,"");

test("desktop Smart Support button uses the active locale copy",()=>{
  const component=read("components/PublicAiSupport.tsx");
  const copy=read("lib/i18n/aiSupport.ts");
  assert.ok(component.includes('getAiSupportCopy'));
  assert.ok(component.includes('aiCopy.widgetOpen'));
  assert.ok(component.includes('aiCopy.widgetOpenAria'));
  assert.equal(component.includes('isOpen?"×":"Smart Support"'),false);
  assert.ok(copy.includes('widgetOpen:"الدعم الذكي"'));
  assert.ok(copy.includes('widgetOpen:"Smart Support"'));
  assert.ok(copy.includes('widgetOpen:"Akıllı Destek"'));
});

test("homepage preserves Owner-approved marketing statistics exactly",()=>{
  const source=read("app/page.tsx");
  for(const value of ['number:"7000+"','number:"5+"','number:"24/7"','number:"+500"','number:"7"']) assert.ok(source.includes(value));
  assert.ok(source.includes('number:"7000+",label:"صانع محتوى"'));
  assert.ok(source.includes('number:"5+",label:"منصات متاحة"'));
  assert.ok(source.includes('number:"24/7",label:"دعم ومتابعة"'));
  assert.ok(source.includes('number:"+500",label:"فرصة نجاح شهريًا"'));
  assert.ok(source.includes('number:"+500",label:"Monthly success opportunities"'));
  assert.ok(source.includes('number:"+500",label:"Aylık başarı fırsatı"'));
  assert.ok(source.includes('number:"7",label:"سنوات خبرة"'));
  assert.equal(source.includes('number:"+50"'),false);
  assert.equal(compact(source).includes('item.key===2?String(programs.length)'),false);
  assert.ok(compact(source).includes('conststats=t.stats.map((item)=>[setting(settings,[`home_stat_${item.key}_number`],item.number),setting(settings,[`home_stat_${item.key}_label_${language}`],item.label)]asconst)'));
  assert.ok(source.includes('if(value?.trim())return value.trim()'));
  assert.ok(source.includes('text-yellow-200'));
});

test("admin-only controls and public support copy are route-gated away from admin login",()=>{
  const blogLink=read("components/AdminBlogQuickLink.tsx");
  const quickNav=read("components/AdminQuickNav.tsx");
  const support=read("components/PublicSupportAvailability.tsx");
  assert.ok(blogLink.includes('pathname === "/admin/login"'));
  assert.equal(blogLink.includes('fixed bottom-24'),false);
  assert.ok(quickNav.includes('pathname === "/admin/login"'));
  assert.ok(support.includes('pathname.startsWith("/admin")'));
});

test("final security migration closes direct browser access to internal guard RPCs",()=>{
  const migration=read("supabase/migrations/20260810001500_pr116_final_security_boundary_closeout.sql");
  const contract=read("tests/pr116-local-migration-contract.sql");
  for(const signature of [
    "public.pr99_guard_submission(text,text,jsonb,timestamptz,text)",
    "public.pr100_guard_ai_answer(text,jsonb)",
    "public.pr100_guard_password_reset(text,jsonb,timestamptz,text)",
  ]){
    assert.ok(migration.includes(`revoke execute on function ${signature} from public, anon, authenticated;`));
    assert.ok(migration.includes(`grant execute on function ${signature} to service_role;`));
  }
  assert.ok(contract.includes("public.pr99_guard_submission(text,text,jsonb,timestamp with time zone,text)"));
  assert.ok(contract.includes("public.pr100_guard_ai_answer(text,jsonb)"));
  assert.ok(contract.includes("public.pr100_guard_password_reset(text,jsonb,timestamp with time zone,text)"));
});