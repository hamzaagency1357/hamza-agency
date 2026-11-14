import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const endpoints=[
 ["app/api/product-expansion/invitations/accept/route.ts",["POST"]],
 ["app/api/product-expansion/invitations/route.ts",["POST"]],
 ["app/api/product-expansion/sessions/register/route.ts",["POST"]],
 ["app/api/product-expansion/portal/route.ts",["PATCH","POST"]],
 ["app/api/product-expansion/push/subscription/route.ts",["POST"]],
];

function load(path){
 const code=ts.transpileModule(readFileSync(path,"utf8"),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true},
 }).outputText;
 const module={exports:{}};
 const calls=[];
 const next={NextResponse:{json(body,options={}){
  calls.push("json");
  return {status:options.status??200,body};
 }}};
 const never=()=>{throw new Error("Preview tried to access a dependency")};
 const stub=new Proxy({}, {get(){return never}});
 vm.runInNewContext(code,{
  module,exports:module.exports,
  process:{env:{VERCEL_ENV:"preview"}},
  require(name){return name==="next/server"?next:stub},
 },{timeout:1000});
 return {api:module.exports,calls};
}
for(const [path,methods] of endpoints){
 test(path+" rejects preview mutations before request parsing or backend access",async()=>{
  const {api,calls}=load(path);
  const request=new Proxy({}, {get(){throw new Error("Preview accessed request details")}});
  for(const method of methods){
   const result=await api[method](request);
   assert.equal(result.status,403);
   assert.equal(result.body.code,"preview_writes_forbidden");
  }
  assert.deepEqual(calls,methods.map(()=>"json"));
 });
}
