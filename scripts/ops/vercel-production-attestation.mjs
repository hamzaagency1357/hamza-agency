import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const PRODUCTION_ENVIRONMENT = "production";
const VERCEL_STATUS_CONTEXT = "Vercel";
const VERCEL_INSPECTOR_HOST = "vercel.com";

function fail(message) {
  throw new Error(`[vercel production attestation] ${message}`);
}

function isFullGitSha(value) {
  return /^[0-9a-f]{40}$/i.test(value || "");
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

function normalizeVercelInspectorUrl(value, repository) {
  let parsed;
  try {
    parsed = new URL(value || "");
  } catch {
    return "";
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== VERCEL_INSPECTOR_HOST) return "";
  if (parsed.username || parsed.password || parsed.search || parsed.hash) return "";
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 3) return "";
  const [, project, deploymentIdentity] = segments;
  const repoName = String(repository || "").split("/")[1] || "";
  if (!repoName || project !== repoName) return "";
  if (!/^[A-Za-z0-9_-]+$/.test(deploymentIdentity)) return "";
  return `https://${VERCEL_INSPECTOR_HOST}/${segments.join("/")}`;
}

export function isTrustedVercelProductionDeployment(deployment, expectedSha = deployment?.sha) {
  const environment = typeof deployment?.environment === "string" ? deployment.environment.toLowerCase() : "";
  return Boolean(
    deployment &&
      environment === PRODUCTION_ENVIRONMENT &&
      isFullGitSha(deployment.sha) &&
      isFullGitSha(expectedSha) &&
      deployment.sha.toLowerCase() === expectedSha.toLowerCase()
  );
}

export function validateVercelStatusCorrelation({ deploymentStatus, commitStatus, repository }) {
  if (String(deploymentStatus?.state || "").toLowerCase() !== "success") {
    fail(`Vercel Production deployment is not READY: ${deploymentStatus?.state || "missing"}`);
  }
  if (commitStatus?.context !== VERCEL_STATUS_CONTEXT || String(commitStatus?.state || "").toLowerCase() !== "success") {
    fail("successful Vercel commit status evidence is missing");
  }
  const deploymentTarget = normalizeVercelInspectorUrl(deploymentStatus?.target_url, repository);
  const commitTarget = normalizeVercelInspectorUrl(commitStatus?.target_url, repository);
  if (!deploymentTarget || !commitTarget || deploymentTarget !== commitTarget) {
    fail("Vercel deployment identity correlation failed");
  }
  return deploymentTarget;
}

export function validateProductionDeploymentEvidence(evidence, expectedSha) {
  if (!isFullGitSha(expectedSha)) fail("expected Git SHA must be a full commit SHA");
  if (!evidence || evidence.source !== "github-vercel-deployment") fail("trusted Production deployment evidence is missing");
  if (!["vercel", "vercel-status"].includes(evidence.trustedApp)) fail("Production deployment was not correlated to trusted Vercel status evidence");
  if (String(evidence.environment || "").toLowerCase() !== PRODUCTION_ENVIRONMENT) {
    fail("resolved Vercel deployment is not Production");
  }
  if (evidence.readyState !== "READY") fail(`Vercel Production deployment is not READY: ${evidence.readyState || "missing"}`);
  if (!isFullGitSha(evidence.gitSha)) fail("Vercel Production deployment Git SHA is missing or invalid");
  if (evidence.gitSha.toLowerCase() !== expectedSha.toLowerCase()) {
    fail(`Vercel Production deployment Git SHA mismatch: expected ${expectedSha}, received ${evidence.gitSha}`);
  }
  return true;
}

export function buildProductionDeploymentEvidence(deployment, status, expectedSha, commitStatus = null, repository = "") {
  if (!isTrustedVercelProductionDeployment(deployment, expectedSha)) fail("trusted Vercel Production deployment could not be resolved");
  const state = String(status?.state || "").toLowerCase();
  let trustedApp = "";
  let deploymentUrl = "";
  if (commitStatus) {
    deploymentUrl = validateVercelStatusCorrelation({ deploymentStatus: status, commitStatus, repository });
    trustedApp = "vercel-status";
  } else if (deployment?.performed_via_github_app?.slug === "vercel") {
    // Backward-compatible pure helper path for existing unit fixtures only.
    // resolveCurrentProductionDeployment never uses this metadata as a trust root.
    trustedApp = "vercel";
  }
  const evidence = {
    source: "github-vercel-deployment",
    deploymentId: Number(deployment.id || 0),
    statusId: Number(status?.id || 0),
    trustedApp,
    environment: deployment.environment || "",
    productionEnvironment: String(deployment.environment || "").toLowerCase() === PRODUCTION_ENVIRONMENT,
    readyState: state === "success" ? "READY" : (state ? state.toUpperCase() : ""),
    gitSha: typeof deployment.sha === "string" ? deployment.sha : "",
    ...(deploymentUrl ? { deploymentUrl } : {}),
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
  if (!isFullGitSha(expectedSha)) fail("expected Git SHA must be a full commit SHA");

  const deployments = await githubJson(
    `/repos/${repository}/deployments?sha=${encodeURIComponent(expectedSha)}&environment=Production&per_page=100`,
    token
  );
  if (!Array.isArray(deployments)) fail("GitHub deployments response is invalid");

  const candidates = deployments.filter((deployment) => isTrustedVercelProductionDeployment(deployment, expectedSha));
  if (candidates.length === 0) fail("trusted Vercel Production deployment could not be resolved");

  const combinedStatus = await githubJson(`/repos/${repository}/commits/${expectedSha}/status?per_page=100`, token);
  if (!Array.isArray(combinedStatus?.statuses)) fail("GitHub commit status response is invalid");
  const vercelCommitStatuses = combinedStatus.statuses.filter(
    (status) => status?.context === VERCEL_STATUS_CONTEXT && String(status?.state || "").toLowerCase() === "success"
  );
  if (vercelCommitStatuses.length === 0) fail("successful Vercel commit status evidence is missing");

  const orderedCandidates = [...candidates].sort((left, right) => {
    const timeDelta = timestamp(right.updated_at || right.created_at) - timestamp(left.updated_at || left.created_at);
    if (timeDelta !== 0) return timeDelta;
    return Number(right.id || 0) - Number(left.id || 0);
  });

  for (const deployment of orderedCandidates) {
    const statuses = await githubJson(`/repos/${repository}/deployments/${deployment.id}/statuses?per_page=100`, token);
    if (!Array.isArray(statuses)) fail("GitHub deployment statuses response is invalid");
    const latestStatus = newest(statuses);
    if (!latestStatus || String(latestStatus.state || "").toLowerCase() !== "success") continue;
    for (const commitStatus of vercelCommitStatuses) {
      try {
        return buildProductionDeploymentEvidence(deployment, latestStatus, expectedSha, commitStatus, repository);
      } catch (error) {
        if (!String(error?.message || "").includes("Vercel deployment identity correlation failed")) throw error;
      }
    }
  }

  fail("Vercel deployment identity correlation failed");
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
