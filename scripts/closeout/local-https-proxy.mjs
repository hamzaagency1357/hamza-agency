import fs from "node:fs";
import https from "node:https";
import http from "node:http";

const key = fs.readFileSync(process.env.CLOSEOUT_TLS_KEY);
const cert = fs.readFileSync(process.env.CLOSEOUT_TLS_CERT);
const upstream = new URL(process.env.CLOSEOUT_UPSTREAM_URL || "http://127.0.0.1:3000");
const port = Number(process.env.CLOSEOUT_HTTPS_PORT || 3443);

const server = https.createServer({ key, cert }, (request, response) => {
  const proxy = http.request({
    hostname: upstream.hostname,
    port: upstream.port,
    method: request.method,
    path: request.url,
    headers: { ...request.headers, host: upstream.host, "x-forwarded-proto": "https" },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  proxy.on("error", (error) => {
    response.writeHead(502, { "content-type": "text/plain" });
    response.end(`local proxy error: ${error.message}`);
  });
  request.pipe(proxy);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Closeout HTTPS proxy listening on https://127.0.0.1:${port}`);
});
