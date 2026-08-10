import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const write = (p, value) => fs.writeFileSync(path.join(ROOT, p), value);

function mustReplace(text, before, after, label) {
  if (!text.includes(before)) throw new Error(`PR116 hardening marker missing: ${label}`);
  return text.replace(before, after);
}

function widenActionFields(text, action, fields) {
  const escaped = action.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(\\"${escaped}\\"\\s*:\\s*\\{[\\s\\S]*?\\"allowedFields\\"\\s*:\\s*)\\[[\\s\\S]*?\\](\\s*,\\s*\\"allowedFilters\\")`);
  const replacement = `$1${JSON.stringify(fields, null, 6)}$2`;
  if (!pattern.test(text)) throw new Error(`PR116 action contract missing: ${action}`);
  return text.replace(pattern, replacement);
}

const brandingFields = ["tenant_id", "primary_color", "secondary_color", "accent_color", "contact_email", "contact_phone", "updated_at"];
for (const contractPath of [
  "lib/server/pr116AdminActionContracts.ts",
  "supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts",
]) {
  let text = read(contractPath);
  text = widenActionFields(text, "pr116_component_productexpansionconsole_entity_tenant_branding_upsert", brandingFields);
  write(contractPath, text);
}

let route = read("app/api/admin/mutations/entities/route.ts");
route = mustReplace(
  route,
  "  const contract = PR116_ADMIN_ACTION_CONTRACTS[body.action as keyof typeof PR116_ADMIN_ACTION_CONTRACTS] as Pr116AdminActionContract;\n",
  "  const contract = PR116_ADMIN_ACTION_CONTRACTS[body.action as keyof typeof PR116_ADMIN_ACTION_CONTRACTS] as Pr116AdminActionContract;\n  if (contract.kind === \"entity\" && contract.table === \"tenant_admin_audit\") {\n    return NextResponse.json({ ok: false, message: \"سجل التدقيق يُنشأ تلقائيًا من البوابة الموثوقة ولا يقبل إدخالًا من المتصفح.\" }, { status: 400 });\n  }\n",
  "server rejects browser-authored audit",
);
write("app/api/admin/mutations/entities/route.ts", route);

let edge = read("supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts");
edge = mustReplace(
  edge,
  '  if (contract.kind === "entity") {\n',
  '  if (contract.kind === "entity") {\n    if (contract.table === "tenant_admin_audit") return false;\n',
  "edge rejects browser-authored audit",
);
edge = mustReplace(
  edge,
  'const TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime","application/pdf"]);',
  'const TYPES=new Set(["image/jpeg","image/png","image/webp","image/avif","image/gif","video/mp4","video/webm","video/quicktime","application/pdf"]);',
  "AVIF storage MIME",
);
edge = mustReplace(
  edge,
  'function bytes(value:unknown){if(!record(value)||value.__file!==true||typeof value.base64!=="string"||typeof value.type!=="string"||typeof value.size!=="number"||value.size<0||value.size>8388608||!TYPES.has(value.type)||value.type==="image/svg+xml")return null;',
  'function bytes(value:unknown,maxSize=8388608,allowedTypes=TYPES){if(!record(value)||value.__file!==true||typeof value.base64!=="string"||typeof value.type!=="string"||typeof value.size!=="number"||value.size<0||value.size>maxSize||!allowedTypes.has(value.type)||value.type==="image/svg+xml")return null;',
  "parameterized storage size",
);
edge = mustReplace(
  edge,
  'const decoded=bytes(file);if(!decoded)return{status:400,body:{ok:false,code:"invalid_file"},ok:false};',
  'const mediaImageTypes=new Set(["image/jpeg","image/png","image/webp","image/avif"]);const cinematicTypes=new Set(["image/jpeg","image/png","image/webp","image/avif","video/mp4","video/webm"]);const mediaAction=input.action==="pr116_media_page_storage_media_library_upload";const cinematicAction=input.action==="pr116_media_cinematic_page_storage_media_library_upload";const decoded=mediaAction?bytes(file,5*1024*1024,mediaImageTypes):cinematicAction?bytes(file,25*1024*1024,cinematicTypes):bytes(file);if(!decoded)return{status:400,body:{ok:false,code:"invalid_file"},ok:false};',
  "action-specific storage policy",
);
write("supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts", edge);

// Guard the exact application lifecycle contract without touching Production.
const migrationPath = "supabase/migrations/20260810203000_pr116_admin_oidc_boundary_lockdown.sql";
if (!fs.existsSync(path.join(ROOT, migrationPath))) {
  const contractText = read("supabase/functions/pr116-admin-oidc-gateway/generated-dispatch.ts");
  const jsonMatch = contractText.match(/^const CONTRACTS = (\{[\s\S]*?\}) as const;/);
  if (!jsonMatch) throw new Error("PR116 generated contracts could not be parsed for lockdown migration");
  const contracts = JSON.parse(jsonMatch[1]);
  const tables = [...new Set(Object.values(contracts).filter((c) => c.kind === "entity" && c.table !== "tenant_admin_audit").map((c) => c.table))].sort();
  const rpcs = [...new Set(Object.values(contracts).filter((c) => c.kind === "rpc").map((c) => c.rpcName))].sort();
  const buckets = [...new Set(Object.values(contracts).filter((c) => c.kind === "storage").map((c) => c.bucket))].sort();
  const q = (value) => `\"${String(value).replaceAll('\\"','\\\\\"')}\"`;
  const tableList = tables.map(q).join(", ");
  const rpcList = rpcs.map((name) => `'${name.replaceAll("'", "''")}'`).join(", ");
  const bucketList = buckets.map((name) => `'${name.replaceAll("'", "''")}'`).join(", ");
  const sql = `begin;\n\n-- PR116 Admin OIDC boundary lockdown. PREPARED ONLY; do not apply to Production without Owner approval.\n-- Browser Admin writes have been migrated to Vercel typed routes -> PR116 OIDC Edge gateway.\n\n-- Six-state owner-approved application lifecycle.\nalter table public.applications drop constraint if exists applications_status_check;\nalter table public.applications add constraint applications_status_check\n  check (status in ('new','under_review','contacted','accepted','rejected','archived')) not valid;\nalter table public.applications validate constraint applications_status_check;\n\n-- Revoke direct browser-role DML only from tables whose Admin mutation paths are now gateway-owned.\ndo $pr116_tables$\ndeclare t text;\nbegin\n  foreach t in array array[${tableList}] loop\n    execute format('revoke insert, update, delete on table public.%I from authenticated', t);\n  end loop;\nend\n$pr116_tables$;\n\n-- Stateful Admin RPCs are gateway-only. Read-only exceptions are intentionally absent here.\ndo $pr116_rpcs$\ndeclare r record;\nbegin\n  for r in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname = any(array[${rpcList}]) loop\n    execute format('revoke execute on function %s from public, anon, authenticated', r.signature);\n    execute format('grant execute on function %s to service_role', r.signature);\n  end loop;\nend\n$pr116_rpcs$;\n\n-- Remove only authenticated write policies that explicitly target migrated Admin Storage buckets.\ndo $pr116_storage$\ndeclare p record;\nbegin\n  for p in\n    select policyname\n    from pg_policies\n    where schemaname='storage' and tablename='objects' and cmd in ('INSERT','UPDATE','DELETE','ALL')\n      and ('authenticated' = any(roles) or 'public' = any(roles))\n      and (coalesce(qual,'') || ' ' || coalesce(with_check,'')) ~ ${bucketList ? `'(${buckets.map((b)=>b.replace(/[.*+?^${}()|[\]\\]/g,'\\\\$&')).join('|')})'` : "'a^'"}\n  loop\n    execute format('drop policy %I on storage.objects', p.policyname);\n  end loop;\nend\n$pr116_storage$;\n\n-- Contract assertions: direct browser DML must be gone while service_role remains available.\ndo $pr116_assert$\ndeclare t text;\nbegin\n  foreach t in array array[${tableList}] loop\n    if has_table_privilege('authenticated', format('public.%I',t), 'INSERT')\n       or has_table_privilege('authenticated', format('public.%I',t), 'UPDATE')\n       or has_table_privilege('authenticated', format('public.%I',t), 'DELETE') then\n      raise exception 'pr116_authenticated_dml_still_exposed: %', t;\n    end if;\n  end loop;\nend\n$pr116_assert$;\n\ncommit;\n`;
  write(migrationPath, sql);
  const rollbackDir = path.join(ROOT, "supabase/rollback");
  fs.mkdirSync(rollbackDir, { recursive: true });
  const rollback = `-- PR116 emergency rollback companion. Run only after verified backup review and explicit Owner approval.\n-- Restores the pre-lockdown Supabase default browser DML grants for the exact migrated table set.\nbegin;\ndo $rollback$ declare t text; begin foreach t in array array[${tableList}] loop execute format('grant insert, update, delete on table public.%I to authenticated', t); end loop; end $rollback$;\n-- Storage policies and function grants must be restored from the verified pre-migration schema snapshot; they are intentionally not recreated generically.\nrollback; -- safety default: change to COMMIT only during an approved rollback procedure.\n`;
  write("supabase/rollback/20260810203000_pr116_admin_oidc_boundary_lockdown.rollback.sql", rollback);
}

console.log("PR116 final security hardening prepared.");
