import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const PRODUCTION_ENVIRONMENT = "production";
const VERCEL_STATUS_CONTEXT = "Vercel";
const VERCEL_INSPECTOR_HOST = "vercel.com";
const VERCEL_EVIDENCE_CHANNEL = "vercel-status";

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
    fail("malformed/untrusted Vercel inspector URL");
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== VERCEL_INSPECTOR_HOST ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    fail("malformed/untrusted Vercel inspector URL");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 3) fail("malformed/untrusted Vercel inspector URL");
  const [scope, project, deploymentIdentity] = segments;
  const repoName = String(repository || "").split("/")[1] || "";
  if (!repoName) fail("malformed/untrusted Vercel inspector URL");
  if (project !== repoName) fail(`wrong Vercel project: expected ${repoName}`);
  if (!/^[A-Za-z0-9_-]+$/.test(scope) || !/^[A-Za-z0-9_-]+$/.test(deploymentIdentity)) {
    fail("malformed/untrusted Vercel inspector URL");
  }

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
  if (!deploymentStatus) fail("no Deployment status");
  if (deploymentStatus.state !== "success") {
    fail(`Deployment status not success: ${deploymentStatus.state || "missing"}`);
  }
  if (commitStatus?.context !== VERCEL_STATUS_CONTEXT || commitStatus?.state !== "success") {
    fail("no successful Vercel commit status");
  }
  return normalizeVercelInspectorUrl(commitStatus.target_url, repository);
}

export function validateProductionDeploymentEvidence(evidence, expectedSha) {
  if (!isFullGitSha(expectedSha)) fail("expected Git SHA must be a full commit SHA");
  if (!isFullGitSha(evidence?.gitSha)) fail("final evidence validation failure: resolved SHA is missing or malformed");
  if (evidence.gitSha.toLowerCase() !== expectedSha.toLowerCase()) {
    fail(`SHA mismatch: expected ${expectedSha}, received ${evidence.gitSha}`);
  }

  if (
    !evidence ||
    evidence.source !== "github-vercel-deployment" ||
    evidence.trustedApp !== VERCEL_EVIDENCE_CHANNEL ||
    String(evidence.environment || "").toLowerCase() !== PRODUCTION_ENVIRONMENT ||
    evidence.readyState !== "READY" ||
    !Number.isFinite(evidence.deploymentId) ||
    evidence.deploymentId <= 0 ||
    !Number.isFinite(evidence.statusId) ||
    evidence.statusId <= 0
  ) {
    fail("final evidence validation failure");
  }

  normalizeVercelInspectorUrl(evidence.deploymentUrl, evidence.repository);
  return true;
}

export function buildProductionDeploymentEvidence(deployment, status, expectedSha, commitStatus, repository = "") {
  if (!isFullGitSha(expectedSha)) fail("expected Git SHA must be a full commit SHA");
  if (!isFullGitSha(deployment?.sha)) fail("deployment SHA is missing or malformed");
  if (deployment.sha.toLowerCase() !== expectedSha.toLowerCase()) {
    fail(`SHA mismatch: expected ${expectedSha}, received ${deployment.sha}`);
  }
  if (String(deployment?.environment || "").toLowerCase() !== PRODUCTION_ENVIRONMENT) {
    fail("no exact-SHA Production deployment candidate");
  }

  const deploymentUrl = validateVercelStatusCorrelation({ deploymentStatus: status, commitStatus, repository });
  const evidence = {
    source: "github-vercel-deployment",
    deploymentId: Number(deployment.id || 0),
    statusId: Number(status?.id || 0),
    trustedApp: VERCEL_EVIDENCE_CHANNEL,
    repository,
    environment: deployment.environment || "",
    productionEnvironment: String(deployment.environment || "").toLowerCase() === PRODUCTION_ENVIRONMENT,
    readyState: "READY",
    gitSha: deployment.sha,
    deploymentUrl,
    deploymentStatusTargetUrl: typeof status?.target_url === "string" ? status.target_url : "",
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
  if (deployments.length === 0) fail("no exact-SHA Production deployment candidate");

  const productionDeployments = deployments.filter(
    (deployment) => String(deployment?.environment || "").toLowerCase() === PRODUCTION_ENVIRONMENT
  );
  if (productionDeployments.length === 0) fail("no exact-SHA Production deployment candidate");

  const malformedSha = productionDeployments.find((deployment) => !isFullGitSha(deployment?.sha));
  if (malformedSha) fail("deployment SHA is missing or malformed");

  const candidates = productionDeployments.filter(
    (deployment) => deployment.sha.toLowerCase() === expectedSha.toLowerCase()
  );
  if (candidates.length === 0) {
    const receivedSha = newest(productionDeployments)?.sha || "missing";
    fail(`SHA mismatch: expected ${expectedSha}, received ${receivedSha}`);
  }

  const current = newest(candidates);
  if (!current) fail("no exact-SHA Production deployment candidate");

  const statuses = await githubJson(`/repos/${repository}/deployments/${current.id}/statuses?per_page=100`, token);
  if (!Array.isArray(statuses)) fail("GitHub deployment statuses response is invalid");
  const latestStatus = newest(statuses);
  if (!latestStatus) fail("no Deployment status");
  if (latestStatus.state !== "success") {
    fail(`Deployment status not success: ${latestStatus.state || "missing"}`);
  }

  const combinedStatus = await githubJson(`/repos/${repository}/commits/${expectedSha}/status?per_page=100`, token);
  if (!Array.isArray(combinedStatus?.statuses)) fail("GitHub commit status response is invalid");
  const vercelCommitStatuses = combinedStatus.statuses.filter(
    (status) => status?.context === VERCEL_STATUS_CONTEXT && status?.state === "success"
  );
  if (vercelCommitStatuses.length === 0) fail("no successful Vercel commit status");

  const commitStatus = newest(vercelCommitStatuses);
  if (!commitStatus) fail("no successful Vercel commit status");

  return buildProductionDeploymentEvidence(current, latestStatus, expectedSha, commitStatus, repository);
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
