import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const ROOT = process.cwd();
const SCAN_ROOTS = ["app/admin", "components/admin"];
const SPECIAL_FILE = "lib/adminTrash.ts";
const ENTITY_METHODS = new Set(["insert", "update", "upsert", "delete"]);
const FILTER_METHODS = new Set(["eq", "neq", "in", "is"]);
const POST_METHODS = new Set(["select", "single", "maybeSingle"]);
const STORAGE_METHODS = new Set(["upload", "update", "remove", "move", "copy"]);
const READONLY_RPCS = new Set(["pr100_admin_requests_index", "pr99_backup_schedule_status"]);
const contracts = {};
const failures = [];

function listFiles(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) out.push(...listFiles(rel));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function slug(value) {
  return value.replace(/\.(tsx?|jsx?)$/, "").replace(/^app\/admin\/?/, "").replace(/^components\/admin\/?/, "component-").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "dashboard";
}

function inferModule(file, source) {
  const explicit = source.match(/requireAdminModuleAccess\(\s*["']([a-z_]+)["']/)?.[1];
  if (explicit) return explicit;
  const rules = [
    [/translations\//, "settings"], [/media\//, "media"], [/programs\//, "programs"],
    [/announcements/, "announcements"], [/contact/, "contact"], [/faqs|pages|sections/, "pages"],
    [/gallery/, "gallery"], [/jobs/, "jobs"], [/partners/, "partners"], [/permissions|TenantGovernance/, "permissions"],
    [/reviews/, "reviews"], [/service-requests/, "service_requests"], [/success-stories/, "success_stories"],
    [/settings|visual-experience|white-label/, "settings"], [/ProductAnalytics/, "analytics"],
    [/ProductExpansion|ProductOperations/, "settings"], [/^app\/admin\/page\.tsx$/, "dashboard"],
    [/reset-password/, "settings"], [/ai-support/, "ai_support"], [/knowledge-base/, "knowledge_base"],
  ];
  for (const [pattern, module] of rules) if (pattern.test(file)) return module;
  failures.push(`${file}: cannot infer AdminModule`);
  return "settings";
}

function permissionFor(method) {
  if (method === "insert") return "can_create";
  if (method === "delete") return "can_delete";
  return "can_edit";
}

function literalText(node) {
  return ts.isStringLiteralLike(node) ? node.text : null;
}

function sourceText(sourceFile, node) {
  return node.getText(sourceFile);
}

function buildDeclarations(sourceFile) {
  const variables = new Map();
  const types = new Map();
  function walk(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) variables.set(node.name.text, node);
    if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) types.set(node.name.text, node);
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
  return { variables, types };
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
  return new Set();
}

function valueFields(expr, declarations, seen = new Set()) {
  if (!expr) return new Set();
  if (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isSatisfiesExpression?.(expr)) return valueFields(expr.expression, declarations, seen);
  if (ts.isParenthesizedExpression(expr)) return valueFields(expr.expression, declarations, seen);
  if (ts.isArrayLiteralExpression(expr)) {
    const out = new Set();
    for (const item of expr.elements) for (const key of valueFields(item, declarations, seen)) out.add(key);
    return out;
  }
  if (ts.isObjectLiteralExpression(expr)) {
    const out = new Set();
    for (const prop of expr.properties) {
      if (ts.isSpreadAssignment(prop)) {
        for (const key of valueFields(prop.expression, declarations, seen)) out.add(key);
      } else if (prop.name && (ts.isIdentifier(prop.name) || ts.isStringLiteralLike(prop.name) || ts.isNumericLiteral(prop.name))) {
        out.add(prop.name.text);
      }
    }
    return out;
  }
  if (ts.isIdentifier(expr)) {
    if (seen.has(expr.text)) return new Set();
    seen.add(expr.text);
    const decl = declarations.variables.get(expr.text);
    if (!decl) return new Set();
    const fromInit = valueFields(decl.initializer, declarations, seen);
    if (fromInit.size) return fromInit;
    return typeFields(decl.type, declarations, seen);
  }
  if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression) && ["Object", "Array"].includes(expr.expression.text)) return new Set();
  return new Set();
}

function parseCallChain(node) {
  const methods = [];
  let cursor = node;
  while (ts.isCallExpression(cursor) && ts.isPropertyAccessExpression(cursor.expression)) {
    methods.unshift({ name: cursor.expression.name.text, args: [...cursor.arguments], node: cursor });
    cursor = cursor.expression.expression;
  }
  return { methods, cursor };
}

function isChainContinuation(node) {
  const p = node.parent;
  return !!(p && ts.isPropertyAccessExpression(p) && p.expression === node && p.parent && ts.isCallExpression(p.parent));
}

function ensureImport(source, helperNames) {
  if (!helperNames.size) return source;
  const modulePath = "@/lib/adminBoundaryMutationClient";
  const existing = source.match(new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${modulePath.replaceAll("/", "\\/")}["'];?`));
  if (existing) {
    const names = new Set(existing[1].split(",").map((v) => v.trim()).filter(Boolean));
    for (const name of helperNames) names.add(name);
    return source.slice(0, existing.index) + `import { ${[...names].sort().join(", ")} } from "${modulePath}";` + source.slice(existing.index + existing[0].length);
  }
  const directive = source.match(/^(["']use client["'];\s*)/);
  const pos = directive ? directive[0].length : 0;
  return source.slice(0, pos) + `\nimport { ${[...helperNames].sort().join(", ")} } from "${modulePath}";\n` + source.slice(pos);
}

function actionName(file, kind, target, method) {
  return `pr116_${slug(file)}_${kind}_${String(target).replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}_${method}`;
}

function validateActionName(name) {
  if (!/^[a-z0-9_]{1,180}$/.test(name)) throw new Error(`invalid generated action ${name}`);
}

function collectSelectFields(selectText) {
  if (!selectText || selectText === "*") return [];
  return [...new Set(selectText.split(",").map((s) => s.trim()).filter((s) => /^[a-zA-Z0-9_]+$/.test(s)))];
}

function transformFile(file) {
  const abs = path.join(ROOT, file);
  let source = fs.readFileSync(abs, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const declarations = buildDeclarations(sf);
  const module = inferModule(file, source);
  const replacements = [];
  const helpers = new Set();

  function visit(node) {
    if (ts.isCallExpression(node) && !isChainContinuation(node)) {
      const { methods } = parseCallChain(node);
      const fromIndex = methods.findIndex((m) => m.name === "from" && m.args.length >= 1);
      const mutationIndex = methods.findIndex((m, index) => index > fromIndex && ENTITY_METHODS.has(m.name));
      if (fromIndex >= 0 && mutationIndex > fromIndex) {
        const table = literalText(methods[fromIndex].args[0]);
        const beforeFrom = methods.slice(0, fromIndex).map((m) => m.name);
        const isStorage = beforeFrom.includes("storage");
        if (!isStorage) {
          if (!table) failures.push(`${file}: dynamic table in ${sourceText(sf, node)}`);
          else {
            const mutation = methods[mutationIndex];
            const after = methods.slice(mutationIndex + 1);
            const unsupported = after.filter((m) => !FILTER_METHODS.has(m.name) && !POST_METHODS.has(m.name));
            if (unsupported.length) failures.push(`${file}: unsupported post-mutation chain ${unsupported.map((m) => m.name).join(",")}`);
            else {
              const action = actionName(file, "entity", table, mutation.name);
              validateActionName(action);
              const fields = mutation.name === "delete" ? new Set() : valueFields(mutation.args[0], declarations);
              if (mutation.name !== "delete" && fields.size === 0) failures.push(`${file}: could not infer mutation fields for ${table}.${mutation.name} from ${mutation.args[0] ? sourceText(sf, mutation.args[0]) : "<missing>"}`);
              const filters = [];
              for (const item of after.filter((m) => FILTER_METHODS.has(m.name))) {
                const field = literalText(item.args[0]);
                if (!field) failures.push(`${file}: dynamic filter field in ${table}.${mutation.name}`);
                else filters.push({ op: item.name, field, value: item.args[1] ? sourceText(sf, item.args[1]) : "null" });
              }
              if (["update", "delete"].includes(mutation.name) && !filters.length) failures.push(`${file}: refusing unfiltered ${table}.${mutation.name}`);
              const selectCall = after.find((m) => m.name === "select");
              const select = selectCall ? (selectCall.args[0] ? literalText(selectCall.args[0]) : "*") : null;
              if (selectCall && select === null) failures.push(`${file}: dynamic select after ${table}.${mutation.name}`);
              const returnMode = after.some((m) => m.name === "single") ? "single" : after.some((m) => m.name === "maybeSingle") ? "maybeSingle" : "many";
              contracts[action] = {
                kind: "entity", table, method: mutation.name, module, permission: permissionFor(mutation.name),
                allowedFields: [...fields].sort(), allowedFilters: [...new Set(filters.map((f) => f.field))].sort(),
                allowedSelects: select ? [select] : [], returnFields: collectSelectFields(select),
              };
              const values = mutation.name === "delete" ? "undefined" : sourceText(sf, mutation.args[0]);
              const upsertOptions = mutation.name === "upsert" && mutation.args[1] ? sourceText(sf, mutation.args[1]) : "undefined";
              const filterCode = `[${filters.map((f) => `{ op: ${JSON.stringify(f.op)}, field: ${JSON.stringify(f.field)}, value: ${f.value} }`).join(", ")}]`;
              const replacement = `adminBoundaryMutation(${JSON.stringify(action)}, { values: ${values}, filters: ${filterCode}, select: ${select ? JSON.stringify(select) : "undefined"}, returnMode: ${JSON.stringify(returnMode)}, options: ${upsertOptions} })`;
              replacements.push({ start: node.getStart(sf), end: node.end, text: replacement });
              helpers.add("adminBoundaryMutation");
            }
          }
        }
      }

      const rpcCall = methods.find((m) => m.name === "rpc");
      if (rpcCall && methods.length && methods[0] === rpcCall) {
        const rpcName = literalText(rpcCall.args[0]);
        if (rpcName && !READONLY_RPCS.has(rpcName)) {
          const afterRpc = methods.slice(1);
          if (afterRpc.some((m) => !POST_METHODS.has(m.name))) failures.push(`${file}: unsupported RPC chain for ${rpcName}`);
          const action = actionName(file, "rpc", rpcName, "call");
          const argsExpr = rpcCall.args[1];
          const argFields = argsExpr ? valueFields(argsExpr, declarations) : new Set();
          if (argsExpr && argFields.size === 0) failures.push(`${file}: could not infer RPC args for ${rpcName}`);
          contracts[action] = { kind: "rpc", rpcName, module, permission: "can_edit", allowedFields: [...argFields].sort() };
          replacements.push({ start: node.getStart(sf), end: node.end, text: `adminBoundaryMutation(${JSON.stringify(action)}, { args: ${argsExpr ? sourceText(sf, argsExpr) : "{}"} })` });
          helpers.add("adminBoundaryMutation");
        }
      }

      const text = sourceText(sf, node);
      if (/^supabase\.auth\.updateUser\(/.test(text)) {
        const action = actionName(file, "auth", "self", "update");
        const fields = valueFields(node.arguments[0], declarations);
        if (!fields.size) failures.push(`${file}: could not infer auth.updateUser fields`);
        contracts[action] = { kind: "auth", authOperation: "update_verified_user", module, permission: "can_manage", allowedFields: [...fields].sort() };
        replacements.push({ start: node.getStart(sf), end: node.end, text: `adminBoundaryMutation(${JSON.stringify(action)}, { values: ${node.arguments[0] ? sourceText(sf, node.arguments[0]) : "{}"} })` });
        helpers.add("adminBoundaryMutation");
      }

      // Supabase Storage: supabase.storage.from("bucket").upload/update/remove/move/copy(...)
      const storageMethod = methods.find((m) => STORAGE_METHODS.has(m.name));
      if (storageMethod) {
        const storageFromIndex = methods.findIndex((m) => m.name === "from" && m.args.length >= 1);
        if (storageFromIndex >= 0 && methods.slice(0, storageFromIndex).some((m) => m.name === "storage")) {
          const bucket = literalText(methods[storageFromIndex].args[0]);
          if (!bucket) failures.push(`${file}: dynamic Storage bucket`);
          else {
            const action = actionName(file, "storage", bucket, storageMethod.name);
            contracts[action] = { kind: "storage", bucket, storageMethod: storageMethod.name, module, permission: storageMethod.name === "remove" ? "can_delete" : "can_edit" };
            const args = storageMethod.args.map((arg) => sourceText(sf, arg));
            replacements.push({ start: node.getStart(sf), end: node.end, text: `adminStorageMutation(${JSON.stringify(action)}, [${args.join(", ")}])` });
            helpers.add("adminStorageMutation");
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  // Drop nested/overlapping replacements in favor of the widest replacement.
  replacements.sort((a, b) => a.start - b.start || b.end - a.end);
  const accepted = [];
  for (const r of replacements) {
    if (accepted.some((x) => r.start >= x.start && r.end <= x.end)) continue;
    if (accepted.some((x) => !(r.end <= x.start || r.start >= x.end))) {
      failures.push(`${file}: overlapping codemod replacements`);
      continue;
    }
    accepted.push(r);
  }
  accepted.sort((a, b) => b.start - a.start);
  for (const r of accepted) source = source.slice(0, r.start) + r.text + source.slice(r.end);
  source = ensureImport(source, helpers);
  if (accepted.length) fs.writeFileSync(abs, source);
  return accepted.length;
}

function writeTrashShim() {
  const content = `import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";\n\ntype JsonRecord = Record<string, unknown>;\n\nexport type MoveRecordToTrashInput = {\n  supabase?: unknown;\n  tableName: string;\n  recordId: string | number;\n  title?: string | null;\n  record: JsonRecord;\n  adminEmail?: string | null;\n  reason?: string | null;\n};\n\nexport type MoveRecordToTrashResult = { success: boolean; trashPayload?: JsonRecord; error?: string };\n\nconst allowedItemTypes = new Set([\n  "announcements", "contact_messages", "faqs", "gallery", "jobs", "media_assets", "pages_content",\n  "partners", "programs", "reviews", "sections", "service_requests", "success_stories"\n]);\n\nfunction cleanTableName(tableName: string) { return tableName.trim().replace(/[^a-zA-Z0-9_]/g, ""); }\nfunction stringifyRecordId(recordId: string | number) { return String(recordId).trim(); }\nfunction inferTitle(record: JsonRecord, fallback: string) {\n  for (const value of [record.title, record.name, record.full_name, record.display_name, record.email, record.phone, record.whatsapp, record.request_code, record.tracking_code, record.slug]) {\n    if (typeof value === "string" && value.trim()) return value.trim();\n    if (typeof value === "number" || typeof value === "boolean") return String(value);\n  }\n  return fallback;\n}\nfunction cloneRecord(record: JsonRecord) { try { return JSON.parse(JSON.stringify(record)) as JsonRecord; } catch { return { ...record }; } }\n\nexport function buildTrashPayload(input: Omit<MoveRecordToTrashInput, "supabase">) {\n  const tableName = cleanTableName(input.tableName);\n  const recordId = stringifyRecordId(input.recordId);\n  const deletedAt = new Date().toISOString();\n  const originalData = cloneRecord(input.record);\n  const title = input.title?.trim() || inferTitle(originalData, \`\${tableName} #\${recordId}\`);\n  return { item_type: tableName, item_id: recordId, item_title: title, item_data: originalData, deleted_at: deletedAt };\n}\n\nexport async function moveRecordToTrash(input: MoveRecordToTrashInput): Promise<MoveRecordToTrashResult> {\n  const itemType = cleanTableName(input.tableName);\n  const recordId = stringifyRecordId(input.recordId);\n  if (!allowedItemTypes.has(itemType)) return { success: false, error: "هذا النوع غير مسموح بنقله إلى سلة المحذوفات." };\n  if (!recordId) return { success: false, error: "الرقم المرجعي غير صالح." };\n  const trashPayload = buildTrashPayload(input);\n  const action = \`pr116_trash_\${itemType}_move\`;\n  const result = await adminBoundaryMutation(action, { itemType, recordId, title: trashPayload.item_title, record: input.record, reason: input.reason || null });\n  if (result.error) return { success: false, trashPayload, error: result.error.message };\n  return { success: true, trashPayload };\n}\n`;
  fs.writeFileSync(path.join(ROOT, SPECIAL_FILE), content);
  for (const itemType of ["announcements", "contact_messages", "faqs", "gallery", "jobs", "media_assets", "pages_content", "partners", "programs", "reviews", "sections", "service_requests", "success_stories"]) {
    contracts[`pr116_trash_${itemType}_move`] = { kind: "trash", itemType, module: "trash", permission: "can_create", allowedFields: ["itemType", "recordId", "title", "record", "reason"] };
  }
}

function generateContracts() {
  const entries = Object.entries(contracts).sort(([a], [b]) => a.localeCompare(b));
  const body = `export type Pr116AdminActionContract =\n  | { kind: "entity"; table: string; method: "insert" | "update" | "upsert" | "delete"; module: string; permission: string; allowedFields: readonly string[]; allowedFilters: readonly string[]; allowedSelects: readonly string[]; returnFields: readonly string[] }\n  | { kind: "rpc"; rpcName: string; module: string; permission: string; allowedFields: readonly string[] }\n  | { kind: "auth"; authOperation: "update_verified_user"; module: string; permission: string; allowedFields: readonly string[] }\n  | { kind: "storage"; bucket: string; storageMethod: "upload" | "update" | "remove" | "move" | "copy"; module: string; permission: string }\n  | { kind: "trash"; itemType: string; module: string; permission: string; allowedFields: readonly string[] };\n\nexport const PR116_ADMIN_ACTION_CONTRACTS = ${JSON.stringify(Object.fromEntries(entries), null, 2)} as const satisfies Record<string, Pr116AdminActionContract>;\n\nexport type Pr116GeneratedAdminAction = keyof typeof PR116_ADMIN_ACTION_CONTRACTS;\n`;
  fs.mkdirSync(path.join(ROOT, "lib/server"), { recursive: true });
  fs.writeFileSync(path.join(ROOT, "lib/server/pr116AdminActionContracts.ts"), body);
}

function generateClient() {
  const body = `"use client";\n\nimport { supabase } from "@/lib/supabase";\n\ntype BoundaryError = { message: string };\nexport type BoundaryResult<T = unknown> = { data: T | null; error: BoundaryError | null };\n\nasync function accessToken() {\n  if (!supabase) return null;\n  const { data } = await supabase.auth.getSession();\n  return data.session?.access_token || null;\n}\n\nexport async function adminBoundaryMutation<T = unknown>(action: string, payload: Record<string, unknown>): Promise<BoundaryResult<T>> {\n  const token = await accessToken();\n  if (!token) return { data: null, error: { message: "انتهت جلسة الإدارة. سجّل الدخول مجددًا." } };\n  try {\n    const response = await fetch("/api/admin/mutations/entities", {\n      method: "POST",\n      cache: "no-store",\n      headers: { Authorization: \`Bearer \${token}\`, "Content-Type": "application/json" },\n      body: JSON.stringify({ action, payload }),\n    });\n    const value = await response.json().catch(() => null) as { data?: T; message?: string } | null;\n    if (!response.ok) return { data: null, error: { message: value?.message || "تعذر حفظ التغيير الإداري." } };\n    return { data: value?.data ?? null, error: null };\n  } catch {\n    return { data: null, error: { message: "تعذر الاتصال بخدمة الحفظ الإداري." } };\n  }\n}\n\nfunction encodeBase64(bytes: Uint8Array) {\n  let binary = "";\n  const chunk = 0x8000;\n  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));\n  return btoa(binary);\n}\n\nexport async function adminStorageMutation<T = unknown>(action: string, args: unknown[]): Promise<BoundaryResult<T>> {\n  const normalized: unknown[] = [];\n  for (const arg of args) {\n    if (arg instanceof Blob) {\n      if (arg.size > 8 * 1024 * 1024) return { data: null, error: { message: "حجم الملف أكبر من الحد المسموح للحفظ الآمن." } };\n      normalized.push({ __file: true, name: arg instanceof File ? arg.name : "upload.bin", type: arg.type || "application/octet-stream", size: arg.size, base64: encodeBase64(new Uint8Array(await arg.arrayBuffer())) });\n    } else normalized.push(arg);\n  }\n  return adminBoundaryMutation<T>(action, { args: normalized });\n}\n`;
  fs.writeFileSync(path.join(ROOT, "lib/adminBoundaryMutationClient.ts"), body);
}

function generateRoute() {
  const body = `import { NextResponse } from "next/server";\nimport { authorizeAdminMutation, PREVIEW_READ_ONLY_MESSAGE } from "@/lib/server/adminMutationBoundary";\nimport { PR116_ADMIN_ACTION_CONTRACTS } from "@/lib/server/pr116AdminActionContracts";\nimport { callPr116AdminOidcGateway, Pr116AdminGatewayError } from "@/lib/server/pr116AdminOidcGateway";\nimport type { AdminModule, AdminPermissionAction } from "@/lib/adminAccess";\n\nfunction isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }\nfunction keysAllowed(value: unknown, allowed: readonly string[]) {\n  const rows = Array.isArray(value) ? value : [value];\n  return rows.every((row) => isRecord(row) && Object.keys(row).every((key) => allowed.includes(key)));\n}\nfunction validatePayload(contract: (typeof PR116_ADMIN_ACTION_CONTRACTS)[keyof typeof PR116_ADMIN_ACTION_CONTRACTS], payload: Record<string, unknown>) {\n  if (JSON.stringify(payload).length > 12_000_000) return false;\n  if (contract.kind === "entity") {\n    if (contract.method !== "delete" && !keysAllowed(payload.values, contract.allowedFields)) return false;\n    const filters = Array.isArray(payload.filters) ? payload.filters : [];\n    if ((contract.method === "update" || contract.method === "delete") && filters.length === 0) return false;\n    if (!filters.every((item) => isRecord(item) && ["eq","neq","in","is"].includes(String(item.op)) && typeof item.field === "string" && contract.allowedFilters.includes(item.field))) return false;\n    if (payload.select !== undefined && (typeof payload.select !== "string" || !contract.allowedSelects.includes(payload.select))) return false;\n    return true;\n  }\n  if (contract.kind === "rpc") return payload.args === undefined || keysAllowed(payload.args, contract.allowedFields);\n  if (contract.kind === "auth") return keysAllowed(payload.values, contract.allowedFields);\n  if (contract.kind === "storage") return Array.isArray(payload.args) && payload.args.length <= 4;\n  if (contract.kind === "trash") return Object.keys(payload).every((key) => contract.allowedFields.includes(key));\n  return false;\n}\n\nexport async function POST(request: Request) {\n  let body: { action?: unknown; payload?: unknown } = {};\n  try { body = await request.json(); } catch { return NextResponse.json({ ok: false, message: "بيانات الحفظ غير صالحة." }, { status: 400 }); }\n  if (typeof body.action !== "string" || !Object.prototype.hasOwnProperty.call(PR116_ADMIN_ACTION_CONTRACTS, body.action) || !isRecord(body.payload)) {\n    return NextResponse.json({ ok: false, message: "عملية الحفظ غير معتمدة." }, { status: 400 });\n  }\n  const contract = PR116_ADMIN_ACTION_CONTRACTS[body.action as keyof typeof PR116_ADMIN_ACTION_CONTRACTS];\n  if (!validatePayload(contract, body.payload)) return NextResponse.json({ ok: false, message: "بيانات الحفظ لا تطابق العقد المعتمد." }, { status: 400 });\n  const auth = await authorizeAdminMutation(request, contract.module as AdminModule, contract.permission as AdminPermissionAction);\n  if (!auth.ok) return NextResponse.json({ ok: false, message: auth.message }, { status: auth.status });\n  try {\n    const result = await callPr116AdminOidcGateway<{ ok?: boolean; data?: unknown }>(request, auth.actor.accessToken, body.action, body.payload);\n    return NextResponse.json({ ok: true, data: result.data ?? null });\n  } catch (error) {\n    if (error instanceof Pr116AdminGatewayError && error.reason === "preview_forbidden") return NextResponse.json({ ok: false, message: PREVIEW_READ_ONLY_MESSAGE }, { status: 403 });\n    if (error instanceof Pr116AdminGatewayError && (error.reason === "unauthorized" || error.reason === "forbidden")) return NextResponse.json({ ok: false, message: "لا تملك صلاحية تنفيذ هذا التغيير." }, { status: 403 });\n    return NextResponse.json({ ok: false, message: "تعذر حفظ التغيير الإداري بأمان." }, { status: 503 });\n  }\n}\n`;
  const target = path.join(ROOT, "app/api/admin/mutations/entities/route.ts");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
}

function patchTransport() {
  const target = path.join(ROOT, "lib/server/pr116AdminOidcGateway.ts");
  let source = fs.readFileSync(target, "utf8");
  source = source.replace("  action: Pr116AdminGatewayAction,", "  action: Pr116AdminGatewayAction | string,");
  source = source.replace("  if (!ALLOWED_ACTIONS.has(action) || !userAccessToken) {", "  if (!action || !/^[a-z0-9_]{1,180}$/.test(action) || !userAccessToken) {");
  fs.writeFileSync(target, source);
}

function main() {
  const files = SCAN_ROOTS.flatMap(listFiles);
  let changed = 0;
  for (const file of files) changed += transformFile(file) ? 1 : 0;
  writeTrashShim();
  generateContracts();
  generateClient();
  generateRoute();
  patchTransport();

  if (failures.length) {
    console.error("PR116 codemod refused unsafe/unknown cases:\n" + failures.map((v) => `- ${v}`).join("\n"));
    process.exit(2);
  }
  console.log(`PR116 codemod transformed ${changed} files and generated ${Object.keys(contracts).length} exact action contracts.`);
}

main();
