import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "supabase/migrations/20260730232500_pr101_product_expansion_foundation.sql",
  "supabase/migrations/20260730233500_pr101_product_expansion_operations.sql",
  "supabase/migrations/20260730234500_pr101_product_expansion_hardening.sql",
  "supabase/migrations/20260730235500_pr101_product_expansion_runtime_fixes.sql",
  "lib/productExpansion/providerAdapters.ts",
  "lib/productExpansion/serverTenantRuntime.ts",
  "lib/server/pr101OidcGateway.ts",
  "supabase/functions/pr101-vercel-oidc-gateway/index.ts",
  "components/admin/ProductExpansionConsole.tsx",
  "components/portals/PortalDashboard.tsx",
  "components/portals/PortalModule.tsx",
  "components/marketplace/MarketplaceClient.tsx",
  "components/CookieConsent.tsx",
  "app/marketplace/page.tsx",
  "app/offline/page.tsx",
  "app/status/page.tsx",
];

const errors = [];
for (const file of requiredFiles) {
  try { await access(path.join(root, file)); } catch { errors.push(`missing required product expansion file: ${file}`); }
}

const migrations = await Promise.all(
  requiredFiles
    .filter((file) => file.includes("supabase/migrations/"))
    .map(async (file) => [file, await readFile(path.join(root, file), "utf8")]),
);

const destructive = [/\bdrop\s+table\b/i, /\btruncate\b/i, /\bdrop\s+column\b/i, /\bdelete\s+from\s+(?!public\.pr101_gateway_nonces\b)/i];
const secretPatterns = [
  /(?:SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY)\s*[:=]\s*["'][^"'\n]{10,}["']/i,
  /postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i,
  /eyJ[A-Za-z0-9_-]{40,}/,
];

for (const [file, sql] of migrations) {
  for (const pattern of destructive) if (pattern.test(sql)) errors.push(`${file}: destructive SQL rejected (${pattern})`);
  for (const pattern of secretPatterns) if (pattern.test(sql)) errors.push(`${file}: possible embedded secret rejected (${pattern})`);
  const createdTables = [...sql.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
  for (const table of createdTables) {
    const combined = migrations.map(([, text]) => text).join("\n");
    if (!new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(combined)
      && !new RegExp(`foreach[\\s\\S]*?['\"]${table}['\"][\\s\\S]*?enable row level security`, "i").test(combined)) {
      errors.push(`${file}: ${table} is created without an RLS enablement record`);
    }
  }
}

const allSql = migrations.map(([, sql]) => sql).join("\n");
const requiredSqlEvidence = [
  /create\s+table[^;]+public\.tenants/i,
  /create\s+table[^;]+public\.tenant_memberships/i,
  /create\s+table[^;]+public\.tasks/i,
  /create\s+table[^;]+public\.sla_policies/i,
  /create\s+table[^;]+public\.workflow_definitions/i,
  /create\s+table[^;]+public\.marketplace_orders/i,
  /create\s+table[^;]+public\.payment_webhook_events/i,
  /create\s+table[^;]+public\.privacy_requests/i,
  /create\s+table[^;]+public\.user_sessions/i,
  /create\s+table[^;]+public\.incidents/i,
  /private\.has_tenant_role/i,
  /resolve_public_tenant_runtime/i,
  /create_marketplace_order/i,
  /pr101_oidc_gateway/i,
  /revoke\s+all\s+on\s+function\s+public\.pr101_oidc_gateway[\s\S]+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
];
for (const pattern of requiredSqlEvidence) if (!pattern.test(allSql)) errors.push(`missing migration evidence: ${pattern}`);

if (/custom\s+(?:css|javascript|js)\b/i.test(allSql)) errors.push("untrusted custom CSS/JS support is forbidden");
if (/mode\s+text[^;]+default\s+'live'/i.test(allSql)) errors.push("provider modes must not default to live");
if (/\b(?:crypto|usdt|bitcoin|ethereum)\b/i.test(allSql)) errors.push("crypto payment activation is outside the approved scope");

const gateway = await readFile(path.join(root, "supabase/functions/pr101-vercel-oidc-gateway/index.ts"), "utf8");
for (const pattern of [/jwtVerify\(/, /issuer:\s*ISSUER/, /audience:\s*AUDIENCE/, /owner_id/, /project_id/, /bodyDigest/, /invalid_oidc_claims/]) {
  if (!pattern.test(gateway)) errors.push(`OIDC gateway lacks ${pattern}`);
}

const serviceWorker = await readFile(path.join(root, "public/sw.js"), "utf8");
for (const privatePrefix of ["/admin", "/portal", "/api", "/auth", "/application-status", "/service-status"]) {
  if (!serviceWorker.includes(privatePrefix)) errors.push(`service worker cache denylist lacks ${privatePrefix}`);
}
if (!/authorization/.test(serviceWorker) || !/cookie/.test(serviceWorker)) errors.push("service worker must reject authenticated requests");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`PR101 product expansion gate passed: ${requiredFiles.length} files, ${migrations.length} additive migrations, OIDC/provider/PWA safeguards verified.`);
