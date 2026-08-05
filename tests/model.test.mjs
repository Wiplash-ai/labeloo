import test from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATE,
  blankLabel,
  labelLines,
  labelPosition,
  parseAddressBlock,
  parseAddressBlocks,
  sanitizeWorkspace,
  sheetCount
} from "../src/model.js";

test("30-up geometry and start position map labels to physical slots", () => {
  assert.equal(TEMPLATE.labelsPerSheet, 30);
  assert.equal(TEMPLATE.columns, 3);
  assert.equal(TEMPLATE.rows, 10);
  assert.equal(TEMPLATE.labelWidthIn, 2.625);
  assert.equal(TEMPLATE.labelHeightIn, 1);
  assert.equal(TEMPLATE.pageWidthIn, 8.5);
  assert.equal(TEMPLATE.pageHeightIn, 11);
  assert.deepEqual(labelPosition(0, 8), { sheet: 0, slot: 7 });
  assert.deepEqual(labelPosition(23, 8), { sheet: 1, slot: 0 });
  assert.equal(sheetCount({ startSlot: 8, labels: Array.from({ length: 24 }) }), 2);
  assert.equal(TEMPLATE.leftMarginIn + (2 * TEMPLATE.horizontalPitchIn) + TEMPLATE.labelWidthIn, 8.3125);
  assert.equal(TEMPLATE.topMarginIn + (9 * TEMPLATE.verticalPitchIn) + TEMPLATE.labelHeightIn, 10.5);
});

test("address blocks parse common US address formatting", () => {
  const label = parseAddressBlock("Alex Rivera\n123 Splash Lane\nFort Worth, TX 76102");
  assert.equal(label.name, "Alex Rivera");
  assert.equal(label.address1, "123 Splash Lane");
  assert.equal(label.city, "Fort Worth");
  assert.equal(label.state, "TX");
  assert.equal(label.postal, "76102");
  assert.deepEqual(labelLines(label), ["Alex Rivera", "123 Splash Lane", "Fort Worth, TX 76102"]);
});

test("multiple pasted blocks become separate labels", () => {
  const labels = parseAddressBlocks("A Person\n1 First St\nAustin, TX 78701\n\nB Person\n2 Second St\nDenver, CO 80202");
  assert.equal(labels.length, 2);
  assert.equal(labels[1].name, "B Person");
});

test("workspace data is bounded and sanitized", () => {
  const clean = sanitizeWorkspace({
    projectName: " Test ",
    startSlot: 99,
    zoom: 3,
    labels: [blankLabel({ fontSize: 99, align: "sideways" })]
  });
  assert.equal(clean.projectName, "Test");
  assert.equal(clean.startSlot, 30);
  assert.equal(clean.zoom, 65);
  assert.equal(clean.labels[0].fontSize, 14);
  assert.equal(clean.labels[0].align, "left");
});

test("new and duplicated labels always receive an identifier", () => {
  const original = blankLabel({ name: "Original" });
  const duplicate = blankLabel({ ...original, id: undefined });
  assert.ok(original.id);
  assert.ok(duplicate.id);
  assert.notEqual(original.id, duplicate.id);
});
