import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { isCommittedRuntimeEnvFile, scanText } from "./secret-scan-core.mjs";

const ignored = new Set(["node_modules", ".git", ".next"]);
const readableExtensions = /\.(?:js|mjs|cjs|ts|tsx|jsx|json|yml|yaml|sql|md|txt|toml)$/i;
const errors = [];

async function walk(dir) {
  for (const name of await readdir(dir)) {
    if (ignored.has(name)) continue;
    const full = path.join(dir, name);
    const info = await stat(full);
    if (info.isDirectory()) {
      await walk(full);
      continue;
    }

    const relative = path.relative(process.cwd(), full);
    if (!readableExtensions.test(name) && !name.toLowerCase().startsWith(".env")) continue;

    const text = await readFile(full, "utf8");
    errors.push(...scanText(relative, text));

    if (isCommittedRuntimeEnvFile(relative) && !errors.some((error) => error.startsWith(`${relative}:`))) {
      errors.push(`${relative}: runtime env file must not be committed`);
    }
  }
}

await walk(process.cwd());
if (errors.length) {
  console.error([...new Set(errors)].join("\n"));
  process.exit(1);
}
console.log("Secret verification passed: templates and references are allowed; concrete secrets and client exposure are blocked.");
