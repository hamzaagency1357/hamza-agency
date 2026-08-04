import fs from "node:fs";
import http from "node:http";
import https from "node:https";

const keyPath = process.env.CLOSEOUT_TLS_KEY || "";
const certPath = process.env.CLOSEOUT_TLS_CERT || "";
if (!keyPath || !certPath) throw new Error("closeout_tls_files_required");

const key = fs.readFileSync(keyPath);
const cert = fs.readFileSync(certPath);
const port = Number(process.env.CLOSEOUT_HTTPS_PORT || 3443);
if (port !== 3443) throw new Error("closeout_https_port_not_allowed");

function localUpstream(name, rawValue, expectedPort) {
  const value = rawValue || `http://127.0.0.1:${expectedPort}`;
  const url = new URL(value);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || Number(url.port) !== expectedPort) {
    throw new Error(`${name}_must_be_exact_loopback_http_${expectedPort}`);
  }
  return url;
}

const applicationUpstream = localUpstream("application_upstream", process.env.CLOSEOUT_UPSTREAM_URL, 3000);
const supabaseValue = process.env.CLOSEOUT_SUPABASE_UPSTREAM_URL || "";
const supabaseUpstream = supabaseValue ? localUpstream("supabase_upstream", supabaseValue, 54321) : null;
const supabasePrefix = "/__closeout_supabase";

function targetFor(rawPath) {
  const path = rawPath || "/";
  if (supabaseUpstream && (path === supabasePrefix || path.startsWith(`${supabasePrefix}/`))) {
    const stripped = path.slice(supabasePrefix.length) || "/";
    return { upstream: supabaseUpstream, path: stripped };
  }
  return { upstream: applicationUpstream, path };
}

function forwardedHeaders(request, upstream) {
  const headers = { ...request.headers };
  delete headers.connection;
  delete headers["proxy-connection"];
  delete headers.upgrade;
  headers.host = upstream.host;
  headers["x-forwarded-host"] = request.headers.host || `127.0.0.1:${port}`;
  headers["x-forwarded-proto"] = "https";
  return headers;
}

const server = https.createServer({ key, cert }, (request, response) => {
  const selected = targetFor(request.url);
  const proxy = http.request({
    hostname: selected.upstream.hostname,
    port: selected.upstream.port,
    method: request.method,
    path: selected.path,
    headers: forwardedHeaders(request, selected.upstream),
  }, (upstreamResponse) => {
    const headers = { ...upstreamResponse.headers };
    if (supabaseUpstream && typeof headers.location === "string" && headers.location.startsWith(supabaseUpstream.origin)) {
      headers.location = `https://127.0.0.1:${port}${supabasePrefix}${headers.location.slice(supabaseUpstream.origin.length)}`;
    }
    response.writeHead(upstreamResponse.statusCode || 502, headers);
    upstreamResponse.pipe(response);
  });
  proxy.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    response.end("local proxy error");
  });
  request.pipe(proxy);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Closeout HTTPS proxy listening on https://127.0.0.1:${port}`);
});
