import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".xml": "application/xml", ".txt": "text/plain" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let filename = path.resolve(root, "." + pathname);
    if (filename !== path.resolve(root) && !filename.startsWith(root)) throw new Error("Invalid path");
    let status = 200;
    try {
      if ((await stat(filename)).isDirectory()) filename = path.join(filename, "index.html");
      await stat(filename);
    } catch { filename = path.join(root, "404.html"); status = 404; }
    const body = await readFile(filename);
    response.writeHead(status, { "Content-Type": types[path.extname(filename)] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch { response.writeHead(500); response.end("Run npm run build before previewing."); }
});
server.listen(4173, "127.0.0.1", () => console.log("Static preview: http://127.0.0.1:4173"));
