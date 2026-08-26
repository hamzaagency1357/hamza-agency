from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"expected block missing: {path}")
    target.write_text(text.replace(old, new))


replace_exact(
    "app/api/admin/mutations/workflows/route.ts",
    """async function invoke(\n  request: Request,\n  token: string,\n  action: Pr116AdminGatewayAction,\n  payload: Record<string, unknown>,\n) {\n  try {\n    const result = await callPr116AdminOidcGateway<{ ok: true; data: unknown }>(request, token, action, payload);\n""",
    """async function invoke(\n  token: string,\n  action: Pr116AdminGatewayAction,\n  payload: Record<string, unknown>,\n) {\n  try {\n    const result = await callPr116AdminOidcGateway<{ ok: true; data: unknown }>(token, action, payload);\n""",
)

workflows = Path("app/api/admin/mutations/workflows/route.ts")
text = workflows.read_text()
if "invoke(request, " not in text:
    raise SystemExit("expected workflow invoke call sites missing")
workflows.write_text(text.replace("invoke(request, ", "invoke("))

replace_exact(
    "app/api/admin/translations/sync/route.ts",
    """  const { data, error } = await client\n    .from(\"admin_users\")\n    .select(\"email, role, is_active\")\n    .ilike(\"email\", user.email)\n    .maybeSingle();\n""",
    """  const { data, error } = await client\n    .from(\"admin_users\")\n    .select(\"email, role, is_active\")\n    .eq(\"user_id\", user.id)\n    .maybeSingle();\n""",
)

path = Path("tests/auth-hardening.test.mjs")
text = path.read_text()
old = """import test from \"node:test\";\n\nconst ROOT = process.cwd();\nconst read = (file) => fs.readFileSync(path.join(ROOT, file), \"utf8\");\n\nfunction evaluateAdminPermission(role, module, action, permission) {\n  if (role === \"super_admin\") return true;\n  if (role === \"program_admin\" && !new Set([\"dashboard\", \"applications\", \"programs\"]).has(module)) return false;\n  if (!permission) return false;\n  return permission.can_manage === true || permission[action] === true;\n}\n"""
new = """import test from \"node:test\";\nimport { evaluateAdminPermission } from \"../lib/adminPermissionPolicy.ts\";\n\nconst ROOT = process.cwd();\nconst read = (file) => fs.readFileSync(path.join(ROOT, file), \"utf8\");\n"""
if old not in text:
    raise SystemExit("expected duplicated permission policy missing")
path.write_text(text.replace(old, new))
