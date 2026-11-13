import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(path, environment) {
 const source=readFileSync(path,"utf8");
 const code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 const calls=[];
 const stubs={
  "server-only":{},
  "node:crypto":{createHash(){calls.push("hash");throw Error("unexpected hash")},randomBytes(){calls.push("random");throw Error("unexpected random")}},
  "next/server":{NextResponse:{json(body,options={}){calls.push("response");return{status:options.status??200,body}}}},
  "@/lib/productExpansion/providerAdapters":{verifySignedWebhook(){calls.push("signature");throw Error("signature should not run")}},
  "@/lib/server/pr101OidcGateway":{callPr101OidcGateway(){calls.push("gateway");throw Error("gateway should not run")}},
 };
 vm.runInNewContext(code,{
  module,exports:module.exports,process:{env:{VERCEL_ENV:environment}},require(id){
   assert.ok(Object.hasOwn(stubs,id),"unexpected import "+id);return stubs[id]
  },
 },{timeout:1000});
 return{module:module.exports,calls};
}

test("PR101 preview gateway refuses every mutating action before reading tokens",async()=>{
 const {module,calls}=load("lib/server/pr101OidcGateway.ts","preview");
 const actions=["consent_record","payment_webhook_record","provider_event_enqueue","provider_health_record"];
 for(const action of actions){
  await assert.rejects(
   ()=>module.callPr101OidcGateway({get headers(){throw Error("headers touched")}},action,{}),
   (error)=>error.reason==="preview_forbidden",
  );
 }
 assert.deepEqual(calls,[]);
});

test("PR101 preview health probe continues to ordinary OIDC authorization path",async()=>{
 const {module,calls}=load("lib/server/pr101OidcGateway.ts","preview");
 await assert.rejects(
  ()=>module.callPr101OidcGateway({headers:{get:()=>null}},"health_probe",{}),
  (error)=>error.reason==="unconfigured",
 );
 assert.deepEqual(calls,[]);
});

test("PR101 production action is not caught by preview guard",async()=>{
 const {module,calls}=load("lib/server/pr101OidcGateway.ts","production");
 await assert.rejects(
  ()=>module.callPr101OidcGateway({headers:{get:()=>null}},"consent_record",{}),
  (error)=>error.reason==="unconfigured",
 );
 assert.deepEqual(calls,[]);
});

test("Preview webhook rejects before parsing body, signature, or provider secrets",async()=>{
 const {module,calls}=load("app/api/product-expansion/payments/[provider]/webhook/route.ts","preview");
 const response=await module.POST({get headers(){throw Error("request headers touched")}},{
  get params(){throw Error("route params touched")}
 });
 assert.equal(response.status,403);
 assert.equal(response.body.code,"preview_writes_forbidden");
 assert.deepEqual(calls,["response"]);
});
