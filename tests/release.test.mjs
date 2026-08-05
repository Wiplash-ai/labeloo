import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("manifest uses MV3 and only local workflow permissions", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["contextMenus", "storage"]);
  assert.equal(manifest.host_permissions, undefined);
});

test("runtime has no analytics, accounts, or remote API client", async () => {
  const paths = ["background.js", "src/app.js", "src/popup.js", "src/storage.js"];
  const source = (await Promise.all(paths.map((path) => readFile(new URL(path, root), "utf8")))).join("\n");
  assert.doesNotMatch(source, /google-analytics|mixpanel|segment\.io|fetch\s*\(|XMLHttpRequest|oauth|sign[ -]?in/i);
});

test("print output preserves Letter paper and uses shared template geometry", async () => {
  const css = await readFile(new URL("src/print.css", root), "utf8");
  const source = await readFile(new URL("src/print.js", root), "utf8");
  assert.match(css, /@page\s*{[^}]*size:\s*Letter/i);
  assert.match(source, /TEMPLATE\.labelWidthIn/);
  assert.match(source, /TEMPLATE\.labelHeightIn/);
  assert.match(source, /TEMPLATE\.horizontalPitchIn/);
  assert.match(source, /TEMPLATE\.verticalPitchIn/);
});
