import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url).pathname;
const webRoot = join(root, "dist", "web");
const port = Number(process.env.PORT || 4186);

spawnSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const safePath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = join(webRoot, safePath === "/" ? "index.html" : safePath);
  if (!existsSync(filePath)) filePath = join(webRoot, "index.html");
  const info = await stat(filePath);
  if (info.isDirectory()) filePath = join(filePath, "index.html");
  response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(filePath).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Labeloo review server: http://127.0.0.1:${port}`);
});
