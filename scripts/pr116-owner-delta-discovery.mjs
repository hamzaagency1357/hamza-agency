import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const exts=new Set([".ts",".tsx",".js",".mjs",".sql"]);
const skip=new Set(["node_modules",".next",".git"]);
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(skip.has(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else if(exts.has(path.extname(ent.name)))files.push(path.relative(root,p).replaceAll("\\","/"));}}
walk(root);
const groups={
  publicMutation: [/createClient\(/,/\.from\([^\n]+\)\s*\.(insert|update|upsert|delete)\(/,/\.rpc\(/,/\.storage\.from\(/],
  ownerDelta: [/7000\+/,/50.*فرصة|فرصة.*50|monthly success|aylık.*50/i,/digital-services/i,/\/apply\b/,/navigation/i,/statistics|stats/i,/dock/i,/admin\/blog/i,/Product Operations|Infrastructure Settings|Product Expansion|Multi-Tenant|Tenant Branding|Feature Flags|MIME Magic Bytes|Secure Image Library|Supabase Storage|Page Slug|Type \/ MIME|API Docs|Public API|Snapshot|Console/i],
};
for(const [group,patterns] of Object.entries(groups)){
 console.log(`\n=== ${group} ===`);
 for(const file of files){const text=fs.readFileSync(path.join(root,file),"utf8");if(patterns.some(r=>r.test(text))){const lines=text.split("\n");const hits=[];for(let i=0;i<lines.length;i++)if(patterns.some(r=>{r.lastIndex=0;return r.test(lines[i])}))hits.push(`${i+1}:${lines[i].trim().slice(0,220)}`);if(hits.length)console.log(`\n## ${file}\n${hits.slice(0,30).join("\n")}`);}}
}
