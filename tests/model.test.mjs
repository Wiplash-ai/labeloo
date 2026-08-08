import test from "node:test";
import assert from "node:assert/strict";
import {
  TEMPLATE,
  TEMPLATES,
  activeSheet,
  blankLabel,
  blankSheet,
  labelLines,
  labelHasContent,
  labelPosition,
  getTemplate,
  parseAddressBlock,
  parseAddressBlocks,
  sanitizeWorkspace,
  sheetCount,
  validateLabel
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

test("all supported stock templates fit within US Letter and paginate independently", () => {
  assert.equal(TEMPLATES.length, 13);
  for (const template of TEMPLATES) {
    const right = template.leftMarginIn + ((template.columns - 1) * template.horizontalPitchIn) + template.labelWidthIn;
    const bottom = template.topMarginIn + ((template.rows - 1) * template.verticalPitchIn) + template.labelHeightIn;
    assert.ok(right <= template.pageWidthIn + 0.001, `${template.id} exceeds page width`);
    assert.ok(bottom <= template.pageHeightIn + 0.001, `${template.id} exceeds page height`);
    assert.equal(template.labelsPerSheet, template.columns * template.rows);
    assert.deepEqual(
      labelPosition(template.labelsPerSheet, 1, template.id),
      { sheet: 1, slot: 0 }
    );
  }
});

test("sheet stock survives workspace sanitization and bounds its start slot", () => {
  const template = getTemplate("avery-5167-80");
  const clean = sanitizeWorkspace({
    projectName: "Return labels",
    sheets: [{ id: "returns", name: "Returns", templateId: template.id, startSlot: 80, labels: [] }],
    activeSheetId: "returns"
  });
  assert.equal(activeSheet(clean).templateId, template.id);
  assert.equal(activeSheet(clean).startSlot, 80);
  assert.equal(sheetCount({ ...activeSheet(clean), labels: [{}, {}] }), 2);
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
  assert.equal(activeSheet(clean).startSlot, 30);
  assert.equal(clean.zoom, 65);
  assert.equal(activeSheet(clean).labels[0].fontSize, 14);
  assert.equal(activeSheet(clean).labels[0].align, "left");
  assert.equal(clean.version, 2);
});

test("workspaces preserve multiple named sheets", () => {
  const address = blankSheet({ name: "Mailing", labels: [blankLabel({ name: "Alex" })] });
  const names = blankSheet({ name: "Conference", defaultType: "name", labels: [blankLabel({ type: "name", name: "Jordan" })] });
  const clean = sanitizeWorkspace({ projectName: "Events", sheets: [address, names], activeSheetId: names.id });
  assert.equal(clean.sheets.length, 2);
  assert.equal(activeSheet(clean).name, "Conference");
  assert.equal(activeSheet(clean).defaultType, "name");
});

test("label validation is type-specific and does not claim deliverability", () => {
  assert.equal(validateLabel(blankLabel({ type: "email", email: "bad-address" })).errors.email.length > 0, true);
  assert.equal(validateLabel(blankLabel({ type: "email", email: "hello@example.com" })).valid, true);
  assert.equal(validateLabel(blankLabel({ type: "address", name: "A", address1: "1 Main", city: "Austin", state: "TX", postal: "78701" })).valid, true);
  assert.equal(validateLabel(blankLabel({ type: "address", name: "A", address1: "1 Main", city: "Austin", state: "TX", postal: "ABC" })).errors.postal.length > 0, true);
});

test("new and duplicated labels always receive an identifier", () => {
  const original = blankLabel({ name: "Original" });
  const duplicate = blankLabel({ ...original, id: undefined });
  assert.ok(original.id);
  assert.ok(duplicate.id);
  assert.notEqual(original.id, duplicate.id);
});

test("label content detection distinguishes editable blank slots from populated labels", () => {
  assert.equal(labelHasContent(blankLabel({ type: "address" })), false);
  assert.equal(labelHasContent(blankLabel({ type: "address", name: "Jordan" })), true);
  assert.equal(labelHasContent(blankLabel({ type: "custom", customText: "FRAGILE" })), true);
});
