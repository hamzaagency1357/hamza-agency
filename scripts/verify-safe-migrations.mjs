import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "supabase", "migrations");
const files = (await readdir(root)).filter((name) => name.endsWith(".sql"));
const destructive = [/\bdrop\s+table\b/i, /\btruncate\b/i, /\bdelete\s+from\b/i, /\bdrop\s+column\b/i];
const secretPatterns = [/service[_-]?role/i, /eyJ[a-zA-Z0-9_-]{20,}/, /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i];
const errors = [];
for (const file of files) {
  const sql = await readFile(path.join(root, file), "utf8");
  for (const pattern of destructive) if (pattern.test(sql)) errors.push(`${file}: forbidden destructive SQL ${pattern}`);
  for (const pattern of secretPatterns) if (pattern.test(sql)) errors.push(`${file}: possible secret ${pattern}`);
  if (!/\bbegin\s*;/i.test(sql) || !/\bcommit\s*;/i.test(sql)) errors.push(`${file}: migration should be transactional`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`Verified ${files.length} migrations: no destructive statements or embedded secrets.`);
