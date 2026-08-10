import fs from "node:fs";

const file="scripts/pr116-owner-final-delta-closeout.mjs";
let source=fs.readFileSync(file,"utf8");
const unsafe='["Slug","الرابط المختصر"]';
const safe='[\'<Field label="Slug"\',\'<Field label="الرابط المختصر"\']';
if(!source.includes(unsafe)) throw new Error("Owner delta Slug replacement marker missing");
source=source.replace(unsafe,safe);
fs.writeFileSync(file,source);
await import("./pr116-owner-final-delta-closeout-v2.mjs");
console.log("PR116 Owner Final Delta v3 completed with identifier-safe wording changes.");
