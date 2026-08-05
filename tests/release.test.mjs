import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("manifest uses MV3 and requests sync hosts only when the user opts in", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.permissions.sort(), ["contextMenus", "storage"]);
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions.sort(), ["http://127.0.0.1/*", "http://localhost/*", "https://labs.wiplash.ai/*"]);
});

test("runtime has no analytics and contains an explicit optional sync client", async () => {
  const paths = ["background.js", "src/app.html", "src/app.js", "src/popup.js", "src/storage.js", "src/sync.js"];
  const source = (await Promise.all(paths.map((path) => readFile(new URL(path, root), "utf8")))).join("\n");
  assert.doesNotMatch(source, /google-analytics|mixpanel|segment\.io|XMLHttpRequest/i);
  assert.match(source, /optional cloud sync/i);
  assert.match(source, /chrome\.permissions\.request/);
});

test("print output stays in the current document and preserves Letter geometry", async () => {
  const css = await readFile(new URL("src/app.css", root), "utf8");
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(css, /@page\s*{[^}]*size:\s*letter/i);
  assert.match(source, /TEMPLATE\.labelWidthIn/);
  assert.match(source, /window\.print\(\)/);
  assert.doesNotMatch(source, /window\.open\("", "_blank"\)/);
});
