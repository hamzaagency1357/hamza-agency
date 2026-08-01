const READONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
export const TRANSLATION_REVISION_RPC_PATH = "/rest/v1/rpc/read_published_translation_revision_fields";
export const TRANSLATION_REVISION_RPC_ARGUMENTS = ["p_language", "p_source_ids", "p_source_type"];

function assertExactJsonArguments(rawBody) {
  let body;
  try {
    body = JSON.parse(rawBody || "");
  } catch {
    throw new Error("Readonly translation RPC requires a JSON object body");
  }
  if (!body || Array.isArray(body) || typeof body !== "object") {
    throw new Error("Readonly translation RPC requires a JSON object body");
  }
  const keys = Object.keys(body).sort();
  if (keys.length !== TRANSLATION_REVISION_RPC_ARGUMENTS.length
      || keys.some((key, index) => key !== TRANSLATION_REVISION_RPC_ARGUMENTS[index])) {
    throw new Error("Readonly translation RPC body contains unapproved arguments");
  }
}

export function assertPreviewReadonlyRequest({ method, rawUrl, isNavigationRequest, expectedHost, supabaseHost, postData = "" }) {
  const url = new URL(rawUrl);
  const host = url.hostname.toLowerCase();
  if (READONLY_METHODS.has(method)) return url;
  const isApprovedRpc = method === "POST"
    && !isNavigationRequest
    && host === supabaseHost
    && url.pathname === TRANSLATION_REVISION_RPC_PATH
    && url.search === "";
  if (!isApprovedRpc) throw new Error(`Readonly closeout blocked ${method} ${url.href}`);
  assertExactJsonArguments(postData);
  return url;
}

export function previewRequestHeaders({ headers = {}, host, expectedHost, bypassSecret }) {
  const next = { ...headers };
  delete next["x-vercel-protection-bypass"];
  delete next["X-Vercel-Protection-Bypass"];
  if (host === expectedHost) next["x-vercel-protection-bypass"] = bypassSecret;
  return next;
}

export async function installPreviewBypass(page, expectedHost) {
  if (process.env.CLOSEOUT_EXECUTION_MODE !== "preview-readonly") return;
  const secret = process.env.CLOSEOUT_VERCEL_BYPASS_SECRET;
  if (!secret) throw new Error("Preview bypass secret is required");
  page.on("framenavigated", frame => {
    if (frame === page.mainFrame() && new URL(frame.url()).hostname.toLowerCase() !== expectedHost) throw new Error(`Navigation left the exact Preview host: ${frame.url()}`);
  });
  await page.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.isNavigationRequest() && url.hostname.toLowerCase() !== expectedHost) throw new Error(`Navigation request left the exact Preview host: ${url.href}`);
    const headers = request.headers();
    if (url.hostname.toLowerCase() === expectedHost) headers["x-vercel-protection-bypass"] = secret;
    await route.continue({ headers });
  });
}
export function previewBypassHeaders(expectedHost, rawUrl) {
  if (process.env.CLOSEOUT_EXECUTION_MODE !== "preview-readonly") return {};
  const url = new URL(rawUrl, process.env.CLOSEOUT_TARGET_URL);
  if (url.hostname.toLowerCase() !== expectedHost) throw new Error(`Request left the exact Preview host: ${url.href}`);
  const secret = process.env.CLOSEOUT_VERCEL_BYPASS_SECRET;
  if (!secret) throw new Error("Preview bypass secret is required");
  return { "x-vercel-protection-bypass": secret };
}
