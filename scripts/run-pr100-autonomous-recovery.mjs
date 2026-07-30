import fs from "node:fs";
import { pathToFileURL } from "node:url";

const scriptPath = "scripts/pr100-autonomous-recovery.mjs";
let source = fs.readFileSync(scriptPath, "utf8");
const broken = '"ai_guard",`oidc-actions:${file}`);';
const fixed = '"ai_guard",\',`oidc-actions:${file}`);';
if (!source.includes(broken)) throw new Error("recovery_syntax_marker_missing");
source = source.replace(broken, fixed);
fs.writeFileSync(scriptPath, source);
await import(`${pathToFileURL(process.cwd() + "/" + scriptPath).href}?v=${Date.now()}`);
