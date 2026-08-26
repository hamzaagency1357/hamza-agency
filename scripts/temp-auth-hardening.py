from pathlib import Path


def replace_exact(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    if old not in text:
        raise SystemExit(f"expected block missing: {path}")
    target.write_text(text.replace(old, new))


replace_exact(
    "lib/adminAccess.ts",
    '''  if (!data && !queryError && profile.email) {
    const fallback = await supabase
      .from("admin_permissions")
      .select(fields)
      .is("admin_user_id", null)
      .ilike("admin_email", profile.email.trim().toLowerCase())
      .eq("module_key", module)
      .maybeSingle();

    data = fallback.data as Record<string, unknown> | null;
    queryError = fallback.error;
  }

''',
    "",
)
replace_exact(
    "lib/adminAccess.ts",
    '''  const email = session.user.email?.trim() || "";

  if (!data && !queryError && email) {
    const fallback = await supabase
      .from("admin_users")
      .select(fields)
      .is("user_id", null)
      .ilike("email", email)
      .maybeSingle();

    data = fallback.data;
    queryError = fallback.error;
  }

''',
    '''  const email = session.user.email?.trim() || "";

''',
)
replace_exact(
    "lib/server/adminMutationBoundary.ts",
    '''  let row = primary.ok && Array.isArray(primary.data) ? primary.data[0] : null;

  if (!row && user.email) {
    const fallback = await supabaseRestAsUser<AdminUserRow[]>(
      `/admin_users?select=${fields}&user_id=is.null&email=ilike.${encodeURIComponent(user.email)}&limit=1`,
      user,
    );
    row = fallback.ok && Array.isArray(fallback.data) ? fallback.data[0] : null;
  }

''',
    '''  const row = primary.ok && Array.isArray(primary.data) ? primary.data[0] : null;

''',
)
replace_exact(
    "lib/server/adminMutationBoundary.ts",
    '''  let permission = primary.ok && Array.isArray(primary.data) ? primary.data[0] : null;
  if (!permission && actor.profile.email) {
    const fallback = await supabaseRestAsUser<PermissionRow[]>(
      `/admin_permissions?select=${fields}&admin_user_id=is.null&admin_email=ilike.${encodeURIComponent(actor.profile.email)}&module_key=eq.${encodeURIComponent(module)}&limit=1`,
      actor.user,
    );
    permission = fallback.ok && Array.isArray(fallback.data) ? fallback.data[0] : null;
  }

''',
    '''  const permission = primary.ok && Array.isArray(primary.data) ? primary.data[0] : null;

''',
)
replace_exact(
    "lib/server/pr116AdminOidcGateway.ts",
    '  const workloadToken = request.headers.get("x-vercel-oidc-token") || process.env.VERCEL_OIDC_TOKEN || "";\n',
    '  const workloadToken = process.env.VERCEL_OIDC_TOKEN || "";\n',
)
replace_exact(
    "supabase/functions/pr116-admin-oidc-gateway/index.ts",
    '''  let rows = primary.ok ? await primary.json().catch(() => []) as Record<string, unknown>[] : [];
  let row = rows[0] || null;
  if (!row && user.email) {
    const fallback = await serviceFetch(supabaseUrl, serviceRole, `/admin_users?select=${fields}&user_id=is.null&email=ilike.${encodeURIComponent(user.email)}&limit=1`);
    rows = fallback.ok ? await fallback.json().catch(() => []) as Record<string, unknown>[] : [];
    row = rows[0] || null;
  }
''',
    '''  const rows = primary.ok ? await primary.json().catch(() => []) as Record<string, unknown>[] : [];
  const row = rows[0] || null;
''',
)
replace_exact(
    "supabase/functions/pr116-admin-oidc-gateway/index.ts",
    '''  let rows = primary.ok ? await primary.json().catch(() => []) as Record<string, unknown>[] : [];
  let row = rows[0] || null;
  if (!row && admin.email) {
    const fallback = await serviceFetch(supabaseUrl, serviceRole, `/admin_permissions?select=${fields}&admin_user_id=is.null&admin_email=ilike.${encodeURIComponent(admin.email)}&module_key=eq.${encodeURIComponent(module)}&limit=1`);
    rows = fallback.ok ? await fallback.json().catch(() => []) as Record<string, unknown>[] : [];
    row = rows[0] || null;
  }
''',
    '''  const rows = primary.ok ? await primary.json().catch(() => []) as Record<string, unknown>[] : [];
  const row = rows[0] || null;
''',
)
