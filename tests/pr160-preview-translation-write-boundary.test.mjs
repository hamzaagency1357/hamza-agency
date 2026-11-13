import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual TypeScript route in an isolated VM: no external calls.
const source=readFileSync("app/api/admin/translations/sync/route.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
function loadRoute(environment){
 const called=[];
 const module={exports:{}};
 const stubs={
  "next/server":{NextResponse:{json(body,options={}){called.push("response");return{status:options.status??200,body,headers:options.headers??{}}}}},
  "@supabase/supabase-js":{createClient(){called.push("database");throw Error("database must not be contacted")}},
  "@/lib/i18n/translationSources":{},
  "@/lib/i18n/translationProvider":{},
  "@/lib/i18n/translationRevisionSource":{},
 };
 vm.runInNewContext(compiled,{module,exports:module.exports,process:{env:{VERCEL_ENV:environment,NEXT_PUBLIC_SUPABASE_URL:"https://example.invalid",NEXT_PUBLIC_SUPABASE_ANON_KEY:"test-placeholder"}},require(id){assert.ok(Object.hasOwn(stubs,id),"unexpected dependency "+id);return stubs[id]}},{timeout:1000});
 return{api:module.exports,called};
}
test("preview POST blocks before auth, JSON parsing, database, or provider",async()=>{
 const {api,called}=loadRoute("preview");
 const request={get headers(){throw Error("headers touched")},json(){throw Error("body touched")}};
 const reply=await api.POST(request);
 assert.equal(reply.status,403);
 assert.equal(reply.body.ok,false);
 assert.equal(reply.headers["Cache-Control"],"no-store");
 assert.deepEqual(called,["response"]);
});
test("preview GET still demands an administrator",async()=>{
 const {api,called}=loadRoute("preview");
 const reply=await api.GET({headers:{get:()=>null}});
 assert.equal(reply.status,403);
 assert.equal(reply.body.ok,false);
 assert.equal(called.includes("database"),false);
});
test("non-preview POST retains normal authentication branch",async()=>{
 const {api,called}=loadRoute("production");
 const reply=await api.POST({headers:{get:()=>null}});
 assert.equal(reply.status,500);
 assert.match(reply.body.message,/يلزم تسجيل دخول إداري/);
 assert.equal(called.includes("database"),false);
});
