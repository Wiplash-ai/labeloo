import Papa from "papaparse";
import { read, utils } from "xlsx";
import { blankLabel, parseAddressBlock } from "./model.js";

export const MAX_SPREADSHEET_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_COLUMNS = 100;
export const MAX_LABELS_PER_SHEET = 2000;

export const IMPORT_FIELDS = Object.freeze([
  { value: "", label: "Do not import" },
  { value: "fullAddress", label: "Full address block" },
  { value: "type", label: "Label type" },
  { value: "name", label: "Name or organization" },
  { value: "subtitle", label: "Subtitle or role" },
  { value: "email", label: "Email address" },
  { value: "customText", label: "Custom label text" },
  { value: "address1", label: "Address line 1" },
  { value: "address2", label: "Address line 2" },
  { value: "city", label: "City" },
  { value: "state", label: "State or region" },
  { value: "postal", label: "ZIP or postal code" },
  { value: "country", label: "Country" }
]);

const aliases = Object.freeze({
  fullAddress: ["full address", "address block", "mailing address", "full mailing address"],
  type: ["type", "label type", "kind"],
  name: ["name", "recipient", "recipient name", "full name", "customer", "customer name", "contact", "contact name", "organization", "company", "company name"],
  subtitle: ["subtitle", "role", "job title", "title", "department"],
  email: ["email", "email address", "e mail"],
  customText: ["custom", "custom text", "label text", "message", "notes"],
  address1: ["address", "address 1", "address1", "street", "street address", "line 1", "address line 1"],
  address2: ["address 2", "address2", "suite", "unit", "line 2", "address line 2", "apartment"],
  city: ["city", "town", "locality"],
  state: ["state", "province", "region", "state province"],
  postal: ["zip", "zipcode", "zip code", "postal", "postal code", "postcode"],
  country: ["country", "country code"]
});

const normalize = (value) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[_./-]+/g, " ")
  .replace(/\s+/g, " ");

const cellText = (value) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim();
};

const rowHasValue = (row) => row.some((value) => cellText(value));

export function fieldForHeader(header) {
  const normalized = normalize(header);
  return Object.entries(aliases).find(([, names]) => names.includes(normalized))?.[0] || null;
}

export function columnName(index) {
  let value = Number(index) + 1;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

export function normalizeRows(inputRows) {
  const rows = (Array.isArray(inputRows) ? inputRows : [])
    .slice(0, MAX_IMPORT_ROWS)
    .map((row) => (Array.isArray(row) ? row : [row]).slice(0, MAX_IMPORT_COLUMNS).map(cellText));
  while (rows.length && !rowHasValue(rows.at(-1))) rows.pop();
  const width = Math.min(MAX_IMPORT_COLUMNS, rows.reduce((maximum, row) => {
    let lastValue = row.length - 1;
    while (lastValue >= 0 && !cellText(row[lastValue])) lastValue -= 1;
    return Math.max(maximum, lastValue + 1);
  }, 0));
  return rows.map((row) => Array.from({ length: width }, (_, index) => row[index] || ""));
}

export function transposeRows(inputRows) {
  const rows = normalizeRows(inputRows);
  const width = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  return normalizeRows(Array.from({ length: width }, (_, columnIndex) => (
    rows.map((row) => row[columnIndex] || "")
  )));
}

export function orientedRows(sheet, orientation = "rows") {
  return orientation === "columns" ? transposeRows(sheet?.rows) : normalizeRows(sheet?.rows);
}

export function parseDelimitedRows(text, extension = "csv") {
  const source = String(text ?? "");
  if (!source.trim()) throw new Error("That spreadsheet does not contain any data.");
  const result = Papa.parse(source, {
    delimiter: extension === "tsv" ? "\t" : "",
    skipEmptyLines: false,
    dynamicTyping: false
  });
  if (result.errors.length && !result.data.length) {
    throw new Error(result.errors[0].message || "The spreadsheet could not be read.");
  }
  const rows = normalizeRows(result.data);
  if (!rows.some(rowHasValue)) throw new Error("That spreadsheet does not contain any data.");
  return rows;
}

function rowsFromWorksheet(worksheet) {
  if (!worksheet?.["!ref"]) return [];
  const range = utils.decode_range(worksheet["!ref"]);
  range.e.r = Math.min(range.e.r, MAX_IMPORT_ROWS - 1);
  range.e.c = Math.min(range.e.c, MAX_IMPORT_COLUMNS - 1);
  return normalizeRows(utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: true,
    range
  }));
}

function workbookResult(workbook, sourceName) {
  const sheets = (workbook.SheetNames || []).map((name) => ({
    name,
    rows: rowsFromWorksheet(workbook.Sheets[name])
  })).filter((sheet) => sheet.rows.some(rowHasValue));
  if (!sheets.length) throw new Error("No populated sheets were found in that workbook.");
  return { sourceName, sheets };
}

export function readSpreadsheetBytes(bytes, sourceName = "Spreadsheet.xlsx") {
  try {
    return workbookResult(read(bytes, { type: "array", cellText: true, cellDates: false }), sourceName);
  } catch (error) {
    throw new Error(`Labeloo could not read ${sourceName}. ${error?.message || "The workbook may be damaged or password protected."}`);
  }
}

export async function readSpreadsheetFile(file) {
  if (!file) throw new Error("Choose a spreadsheet first.");
  if (file.size > MAX_SPREADSHEET_BYTES) throw new Error("Choose a spreadsheet smaller than 25 MB.");
  const extension = String(file.name || "").split(".").pop().toLowerCase();
  const supported = ["csv", "tsv", "txt", "xlsx", "xls", "xlsm", "xlsb", "ods", "fods", "numbers"];
  if (!supported.includes(extension)) {
    throw new Error("Choose an Excel, Numbers, LibreOffice Calc, CSV, TSV, or text spreadsheet.");
  }
  if (["csv", "tsv", "txt"].includes(extension)) {
    return {
      sourceName: file.name,
      sheets: [{ name: "Imported list", rows: parseDelimitedRows(await file.text(), extension) }]
    };
  }
  return readSpreadsheetBytes(await file.arrayBuffer(), file.name);
}

export function googleSheetExportUrl(value) {
  let url;
  try {
    url = new URL(String(value ?? "").trim());
  } catch {
    throw new Error("Paste a complete Google Sheets link.");
  }
  const match = url.hostname === "docs.google.com" && url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Use a docs.google.com/spreadsheets link.");
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
}

function headerScore(row) {
  const fields = new Set(row.map(fieldForHeader).filter(Boolean));
  const populated = row.filter((value) => cellText(value)).length;
  return fields.size * 20 + Math.min(populated, 10);
}

export function detectHeaderRow(rows) {
  const candidates = normalizeRows(rows).slice(0, 30);
  if (!candidates.length) return -1;
  let bestIndex = candidates.findIndex(rowHasValue);
  let bestScore = bestIndex >= 0 ? headerScore(candidates[bestIndex]) : -1;
  candidates.forEach((row, index) => {
    const score = headerScore(row);
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });
  return bestIndex;
}

export function columnDescriptors(rows, headerRowIndex = -1, firstDataRowIndex = 0) {
  const normalizedRows = normalizeRows(rows);
  const width = normalizedRows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  return Array.from({ length: width }, (_, index) => {
    const header = headerRowIndex >= 0 ? cellText(normalizedRows[headerRowIndex]?.[index]) : "";
    const samples = [];
    for (let rowIndex = firstDataRowIndex; rowIndex < normalizedRows.length && samples.length < 3; rowIndex += 1) {
      const value = cellText(normalizedRows[rowIndex]?.[index]);
      if (value && !samples.includes(value)) samples.push(value);
    }
    return {
      index,
      reference: columnName(index),
      header,
      label: header || `Column ${columnName(index)}`,
      samples,
      suggestedField: fieldForHeader(header)
    };
  });
}

export function autoMapping(rows, headerRowIndex = -1, firstDataRowIndex = 0) {
  const usedFields = new Set();
  return Object.fromEntries(columnDescriptors(rows, headerRowIndex, firstDataRowIndex).map((column) => {
    const field = column.suggestedField && !usedFields.has(column.suggestedField) ? column.suggestedField : "";
    if (field) usedFields.add(field);
    return [column.index, field];
  }));
}

export function createImportPlan(sheet, orientation = "rows") {
  const rows = orientedRows(sheet, orientation);
  const headerRowIndex = detectHeaderRow(rows);
  const firstDataRowIndex = Math.min(rows.length, Math.max(0, headerRowIndex + 1));
  return {
    orientation: orientation === "columns" ? "columns" : "rows",
    headerRowIndex,
    firstDataRowIndex,
    mapping: autoMapping(rows, headerRowIndex, firstDataRowIndex)
  };
}

function normalizeType(value) {
  const type = normalize(value);
  if (["name", "name tag", "badge", "name badge"].includes(type)) return "name";
  if (["email", "email label"].includes(type)) return "email";
  if (["custom", "custom label", "text"].includes(type)) return "custom";
  if (["address", "shipping", "mailing", "postal"].includes(type)) return "address";
  return "";
}

function labelFromValues(values) {
  const addressBlock = values.fullAddress ? parseAddressBlock(values.fullAddress) : null;
  const merged = { ...values };
  if (addressBlock) {
    ["name", "address1", "address2", "city", "state", "postal", "country"].forEach((field) => {
      if (!merged[field]) merged[field] = addressBlock[field];
    });
  }
  delete merged.fullAddress;
  const mappedType = normalizeType(merged.type);
  const type = mappedType || (merged.email ? "email" : merged.customText ? "custom" : merged.address1 ? "address" : "name");
  return blankLabel({ ...merged, type });
}

export function labelsFromTable(inputRows, plan, limit = MAX_LABELS_PER_SHEET) {
  const rows = normalizeRows(inputRows);
  const mappedFields = Object.values(plan?.mapping || {}).filter(Boolean);
  if (!["fullAddress", "address1", "email", "name", "customText"].some((field) => mappedFields.includes(field))) {
    throw new Error("Map at least one name, address, email, full address, or custom text field.");
  }
  const labels = [];
  for (let rowIndex = Math.max(0, Number(plan.firstDataRowIndex) || 0); rowIndex < rows.length && labels.length < limit; rowIndex += 1) {
    const values = {};
    Object.entries(plan.mapping || {}).forEach(([columnIndex, field]) => {
      if (field && !values[field]) values[field] = cellText(rows[rowIndex]?.[Number(columnIndex)]);
    });
    const label = labelFromValues(values);
    if (label.name || label.address1 || label.city || label.postal || label.email || label.customText) labels.push(label);
  }
  if (!labels.length) throw new Error("No usable label records were found with this mapping.");
  return labels;
}
