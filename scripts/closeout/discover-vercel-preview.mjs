import fs from "node:fs";
import { pathToFileURL } from "node:url";

const VERCEL_APP_SLUG = "vercel";
const VERCEL_STATUS_CONTEXT = "Vercel";
const SAFE_INSPECTOR_QUERY_PARAMS = new Set([
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeReason(error, fallback) {
  if (error instanceof Error && /^[a-z_]+$/.test(error.message)) return error.message;
  return fallback;
}

function logDiagnostics(attempt, diagnostics) {
  console.log(
    `[preview-discovery] attempt=${attempt} deployments=${diagnostics.deployments} ` +
      `vercel_statuses=${diagnostics.vercelStatuses} trusted_comments=${diagnostics.trustedComments} ` +
      `reason=${diagnostics.reason}`
  );
}

export function assertExactPreviewUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("preview_host_rejected");
  if (url.username || url.password || url.port) throw new Error("preview_host_rejected");
  const host = url.hostname.toLowerCase();
  if (host === "hamza-agency.com" || host === "www.hamza-agency.com") {
    throw new Error("preview_host_rejected");
  }
  if (!host.endsWith(".vercel.app")) throw new Error("preview_host_rejected");
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return { url: url.toString().replace(/\/$/, ""), host };
}

export function normalizeInspectorUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "vercel.com") {
    throw new Error("status_missing");
  }
  if (url.username || url.password || url.port) throw new Error("status_missing");
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 3) throw new Error("status_missing");
  for (const key of url.searchParams.keys()) {
    if (!SAFE_INSPECTOR_QUERY_PARAMS.has(key)) throw new Error("status_missing");
  }
  url.pathname = `/${segments.join("/")}`;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function isTrustedVercelDeployment(deployment, expectedSha) {
  const environment = typeof deployment?.environment === "string" ? deployment.environment.toLowerCase() : "";
  return Boolean(
    deployment &&
      deployment.sha === expectedSha &&
      deployment.production_environment !== true &&
      environment !== "production" &&
      deployment.performed_via_github_app?.slug === VERCEL_APP_SLUG
  );
}

function newestStatus(statuses) {
  if (!Array.isArray(statuses) || statuses.length === 0) return null;
  return [...statuses].sort((left, right) => {
    const timeDelta = timestamp(right.updated_at || right.created_at) - timestamp(left.updated_at || left.created_at);
    if (timeDelta !== 0) return timeDelta;
    return Number(right.id || 0) - Number(left.id || 0);
  })[0];
}

function statusUrl(status) {
  if (typeof status?.environment_url === "string" && status.environment_url.trim()) return status.environment_url;
  if (typeof status?.target_url === "string" && status.target_url.trim()) return status.target_url;
  return "";
}

export function selectPreviewCandidate(records, expectedSha) {
  const candidates = [];
  for (const record of records || []) {
    const deployment = record?.deployment;
    if (!isTrustedVercelDeployment(deployment, expectedSha)) continue;
    const latest = newestStatus(record.statuses);
    if (!latest || latest.state !== "success") continue;
    const rawUrl = statusUrl(latest);
    if (!rawUrl) continue;
    let preview;
    try {
      preview = assertExactPreviewUrl(rawUrl);
    } catch {
      continue;
    }
    candidates.push({
      ...preview,
      source: "github-deployment",
      inspectorUrl: "",
      deploymentId: deployment.id,
      statusId: Number(latest.id || 0),
      updatedAt: timestamp(latest.updated_at || latest.created_at || deployment.updated_at || deployment.created_at),
    });
  }

  candidates.sort((left, right) => {
    const timeDelta = right.updatedAt - left.updatedAt;
    if (timeDelta !== 0) return timeDelta;
    const statusDelta = right.statusId - left.statusId;
    if (statusDelta !== 0) return statusDelta;
    return Number(right.deploymentId || 0) - Number(left.deploymentId || 0);
  });

  if (candidates.length > 1) {
    const first = candidates[0];
    const second = candidates[1];
    if (
      first.updatedAt === second.updatedAt &&
      first.statusId === second.statusId &&
      Number(first.deploymentId || 0) === Number(second.deploymentId || 0) &&
      first.url !== second.url
    ) {
      throw new Error("ambiguous_candidates");
    }
  }
  return candidates[0] || null;
}

function visibleMarkdownLinks(body) {
  if (typeof body !== "string") return [];
  const visible = body
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("[vc]:"))
    .join("\n");
  return [...visible.matchAll(/(?<!!)\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g)].map((match) => match[1]);
}

function hasTrustedVercelAuthor(comment) {
  const app = comment?.performed_via_github_app;
  if (app !== undefined && app !== null) return app?.slug === VERCEL_APP_SLUG;
  return comment?.user?.login === "vercel[bot]" && comment?.user?.type === "Bot";
}

export function isTrustedVercelComment(comment, inspectorUrl) {
  if (!hasTrustedVercelAuthor(comment)) return false;
  return visibleMarkdownLinks(comment?.body).some((link) => {
    try {
      return normalizeInspectorUrl(link) === inspectorUrl;
    } catch {
      return false;
    }
  });
}

export function selectStatusCommentCandidate(statuses, comments) {
  const vercelStatuses = (statuses || []).filter((status) => status?.context === VERCEL_STATUS_CONTEXT);
  const latest = newestStatus(vercelStatuses);
  if (!latest) return null;
  if (latest.state !== "success") return null;

  let inspectorUrl;
  try {
    inspectorUrl = normalizeInspectorUrl(latest.target_url || "");
  } catch {
    return null;
  }

  const candidates = [];
  let inspectorMatched = false;
  let rejectedPreviewHost = false;
  for (const comment of comments || []) {
    if (!hasTrustedVercelAuthor(comment)) continue;
    if (!isTrustedVercelComment(comment, inspectorUrl)) continue;
    inspectorMatched = true;
    for (const link of visibleMarkdownLinks(comment.body)) {
      let preview;
      try {
        preview = assertExactPreviewUrl(link);
      } catch {
        if (/\.vercel\.app|hamza-agency\.com/i.test(link)) rejectedPreviewHost = true;
        continue;
      }
      candidates.push({
        ...preview,
        source: "vercel-status-comment",
        inspectorUrl,
        deploymentId: null,
        statusId: Number(latest.id || 0),
        commentId: Number(comment.id || 0),
        updatedAt: timestamp(latest.updated_at || latest.created_at),
      });
    }
  }

  const distinct = new Map(candidates.map((candidate) => [candidate.url, candidate]));
  if (distinct.size > 1) throw new Error("ambiguous_candidates");
  const candidate = distinct.values().next().value || null;
  if (!candidate && rejectedPreviewHost) throw new Error("preview_host_rejected");
  if (!candidate && inspectorMatched) throw new Error("preview_url_missing");
  return candidate;
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
  if (!response.ok) throw new Error(`GitHub evidence lookup failed with HTTP ${response.status}`);
  return response.json();
}

async function discoverDeploymentCandidate({ repository, expectedSha, token }) {
  const deployments = await githubJson(
    `/repos/${repository}/deployments?sha=${encodeURIComponent(expectedSha)}&per_page=100`,
    token
  );
  if (!Array.isArray(deployments)) throw new Error("GitHub deployments response is invalid");

  const records = [];
  for (const deployment of deployments) {
    if (!isTrustedVercelDeployment(deployment, expectedSha)) continue;
    const statuses = await githubJson(`/repos/${repository}/deployments/${deployment.id}/statuses?per_page=100`, token);
    if (!Array.isArray(statuses)) throw new Error("GitHub deployment statuses response is invalid");
    records.push({ deployment, statuses });
  }
  return { candidate: selectPreviewCandidate(records, expectedSha), count: deployments.length };
}

async function discoverStatusCommentCandidate({ repository, expectedSha, prNumber, token }) {
  const [statuses, comments] = await Promise.all([
    githubJson(`/repos/${repository}/commits/${encodeURIComponent(expectedSha)}/statuses?per_page=100`, token),
    githubJson(`/repos/${repository}/issues/${prNumber}/comments?per_page=100`, token),
  ]);
  if (!Array.isArray(statuses)) throw new Error("GitHub commit statuses response is invalid");
  if (!Array.isArray(comments)) throw new Error("GitHub Pull Request comments response is invalid");

  const matchingStatuses = statuses.filter((status) => status?.context === VERCEL_STATUS_CONTEXT);
  const trustedComments = comments.filter(hasTrustedVercelAuthor);
  const latest = newestStatus(matchingStatuses);
  let reason = "preview_url_missing";
  if (!latest) reason = "status_missing";
  else if (latest.state !== "success") reason = "status_not_success";
  else if (trustedComments.length === 0) reason = "preview_url_missing";
  else {
    try {
      const inspectorUrl = normalizeInspectorUrl(latest.target_url || "");
      if (!trustedComments.some((comment) => isTrustedVercelComment(comment, inspectorUrl))) {
        reason = "inspector_mismatch";
      }
    } catch {
      reason = "status_missing";
    }
  }

  try {
    const candidate = selectStatusCommentCandidate(statuses, comments);
    return {
      candidate,
      statusCount: matchingStatuses.length,
      trustedCommentCount: trustedComments.length,
      reason: candidate ? "matched" : reason,
    };
  } catch (error) {
    const rejection = safeReason(error, "preview_url_missing");
    if (rejection === "ambiguous_candidates") throw error;
    return {
      candidate: null,
      statusCount: matchingStatuses.length,
      trustedCommentCount: trustedComments.length,
      reason: rejection,
    };
  }
}

async function discoverCandidate({ repository, expectedSha, prNumber, token }) {
  const deploymentEvidence = await discoverDeploymentCandidate({ repository, expectedSha, token });
  if (deploymentEvidence.candidate) {
    return {
      candidate: deploymentEvidence.candidate,
      diagnostics: {
        deployments: deploymentEvidence.count,
        vercelStatuses: 0,
        trustedComments: 0,
        reason: "matched",
      },
    };
  }

  const fallback = await discoverStatusCommentCandidate({ repository, expectedSha, prNumber, token });
  return {
    candidate: fallback.candidate,
    diagnostics: {
      deployments: deploymentEvidence.count,
      vercelStatuses: fallback.statusCount,
      trustedComments: fallback.trustedCommentCount,
      reason: fallback.candidate ? "matched" : fallback.reason || "deployment_missing",
    },
  };
}

export async function readPreviewHealth(previewUrl, bypassSecret) {
  try {
    const response = await fetch(`${previewUrl}/api/health`, {
      headers: {
        "x-vercel-protection-bypass": bypassSecret,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, status: "", commitSha: "", reason: "health_unreachable" };
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || payload.status !== "ok") {
      return { ok: false, status: "", commitSha: "", reason: "health_unreachable" };
    }
    const commitSha = typeof payload.commitSha === "string" ? payload.commitSha : "";
    return { ok: true, status: "ok", commitSha, reason: commitSha ? "matched" : "commit_mismatch" };
  } catch {
    return { ok: false, status: "", commitSha: "", reason: "health_unreachable" };
  }
}

export async function readPreviewCommitSha(previewUrl, bypassSecret) {
  const health = await readPreviewHealth(previewUrl, bypassSecret);
  return health.ok ? health.commitSha : "";
}

export async function discoverExactHeadPreview({
  repository,
  expectedSha,
  prNumber,
  token,
  bypassSecret,
  attempts = 90,
  intervalMs = 10_000,
}) {
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error("Expected Head SHA is invalid");
  if (!repository || !token || !bypassSecret || !Number.isInteger(Number(prNumber)) || Number(prNumber) <= 0) {
    throw new Error("Preview discovery configuration is incomplete");
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const evidence = await discoverCandidate({ repository, expectedSha, prNumber: Number(prNumber), token });
    if (evidence.candidate) {
      const health = await readPreviewHealth(evidence.candidate.url, bypassSecret);
      if (health.ok && health.commitSha === expectedSha) {
        console.log(`[preview-discovery] source=${evidence.candidate.source}`);
        if (evidence.candidate.inspectorUrl) {
          console.log(`[preview-discovery] inspector=${evidence.candidate.inspectorUrl}`);
        }
        return evidence.candidate;
      }
      evidence.diagnostics.reason = health.ok ? "commit_mismatch" : health.reason;
    }
    if (attempt === 1 || attempt === attempts || attempt % 10 === 0) {
      logDiagnostics(attempt, evidence.diagnostics);
    }
    if (attempt < attempts) await sleep(intervalMs);
  }
  throw new Error("No trusted Vercel Preview matched the exact Pull Request Head");
}

async function main() {
  const result = await discoverExactHeadPreview({
    repository: process.env.GITHUB_REPOSITORY || "",
    expectedSha: process.env.EXPECTED_SHA || "",
    prNumber: Number(process.env.PR_NUMBER || 0),
    token: process.env.GITHUB_TOKEN || "",
    bypassSecret: process.env.VERCEL_AUTOMATION_BYPASS_SECRET || "",
  });
  const output = process.env.GITHUB_OUTPUT;
  if (!output) throw new Error("GITHUB_OUTPUT is unavailable");
  fs.appendFileSync(
    output,
    `preview_url=${result.url}\npreview_host=${result.host}\npreview_source=${result.source}\npreview_inspector=${result.inspectorUrl || ""}\n`,
    "utf8"
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Preview discovery failed");
    process.exitCode = 1;
  });
}
