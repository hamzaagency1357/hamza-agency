import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root=path.join(process.cwd(),"supabase","migrations");
const files=(await readdir(root)).filter(name=>name.includes("pr99")&&name.endsWith(".sql"));
const forbidden=[/\bdrop\s+table\b/i,/\btruncate\b/i,/\bdrop\s+column\b/i,/\balter\s+table\b[^;]*\brename\s+column\b/i];
const secrets=[/service[_-]?role/i,/eyJ[a-zA-Z0-9_-]{20,}/,/postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i];
const errors=[];
for(const file of files){const sql=await readFile(path.join(root,file),"utf8");for(const pattern of forbidden)if(pattern.test(sql))errors.push(`${file}: forbidden destructive SQL ${pattern}`);for(const pattern of secrets)if(pattern.test(sql))errors.push(`${file}: possible secret ${pattern}`);if(!/\bbegin\s*;/i.test(sql)||!/\bcommit\s*;/i.test(sql))errors.push(`${file}: migration should be transactional`);if(/\bdelete\s+from\b/i.test(sql)&&!(/version_history/i.test(sql)&&/offset\s+30/i.test(sql)))errors.push(`${file}: hard delete outside documented version retention`);}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}console.log(`Verified ${files.length} PR99 migrations: transactional, non-destructive, and secret-free.`);
