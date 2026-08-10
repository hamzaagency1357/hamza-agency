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

test("homepage statistics do not publish unsupported numeric fallbacks",()=>{
  const source=read("app/page.tsx");
  assert.equal(source.includes('number:"+7000"'),false);
  assert.equal(source.includes('number:"+5"'),false);
  assert.equal(source.includes('number:"24/7"'),false);
  assert.ok(compact(source).includes('item.key===2?String(programs.length)'));
  assert.ok(source.includes('number:"7",label:"سنوات خبرة",key:5'));
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
