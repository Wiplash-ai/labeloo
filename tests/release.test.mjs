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
  assert.match(source, /data_collection/);
});

test("Firefox declares optional cloud-sync data collection", async () => {
  const buildScript = await readFile(new URL("scripts/build.mjs", root), "utf8");
  assert.match(buildScript, /required:\s*\["none"\]/);
  assert.match(buildScript, /optional:\s*\["authenticationInfo",\s*"personallyIdentifyingInfo"\]/);
  assert.match(buildScript, /strict_min_version:\s*"142\.0"/);
});

test("print output stays in the current document and preserves Letter geometry", async () => {
  const css = await readFile(new URL("src/app.css", root), "utf8");
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(css, /@page\s*{[^}]*size:\s*letter/i);
  assert.match(source, /selectedTemplate\.labelWidthIn/);
  assert.match(source, /cell\.append\(createLabelContent\(label\)\)/);
  assert.match(css, /\.print-label \.sheet-label-content\s*{[^}]*width:\s*100%[^}]*height:\s*100%/i);
  assert.match(source, /window\.print\(\)/);
  assert.doesNotMatch(source, /window\.open\("", "_blank"\)/);
});

test("left label rows expose a direct delete action", async () => {
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(source, /remove\.title = "Delete label"/);
  assert.match(source, /deleteLabelAt\(index\)/);
});

test("sheet settings apply typography to existing and future labels", async () => {
  const html = await readFile(new URL("src/app.html", root), "utf8");
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(html, /id="sheetAlignmentControl"/);
  assert.match(html, /id="sheetFontSizeInput"/);
  assert.match(html, /id="sheetLineHeightInput"/);
  assert.match(html, /id="resetSheetTypographyButton"/);
  assert.match(source, /sheet\.labels\.forEach\(\(label\) => applySheetTypography\(label, sheet\)\)/);
  assert.match(source, /blankLabelForSheet\(sheet\)/);
  assert.match(source, /sheetFontSizeInput\.value = "10"/);
  assert.match(source, /sheetLineHeightInput\.value = "1\.15"/);
});

test("left label rows prioritize real content over generic placeholders", async () => {
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(source, /const \[primary, \.\.\.remaining\] = lines/);
  assert.match(source, /title\.textContent = primary \|\| `Empty/);
  assert.doesNotMatch(source, /title\.textContent = label\.name \|\| "Untitled label"/);
});

test("number steppers remain bounded in the label inspector", async () => {
  const html = await readFile(new URL("src/app.html", root), "utf8");
  const css = await readFile(new URL("src/app.css", root), "utf8");
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(html, /class="typography-fields field--wide"/);
  assert.match(css, /\.typography-fields\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/i);
  assert.match(css, /\.number-stepper button\s*{[^}]*overflow:\s*hidden/i);
  assert.match(source, /function syncNumberStepper\(input\)/);
  assert.match(source, /down\.disabled =/);
  assert.match(source, /up\.disabled =/);
});

test("all dialogs close when their backdrop is clicked", async () => {
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(source, /document\.querySelectorAll\("dialog"\)\.forEach/);
  assert.match(source, /if \(event\.target === dialog\) dialog\.close\(\)/);
});

test("product page demonstrates and documents the full stock catalog", async () => {
  const html = await readFile(new URL("site/labeloo/index.html", root), "utf8");
  const source = await readFile(new URL("site/labeloo/site.js", root), "utf8");
  const roadmap = await readFile(new URL("docs/SPECIALTY_TEMPLATE_ROADMAP.md", root), "utf8");
  assert.match(html, /Thirteen layouts\. One workbench\./);
  assert.match(html, /id="demoTemplate"/);
  assert.match(html, /api\/docs/);
  assert.equal((source.match(/id: "avery-/g) || []).length, 13);
  assert.match(roadmap, /Target: Labeloo v0\.5\.0/);
  assert.match(roadmap, /not currently supported layouts/);
});
