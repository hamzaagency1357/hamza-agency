import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const write = (file, value) => fs.writeFileSync(path.join(ROOT, file), value);

function mustReplace(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`PR116 closeout marker missing: ${label}`);
  return text.replace(before, after);
}

function ensureImport(text, statement) {
  if (text.includes(statement)) return text;
  const directive = text.match(/^(?:"use client"|'use client');\s*/)?.[0] || "";
  return text.slice(0, directive.length) + `\n${statement}\n` + text.slice(directive.length);
}

function addContracts(file, additions) {
  let source = read(file);
  const isEdge = file.endsWith("generated-dispatch.ts");
  const pattern = isEdge
    ? /const CONTRACTS = (\{[\s\S]*?\}) as const;/
    : /PR116_ADMIN_ACTION_CONTRACTS = (\{[\s\S]*?\}) as const satisfies/;
  const match = source.match(pattern);
  if (!match) throw new Error(`PR116 contract object missing in ${file}`);
  const parsed = JSON.parse(match[1]);
  for (const [action, contract] of Object.entries(additions)) parsed[action] = contract;
  const json = JSON.stringify(Object.fromEntries(Object.entries(parsed).sort(([a],[b]) => a.localeCompare(b))), null, 2);
  if (isEdge) source = source.replace(pattern, `const CONTRACTS = ${json} as const;`);
  else source = source.replace(pattern, `PR116_ADMIN_ACTION_CONTRACTS = ${json} as const satisfies`);
  write(file, source);
}

const sharedContracts = {
  pr116_admin_backup_create: { kind:"rpc", rpcName:"pr99_create_private_backup", module:"backups", permission:"can_manage", allowedFields:["p_mode","p_notes","p_scope"] },
  pr116_admin_backup_dry_run: { kind:"rpc", rpcName:"pr99_backup_dry_run", module:"backups", permission:"can_manage", allowedFields:["p_backup","p_scope"] },
  pr116_admin_backup_restore: { kind:"rpc", rpcName:"pr99_restore_backup", module:"backups", permission:"can_manage", allowedFields:["p_backup","p_scope"] },
  pr116_admin_blog_save: { kind:"rpc", rpcName:"pr3_save_blog_post", module:"pages", permission:"can_edit", allowedFields:["p_category","p_featured_image_url","p_post_id","p_scheduled_at","p_slug","p_status","p_tags","p_translations"] },
  pr116_admin_blog_publish: { kind:"rpc", rpcName:"pr3_publish_blog_post", module:"pages", permission:"can_edit", allowedFields:["p_post_id"] },
  pr116_admin_blog_unpublish: { kind:"rpc", rpcName:"pr3_unpublish_blog_post", module:"pages", permission:"can_edit", allowedFields:["p_post_id"] },
  pr116_admin_page_builder_save: { kind:"rpc", rpcName:"save_page_builder_draft", module:"pages", permission:"can_edit", allowedFields:["p_language","p_page_id","p_page_patch","p_sections"] },
  pr116_admin_page_builder_publish: { kind:"rpc", rpcName:"publish_page_builder_page", module:"pages", permission:"can_edit", allowedFields:["p_language","p_notes","p_page_id"] },
  pr116_admin_page_builder_unpublish: { kind:"rpc", rpcName:"pr99_unpublish_page", module:"pages", permission:"can_edit", allowedFields:["p_language","p_page_id"] },
  pr116_admin_cms_translation_upsert: { kind:"entity", table:"content_translations", method:"upsert", module:"settings", permission:"can_edit", allowedFields:["field_name","is_published","language","reviewed","source_id","source_type","status","translated_value","updated_at"], allowedFilters:[], allowedSelects:[], returnFields:[] },
  pr116_admin_notification_action: { kind:"rpc", rpcName:"pr4_notification_action", module:"notifications", permission:"can_edit", allowedFields:["p_action","p_ids"] },
  pr116_admin_notifications_mark_read: { kind:"rpc", rpcName:"pr99_mark_notifications_read", module:"notifications", permission:"can_edit", allowedFields:["p_ids"] },
  pr116_admin_review_setting_update: { kind:"entity", table:"settings", method:"update", module:"reviews", permission:"can_edit", allowedFields:["is_public","setting_value","updated_at"], allowedFilters:["id"], allowedSelects:["id"], returnFields:["id"] },
  pr116_admin_review_setting_insert: { kind:"entity", table:"settings", method:"insert", module:"reviews", permission:"can_create", allowedFields:["description","group_name","input_type","is_public","label_ar","label_en","setting_group","setting_key","setting_value","sort_order","updated_at"], allowedFilters:[], allowedSelects:["id"], returnFields:["id"] },
  pr116_admin_review_moderate: { kind:"rpc", rpcName:"pr116_moderate_review_submission", module:"reviews", permission:"can_edit", allowedFields:["p_decision","p_submission_id"] },
  pr116_admin_trash_restore: { kind:"rpc", rpcName:"pr99_restore_trash", module:"trash", permission:"can_edit", allowedFields:["p_trash_id"] },
  pr116_admin_trash_permanent_delete: { kind:"rpc", rpcName:"pr99_permanent_delete_trash", module:"trash", permission:"can_delete", allowedFields:["p_confirmation","p_trash_id"] },
};

for (const file of ["lib/server/pr116AdminActionContracts.ts","supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts"]) addContracts(file, sharedContracts);

// Replace every unsafe `any` in the generated dispatcher with exact discriminated contract types.
{
  const file = "supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts";
  let source = read(file);
  source = mustReplace(source,
    'type Result = { status: number; body: Record<string, unknown>; ok: boolean } | null;\n',
    'type Result = { status: number; body: Record<string, unknown>; ok: boolean } | null;\ntype GeneratedContract = (typeof CONTRACTS)[keyof typeof CONTRACTS];\ntype EntityContract = Extract<GeneratedContract, { kind: "entity" }>;\ntype RpcContract = Extract<GeneratedContract, { kind: "rpc" }>;\ntype StorageContract = Extract<GeneratedContract, { kind: "storage" }>;\ntype TrashContract = Extract<GeneratedContract, { kind: "trash" }>;\n',
    "generated contract types",
  );
  source = source
    .replace('function valid(contract: any, payload: Record<string, unknown>)', 'function valid(contract: GeneratedContract, payload: Record<string, unknown>)')
    .replace('async function programAllowed(input: Input, contract: any, payload: Record<string, unknown>)', 'async function programAllowed(input: Input, contract: EntityContract, payload: Record<string, unknown>)')
    .replace('async function entity(input: Input, contract: any)', 'async function entity(input: Input, contract: EntityContract)')
    .replace('async function rpc(input: Input, contract: any)', 'async function rpc(input: Input, contract: RpcContract)')
    .replace('async function storage(input:Input,contract:any)', 'async function storage(input:Input,contract:StorageContract)')
    .replace('async function trash(input:Input,contract:any)', 'async function trash(input:Input,contract:TrashContract)')
    .replace('(CONTRACTS as Record<string,any>)[input.action]', '(CONTRACTS as Record<string, GeneratedContract>)[input.action]');
  if (/\bany\b/.test(source.slice(source.indexOf("export const GENERATED_ACTIONS")))) throw new Error("generated dispatcher still contains explicit any");
  write(file, source);
}

// Browser Admin shared components: route stateful calls through the existing typed PR116 boundary.
{
  const file = "components/AdminBackupRestoreOperations.tsx";
  let source = ensureImport(read(file), 'import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";');
  source = mustReplace(source,
    'const result=await supabase.rpc("pr99_create_private_backup",{p_scope:selectedScope,p_mode:"manual",p_notes:"Created from PR99 operations UI"})',
    'const result=await adminBoundaryMutation("pr116_admin_backup_create",{args:{p_scope:selectedScope,p_mode:"manual",p_notes:"Created from Admin backup operations"}})',
    "backup create",
  );
  source = mustReplace(source,
    'const result=await supabase.rpc("pr99_backup_dry_run",{p_backup:filePayload,p_scope:selectedScope})',
    'const result=await adminBoundaryMutation<Validation>("pr116_admin_backup_dry_run",{args:{p_backup:filePayload,p_scope:selectedScope}})',
    "backup dry run",
  );
  source = mustReplace(source,
    'const result=await supabase.rpc("pr99_restore_backup",{p_backup:filePayload,p_scope:selectedScope})',
    'const result=await adminBoundaryMutation("pr116_admin_backup_restore",{args:{p_backup:filePayload,p_scope:selectedScope}})',
    "backup restore",
  );
  source = source
    .replace('setMessage(`فشل إنشاء النسخة: ${result.error.message}`)', 'setMessage("تعذر إنشاء النسخة الخاصة. تحقق من الصلاحيات وحاول مجددًا.")')
    .replace('setMessage(`تم رفض الملف بأمان: ${result.error.message}`)', 'setMessage("تم رفض ملف النسخة بأمان. راجع الملف والنطاق المحدد ثم حاول مجددًا.")');
  write(file, source);
}

{
  const file = "components/AdminBlogManager.tsx";
  let source = ensureImport(read(file), 'import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";');
  source = mustReplace(source,
    'const{data,error}=await supabase.rpc("pr3_save_blog_post",{p_post_id:activeId,p_slug:slug,p_status:status,p_category:category||"general",p_tags:tags.split(",").map((item)=>item.trim().toLowerCase()).filter(Boolean),p_featured_image_url:featuredImage||null,p_scheduled_at:scheduledAt?new Date(scheduledAt).toISOString():null,p_translations:payload})',
    'const{data,error}=await adminBoundaryMutation<{post_id?:number}>("pr116_admin_blog_save",{args:{p_post_id:activeId,p_slug:slug,p_status:status,p_category:category||"general",p_tags:tags.split(",").map((item)=>item.trim().toLowerCase()).filter(Boolean),p_featured_image_url:featuredImage||null,p_scheduled_at:scheduledAt?new Date(scheduledAt).toISOString():null,p_translations:payload}})',
    "blog save",
  );
  source = mustReplace(source,
    'const rpc=status==="published"?"pr3_unpublish_blog_post":"pr3_publish_blog_post";const{error}=await supabase.rpc(rpc,{p_post_id:activeId})',
    'const action=status==="published"?"pr116_admin_blog_unpublish":"pr116_admin_blog_publish";const{error}=await adminBoundaryMutation(action,{args:{p_post_id:activeId}})',
    "blog publish",
  );
  source = source
    .replace('setMessage(error.message||"تعذر حفظ المقال.")', 'setMessage("تعذر حفظ المقال. راجع الحقول والصلاحيات ثم حاول مجددًا.")')
    .replace('setMessage(error.message||"تعذر تحديث النشر.")', 'setMessage("تعذر تحديث حالة النشر. حاول مجددًا.")');
  write(file, source);
}

{
  const file = "components/AdminManagementPageBuilder.tsx";
  let source = ensureImport(read(file), 'import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";');
  source = mustReplace(source,
    'const {error}=await supabase.rpc("save_page_builder_draft",{p_page_id:pageId,p_language:locale,p_sections:payload,p_page_patch:{title,slug,seo_title:seoTitle,seo_description:seoDescription,canonical_url:canonical,og_image_url:ogImage,publishing_status:status}})',
    'const {error}=await adminBoundaryMutation("pr116_admin_page_builder_save",{args:{p_page_id:pageId,p_language:locale,p_sections:payload,p_page_patch:{title,slug,seo_title:seoTitle,seo_description:seoDescription,canonical_url:canonical,og_image_url:ogImage,publishing_status:status}}})',
    "page builder save",
  );
  source = mustReplace(source,
    'const {error}=await supabase.rpc("publish_page_builder_page",{p_page_id:pageId,p_language:locale,p_notes:`Published ${locale} from Page Builder`})',
    'const {error}=await adminBoundaryMutation("pr116_admin_page_builder_publish",{args:{p_page_id:pageId,p_language:locale,p_notes:`Published ${locale} from page management`}})',
    "page builder publish",
  );
  source = mustReplace(source,
    'const {error}=await supabase.rpc("pr99_unpublish_page",{p_page_id:pageId,p_language:locale})',
    'const {error}=await adminBoundaryMutation("pr116_admin_page_builder_unpublish",{args:{p_page_id:pageId,p_language:locale}})',
    "page builder unpublish",
  );
  source = source.replace(/if\(error\)\{await supabase\.rpc\("pr99_log_operation_failure",\{[\s\S]*?\}\);setError\("فشل النشر دون تطبيق جزئي\."\);return;\}/,
    'if(error){setError("فشل النشر دون تطبيق جزئي.");return;}');
  source = source.replace(/if\(error\)\{await supabase\.rpc\("pr99_log_operation_failure",\{[\s\S]*?\}\);setError\("تعذر إلغاء النشر بأمان\."\);return;\}/,
    'if(error){setError("تعذر إلغاء النشر بأمان.");return;}');
  source = source.replace('setError(`تعذر الحفظ: ${error.message}`)', 'setError("تعذر حفظ المسودة. راجع الحقول والصلاحيات ثم حاول مجددًا.")');
  write(file, source);
}

{
  const file = "components/AdminMultilingualCmsWorkbench.tsx";
  let source = ensureImport(read(file), 'import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";');
  source = mustReplace(source,
    'const result=await client.from("content_translations").upsert(rows,{onConflict:"source_type,source_id,field_name,language"})',
    'const result=await adminBoundaryMutation("pr116_admin_cms_translation_upsert",{values:rows,filters:[],select:undefined,returnMode:"many",options:{onConflict:"source_type,source_id,field_name,language"}})',
    "multilingual translation upsert",
  );
  source = source.replace('setMessage(`تعذر الحفظ: ${result.error.message}`)', 'setMessage("تعذر حفظ الترجمة. راجع المحتوى والصلاحيات ثم حاول مجددًا.")');
  write(file, source);
}

{
  const file = "components/AdminNotificationsInbox.tsx";
  let source = ensureImport(read(file), 'import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";');
  source = source
    .replace('supabase.rpc("pr4_notification_action",{p_ids:ids,p_action:value})', 'adminBoundaryMutation("pr116_admin_notification_action",{args:{p_ids:ids,p_action:value}})')
    .replace('supabase.rpc("pr99_mark_notifications_read",{p_ids:ids})', 'adminBoundaryMutation("pr116_admin_notifications_mark_read",{args:{p_ids:ids}})')
    .replace('supabase.rpc("pr4_notification_action",{p_ids:[],p_action:"read_all"})', 'adminBoundaryMutation("pr116_admin_notification_action",{args:{p_ids:[],p_action:"read_all"}})')
    .replace('supabase.rpc("pr99_mark_notifications_read",{p_ids:null})', 'adminBoundaryMutation("pr116_admin_notifications_mark_read",{args:{p_ids:null}})');
  if (/supabase\.rpc\s*\(/.test(source)) throw new Error("notification direct RPC remains");
  write(file, source);
}

{
  const file = "components/AdminReviewSubmissionsPanel.tsx";
  let source = ensureImport(read(file), 'import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";');
  source = mustReplace(source,
    'const result=settingId?await supabase.from("settings").update({setting_value:payload,is_public:true,updated_at:now}).eq("id",settingId).select("id").single():await supabase.from("settings").insert({setting_key:"review_form_config",setting_value:payload,setting_group:"reviews",group_name:"reviews",label_ar:"إعداد نموذج التقييم",label_en:"Review form configuration",description:"Owner-managed enabled/required review fields",input_type:"json",sort_order:210,is_public:true,updated_at:now}).select("id").single()',
    'const result=settingId?await adminBoundaryMutation<{id:number}>("pr116_admin_review_setting_update",{values:{setting_value:payload,is_public:true,updated_at:now},filters:[{op:"eq",field:"id",value:settingId}],select:"id",returnMode:"single",options:undefined}):await adminBoundaryMutation<{id:number}>("pr116_admin_review_setting_insert",{values:{setting_key:"review_form_config",setting_value:payload,setting_group:"reviews",group_name:"reviews",label_ar:"إعداد نموذج التقييم",label_en:"Review form configuration",description:"Owner-managed enabled/required review fields",input_type:"json",sort_order:210,is_public:true,updated_at:now},filters:[],select:"id",returnMode:"single",options:undefined})',
    "review settings save",
  );
  source = mustReplace(source,
    'const{error}=await supabase.rpc("pr116_moderate_review_submission",{p_submission_id:id,p_decision:decision})',
    'const{error}=await adminBoundaryMutation("pr116_admin_review_moderate",{args:{p_submission_id:id,p_decision:decision}})',
    "review moderation",
  );
  write(file, source);
}

{
  const file = "components/AdminTrashOperations.tsx";
  let source = ensureImport(read(file), 'import { adminBoundaryMutation } from "@/lib/adminBoundaryMutationClient";');
  source = source
    .replace('supabase.rpc("pr99_restore_trash",{p_trash_id:id})', 'adminBoundaryMutation("pr116_admin_trash_restore",{args:{p_trash_id:id}})')
    .replace('supabase.rpc("pr99_permanent_delete_trash",{p_trash_id:deleteId,p_confirmation:confirmText})', 'adminBoundaryMutation("pr116_admin_trash_permanent_delete",{args:{p_trash_id:deleteId,p_confirmation:confirmText}})');
  if (/supabase\.rpc\s*\(/.test(source)) throw new Error("trash direct RPC remains");
  write(file, source);
}

// Current lint blockers caused by the earlier browser-write migration.
{
  const file = "lib/server/pr116AdminOidcGateway.ts";
  let source = read(file);
  source = source.replace(/\nconst ALLOWED_ACTIONS = new Set<Pr116AdminGatewayAction>\(\[[\s\S]*?\]\);\n/, "\n");
  write(file, source);
}
for (const file of ["app/admin/media/page.tsx","app/admin/media/cinematic/page.tsx"]) {
  let source = read(file);
  source = source.replace(/\nconst BUCKET\s*=\s*["']media-library["'];?\n/, "\n");
  write(file, source);
}
for (const file of ["app/admin/announcements/page.tsx","app/admin/settings/homepage/page.tsx"]) {
  let source = read(file);
  source = source.replace(/const\[adminEmail,setAdminEmail\]=useState\(""\);?/, "");
  source = source.replace(/\n\s*const \[adminEmail, setAdminEmail\] = useState\(""\);/, "");
  source = source.replace(/\s*setAdminEmail\(access\.profile\.email\s*\|\|\s*access\.user\?\.email\s*\|\|\s*""\);?/, "");
  write(file, source);
}
for (const file of ["app/admin/announcements/page.tsx","app/admin/pages/page.tsx","app/admin/sections/page.tsx","app/admin/settings/page.tsx"]) {
  let source = read(file);
  source = source.replace(
    /async function logActivity\(action: string, entityType: string, entityId: string, oldData: string, newData: string\) \{\n\s*if \(!supabase\) return;/,
    'async function logActivity(action: string, entityType: string, entityId: string, oldData: string, newData: string) {\n    void action; void entityType; void entityId; void oldData; void newData;\n    if (!supabase) return;',
  );
  source = source.replace(
    /async function logActivity\(\n\s*action: string,\n\s*entityType: string,\n\s*entityId: string,\n\s*oldData: string,\n\s*newData: string\n\s*\) \{\n\s*if \(!supabase\) return;/,
    'async function logActivity(\n    action: string,\n    entityType: string,\n    entityId: string,\n    oldData: string,\n    newData: string\n  ) {\n    void action; void entityType; void entityId; void oldData; void newData;\n    if (!supabase) return;',
  );
  write(file, source);
}

// Expand the fail-closed browser mutation guard to every shared Admin component.
{
  const file = "tests/admin-mutation-boundary.test.mjs";
  let source = read(file);
  source = mustReplace(source,
    'const SCAN_ROOTS = ["app/admin", "components/admin"];\n',
    'const SCAN_ROOTS = ["app/admin", "components/admin"];\nconst SHARED_ADMIN_ROOT = "components";\n',
    "guard shared root",
  );
  source = mustReplace(source,
    'function rpcViolations(file, text) {\n  const allowed = READONLY_BROWSER_RPCS.get(file) || new Set();\n  const names = [...text.matchAll(/\\.rpc\\s*\\(\\s*["\'`]([^"\'`]+)["\'`]/g)].map((match) => match[1]);\n  return names.filter((name) => !allowed.has(name)).map((name) => `${file}: stateful/unclassified RPC ${name}`);\n}\n',
    'function rpcViolations(file, text) {\n  const allowed = READONLY_BROWSER_RPCS.get(file) || new Set();\n  const names = [...text.matchAll(/\\.rpc\\s*\\(\\s*["\'`]([^"\'`]+)["\'`]/g)].map((match) => match[1]);\n  const violations = names.filter((name) => !allowed.has(name)).map((name) => `${file}: stateful/unclassified RPC ${name}`);\n  if (/\\.rpc\\s*\\(\\s*(?!["\'`])/.test(text)) violations.push(`${file}: dynamic/unclassified RPC`);\n  return violations;\n}\n',
    "guard dynamic RPC",
  );
  source = mustReplace(source,
    '  const files = [...new Set([...SCAN_ROOTS.flatMap(walk), ...EXTRA_FILES.filter((file) => fs.existsSync(path.join(ROOT, file)))])];\n',
    '  const sharedAdminFiles = walk(SHARED_ADMIN_ROOT).filter((file) => { const source = fs.readFileSync(path.join(ROOT, file), "utf8"); return /^Admin[A-Z0-9_].*\\.(?:js|jsx|ts|tsx)$/.test(path.basename(file)) || source.includes("requireAdminModuleAccess(") || source.includes("@/lib/adminAccess"); });\n  const files = [...new Set([...SCAN_ROOTS.flatMap(walk), ...sharedAdminFiles, ...EXTRA_FILES.filter((file) => fs.existsSync(path.join(ROOT, file)))])];\n',
    "guard shared files",
  );
  write(file, source);
}

console.log("PR116 final Admin surface closeout patch applied.");
