import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("manifest uses MV3 and requests sync hosts only when the user opts in", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
  const packageMetadata = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, packageMetadata.version);
  assert.equal(manifest.version, "0.5.2");
  assert.deepEqual(manifest.permissions.sort(), ["contextMenus", "identity", "storage"]);
  assert.equal(manifest.permissions.includes("identity.email"), false);
  assert.equal(manifest.host_permissions, undefined);
  assert.deepEqual(manifest.optional_host_permissions, ["https://auth.wiplash.ai/*", "https://docs.google.com/*"]);
  assert.equal(manifest.action.default_popup, undefined);
});

test("toolbar clicks open the editor directly and reuse a browser new tab", async () => {
  const background = await readFile(new URL("background.js", root), "utf8");
  assert.match(background, /chrome\.action\.onClicked\.addListener/);
  assert.match(background, /chrome:\/\/newtab\//);
  assert.match(background, /chrome\.tabs\.update\(tab\.id, \{ url \}\)/);
  assert.match(background, /chrome\.tabs\.create/);
  assert.doesNotMatch(background, /labeloo:open-editor/);
});

test("the main sheet editor preserves scrolling and exposes pointer-centered gesture zoom", async () => {
  const appHtml = await readFile(new URL("src/app.html", root), "utf8");
  const appSource = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(appHtml, /id="sheetStage"[^>]+Scroll to move[^>]+zoom toward the pointer/);
  assert.match(appHtml, /id="zoomValue"[^>]*>86%<\/output>/);
  assert.match(appHtml, /id="zoomInput"[^>]+max="300"/);
  assert.match(appSource, /sheetStage\.addEventListener\("wheel"/);
  assert.match(appSource, /!event\.ctrlKey && !event\.metaKey/);
  assert.match(appSource, /captureZoomAnchor/);
  assert.match(appSource, /restoreZoomAnchor/);
  assert.match(appSource, /capture: true, passive: false/);
  assert.match(appSource, /requestAnimationFrame/);
});

test("sheet names are the only user-facing names and drive exported filenames", async () => {
  const appHtml = await readFile(new URL("src/app.html", root), "utf8");
  const appSource = await readFile(new URL("src/app.js", root), "utf8");
  assert.doesNotMatch(appHtml, /id="projectName"/);
  assert.match(appSource, /const safeName = currentSheet\(\)\.name\.toLowerCase\(\)/);
});

test("runtime and public copy contain explicit optional Wiplash sync", async () => {
  const paths = ["README.md", "background.js", "src/app.html", "src/app.js", "src/storage.js", "src/sync.js"];
  const source = (await Promise.all(paths.map((path) => readFile(new URL(path, root), "utf8")))).join("\n");
  assert.doesNotMatch(source, /google-analytics|mixpanel|segment\.io|XMLHttpRequest/i);
  assert.match(source, /Wiplash single sign-on/i);
  assert.match(source, /chrome\.permissions\.request/);
  assert.match(source, /data_collection/);
  assert.match(source, /Continue with Wiplash\.ai/);
  assert.match(source, /assets\/wiplash-account-mark\.png/);
  assert.match(source, /Sign in for cross-browser project sync/);
  assert.doesNotMatch(source, /VideoStitch|GlassWare/);
  assert.doesNotMatch(source, /\/auth\/(?:login|register)/);
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
  assert.match(source, /printablePageIndexes\(sheetSet\)/);
  assert.match(source, /label && labelHasContent\(label\)/);
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

test("imports reveal Google Sheets on demand and duplicate references navigate between labels", async () => {
  const html = await readFile(new URL("src/app.html", root), "utf8");
  const css = await readFile(new URL("src/app.css", root), "utf8");
  const source = `${await readFile(new URL("src/app.js", root), "utf8")}\n${await readFile(new URL("src/sync.js", root), "utf8")}`;
  assert.match(html, /id="googleSheetToggle"[^>]+aria-expanded="false"/);
  assert.match(html, /id="googleSheetImport" class="google-sheet-import hidden"/);
  assert.match(html, /Google sign-in does not give Labeloo access/);
  assert.match(html, /Share → General access → Anyone with the link \(Viewer\)/);
  assert.match(html, /id="googleDriveButton"/);
  assert.match(html, /id="googleDriveSwitchButton"[^>]+>Switch Google account</);
  assert.match(html, /Sign in to use My Drive/);
  assert.match(source, /chooseGoogleDriveSheet/);
  assert.match(source, /launchWebAuthFlow/);
  assert.match(source, /chrome\.windows\.create|windowsApi\.create/);
  assert.match(source, /chooseAccount: true/);
  assert.match(source, /Sign in with Wiplash\.ai before choosing a private Google Sheet/);
  assert.match(html, /id="importMessage"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /id="duplicateSummary"/);
  assert.match(source, /insertLabelsIntoBlankSlots\(currentLabels\(\), labels\)/);
  assert.match(source, /duplicateLabelGroups\(sheet\.labels\)/);
  assert.match(source, /link\.addEventListener\("click", \(\) => selectLabel\(duplicate\.id\)\)/);
  assert.match(source, /GOOGLE_SHEET_DOWNLOAD_MESSAGE/);
  assert.match(source, /failed to fetch\|networkerror\|load failed/i);
  assert.match(css, /\.slot-number\.duplicate-reference/);
  assert.match(css, /\.google-sheet-trigger\s*\{/);
});

test("spreadsheet import tabs and file chooser expose keyboard-accessible state", async () => {
  const html = await readFile(new URL("src/app.html", root), "utf8");
  const css = await readFile(new URL("src/app.css", root), "utf8");
  const source = await readFile(new URL("src/app.js", root), "utf8");
  assert.match(html, /id="spreadsheetImportTab"[^>]+role="tab"[^>]+aria-selected="true"[^>]+aria-controls="spreadsheetPanel"[^>]*>Spreadsheet</);
  assert.match(html, /id="pasteImportTab"[^>]+role="tab"[^>]+aria-selected="false"[^>]+aria-controls="pastePanel"[^>]*>List</);
  assert.ok(html.indexOf('id="spreadsheetImportTab"') < html.indexOf('id="pasteImportTab"'));
  assert.match(html, /id="pastePanel"[^>]+role="tabpanel"[^>]+aria-labelledby="pasteImportTab"/);
  assert.match(html, /id="spreadsheetPanel"[^>]+role="tabpanel"[^>]+aria-labelledby="spreadsheetImportTab"/);
  assert.match(source, /let activeImportTab = "spreadsheet"/);
  assert.match(source, /importButton\.addEventListener\("click", \(\) => showImportDialog\("spreadsheet"\)\)/);
  assert.match(source, /pasteAddressesButton\.addEventListener\("click", \(\) => showImportDialog\("paste"\)\)/);
  assert.match(source, /button\.setAttribute\("aria-selected", String\(selected\)\)/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.match(source, /event\.key === "Home"/);
  assert.match(css, /\.file-drop:focus-within\s*{[^}]*outline:/i);
});

test("product page demonstrates and documents the full stock catalog", async () => {
  const html = await readFile(new URL("site/labeloo/index.html", root), "utf8");
  const source = await readFile(new URL("site/labeloo/site.js", root), "utf8");
  const roadmap = await readFile(new URL("docs/SPECIALTY_TEMPLATE_ROADMAP.md", root), "utf8");
  assert.match(html, /Thirteen layouts\. One workbench\./);
  assert.match(html, /id="demoTemplate"/);
  assert.match(html, /api\/docs/);
  assert.equal((html.match(/class="demo-text-field"/g) || []).length, 3);
  assert.doesNotMatch(html, /<input[^>]+id="demo(?:Name|Address|City)"/);
  assert.match(source, /fields\[0\]\.textContent = row\.dataset\.name/);
  assert.match(source, /127\.0\.0\.1:8790/);
  assert.equal((source.match(/id: "avery-/g) || []).length, 13);
  assert.match(roadmap, /Target: Labeloo v0\.5\.0/);
  assert.match(roadmap, /not currently supported layouts/);
});

test("public account pages disclose Google Drive access and support paths", async () => {
  const homepage = await readFile(new URL("site/labeloo/index.html", root), "utf8");
  const privacy = await readFile(new URL("site/labeloo/privacy/index.html", root), "utf8");
  const support = await readFile(new URL("site/labeloo/support/index.html", root), "utf8");
  assert.match(homepage, /Signed-in users can choose one private spreadsheet from Google Drive/);
  assert.match(homepage, /href="support\//);
  assert.match(homepage, /https:\/\/wiplash\.ai\/legal\/terms/);
  assert.match(privacy, /Google API Services User Data Policy/);
  assert.match(privacy, /Limited Use requirements/);
  assert.match(privacy, /drive\.file/);
  assert.match(support, /Choose a private Google Sheet/);
  assert.match(support, /Remove Google access/);
  assert.match(support, /support@wiplash\.ai/);
});
