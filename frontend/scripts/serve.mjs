import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://localhost:${port}`);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const normalizedPath = normalize(join(root, requestedPath));

    if (!normalizedPath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const body = await readFile(normalizedPath);
    response.writeHead(200, {
      "Content-Type": contentTypes[extname(normalizedPath)] || "application/octet-stream"
    });

    if (extname(normalizedPath) === ".html" && process.env.API_BASE_URL) {
      const html = body
        .toString("utf8")
        .replace(
          '<script type="module"',
          `<script>window.__API_BASE_URL__ = ${JSON.stringify(process.env.API_BASE_URL)};</script>\n    <script type="module"`
        );
      response.end(html);
      return;
    }

    response.end(body);
  } catch (error) {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.on("error", (error) => {
  const reason = error.code === "EADDRINUSE" ? "already in use" : error.message;
  console.error(`Frontend server cannot listen on http://${host}:${port}: ${reason}`);
  console.error("Set another port, for example: PORT=4175 npm run dev");
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`AI troubleshooting board running at http://${host}:${port}`);
});
