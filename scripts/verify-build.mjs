import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const surfaces = ["web", "chrome", "edge", "opera", "firefox"];

async function expectedReference(surface, assetName) {
  const asset = await readFile(join(root, "dist", surface, assetName));
  const version = createHash("sha256").update(asset).digest("hex").slice(0, 12);
  return `${assetName}?v=${version}`;
}

for (const surface of surfaces) {
  const output = join(root, "dist", surface);
  const appHtml = await readFile(join(output, "app.html"), "utf8");
  const printHtml = await readFile(join(output, "print.html"), "utf8");

  assert.ok(appHtml.includes(await expectedReference(surface, "app.css")));
  assert.ok(appHtml.includes(await expectedReference(surface, "app.js")));
  assert.ok(printHtml.includes(await expectedReference(surface, "print.css")));
  assert.ok(printHtml.includes(await expectedReference(surface, "print.js")));
}

const webApp = await readFile(join(root, "dist", "web", "app.html"), "utf8");
const webIndex = await readFile(join(root, "dist", "web", "index.html"), "utf8");
assert.equal(webIndex, webApp, "The hosted index must retain the versioned asset references.");

console.log("Verified content-versioned Labeloo app and print assets across every build surface.");
