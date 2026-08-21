import test from "node:test";
import assert from "node:assert/strict";
import { utils, write } from "xlsx";
import {
  autoMapping,
  createImportPlan,
  googleSheetExportUrl,
  labelsFromTable,
  orientedRows,
  parseDelimitedRows,
  readSpreadsheetBytes
} from "../src/spreadsheet.js";

const addressRows = [
  ["Holiday mailing list"],
  [],
  ["Customer", "Street", "Town", "State", "ZIP Code"],
  ["Alex Rivera", "123 Splash Lane", "Fort Worth", "TX", "76102"],
  ["Wiplash Labs", "44 Signal Street", "Austin", "TX", "78701"]
];

test("import plans detect a header below title and blank rows", () => {
  const sheet = { name: "Addresses", rows: addressRows };
  const plan = createImportPlan(sheet);
  const labels = labelsFromTable(orientedRows(sheet, plan.orientation), plan);
  assert.equal(plan.headerRowIndex, 2);
  assert.equal(plan.firstDataRowIndex, 3);
  assert.equal(labels.length, 2);
  assert.equal(labels[0].name, "Alex Rivera");
  assert.equal(labels[0].postal, "76102");
});

test("records running in columns can be transposed and mapped", () => {
  const sheet = {
    name: "Sideways",
    rows: [
      ["Full Name", "Alex Rivera", "Sam Lee"],
      ["Street Address", "123 Splash Lane", "8 Oak Road"],
      ["City", "Fort Worth", "Tulsa"],
      ["State", "TX", "OK"],
      ["Postal Code", "76102", "74103"]
    ]
  };
  const plan = createImportPlan(sheet, "columns");
  const labels = labelsFromTable(orientedRows(sheet, plan.orientation), plan);
  assert.equal(labels.length, 2);
  assert.equal(labels[1].name, "Sam Lee");
  assert.equal(labels[1].city, "Tulsa");
});

test("manual field mapping imports spreadsheets without headers", () => {
  const rows = [["Alex Rivera", "123 Splash Lane", "Fort Worth", "TX", "76102"]];
  const mapping = { 0: "name", 1: "address1", 2: "city", 3: "state", 4: "postal" };
  const [label] = labelsFromTable(rows, { headerRowIndex: -1, firstDataRowIndex: 0, mapping });
  assert.equal(label.name, "Alex Rivera");
  assert.equal(label.address1, "123 Splash Lane");
});

test("TSV files retain text values and use the same mapping model", () => {
  const rows = parseDelimitedRows("Name\tEmail\nJordan\tjordan@example.com", "tsv");
  const mapping = autoMapping(rows, 0, 1);
  const [label] = labelsFromTable(rows, { headerRowIndex: 0, firstDataRowIndex: 1, mapping });
  assert.equal(label.type, "email");
  assert.equal(label.email, "jordan@example.com");
});

test("empty delimited files produce a friendly validation message", () => {
  assert.throws(
    () => parseDelimitedRows("  \n\t ", "csv"),
    { message: "That spreadsheet does not contain any data." }
  );
});

for (const bookType of ["xlsx", "xls", "xlsm", "xlsb", "ods", "fods"]) {
  test(`reads ${bookType.toUpperCase()} workbook data`, () => {
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, utils.aoa_to_sheet(addressRows), "Address Book");
    const bytes = write(workbook, { bookType, type: "array" });
    const imported = readSpreadsheetBytes(bytes, `address-book.${bookType}`);
    const plan = createImportPlan(imported.sheets[0]);
    const labels = labelsFromTable(orientedRows(imported.sheets[0], plan.orientation), plan);
    assert.equal(imported.sheets[0].name, "Address Book");
    assert.equal(labels[0].name, "Alex Rivera");
  });
}

test("Google Sheets links are restricted to the official spreadsheet host", () => {
  assert.equal(
    googleSheetExportUrl("https://docs.google.com/spreadsheets/d/abc_123-XYZ/edit#gid=42"),
    "https://docs.google.com/spreadsheets/d/abc_123-XYZ/export?format=xlsx"
  );
  assert.throws(() => googleSheetExportUrl("https://example.com/spreadsheets/d/abc"), /docs\.google\.com/i);
});
