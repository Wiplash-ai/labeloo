import test from "node:test";
import assert from "node:assert/strict";
import {
  importReceiptTokenFromUrl,
  urlWithoutImportReceipt,
  workspaceWithImportReceipt,
} from "../src/import-handoff.js";
import { blankLabel, sampleWorkspace } from "../src/model.js";

const token = `loo_import_${"a".repeat(43)}`;

test("Labeloo recognizes only opaque import receipt tokens and removes them from the visible URL", () => {
  assert.equal(importReceiptTokenFromUrl(`https://labs.wiplash.ai/labeloo/app/?import=${token}&source=sheets`), token);
  assert.equal(importReceiptTokenFromUrl("https://labs.wiplash.ai/labeloo/app/?import=Alex%20Rivera"), "");
  assert.equal(urlWithoutImportReceipt(`https://labs.wiplash.ai/labeloo/app/?import=${token}&source=sheets#editor`), "/labeloo/app/?source=sheets#editor");
});

test("a consumed spreadsheet receipt opens its labels on a new sheet without replacing local work", () => {
  const current = sampleWorkspace();
  const beforeLabels = current.sheets[0].labels.map((label) => label.name);
  const imported = workspaceWithImportReceipt(current, {
    source: { workbookName: "Fundraiser checks", sheetName: "Mailing list", range: "A1:F3" },
    labels: [
      { type: "address", name: "Alex Rivera", address1: "123 Splash Lane", city: "Fort Worth", state: "TX", postal: "76102" },
      { type: "address", name: "Wiplash Labs", address1: "44 Signal Street", city: "Austin", state: "TX", postal: "78701" },
    ],
  });
  assert.equal(imported.count, 2);
  assert.equal(imported.workspace.sheets.length, 2);
  assert.deepEqual(imported.workspace.sheets[0].labels.map((label) => label.name), beforeLabels);
  assert.equal(imported.workspace.sheets[1].name, "Mailing list");
  assert.deepEqual(imported.workspace.sheets[1].labels.map((label) => label.name), ["Alex Rivera", "Wiplash Labs"]);
  assert.equal(imported.workspace.activeSheetId, imported.workspace.sheets[1].id);
  assert.equal(imported.destination, "new_sheet");
});

test("a spreadsheet receipt can fill blank slots in the current Labeloo sheet before appending", () => {
  const current = sampleWorkspace();
  const currentSheet = current.sheets[0];
  const existingSheetId = currentSheet.id;
  currentSheet.labels[1] = blankLabel({ id: "existing-blank-slot" });
  const imported = workspaceWithImportReceipt(current, {
    destination: "current_sheet",
    source: { workbookName: "Fundraiser checks", sheetName: "Mailing list", range: "A1:F3" },
    labels: [
      { type: "address", name: "First new donor", address1: "1 New Lane", city: "Austin", state: "TX", postal: "78701" },
      { type: "address", name: "Second new donor", address1: "2 New Lane", city: "Austin", state: "TX", postal: "78702" },
    ],
  });
  assert.equal(imported.destination, "current_sheet");
  assert.equal(imported.workspace.sheets.length, 1);
  assert.equal(imported.workspace.activeSheetId, existingSheetId);
  assert.equal(imported.workspace.sheets[0].labels[1].id, "existing-blank-slot");
  assert.equal(imported.workspace.sheets[0].labels[1].name, "First new donor");
  assert.equal(imported.workspace.sheets[0].labels.at(-1).name, "Second new donor");
  assert.equal(imported.workspace.selectedId, "existing-blank-slot");
});

test("filling the current sheet rejects imports that exceed its remaining capacity", () => {
  const current = sampleWorkspace();
  current.sheets[0].labels = Array.from({ length: 2000 }, (_, index) => blankLabel({
    id: `existing-${index}`,
    type: "custom",
    customText: `Existing label ${index + 1}`,
  }));

  assert.throws(() => workspaceWithImportReceipt(current, {
    destination: "current_sheet",
    labels: [{ type: "custom", customText: "One label too many" }],
  }), /can accept 0 more labels/i);
});
