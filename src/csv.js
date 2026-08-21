import { autoMapping, detectHeaderRow, labelsFromTable, parseDelimitedRows } from "./spreadsheet.js";

export function parseCsv(text) {
  const rows = parseDelimitedRows(text, "csv");
  const headerRowIndex = detectHeaderRow(rows);
  const firstDataRowIndex = Math.max(0, headerRowIndex + 1);
  try {
    return labelsFromTable(rows, {
      headerRowIndex,
      firstDataRowIndex,
      mapping: autoMapping(rows, headerRowIndex, firstDataRowIndex)
    });
  } catch (error) {
    if (/Map at least one/i.test(error.message)) {
      throw new Error("Add a name, address, email, or label text column to the CSV.");
    }
    throw error;
  }
}

function quote(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function labelsToCsv(labels) {
  const headers = ["Type", "Name", "Subtitle", "Email", "Custom Text", "Address 1", "Address 2", "City", "State", "Postal Code", "Country"];
  const rows = labels.map((label) => [
    label.type,
    label.name,
    label.subtitle,
    label.email,
    label.customText,
    label.address1,
    label.address2,
    label.city,
    label.state,
    label.postal,
    label.country
  ]);
  return [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
}
