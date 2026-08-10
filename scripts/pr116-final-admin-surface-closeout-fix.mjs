import fs from "node:fs";

function patch(file, mutate) {
  const source = fs.readFileSync(file, "utf8");
  const next = mutate(source);
  if (next === source) throw new Error(`No focused change applied to ${file}`);
  fs.writeFileSync(file, next);
}

patch("app/admin/media/page.tsx", (source) => source.replace('const BUCKET="media-library";const MAX=', 'const MAX='));
patch("app/admin/sections/page.tsx", (source) => source.replace(
`  ) {\n    if (!isSupabaseConfigured || !supabase) return;\n\n    await Promise.resolve({ data: null, error: null });\n  }`,
`  ) {\n    void action;\n    void entityType;\n    void entityId;\n    void oldData;\n    void newData;\n    if (!isSupabaseConfigured || !supabase) return;\n\n    await Promise.resolve({ data: null, error: null });\n  }`,
));

console.log("Residual PR116 focused lint warnings patched.");
