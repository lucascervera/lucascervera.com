#!/usr/bin/env node
/**
 * Zero-dependency static server for local review of the generated site.
 * Usage: node scripts/serve.mjs [port]
 */
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.argv[2] ?? process.env.PORT ?? 8080);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const target = normalize(join(ROOT, pathname.endsWith("/") ? `${pathname}index.html` : pathname));

  if (target !== ROOT && !target.startsWith(`${ROOT}\\`) && !target.startsWith(`${ROOT}/`)) {
    res.writeHead(403, { "content-type": "text/plain; charset=utf-8" }).end("Forbidden");
    return;
  }

  let stats;
  try {
    stats = statSync(target);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    return;
  }

  if (stats.isDirectory()) {
    res.writeHead(302, { location: `${pathname.replace(/\/?$/, "/")}` }).end();
    return;
  }

  res.writeHead(200, {
    "content-type": TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
    "content-length": stats.size,
    "cache-control": "no-store",
  });
  createReadStream(target).pipe(res);
});

server.listen(PORT, () => {
  process.stdout.write(`Serving ${ROOT}\n`);
  process.stdout.write(`http://localhost:${PORT}\n`);
});
