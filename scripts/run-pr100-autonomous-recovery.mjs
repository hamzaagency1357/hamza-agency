import fs from "node:fs";
import { pathToFileURL } from "node:url";

const file = "scripts/pr100-autonomous-recovery.mjs";
let source = fs.readFileSync(file, "utf8");
source = source.replace(
  `'  "contact_lookup",\\n  "ai_guard",\`oidc-actions:${'${file}'}\`);`,
  `'  "contact_lookup",\\n  "ai_guard",',\`oidc-actions:${'${file}'}\`);`
);
fs.writeFileSync(file, source);
await import(`${pathToFileURL(process.cwd() + "/" + file).href}?v=${Date.now()}`);
