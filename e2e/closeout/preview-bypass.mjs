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
