import { access, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "supabase/migrations/20260730232500_pr101_product_expansion_foundation.sql",
  "supabase/migrations/20260730233500_pr101_product_expansion_operations.sql",
  "supabase/migrations/20260730234000_pr101_kpi_schema_guard.sql",
  "supabase/migrations/20260730234500_pr101_product_expansion_hardening.sql",
  "supabase/migrations/20260730235500_pr101_product_expansion_runtime_fixes.sql",
  "supabase/migrations/20260730235900_pr101_tenant_admin_permissions.sql",
  "supabase/migrations/20260731001000_pr101_portal_provider_session_policies.sql",
  "supabase/migrations/20260731002000_pr101_kpi_notifications_workflow_runtime.sql",
  "supabase/migrations/20260731003000_pr101_security_tenant_finalization.sql",
  "lib/productExpansion/providerAdapters.ts",
  "lib/productExpansion/serverTenantRuntime.ts",
  "lib/server/pr101OidcGateway.ts",
  "lib/server/supabaseUser.ts",
  "supabase/functions/pr101-vercel-oidc-gateway/index.ts",
  "components/admin/TenantGovernanceConsole.tsx",
  "components/admin/ProductOperationsConsole.tsx",
  "components/admin/ProductAnalyticsConsole.tsx",
  "components/portals/PortalDashboard.tsx",
  "components/portals/PortalModule.tsx",
  "components/portals/PortalAccountModule.tsx",
  "components/portals/PortalNotificationCenter.tsx",
  "components/portals/PortalSessionCenter.tsx",
  "components/marketplace/MarketplaceClient.tsx",
  "components/ai/ProductAiAssistant.tsx",
  "components/CookieConsent.tsx",
  "app/api/product-expansion/ai/route.ts",
  "app/api/product-expansion/consent/route.ts",
  "app/api/product-expansion/providers/queue/route.ts",
  "app/api/product-expansion/payments/[provider]/webhook/route.ts",
  "app/api/product-expansion/health/route.ts",
  "app/api/product-expansion/sessions/register/route.ts",
  "app/marketplace/page.tsx",
  "app/offline/page.tsx",
  "app/status/page.tsx",
  "mobile/capacitor.config.json",
  "mobile/configure-native.mjs",
  ".github/workflows/pr101-mobile-build.yml",
];

const errors = [];
for (const file of requiredFiles) {
  try { await access(path.join(root, file)); } catch { errors.push(`missing required product expansion file: ${file}`); }
}

const migrations = await Promise.all(
  requiredFiles.filter((file) => file.includes("supabase/migrations/")).map(async (file) => [file, await readFile(path.join(root, file), "utf8")]),
);
const allSql = migrations.map(([, sql]) => sql).join("\n");

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
    const direct = new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i");
    const arrayLoop = new RegExp(`array\\[[\\s\\S]*?['"]${table}['"][\\s\\S]*?enable row level security`, "i");
    if (!direct.test(allSql) && !arrayLoop.test(allSql)) errors.push(`${file}: ${table} is created without an RLS enablement record`);
  }
}

const requiredSqlEvidence = [
  /create\s+table[^;]+public\.tenants/i,
  /create\s+table[^;]+public\.tenant_memberships/i,
  /create\s+table[^;]+public\.tasks/i,
  /create\s+table[^;]+public\.task_attachments/i,
  /create\s+table[^;]+public\.sla_policies/i,
  /create\s+table[^;]+public\.workflow_definitions/i,
  /create\s+table[^;]+public\.workflow_steps/i,
  /create\s+table[^;]+public\.marketplace_orders/i,
  /create\s+table[^;]+public\.marketplace_listing_translations/i,
  /create\s+table[^;]+public\.payment_webhook_events/i,
  /create\s+table[^;]+public\.whatsapp_templates/i,
  /create\s+table[^;]+public\.ai_sessions/i,
  /create\s+table[^;]+public\.privacy_requests/i,
  /create\s+table[^;]+public\.consent_records/i,
  /create\s+table[^;]+public\.user_sessions/i,
  /create\s+table[^;]+public\.incidents/i,
  /create\s+table[^;]+public\.product_kpi_daily/i,
  /private\.has_tenant_role/i,
  /private\.can_manage_tenant_member/i,
  /resolve_public_tenant_runtime/i,
  /create_marketplace_order/i,
  /revoke_own_platform_session/i,
  /refresh_product_kpis/i,
  /start_workflow_run/i,
  /get_public_incident_status/i,
  /tenant_backfill_incomplete/i,
  /pr101_oidc_gateway/i,
  /revoke\s+all\s+on\s+function\s+public\.pr101_oidc_gateway[\s\S]+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
];
for (const pattern of requiredSqlEvidence) if (!pattern.test(allSql)) errors.push(`missing migration evidence: ${pattern}`);

if (/custom\s+(?:css|javascript|js)\b/i.test(allSql)) errors.push("untrusted custom CSS/JS support is forbidden");
if (/mode\s+text[^;]+default\s+'live'/i.test(allSql)) errors.push("provider modes must not default to live");
if (/\b(?:usdt|bitcoin|ethereum)\b/i.test(allSql)) errors.push("crypto payment activation is outside the approved scope");
if (/card_number|\bcvv\b|\bcvc\b/i.test(allSql)) errors.push("payment schema must not store card data");
if (/create\s+policy\s+"public reads active incidents"/i.test(allSql) && !/drop\s+policy\s+if\s+exists\s+"public reads active incidents"/i.test(allSql)) errors.push("incident internals must not be directly exposed to anon");

const gateway = await readFile(path.join(root, "supabase/functions/pr101-vercel-oidc-gateway/index.ts"), "utf8");
for (const pattern of [/jwtVerify\(/, /issuer:\s*ISSUER/, /audience:\s*AUDIENCE/, /owner_id/, /project_id/, /bodyDigest/, /invalid_oidc_claims/]) {
  if (!pattern.test(gateway)) errors.push(`OIDC gateway lacks ${pattern}`);
}

const providerAdapters = await readFile(path.join(root, "lib/productExpansion/providerAdapters.ts"), "utf8");
for (const pattern of [/redactPii/, /detectsPromptInjection/, /validateWhatsAppTemplate/, /safePushPayload/, /verifySignedWebhook/, /providerDisabled/]) {
  if (!pattern.test(providerAdapters)) errors.push(`provider adapter lacks ${pattern}`);
}

const serviceWorker = await readFile(path.join(root, "public/sw.js"), "utf8");
for (const privatePrefix of ["/admin", "/portal", "/api", "/auth", "/application-status", "/service-status"]) {
  if (!serviceWorker.includes(privatePrefix)) errors.push(`service worker cache denylist lacks ${privatePrefix}`);
}
if (!/authorization/.test(serviceWorker) || !/cookie/.test(serviceWorker) || !/no-store/.test(serviceWorker)) errors.push("service worker must reject authenticated or non-cacheable responses");

const mobileConfig = JSON.parse(await readFile(path.join(root, "mobile/capacitor.config.json"), "utf8"));
if (mobileConfig?.server?.cleartext !== false || !String(mobileConfig?.server?.url || "").startsWith("https://")) errors.push("mobile wrapper must use restricted HTTPS transport");
if (JSON.stringify(mobileConfig).match(/secret|service_role|oidc_token/i)) errors.push("mobile configuration must not reference server secrets");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`PR101 product expansion gate passed: ${requiredFiles.length} files, ${migrations.length} additive migrations, tenant/RLS/OIDC/provider/PWA/mobile safeguards verified.`);
