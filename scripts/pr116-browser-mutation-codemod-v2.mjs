import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "scripts/pr116-browser-mutation-codemod.mjs");
const TEMP = path.join(ROOT, "scripts/.pr116-browser-mutation-codemod-run.mjs");

function mustReplace(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`codemod-v2 marker missing: ${label}`);
  return source.replace(before, after);
}

let source = fs.readFileSync(SOURCE, "utf8");
source = mustReplace(
  source,
  '  failures.push(`${file}: cannot infer AdminModule`);\n  return "settings";',
  '  return "settings";',
  "non-mutating page module fallback",
);

const declarationsStart = source.indexOf("function buildDeclarations(sourceFile) {");
const declarationsEnd = source.indexOf("function parseCallChain(node) {");
if (declarationsStart < 0 || declarationsEnd <= declarationsStart) throw new Error("codemod-v2 declarations markers missing");
const enhancedDeclarations = String.raw`function buildDeclarations(sourceFile) {
  const variables = new Map();
  const types = new Map();
  const parameters = new Map();
  function walk(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) variables.set(node.name.text, node);
    if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) types.set(node.name.text, node);
    if (ts.isParameter(node) && ts.isIdentifier(node.name)) parameters.set(node.name.text, node);
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
  return { variables, types, parameters };
}

function typeFields(node, declarations, seen = new Set()) {
  if (!node) return new Set();
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const name = node.typeName.text;
    if (seen.has(name)) return new Set();
    seen.add(name);
    const decl = declarations.types.get(name);
    if (!decl) return new Set();
    if (ts.isInterfaceDeclaration(decl)) return new Set(decl.members.flatMap((m) => m.name && (ts.isIdentifier(m.name) || ts.isStringLiteralLike(m.name)) ? [m.name.text] : []));
    return typeFields(decl.type, declarations, seen);
  }
  if (ts.isTypeLiteralNode(node)) return new Set(node.members.flatMap((m) => m.name && (ts.isIdentifier(m.name) || ts.isStringLiteralLike(m.name)) ? [m.name.text] : []));
  if (ts.isUnionTypeNode(node)) {
    const out = new Set();
    for (const item of node.types) for (const key of typeFields(item, declarations, seen)) out.add(key);
    return out;
  }
  return new Set();
}

function literalUnionValues(node, declarations, seen = new Set()) {
  if (!node) return new Set();
  if (ts.isLiteralTypeNode(node) && ts.isStringLiteralLike(node.literal)) return new Set([node.literal.text]);
  if (ts.isUnionTypeNode(node)) {
    const out = new Set();
    for (const item of node.types) for (const value of literalUnionValues(item, declarations, seen)) out.add(value);
    return out;
  }
  if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
    const name = node.typeName.text;
    if (seen.has(name)) return new Set();
    seen.add(name);
    const decl = declarations.types.get(name);
    return decl && ts.isTypeAliasDeclaration(decl) ? literalUnionValues(decl.type, declarations, seen) : new Set();
  }
  return new Set();
}

function computedValues(expr, declarations) {
  if (ts.isStringLiteralLike(expr)) return new Set([expr.text]);
  if (ts.isIdentifier(expr)) {
    const variable = declarations.variables.get(expr.text);
    if (variable) {
      const typed = literalUnionValues(variable.type, declarations);
      if (typed.size) return typed;
      if (variable.initializer && ts.isStringLiteralLike(variable.initializer)) return new Set([variable.initializer.text]);
    }
    const parameter = declarations.parameters.get(expr.text);
    if (parameter) return literalUnionValues(parameter.type, declarations);
  }
  return new Set();
}

function returnExpression(fn) {
  if (!fn || (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn))) return null;
  if (!ts.isBlock(fn.body)) return fn.body;
  for (const statement of fn.body.statements) if (ts.isReturnStatement(statement) && statement.expression) return statement.expression;
  return null;
}

function valueFields(expr, declarations, seen = new Set()) {
  if (!expr) return new Set();
  if (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isSatisfiesExpression?.(expr)) {
    const direct = valueFields(expr.expression, declarations, seen);
    return direct.size ? direct : typeFields(expr.type, declarations, seen);
  }
  if (ts.isNonNullExpression?.(expr)) return valueFields(expr.expression, declarations, seen);
  if (ts.isParenthesizedExpression(expr)) return valueFields(expr.expression, declarations, seen);
  if (ts.isConditionalExpression(expr)) {
    const out = new Set();
    for (const branch of [expr.whenTrue, expr.whenFalse]) for (const key of valueFields(branch, declarations, new Set(seen))) out.add(key);
    return out;
  }
  if (ts.isArrayLiteralExpression(expr)) {
    const out = new Set();
    for (const item of expr.elements) for (const key of valueFields(item, declarations, new Set(seen))) out.add(key);
    return out;
  }
  if (ts.isObjectLiteralExpression(expr)) {
    const out = new Set();
    for (const prop of expr.properties) {
      if (ts.isSpreadAssignment(prop)) {
        for (const key of valueFields(prop.expression, declarations, new Set(seen))) out.add(key);
      } else if (prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name) || ts.isNumericLiteral(prop.name))) {
        out.add(prop.name.text);
      } else if (prop.name && ts.isComputedPropertyName(prop.name)) {
        for (const key of computedValues(prop.name.expression, declarations)) out.add(key);
      }
    }
    return out;
  }
  if (ts.isIdentifier(expr)) {
    if (seen.has(expr.text)) return new Set();
    const next = new Set(seen); next.add(expr.text);
    const decl = declarations.variables.get(expr.text);
    if (decl) {
      const fromInit = valueFields(decl.initializer, declarations, next);
      if (fromInit.size) return fromInit;
      const fromType = typeFields(decl.type, declarations, next);
      if (fromType.size) return fromType;
    }
    const parameter = declarations.parameters.get(expr.text);
    return parameter ? typeFields(parameter.type, declarations, next) : new Set();
  }
  if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) {
    const method = expr.expression.name.text;
    if (["filter", "slice", "concat"].includes(method)) return valueFields(expr.expression.expression, declarations, seen);
    if (method === "map") {
      const returned = returnExpression(expr.arguments[0]);
      return valueFields(returned, declarations, seen);
    }
  }
  return new Set();
}

`;
source = source.slice(0, declarationsStart) + enhancedDeclarations + source.slice(declarationsEnd);

source = mustReplace(
  source,
  '          else {\n            const mutation = methods[mutationIndex];',
  '          else if (table === "activity_logs" || table === "admin_audit_log") {\n            replacements.push({ start: node.getStart(sf), end: node.end, text: "Promise.resolve({ data: null, error: null })" });\n          } else {\n            const mutation = methods[mutationIndex];',
  "trusted audit replacement",
);

fs.writeFileSync(TEMP, source);
const run = spawnSync(process.execPath, [TEMP], { cwd: ROOT, stdio: "inherit" });
fs.rmSync(TEMP, { force: true });
if (run.status !== 0) process.exit(run.status || 2);

const contractPath = path.join(ROOT, "lib/server/pr116AdminActionContracts.ts");
const contractSource = fs.readFileSync(contractPath, "utf8");
const match = contractSource.match(/PR116_ADMIN_ACTION_CONTRACTS = (\{[\s\S]*\}) as const satisfies/);
if (!match) throw new Error("generated action contract object missing");
const contracts = JSON.parse(match[1]);

function generateEdgeDispatch() {
  const target = path.join(ROOT, "supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts");
  const body = `const CONTRACTS = ${JSON.stringify(contracts, null, 2)} as const;\n\nexport const GENERATED_ACTIONS = Object.keys(CONTRACTS);\nexport const GENERATED_PERMISSIONS: Record<string, { module: string; permission: string }> = Object.fromEntries(Object.entries(CONTRACTS).map(([action, contract]) => [action, { module: contract.module, permission: contract.permission }]));\n\ntype Admin = { id: number; email: string; role: string; assignedProgram: string | null };\ntype User = { id: string; email: string };\ntype Input = { action: string; payload: Record<string, unknown>; supabaseUrl: string; serviceRole: string; admin: Admin; user: User };\ntype Result = { status: number; body: Record<string, unknown>; ok: boolean } | null;\n\nfunction record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === \"object\" && !Array.isArray(value); }\nfunction keysAllowed(value: unknown, allowed: readonly string[]) { const rows = Array.isArray(value) ? value : [value]; return rows.every((row) => record(row) && Object.keys(row).every((key) => allowed.includes(key))); }\nfunction primitive(value: unknown) { return value === null || [\"string\",\"number\",\"boolean\"].includes(typeof value); }\nfunction safePath(value: unknown) { return typeof value === \"string\" && value.length > 0 && value.length <= 800 && !value.includes(\"..\") && !value.startsWith(\"/\") && !value.includes(\"\\\\\"); }\nfunction scope(value: unknown) { return String(value || \"\").trim().toLowerCase().replace(/[^a-z0-9\\u0600-\\u06ff]+/g, \"-\").replace(/-+/g, \"-\").replace(/^-|-$/g, \"\"); }\nasync function rest(url: string, key: string, path: string, init?: RequestInit) { return fetch(\`\${url}/rest/v1\${path}\`, { ...init, headers: { apikey: key, Authorization: \`Bearer \${key}\`, \"Content-Type\": \"application/json\", Prefer: \"return=representation\", ...(init?.headers || {}) }, signal: AbortSignal.timeout(8000) }); }\nfunction valid(contract: any, payload: Record<string, unknown>) {\n  if (JSON.stringify(payload).length > 12000000) return false;\n  if (contract.kind === \"entity\") {\n    if (contract.method !== \"delete\" && !keysAllowed(payload.values, contract.allowedFields)) return false;\n    const filters = Array.isArray(payload.filters) ? payload.filters : [];\n    if ([\"update\",\"delete\"].includes(contract.method) && filters.length === 0) return false;\n    if (!filters.every((item) => record(item) && [\"eq\",\"neq\",\"in\",\"is\"].includes(String(item.op)) && typeof item.field === \"string\" && contract.allowedFilters.includes(item.field))) return false;\n    if (payload.select !== undefined && (typeof payload.select !== \"string\" || !contract.allowedSelects.includes(payload.select))) return false;\n    if (payload.options !== undefined) { const options = payload.options; if (!record(options) || Object.keys(options).some((key) => ![\"onConflict\",\"ignoreDuplicates\"].includes(key))) return false; if (options.onConflict !== undefined && (typeof options.onConflict !== \"string\" || !options.onConflict.split(\",\").every((key) => /^[a-zA-Z0-9_]+$/.test(key.trim()) && contract.allowedFields.includes(key.trim())))) return false; if (options.ignoreDuplicates !== undefined && typeof options.ignoreDuplicates !== \"boolean\") return false; }\n    return true;\n  }\n  if (contract.kind === \"rpc\") return payload.args === undefined || keysAllowed(payload.args, contract.allowedFields);\n  if (contract.kind === \"auth\") return keysAllowed(payload.values, contract.allowedFields);\n  if (contract.kind === \"storage\") return Array.isArray(payload.args) && payload.args.length <= 4;\n  if (contract.kind === \"trash\") return Object.keys(payload).every((key) => contract.allowedFields.includes(key));\n  return false;\n}\nfunction filterQuery(filters: unknown[]) { const search = new URLSearchParams(); for (const raw of filters) { if (!record(raw) || typeof raw.field !== \"string\" || typeof raw.op !== \"string\") return null; if (raw.op === \"in\") { if (!Array.isArray(raw.value) || !raw.value.length || !raw.value.every(primitive)) return null; search.append(raw.field, \`in.(\${raw.value.map(String).join(\",\")})\`); } else { if (!primitive(raw.value)) return null; search.append(raw.field, \`\${raw.op}.\${raw.value === null ? \"null\" : String(raw.value)}\`); } } return search; }\nasync function programAllowed(input: Input, contract: any, payload: Record<string, unknown>) {\n  if (input.admin.role !== \"program_admin\") return true;\n  if (contract.module !== \"programs\" || contract.kind !== \"entity\") return false;\n  const assigned = scope(input.admin.assignedProgram); if (!assigned) return false;\n  const matchesId = async (id: unknown) => { if (!(typeof id === \"number\" || typeof id === \"string\")) return false; const response = await rest(input.supabaseUrl, input.serviceRole, \`/programs?select=id,slug,name&id=eq.\${encodeURIComponent(String(id))}&limit=1\`); const rows = response.ok ? await response.json().catch(() => []) as Record<string, unknown>[] : []; const row = rows[0]; return !!row && [row.slug,row.name].some((value) => { const normalized = scope(value); return normalized && (normalized === assigned || normalized.includes(assigned) || assigned.includes(normalized)); }); };\n  const values = Array.isArray(payload.values) ? payload.values : [payload.values];\n  if (contract.table === \"programs\") { for (const row of values) if (record(row) && [row.slug,row.name].some((value) => { const normalized = scope(value); return normalized && (normalized === assigned || normalized.includes(assigned) || assigned.includes(normalized)); })) return true; const filters = Array.isArray(payload.filters) ? payload.filters : []; const id = filters.find((item) => record(item) && item.op === \"eq\" && item.field === \"id\"); return id && record(id) ? matchesId(id.value) : false; }\n  for (const row of values) if (record(row) && \"program_id\" in row && await matchesId(row.program_id)) return true; const filters = Array.isArray(payload.filters) ? payload.filters : []; const program = filters.find((item) => record(item) && item.op === \"eq\" && item.field === \"program_id\"); return program && record(program) ? matchesId(program.value) : false;\n}\nasync function entity(input: Input, contract: any) { if (!await programAllowed(input, contract, input.payload)) return { status: 403, body: { ok:false, code:\"forbidden\" }, ok:false }; const filters = Array.isArray(input.payload.filters) ? input.payload.filters : []; const query = filterQuery(filters); if (!query) return { status:400, body:{ok:false,code:\"invalid_request\"}, ok:false }; if (typeof input.payload.select === \"string\") query.set(\"select\", input.payload.select); const options = record(input.payload.options) ? input.payload.options : {}; if (contract.method === \"upsert\" && typeof options.onConflict === \"string\") query.set(\"on_conflict\", options.onConflict); let method = \"POST\"; if (contract.method === \"update\") method = \"PATCH\"; if (contract.method === \"delete\") method = \"DELETE\"; const prefer = contract.method === \"upsert\" ? \`return=representation,resolution=\${options.ignoreDuplicates === true ? \"ignore-duplicates\" : \"merge-duplicates\"}\` : \"return=representation\"; const response = await rest(input.supabaseUrl,input.serviceRole,\`/\${contract.table}\${query.toString()?\`?\${query}\`:\"\"}\`,{method,headers:{Prefer:prefer},body:contract.method===\"delete\"?undefined:JSON.stringify(input.payload.values)}); const text=await response.text(); let data:unknown=null; try{data=text?JSON.parse(text):null}catch{} if(!response.ok)return{status:502,body:{ok:false,code:\"database_contract_rejected\"},ok:false}; if ([\"single\",\"maybeSingle\"].includes(String(input.payload.returnMode)) && Array.isArray(data)) data=data[0]??null; return{status:200,body:{ok:true,data},ok:true}; }\nasync function rpc(input: Input, contract: any) { if(input.admin.role===\"program_admin\")return{status:403,body:{ok:false,code:\"forbidden\"},ok:false}; const response=await rest(input.supabaseUrl,input.serviceRole,\`/rpc/\${contract.rpcName}\`,{method:\"POST\",body:JSON.stringify(record(input.payload.args)?input.payload.args:{})}); const text=await response.text(); let data:unknown=null; try{data=text?JSON.parse(text):null}catch{} return response.ok?{status:200,body:{ok:true,data},ok:true}:{status:502,body:{ok:false,code:\"database_contract_rejected\"},ok:false}; }\nasync function auth(input: Input) { if(!record(input.payload.values))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false}; const values=input.payload.values; if(\"password\" in values&&(typeof values.password!==\"string\"||values.password.length<8||values.password.length>256))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false}; const response=await fetch(\`\${input.supabaseUrl}/auth/v1/admin/users/\${encodeURIComponent(input.user.id)}\`,{method:\"PUT\",headers:{apikey:input.serviceRole,Authorization:\`Bearer \${input.serviceRole}\`,\"Content-Type\":\"application/json\"},body:JSON.stringify(values),signal:AbortSignal.timeout(8000)}); return response.ok?{status:200,body:{ok:true,data:null},ok:true}:{status:502,body:{ok:false,code:\"database_contract_rejected\"},ok:false}; }\nconst TYPES=new Set([\"image/jpeg\",\"image/png\",\"image/webp\",\"image/gif\",\"video/mp4\",\"video/webm\",\"video/quicktime\",\"application/pdf\"]);\nfunction bytes(value:unknown){if(!record(value)||value.__file!==true||typeof value.base64!==\"string\"||typeof value.type!==\"string\"||typeof value.size!==\"number\"||value.size<0||value.size>8388608||!TYPES.has(value.type)||value.type===\"image/svg+xml\")return null;try{const binary=atob(value.base64);if(binary.length!==value.size)return null;const out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return{out,type:value.type}}catch{return null}}\nasync function storage(input:Input,contract:any){if(input.admin.role===\"program_admin\"&&contract.module!==\"programs\")return{status:403,body:{ok:false,code:\"forbidden\"},ok:false};const args=input.payload.args;if(!Array.isArray(args))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false};const headers={apikey:input.serviceRole,Authorization:\`Bearer \${input.serviceRole}\`};if([\"upload\",\"update\"].includes(contract.storageMethod)){const [objectPath,file,options]=args;if(!safePath(objectPath))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false};const decoded=bytes(file);if(!decoded)return{status:400,body:{ok:false,code:\"invalid_file\"},ok:false};const opt=record(options)?options:{};if(Object.keys(opt).some((key)=>![\"cacheControl\",\"contentType\",\"upsert\"].includes(key)))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false};const response=await fetch(\`\${input.supabaseUrl}/storage/v1/object/\${encodeURIComponent(contract.bucket)}/\${String(objectPath).split(\"/\").map(encodeURIComponent).join(\"/\")}\`,{method:contract.storageMethod===\"upload\"?\"POST\":\"PUT\",headers:{...headers,\"Content-Type\":decoded.type,\"x-upsert\":opt.upsert===true?\"true\":\"false\"},body:decoded.out,signal:AbortSignal.timeout(10000)});const data=await response.json().catch(()=>null);return response.ok?{status:200,body:{ok:true,data},ok:true}:{status:502,body:{ok:false,code:\"storage_rejected\"},ok:false};}if(contract.storageMethod===\"remove\"){const [paths]=args;if(!Array.isArray(paths)||!paths.length||!paths.every(safePath))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false};const response=await fetch(\`\${input.supabaseUrl}/storage/v1/object/\${encodeURIComponent(contract.bucket)}\`,{method:\"DELETE\",headers:{...headers,\"Content-Type\":\"application/json\"},body:JSON.stringify({prefixes:paths}),signal:AbortSignal.timeout(8000)});const data=await response.json().catch(()=>null);return response.ok?{status:200,body:{ok:true,data},ok:true}:{status:502,body:{ok:false,code:\"storage_rejected\"},ok:false};}const[sourceKey,destinationKey]=args;if(!safePath(sourceKey)||!safePath(destinationKey))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false};const response=await fetch(\`\${input.supabaseUrl}/storage/v1/object/\${contract.storageMethod}\`,{method:\"POST\",headers:{...headers,\"Content-Type\":\"application/json\"},body:JSON.stringify({bucketId:contract.bucket,sourceKey,destinationKey}),signal:AbortSignal.timeout(8000)});const data=await response.json().catch(()=>null);return response.ok?{status:200,body:{ok:true,data},ok:true}:{status:502,body:{ok:false,code:\"storage_rejected\"},ok:false};}\nasync function trash(input:Input,contract:any){if(input.admin.role===\"program_admin\"||input.payload.itemType!==contract.itemType||!record(input.payload.record))return{status:403,body:{ok:false,code:\"forbidden\"},ok:false};const recordId=String(input.payload.recordId||\"\").trim();if(!recordId||recordId.length>200)return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false};const row={item_type:contract.itemType,item_id:recordId,item_title:typeof input.payload.title===\"string\"?input.payload.title.slice(0,500):\`\${contract.itemType} #\${recordId}\`,item_data:input.payload.record,deleted_by:input.user.email||null,deleted_at:new Date().toISOString()};const response=await rest(input.supabaseUrl,input.serviceRole,\"/trash_items\",{method:\"POST\",body:JSON.stringify(row)});const data=response.ok?await response.json().catch(()=>null):null;return response.ok?{status:200,body:{ok:true,data},ok:true}:{status:502,body:{ok:false,code:\"database_contract_rejected\"},ok:false};}\nexport async function dispatchGeneratedAdminAction(input:Input):Promise<Result>{const contract=(CONTRACTS as Record<string,any>)[input.action];if(!contract)return null;if(!valid(contract,input.payload))return{status:400,body:{ok:false,code:\"invalid_request\"},ok:false};if(contract.kind===\"entity\")return entity(input,contract);if(contract.kind===\"rpc\")return rpc(input,contract);if(contract.kind===\"auth\")return auth(input);if(contract.kind===\"storage\")return storage(input,contract);if(contract.kind===\"trash\")return trash(input,contract);return{status:400,body:{ok:false,code:\"invalid_action\"},ok:false};}\n`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
}

generateEdgeDispatch();

const edgePath = path.join(ROOT, "supabase/functions/pr116-admin-oidc-gateway/index.ts");
let edge = fs.readFileSync(edgePath, "utf8");
const edgeImport = 'import { GENERATED_ACTIONS, GENERATED_PERMISSIONS, dispatchGeneratedAdminAction } from "./generated-dispatch.ts";';
if (!edge.includes(edgeImport)) edge = edge.replace('import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "npm:jose@6.1.0";', 'import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "npm:jose@6.1.0";\n' + edgeImport);
if (!edge.includes("...GENERATED_ACTIONS")) edge = edge.replace("const ACTIONS = new Set([\n", "const ACTIONS = new Set([\n  ...GENERATED_ACTIONS,\n");
if (!edge.includes("...GENERATED_PERMISSIONS")) edge = edge.replace('const ACTION_PERMISSIONS: Record<string, { module: string; permission: string }> = {\n', 'const ACTION_PERMISSIONS: Record<string, { module: string; permission: string }> = {\n  ...GENERATED_PERMISSIONS,\n');
const marker = '    const rpc = async (name: string, rpcBody: Record<string, unknown>) => {';
if (!edge.includes("dispatchGeneratedAdminAction({ action, payload")) {
  if (!edge.includes(marker)) throw new Error("Edge dispatcher insertion marker missing");
  edge = edge.replace(marker, '    const generated = await dispatchGeneratedAdminAction({ action, payload, supabaseUrl, serviceRole, admin, user });\n    if (generated) {\n      if (generated.ok) await audit(supabaseUrl, serviceRole, user, action, action, null, { action });\n      return json(generated.status, generated.body);\n    }\n\n' + marker);
}
edge = edge
  .replaceAll('"pr4_knowledge_upsert"', '"pr4_save_knowledge"')
  .replaceAll('"pr4_knowledge_promote_suggestion"', '"pr4_promote_suggestion"')
  .replaceAll('"pr99_translation_upsert_candidate"', '"save_translation_candidate_fields"')
  .replaceAll('"pr99_translation_review_candidate"', '"review_translation_candidate"')
  .replaceAll('"pr99_translation_publish_candidate"', '"publish_translation_candidate"');
fs.writeFileSync(edgePath, edge);

console.log(`PR116 v2 generated Edge allowlist for ${Object.keys(contracts).length} exact actions.`);
