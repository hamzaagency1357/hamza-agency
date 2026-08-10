import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");
const write = (file, value) => fs.writeFileSync(path.join(ROOT, file), value);

// Reapply the full deterministic v1 transformation in the runner worktree.
execFileSync(process.execPath, [path.join(ROOT, "scripts/pr116-final-admin-surface-closeout.mjs")], { stdio: "inherit" });

// Close the two formatting variants missed by the first pass.
{
  const file = "app/admin/media/page.tsx";
  let source = read(file);
  source = source.replace('const BUCKET="media-library";', '');
  write(file, source);
}

{
  const file = "app/admin/sections/page.tsx";
  let source = read(file);
  const marker = `  ) {\n    if (!isSupabaseConfigured || !supabase) return;\n\n    await Promise.resolve({ data: null, error: null });\n  }`;
  const replacement = `  ) {\n    void action;\n    void entityType;\n    void entityId;\n    void oldData;\n    void newData;\n    if (!isSupabaseConfigured || !supabase) return;\n\n    await Promise.resolve({ data: null, error: null });\n  }`;
  if (!source.includes(marker)) throw new Error("sections logActivity marker not found");
  source = source.replace(marker, replacement);
  write(file, source);
}

console.log("PR116 v2 residual closeout patch applied.");
