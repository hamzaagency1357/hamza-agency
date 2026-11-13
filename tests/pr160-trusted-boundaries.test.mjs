import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = (path) => readFileSync(new URL("../"+path, import.meta.url),"utf8");
const fp = source("lib/server/pr160TrustedFingerprint.ts");
const compiled = ts.transpileModule(fp,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module = { exports: {} };
const context = { module, exports: module.exports, process: {env:{VERCEL_ENV:"production"}}, require: (name)=>{
 if (name==="server-only") return {};
 if (name==="node:crypto") return require("node:crypto");
 if (name==="node:net") return require("node:net");
 throw Error("Unexpected import: "+name);
}};
vm.runInNewContext(compiled,context,{timeout:3000});
const fingerprint = module.exports.trustedClientFingerprint;
const req = (ip,ua="A")=>({headers:{get(name){if(name==="x-forwarded-for")return ip;if(name==="user-agent")return ua;return null;}}});

test("trusted source ignores caller-controlled User-Agent and body identity",()=>{
 assert.equal(fingerprint(req("203.0.113.4","Browser-A")),fingerprint(req("203.0.113.4","Fake-Bot")));
 assert.notEqual(fingerprint(req("203.0.113.4")),fingerprint(req("203.0.113.5")));
 assert.equal(fingerprint(req("203.0.113.4, 198.51.100.1")),fingerprint(req("203.0.113.4")));
});
test("Vercel requests missing a valid proxy address fail closed",()=>{
 assert.throws(()=>fingerprint(req(null)),/trusted_proxy_ip_unavailable/);
 assert.throws(()=>fingerprint(req("not-an-ip")),/trusted_proxy_ip_unavailable/);
});
test("public tracking and AI endpoints all use one stable trusted source dimension",()=>{
 for(const path of ["app/api/track/route.ts","app/api/application-status/route.ts","app/api/service-status/route.ts","app/api/ai-support/route.ts"]){
  const code=source(path);
  assert.match(code,/trustedClientFingerprint\(request\)/,path);
  assert.doesNotMatch(code,/user-agent.*(fingerprint|sha256)/i,path);
 }
});
test("suggestion persistence is OIDC-only, fail-closed in Preview, and retains safe response",()=>{
 const app=source("app/api/ai-support/route.ts");
 const server=source("lib/server/pr100SignedGateway.ts");
 const edge=source("supabase/functions/pr100-vercel-oidc-gateway/index.ts");
 const migration=source("supabase/migrations/20261113180500_pr160_trusted_rate_and_knowledge_gateway.sql");
 assert.match(app,/callOidcGateway\(request,"knowledge_suggest"/);
 assert.doesNotMatch(app,/\.rpc\("pr4_suggest_knowledge"/);
 assert.match(app,/answer:fallback\[language\]/);
 for(const code of [server,edge]) {
  assert.match(code,/"knowledge_suggest"/);
  const prodOnly=code.match(/const PRODUCTION_ONLY_ACTIONS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(prodOnly&&prodOnly[1].includes('"knowledge_suggest"'),"Preview must never write suggestions");
 }
 assert.match(migration,/revoke all on function public\.pr4_suggest_knowledge\(text,text\) from public,anon,authenticated/i);
 assert.match(migration,/pg_advisory_xact_lock/);
 assert.match(migration,/when 'knowledge_suggest'/);
});
