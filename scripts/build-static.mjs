import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const intermediate = path.join(root, ".static-build");
const output = path.join(root, "dist");
// Only these generated directories may be replaced by this build.
for (const directory of [intermediate, output]) {
  if (path.dirname(directory) !== path.resolve(root)) throw new Error("Unsafe build directory");
}
await rm(intermediate, { recursive: true, force: true });
const build = spawnSync(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "build", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

const { default: app } = await import(pathToFileURL(path.join(intermediate, "server/server.js")).href);
async function fetchPage(pathname) {
  let url = new URL(pathname, "http://localhost");
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await app.fetch(new Request(url), {}, { waitUntil() {} });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    url = new URL(response.headers.get("location"), url);
    if (url.origin !== "http://localhost") throw new Error(`External export redirect: ${url}`);
  }
  throw new Error(`Too many redirects exporting ${pathname}`);
}
const pending = ["/", "/customised", "/projects", "/search", "/cart", "/account"];
const pages = new Map();
while (pending.length) {
  const pathname = pending.shift();
  if (pages.has(pathname)) continue;
  const response = await fetchPage(pathname);
  if (response.status !== 200) throw new Error(`Cannot export ${pathname}: HTTP ${response.status}`);
  const html = await response.text();
  if (!response.headers.get("content-type")?.includes("text/html")) throw new Error(`Not an HTML page: ${pathname}`);
  pages.set(pathname, html);
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/g)) {
    const url = new URL(match[1].replaceAll("&amp;", "&"), "http://localhost");
    if (url.origin !== "http://localhost" || /\.[a-z0-9]+$/i.test(url.pathname)) continue;
    const linkedPath = url.pathname.replace(/\/$/, "") || "/";
    if (!pages.has(linkedPath) && !pending.includes(linkedPath)) pending.push(linkedPath);
  }
}
const notFound = await fetchPage("/__static-not-found__");
if (notFound.status !== 404) throw new Error("Missing pages must return HTTP 404");
const notFoundHtml = await notFound.text();

// Keep the previous upload folder intact until page rendering has succeeded.
await rm(output, { recursive: true, force: true });
await cp(path.join(intermediate, "client"), output, { recursive: true });
for (const [pathname, html] of pages) {
  const directory = path.join(output, pathname === "/" ? "" : pathname.slice(1));
  if (directory !== output && !directory.startsWith(output + path.sep)) throw new Error("Unsafe page path");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), html);
}
await writeFile(path.join(output, "404.html"), notFoundHtml);
const robots = await fetchPage("/robots.txt");
if (!robots.ok) throw new Error("Failed to generate robots.txt");
await writeFile(path.join(output, "robots.txt"), await robots.text());
const sitemap = await fetchPage("/sitemap.xml");
if (sitemap.ok) {
  await writeFile(path.join(output, "sitemap.xml"), await sitemap.text());
} else if (sitemap.status === 503) {
  console.warn("VITE_SITE_URL is unset: sitemap and absolute SEO URLs require the final domain and a rebuild.");
} else throw new Error(`Failed to generate sitemap: ${sitemap.status}`);
await writeFile(path.join(output, "_redirects"), "# Existing static files take precedence. Unknown URLs stay genuine 404s.\n/* /404.html 404\n");
await writeFile(path.join(output, "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n");
const home = await readFile(path.join(output, "index.html"), "utf8");
for (const match of home.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) {
  await readFile(path.join(output, match[1].slice(1)));
}
console.log(`\nStatic export complete: ${pages.size} HTML pages + 404, robots and assets in dist/.`);
console.log("Upload the dist folder to Netlify Drop. No server or build step is needed there.");
