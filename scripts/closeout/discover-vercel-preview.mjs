import fs from "node:fs";
import { pathToFileURL } from "node:url";

const VERCEL_APP_SLUG = "vercel";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertExactPreviewUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Preview URL must use HTTPS");
  const host = url.hostname.toLowerCase();
  if (!host.endsWith(".vercel.app")) throw new Error("Preview URL must be a Vercel deployment host");
  if (host === "hamza-agency.com" || host === "www.hamza-agency.com") {
    throw new Error("Production host is forbidden");
  }
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return { url: url.toString().replace(/\/$/, ""), host };
}

export function isTrustedVercelDeployment(deployment, expectedSha) {
  return Boolean(
    deployment &&
      deployment.sha === expectedSha &&
      deployment.production_environment !== true &&
      deployment.transient_environment === true &&
      deployment.performed_via_github_app?.slug === VERCEL_APP_SLUG
  );
}

async function githubJson(path, token) {
  const response = await fetch(`${process.env.GITHUB_API_URL || "https://api.github.com"}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`GitHub deployment lookup failed with HTTP ${response.status}`);
  return response.json();
}

async function discoverCandidate({ repository, expectedSha, token }) {
  const deployments = await githubJson(
    `/repos/${repository}/deployments?sha=${encodeURIComponent(expectedSha)}&per_page=100`,
    token
  );
  if (!Array.isArray(deployments)) throw new Error("GitHub deployments response is invalid");

  for (const deployment of deployments) {
    if (!isTrustedVercelDeployment(deployment, expectedSha)) continue;
    const statuses = await githubJson(`/repos/${repository}/deployments/${deployment.id}/statuses?per_page=100`, token);
    if (!Array.isArray(statuses) || statuses.length === 0) continue;
    const latest = statuses[0];
    if (latest?.state !== "success" || typeof latest.environment_url !== "string") continue;
    return assertExactPreviewUrl(latest.environment_url);
  }
  return null;
}

async function readPreviewCommitSha(previewUrl, bypassSecret) {
  try {
    const response = await fetch(`${previewUrl}/api/health`, {
      headers: {
        "x-vercel-protection-bypass": bypassSecret,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return "";
    const payload = await response.json();
    return payload && typeof payload === "object" && typeof payload.commitSha === "string"
      ? payload.commitSha
      : "";
  } catch {
    return "";
  }
}

export async function discoverExactHeadPreview({
  repository,
  expectedSha,
  token,
  bypassSecret,
  attempts = 90,
  intervalMs = 10_000,
}) {
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Expected Head SHA is invalid");
  if (!repository || !token || !bypassSecret) throw new Error("Preview discovery configuration is incomplete");

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const candidate = await discoverCandidate({ repository, expectedSha, token });
    if (candidate) {
      const actualSha = await readPreviewCommitSha(candidate.url, bypassSecret);
      if (actualSha === expectedSha) return candidate;
    }
    if (attempt < attempts) await sleep(intervalMs);
  }
  throw new Error("No successful Vercel Preview deployment matched the exact Pull Request Head");
}

async function main() {
  const result = await discoverExactHeadPreview({
    repository: process.env.GITHUB_REPOSITORY || "",
    expectedSha: process.env.EXPECTED_SHA || "",
    token: process.env.GITHUB_TOKEN || "",
    bypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "",
  });
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error("GITHUB_OUTPUT is unavailable");
  fs.appendFileSync(output, `preview_url=${result.url}\npreview_host=${result.host}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Preview discovery failed");
    process.exitCode = 1;
  });
}
