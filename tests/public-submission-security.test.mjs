import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const roots=["app","components"];
const sensitive=["agency_applications","service_requests","job_applications","contact_messages","ai_conversations","ai_unanswered_questions"];
async function files(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())result.push(...await files(full));else if(/\.(?:ts|tsx|js|jsx)$/.test(entry.name))result.push(full)}return result}

test("public client components never insert directly into sensitive tables",async()=>{
 const violations=[];
 for(const root of roots){for(const file of await files(path.join(process.cwd(),root))){const relative=path.relative(process.cwd(),file).replaceAll(path.sep,"/");if(relative.startsWith("app/admin/"))continue;const source=await readFile(file,"utf8");if(!/^\s*["']use client["'];?/m.test(source))continue;for(const table of sensitive){const pattern=new RegExp(`\\.from\\(\\s*["']${table}["']\\s*\\)[\\s\\S]{0,500}?\\.insert\\(`,"i");if(pattern.test(source))violations.push(`${relative}: ${table}`)}}}
 assert.deepEqual(violations,[]);
});
