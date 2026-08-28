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
    const timeDelta = timestamp(right.created_at || right.updated_at) - timestamp(left.created_at || left.updated_at);
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
    parsed.hash ||
    parsed.pathname.includes("//") ||
    /%2f|%5c/i.test(parsed.pathname)
  ) {
    fail("malformed/untrusted Vercel inspector URL");
  }

  const segments = parsed.pathname.split("/");
  if (segments.length !== 4 || segments[0] !== "" || segments.slice(1).some((segment) => !segment)) {
    fail("malformed/untrusted Vercel inspector URL");
  }
  const [, scope, project, deploymentIdentity] = segments;
  const repoName = String(repository || "").split("/")[1] || "";
  if (!repoName) fail("malformed/untrusted Vercel inspector URL");
  if (project !== repoName) fail(`wrong Vercel project: expected ${repoName}`);
  if (!/^[A-Za-z0-9_-]+$/.test(scope) || !/^[A-Za-z0-9_-]+$/.test(deploymentIdentity)) {
    fail("malformed/untrusted Vercel inspector URL");
  }

  return `https://${VERCEL_INSPECTOR_HOST}/${scope}/${project}/${deploymentIdentity}`;
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

export function validateVercelStatusCorrelation({ deploymentStatus, commitStatus, repository, deploymentId = 0 }) {
  if (!deploymentStatus) {
    fail(`no Deployment status${deploymentId ? ` for deployment ${deploymentId}` : ""}`);
  }
  if (deploymentStatus.state !== "success") {
    fail(
      `Deployment status not success: state=${deploymentStatus.state || "missing"}` +
      `${deploymentId ? ` deploymentId=${deploymentId}` : ""}` +
      `${deploymentStatus.id ? ` statusId=${deploymentStatus.id}` : ""}`
    );
  }
  if (commitStatus?.context !== VERCEL_STATUS_CONTEXT) {
    fail("no Vercel commit status for exact context Vercel");
  }
  if (commitStatus.state !== "success") {
    fail(
      `latest Vercel commit status not success: state=${commitStatus.state || "missing"}` +
      `${commitStatus.id ? ` statusId=${commitStatus.id}` : ""}`
    );
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
    fail(
      "final evidence validation failure" +
      `: deploymentId=${Number(evidence?.deploymentId || 0)}` +
      ` sha=${evidence?.gitSha || "missing"}` +
      ` environment=${evidence?.environment || "missing"}` +
      ` readyState=${evidence?.readyState || "missing"}`
    );
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
    fail(`no exact-SHA Production deployment candidate: sha=${expectedSha} environment=${deployment?.environment || "missing"}`);
  }

  const deploymentUrl = validateVercelStatusCorrelation({
    deploymentStatus: status,
    commitStatus,
    repository,
    deploymentId: Number(deployment.id || 0),
  });
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
  if (deployments.length === 0) {
    fail(`no exact-SHA Production deployment candidate: sha=${expectedSha} environment=Production`);
  }

  const productionDeployments = deployments.filter(
    (deployment) => String(deployment?.environment || "").toLowerCase() === PRODUCTION_ENVIRONMENT
  );
  if (productionDeployments.length === 0) {
    fail(`no exact-SHA Production deployment candidate: sha=${expectedSha} environment=Production`);
  }

  const malformedSha = productionDeployments.find((deployment) => !isFullGitSha(deployment?.sha));
  if (malformedSha) {
    fail(`deployment SHA is missing or malformed: deploymentId=${Number(malformedSha?.id || 0)} environment=${malformedSha?.environment || "missing"}`);
  }

  const candidates = productionDeployments.filter(
    (deployment) => deployment.sha.toLowerCase() === expectedSha.toLowerCase()
  );
  if (candidates.length === 0) {
    const receivedSha = newest(productionDeployments)?.sha || "missing";
    fail(`SHA mismatch: expected ${expectedSha}, received ${receivedSha}`);
  }

  // Candidate rule: newest exact-SHA Production deployment by created_at, then numeric id.
  const current = newest(candidates);
  if (!current) fail(`no exact-SHA Production deployment candidate: sha=${expectedSha} environment=Production`);

  const statuses = await githubJson(`/repos/${repository}/deployments/${current.id}/statuses?per_page=100`, token);
  if (!Array.isArray(statuses)) fail(`GitHub deployment statuses response is invalid: deploymentId=${current.id}`);
  const latestStatus = newest(statuses);
  if (!latestStatus) fail(`no Deployment status for deployment ${current.id}`);
  if (latestStatus.state !== "success") {
    fail(
      `Deployment status not success: state=${latestStatus.state || "missing"}` +
      ` deploymentId=${current.id}` +
      `${latestStatus.id ? ` statusId=${latestStatus.id}` : ""}`
    );
  }

  const commitStatuses = await githubJson(`/repos/${repository}/commits/${expectedSha}/statuses?per_page=100`, token);
  if (!Array.isArray(commitStatuses)) fail("GitHub commit statuses response is invalid");
  const vercelCommitStatuses = commitStatuses.filter((status) => status?.context === VERCEL_STATUS_CONTEXT);
  if (vercelCommitStatuses.length === 0) {
    fail(`no Vercel commit status for exact context Vercel: sha=${expectedSha}`);
  }

  // Vercel rule: newest exact-context status by created_at, then numeric id; stale success cannot override it.
  const commitStatus = newest(vercelCommitStatuses);
  if (!commitStatus) fail(`no Vercel commit status for exact context Vercel: sha=${expectedSha}`);
  if (commitStatus.state !== "success") {
    fail(
      `latest Vercel commit status not success: state=${commitStatus.state || "missing"}` +
      ` sha=${expectedSha}` +
      `${commitStatus.id ? ` statusId=${commitStatus.id}` : ""}`
    );
  }

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
