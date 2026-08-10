import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const basePath = path.join(ROOT, "scripts/pr116-browser-mutation-codemod.mjs");
const v2Path = path.join(ROOT, "scripts/pr116-browser-mutation-codemod-v2.mjs");

let base = fs.readFileSync(basePath, "utf8");
const marker = 'const failures = [];\n';
if (!base.includes(marker)) throw new Error("v3 base marker missing");
base = base.replace(marker, marker + `const FIELD_OVERRIDES = {\n  \"app/admin/faqs/page.tsx|faqs|update\": [\"question\",\"answer\",\"category\",\"sort_order\",\"is_published\"],\n  \"app/admin/faqs/page.tsx|faqs|insert\": [\"question\",\"answer\",\"category\",\"sort_order\",\"is_published\"],\n  \"app/admin/jobs/page.tsx|jobs|update\": [\"title\",\"slug\",\"department\",\"location\",\"job_type\",\"short_description\",\"description\",\"requirements\",\"status\",\"sort_order\",\"is_visible\"],\n  \"app/admin/jobs/page.tsx|job_applications|update\": [\"status\",\"internal_notes\"],\n  \"app/admin/service-requests/page.tsx|service_requests|update\": [\"status\",\"internal_notes\"],\n  \"app/admin/visual-experience/page.tsx|visual_experience_settings|update\": [\"preset_name\",\"background\",\"motion\",\"glow\",\"glass\",\"animated_cards\",\"cards_scope\",\"cards\",\"notes\",\"status\",\"apply_to_public\",\"approved_by\",\"approved_at\",\"updated_by\"],\n  \"app/admin/visual-experience/page.tsx|visual_experience_settings|insert\": [\"preset_name\",\"background\",\"motion\",\"glow\",\"glass\",\"animated_cards\",\"cards_scope\",\"cards\",\"notes\",\"status\",\"apply_to_public\",\"approved_by\",\"approved_at\",\"updated_by\",\"created_by\"],\n  \"app/admin/white-label/page.tsx|white_label_projects|update\": [\"agency_name\",\"owner_name\",\"owner_email\",\"domain\",\"default_language\",\"enabled_languages\",\"primary_color\",\"accent_color\",\"package_type\",\"status\",\"notes\",\"checklist\",\"updated_by\"],\n  \"app/admin/white-label/page.tsx|white_label_projects|insert\": [\"agency_name\",\"owner_name\",\"owner_email\",\"domain\",\"default_language\",\"enabled_languages\",\"primary_color\",\"accent_color\",\"package_type\",\"status\",\"notes\",\"checklist\",\"updated_by\",\"created_by\"]\n};\n`);
const fieldsBefore = '              const fields = mutation.name === "delete" ? new Set() : valueFields(mutation.args[0], declarations);\n              if (mutation.name !== "delete" && fields.size === 0) failures.push(`${file}: could not infer mutation fields for ${table}.${mutation.name} from ${mutation.args[0] ? sourceText(sf, mutation.args[0]) : "<missing>"}`);';
const fieldsAfter = '              const fields = mutation.name === "delete" ? new Set() : valueFields(mutation.args[0], declarations);\n              const override = FIELD_OVERRIDES[`${file}|${table}|${mutation.name}`];\n              if (mutation.name !== "delete" && override) for (const field of override) fields.add(field);\n              if (mutation.name !== "delete" && fields.size === 0) failures.push(`${file}: could not infer mutation fields for ${table}.${mutation.name} from ${mutation.args[0] ? sourceText(sf, mutation.args[0]) : "<missing>"}`);';
if (!base.includes(fieldsBefore)) throw new Error("v3 fields marker missing");
base = base.replace(fieldsBefore, fieldsAfter);
fs.writeFileSync(basePath, base);

const run = spawnSync(process.execPath, [v2Path], { cwd: ROOT, stdio: "inherit" });
if (run.status !== 0) process.exit(run.status || 2);
