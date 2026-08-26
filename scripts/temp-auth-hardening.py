from pathlib import Path

path = Path("supabase/functions/pr116-admin-oidc-gateway/index.ts")
text = path.read_text()
old = '  if (!row) return admin.role === "deputy_super_admin";\n'
new = '  if (!row) return false;\n'
if old not in text:
    raise SystemExit("expected implicit deputy permission fallback missing")
path.write_text(text.replace(old, new, 1))
