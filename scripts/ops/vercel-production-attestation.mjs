import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const VERCEL_APP_SLUG = "vercel";
const PRODUCTION_ENVIRONMENT = "production";

function fail(message) {
  throw new Error(`[vercel production attestation] ${message}`);
}

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function newest(records) {
  if (!Array.isArray(records) || records.length === 0) return null;
  return [...records].sort((left, right) => {
    const timeDelta = timestamp(right.updated_at || right.created_at) - timestamp(left.updated_at || left.created_at);
    if (timeDelta !== 0) return timeDelta;
    return Number(right.id || 0) - Number(left.id || 0);
  })[0];
}

export function isTrustedVercelProductionDeployment(deployment) {
  const environment = typeof deployment?.environment === "string" ? deployment.environment.toLowerCase() : "";
  return Boolean(
    deployment &&
      deployment.production_environment === true &&
      environment === PRODUCTION_ENVIRONMENT &&
      deployment.performed_via_github_app?.slug === VERCEL_APP_SLUG
  );
}

export function validateProductionDeploymentEvidence(evidence, expectedSha) {
  if (!/^[0-9a-f]{40}$/i.test(expectedSha || "")) fail("expected Git SHA must be a full commit SHA");
  if (!evidence || evidence.source !== "github-vercel-deployment") fail("trusted Production deployment evidence is missing");
  if (evidence.trustedApp !== VERCEL_APP_SLUG) fail("Production deployment was not created by the trusted Vercel GitHub App");
  if (evidence.productionEnvironment !== true || String(evidence.environment || "").toLowerCase() !== PRODUCTION_ENVIRONMENT) {
    fail("resolved Vercel deployment is not Production");
  }
  if (evidence.readyState !== "READY") fail(`Vercel Production deployment is not READY: ${evidence.readyState || "missing"}`);
  if (!/^[0-9a-f]{40}$/i.test(evidence.gitSha || "")) fail("Vercel Production deployment Git SHA is missing or invalid");
  if (evidence.gitSha.toLowerCase() !== expectedSha.toLowerCase()) {
    fail(`Vercel Production deployment Git SHA mismatch: expected ${expectedSha}, received ${evidence.gitSha}`);
  }
  return true;
}

export function buildProductionDeploymentEvidence(deployment, status, expectedSha) {
  if (!isTrustedVercelProductionDeployment(deployment)) fail("trusted Vercel Production deployment could not be resolved");
  const state = String(status?.state || "").toLowerCase();
  const evidence = {
    source: "github-vercel-deployment",
    deploymentId: Number(deployment.id || 0),
    statusId: Number(status?.id || 0),
    trustedApp: deployment.performed_via_github_app?.slug || "",
    environment: deployment.environment || "",
    productionEnvironment: deployment.production_environment === true,
    readyState: state === "success" ? "READY" : (state ? state.toUpperCase() : ""),
    gitSha: typeof deployment.sha === "string" ? deployment.sha : "",
  };
  validateProductionDeploymentEvidence(evidence, expectedSha);
  return evidence;
}

async function githubJson(path, token) {
  const response = await fetch(`${process.env.GITHUB_API_URL || "https://api.github.com"}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) fail(`GitHub deployment evidence lookup failed with HTTP ${response.status}`);
  return response.json();
}

export async function resolveCurrentProductionDeployment({ repository, expectedSha, token }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || "")) fail("GitHub repository identity is invalid");
  if (!token) fail("GitHub deployment evidence token is missing");
  if (!/^[0-9a-f]{40}$/i.test(expectedSha || "")) fail("expected Git SHA must be a full commit SHA");

  const deployments = await githubJson(
    `/repos/${repository}/deployments?environment=Production&per_page=100`,
    token
  );
  if (!Array.isArray(deployments)) fail("GitHub deployments response is invalid");

  const current = newest(deployments.filter(isTrustedVercelProductionDeployment));
  if (!current) fail("trusted Vercel Production deployment could not be resolved");

  const statuses = await githubJson(`/repos/${repository}/deployments/${current.id}/statuses?per_page=100`, token);
  if (!Array.isArray(statuses)) fail("GitHub deployment statuses response is invalid");
  const latestStatus = newest(statuses);
  if (!latestStatus) fail("Vercel Production deployment status is missing");

  return buildProductionDeploymentEvidence(current, latestStatus, expectedSha);
}

async function main() {
  const outputPath = process.env.FORWARD_VERCEL_JSON || "";
  if (!outputPath) fail("FORWARD_VERCEL_JSON is missing");
  const evidence = await resolveCurrentProductionDeployment({
    repository: process.env.GITHUB_REPOSITORY || "",
    expectedSha: process.env.EXPECTED_SHA || "",
    token: process.env.GITHUB_TOKEN || "",
  });
  await writeFile(outputPath, `${JSON.stringify(evidence)}\n`, "utf8");
  console.log(JSON.stringify({
    ok: true,
    source: evidence.source,
    readyState: evidence.readyState,
    gitSha: evidence.gitSha,
    deploymentId: evidence.deploymentId,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
