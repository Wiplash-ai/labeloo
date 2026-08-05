import Papa from "papaparse";
import { blankLabel } from "./model.js";

const aliases = {
  name: ["name", "recipient", "full name", "organization", "company"],
  address1: ["address", "address 1", "address1", "street", "street address", "line 1"],
  address2: ["address 2", "address2", "suite", "unit", "line 2"],
  city: ["city", "town"],
  state: ["state", "province", "region"],
  postal: ["zip", "zipcode", "zip code", "postal", "postal code"],
  country: ["country", "country code"]
};

const normalize = (value) => String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

function fieldForHeader(header) {
  const normalized = normalize(header);
  return Object.entries(aliases).find(([, names]) => names.includes(normalized))?.[0] || null;
}

export function parseCsv(text) {
  const parsed = Papa.parse(String(text ?? ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim()
  });
  if (parsed.errors.length && !parsed.data.length) {
    throw new Error(parsed.errors[0].message || "The CSV could not be read.");
  }

  const mapping = Object.fromEntries((parsed.meta.fields || []).map((header) => [header, fieldForHeader(header)]));
  if (!Object.values(mapping).includes("address1")) {
    throw new Error("Add an address or street column to the CSV.");
  }

  const labels = parsed.data.map((row) => {
    const values = {};
    for (const [header, field] of Object.entries(mapping)) {
      if (field && !values[field]) values[field] = String(row[header] ?? "").trim();
    }
    return blankLabel(values);
  }).filter((label) => label.name || label.address1 || label.city || label.postal);

  if (!labels.length) throw new Error("No usable address rows were found in the CSV.");
  return labels;
}

function quote(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function labelsToCsv(labels) {
  const headers = ["Name", "Address 1", "Address 2", "City", "State", "Postal Code", "Country"];
  const rows = labels.map((label) => [
    label.name,
    label.address1,
    label.address2,
    label.city,
    label.state,
    label.postal,
    label.country
  ]);
  return [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n");
}
