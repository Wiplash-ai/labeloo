import { LABEL_TYPES, blankLabel, blankSheet, labelHasContent, sanitizeWorkspace } from "./model.js";

export const IMPORT_RECEIPT_PARAM = "import";
export const IMPORT_RECEIPT_SESSION_KEY = "labelooPendingImportReceiptV1";

export function importReceiptTokenFromUrl(value) {
  try {
    const token = new URL(String(value)).searchParams.get(IMPORT_RECEIPT_PARAM) || "";
    return /^loo_import_[A-Za-z0-9_-]{43}$/.test(token) ? token : "";
  } catch {
    return "";
  }
}

export function urlWithoutImportReceipt(value) {
  const url = new URL(String(value));
  url.searchParams.delete(IMPORT_RECEIPT_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function workspaceWithImportReceipt(currentWorkspace, payload) {
  const workspace = sanitizeWorkspace(currentWorkspace);
  if (workspace.sheets.length >= 100) throw new Error("This workspace already has the maximum of 100 label sheets.");
  const labels = (Array.isArray(payload?.labels) ? payload.labels : [])
    .slice(0, 2000)
    .map((label) => blankLabel(label))
    .filter(labelHasContent);
  if (!labels.length) throw new Error("That spreadsheet import did not contain any usable labels.");
  const firstType = LABEL_TYPES[labels[0].type] ? labels[0].type : "address";
  const name = String(payload?.source?.sheetName || payload?.source?.workbookName || "Spreadsheet import").trim().slice(0, 60);
  const sheet = blankSheet({
    name: name || "Spreadsheet import",
    defaultType: firstType,
    labels,
  });
  workspace.sheets.push(sheet);
  workspace.activeSheetId = sheet.id;
  workspace.selectedId = labels[0].id;
  return { workspace, sheetId: sheet.id, count: labels.length };
}
